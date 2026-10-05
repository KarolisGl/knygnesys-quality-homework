#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const ts = require('../tools/node_modules/typescript');
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(scriptDir, '..');
const projectDir = path.resolve(root, '../../knygnesys-ui');
const srcDir = path.join(projectDir, 'src');
const evidenceDir = path.join(root, 'evidence');

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (entry.isFile() && entry.name.endsWith('.ts') && !entry.name.endsWith('.spec.ts')) out.push(full);
  }
  return out.sort();
}

const files = walk(srcDir);
const relativeFiles = new Set(files.map((file) => path.relative(srcDir, file).split(path.sep).join('/')));
const sourceFiles = new Map();
for (const file of files) {
  const rel = path.relative(srcDir, file).split(path.sep).join('/');
  const source = fs.readFileSync(file, 'utf8');
  sourceFiles.set(rel, ts.createSourceFile(rel, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS));
}

function resolveInternal(fromRel, specifier) {
  if (!specifier.startsWith('.')) return null;
  const base = path.posix.normalize(path.posix.join(path.posix.dirname(fromRel), specifier));
  const candidates = [base, `${base}.ts`, `${base}.tsx`, `${base}/index.ts`];
  return candidates.find((candidate) => relativeFiles.has(candidate)) ?? null;
}

function lineSpan(sourceFile, node) {
  const start = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile)).line + 1;
  const end = sourceFile.getLineAndCharacterOfPosition(node.getEnd()).line + 1;
  return { start, end, lines: end - start + 1 };
}

function isMethod(member) {
  return ts.isMethodDeclaration(member) || ts.isConstructorDeclaration(member) || ts.isGetAccessorDeclaration(member) || ts.isSetAccessorDeclaration(member);
}

const records = [];
const edges = [];
for (const [rel, sourceFile] of sourceFiles) {
  const imports = [];
  const classes = [];
  const functions = [];
  function visit(node) {
    if (ts.isImportDeclaration(node)) {
      const specifier = node.moduleSpecifier.text;
      const internalTarget = resolveInternal(rel, specifier);
      imports.push({ specifier, internalTarget });
      if (internalTarget) edges.push({ from: rel, to: internalTarget, specifier });
    }
    if (ts.isClassDeclaration(node) && node.name) {
      const span = lineSpan(sourceFile, node);
      classes.push({
        name: node.name.text,
        startLine: span.start,
        endLine: span.end,
        physicalLoc: span.lines,
        memberCount: node.members.length,
        methodCount: node.members.filter(isMethod).length,
      });
    }
    if (ts.isFunctionDeclaration(node) && node.name) {
      const span = lineSpan(sourceFile, node);
      functions.push({ name: node.name.text, startLine: span.start, endLine: span.end, physicalLoc: span.lines });
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);
  const physicalLoc = sourceFile.getLineStarts().length;
  records.push({
    sourceFile: rel,
    physicalLoc,
    staticImports: imports.length,
    internalImports: imports.filter((item) => item.internalTarget).length,
    externalImports: imports.filter((item) => !item.internalTarget).length,
    imports,
    classes: classes.map((item) => ({ ...item, sourceFile: rel })),
    functions,
  });
}

const fanIn = new Map([...relativeFiles].map((file) => [file, 0]));
for (const edge of edges) fanIn.set(edge.to, (fanIn.get(edge.to) ?? 0) + 1);
for (const record of records) {
  const outgoing = edges.filter((edge) => edge.from === record.sourceFile);
  record.coupling = {
    fanOut: outgoing.length,
    fanOutUnique: new Set(outgoing.map((edge) => edge.to)).size,
    fanIn: fanIn.get(record.sourceFile) ?? 0,
  };
}

const classes = records.flatMap((record) => record.classes.map((item) => ({ ...item, sourceFile: record.sourceFile })));
const sourcePhysicalLoc = records.reduce((sum, record) => sum + record.physicalLoc, 0);
const staticImports = records.reduce((sum, record) => sum + record.staticImports, 0);
const internalImportEdges = edges.length;
const summary = {
  productionTsFiles: records.length,
  sourcePhysicalLoc,
  staticImports,
  internalImportEdges,
  externalImportStatements: staticImports - internalImportEdges,
  internalGraphNodes: new Set(edges.flatMap((edge) => [edge.from, edge.to])).size,
  classes: classes.length,
  totalClassPhysicalLoc: classes.reduce((sum, item) => sum + item.physicalLoc, 0),
  averageClassPhysicalLoc: classes.length ? classes.reduce((sum, item) => sum + item.physicalLoc, 0) / classes.length : 0,
  maxClass: classes.slice().sort((a, b) => b.physicalLoc - a.physicalLoc)[0] ?? null,
  maxFanOut: records.slice().sort((a, b) => b.coupling.fanOut - a.coupling.fanOut)[0] ?? null,
  maxFanIn: records.slice().sort((a, b) => b.coupling.fanIn - a.coupling.fanIn)[0] ?? null,
};

const result = {
  tool: { name: 'TypeScript compiler API', version: ts.version },
  scope: { sourceRoot: '../../knygnesys-ui/src', productionTsFiles: records.length, specFilesExcluded: true, imports: 'static ImportDeclaration nodes only' },
  methodology: {
    physicalLoc: 'TypeScript SourceFile line starts per production .ts file.',
    classSize: 'ClassDeclaration start-to-end physical lines, member count, and method/constructor/accessor count.',
    coupling: 'Static import statements resolved to relative .ts/.tsx/index.ts files; external package imports are retained but not graph edges; fan-in/out count import edges.',
  },
  summary,
  files: records,
  edges,
};
fs.mkdirSync(evidenceDir, { recursive: true });
fs.writeFileSync(path.join(evidenceDir, 'structure-metrics.json'), `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify(result.summary, null, 2));
