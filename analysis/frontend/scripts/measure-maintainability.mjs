#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const ts = require('../tools/node_modules/typescript');
const escomplex = require('../tools/node_modules/typhonjs-escomplex');

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(scriptDir, '..');
const projectDir = path.resolve(root, '../../knygnesys-ui');
const srcDir = path.join(projectDir, 'src');
const evidenceDir = path.join(root, 'evidence');
const transpiledDir = path.join(evidenceDir, 'transpiled-js');

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (entry.isFile() && entry.name.endsWith('.ts') && !entry.name.endsWith('.spec.ts')) out.push(full);
  }
  return out.sort();
}

function mi(volume, cyclomatic, logicalLoc) {
  if (volume <= 0 || logicalLoc <= 0) return null;
  // Classic unnormalized MI (0..171 after clamping):
  // 171 - 5.2 ln(Halstead Volume) - 0.23*Cyclomatic - 16.2 ln(logical LOC).
  return Math.max(0, 171 - 5.2 * Math.log(volume) - 0.23 * cyclomatic - 16.2 * Math.log(logicalLoc));
}

const reports = [];
const errors = [];
for (const file of walk(srcDir)) {
  const rel = path.relative(srcDir, file).split(path.sep).join('/');
  const source = fs.readFileSync(file, 'utf8');
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
      experimentalDecorators: true,
      noEmitHelpers: true,
      removeComments: false,
      sourceMap: false,
    },
    fileName: rel,
  }).outputText;
  const outFile = path.join(transpiledDir, rel.replace(/\.ts$/, '.js'));
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, transpiled);
  try {
    const report = escomplex.analyzeModule(transpiled, {}, { sourceType: 'module' });
    const metric = (method) => ({
      name: method.name,
      lineStart: method.lineStart,
      lineEnd: method.lineEnd,
      cyclomatic: method.cyclomatic,
      halsteadVolume: method.halstead.volume,
      logicalLoc: method.sloc.logical,
      physicalLoc: method.sloc.physical,
      maintainabilityManual: mi(method.halstead.volume, method.cyclomatic, method.sloc.logical),
    });
    const classes = (report.classes ?? []).map((classReport) => ({
      name: classReport.name,
      lineStart: classReport.lineStart,
      lineEnd: classReport.lineEnd,
      maintainabilityTool: classReport.maintainability,
      aggregate: {
        cyclomatic: classReport.aggregate.cyclomatic,
        halsteadVolume: classReport.aggregate.halstead.volume,
        logicalLoc: classReport.aggregate.sloc.logical,
        physicalLoc: classReport.aggregate.sloc.physical,
      },
      methods: (classReport.methods ?? []).map(metric),
    }));
    reports.push({
      sourceFile: rel,
      transpiledFile: path.relative(root, outFile).split(path.sep).join('/'),
      sourcePhysicalLoc: source.split(/\r?\n/).length,
      aggregate: {
        cyclomatic: report.aggregate.cyclomatic,
        halsteadVolume: report.aggregate.halstead.volume,
        logicalLoc: report.aggregate.sloc.logical,
        physicalLoc: report.aggregate.sloc.physical,
        maintainabilityTool: report.maintainability,
      },
      maintainabilityManual: mi(report.aggregate.halstead.volume, report.aggregate.cyclomatic, report.aggregate.sloc.logical),
      methods: (report.methods ?? []).map(metric),
      classes,
      errors: report.errors ?? [],
    });
  } catch (error) {
    errors.push({ sourceFile: rel, message: String(error?.stack ?? error) });
  }
}

const total = reports.reduce((acc, item) => {
  acc.cyclomatic += item.aggregate.cyclomatic;
  acc.halsteadVolume += item.aggregate.halsteadVolume;
  acc.logicalLoc += item.aggregate.logicalLoc;
  acc.physicalLoc += item.aggregate.physicalLoc;
  return acc;
}, { cyclomatic: 0, halsteadVolume: 0, logicalLoc: 0, physicalLoc: 0 });
const fileMI = reports.map((item) => item.maintainabilityManual).filter((value) => value !== null).sort((a, b) => a - b);
const median = fileMI.length === 0 ? null : (fileMI.length % 2 ? fileMI[(fileMI.length - 1) / 2] : (fileMI[fileMI.length / 2 - 1] + fileMI[fileMI.length / 2]) / 2);
const methods = reports.flatMap((item) => [
  ...item.methods,
  ...item.classes.flatMap((classReport) => classReport.methods),
].map((method) => ({ ...method, sourceFile: item.sourceFile })));
methods.sort((a, b) => b.cyclomatic - a.cyclomatic || b.logicalLoc - a.logicalLoc || a.sourceFile.localeCompare(b.sourceFile));

const result = {
  tool: { name: 'typhonjs-escomplex', version: '0.1.0' },
  scope: { sourceRoot: '../../knygnesys-ui/src', productionTsFiles: reports.length, specFilesExcluded: true },
  transpilation: {
    compiler: 'typescript.transpileModule',
    typescriptVersion: ts.version,
    target: 'ES2022',
    module: 'ESNext',
    experimentalDecorators: true,
    semanticTypeChecking: false,
    angularTemplateCompilation: false,
    note: 'Metrics are for emitted JavaScript. Type annotations and TS-only syntax are erased; Angular external templates are not part of TS metrics; decorator lowering is used with compiler helpers omitted to reduce helper-code skew. Angular template semantics and type-checking are not measured here.',
  },
  methodology: {
    aggregate: 'Sum per-file Halstead volume, cyclomatic complexity, and logical SLOC for the corpus.',
    maintainabilityIndex: 'max(0, 171 - 5.2*ln(HalsteadVolume) - 0.23*Cyclomatic - 16.2*ln(logicalLOC)); unnormalized 0..171 scale.',
    perFunction: 'Same formula applied to typhonjs-escomplex method metrics; method names are those recovered from emitted JavaScript.',
    medianFileMI: median,
  },
  totals: { ...total, maintainabilityManual: mi(total.halsteadVolume, total.cyclomatic, total.logicalLoc) },
  topMethodsByCyclomatic: methods.slice(0, 25),
  files: reports,
  errors,
};
fs.mkdirSync(evidenceDir, { recursive: true });
fs.writeFileSync(path.join(evidenceDir, 'maintainability.json'), `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify({ files: reports.length, errors: errors.length, totals: result.totals, medianFileMI: median, topMethodsByCyclomatic: methods.slice(0, 8) }, null, 2));
process.exitCode = errors.length ? 1 : 0;
