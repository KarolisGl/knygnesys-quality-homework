"""Java structural metrics and explicit AST-based decision-point counts.
CBO_import is an import proxy, not resolved CBO. DIT counts explicit extends
edges only, omitting implicit Object. WMC=sum stated per-method decision counts.
"""
from pathlib import Path
import json
from importlib.metadata import version
from tree_sitter import Language, Parser
import tree_sitter_java
ROOT=Path(__file__).resolve().parents[1]
SRC=ROOT/'knygnesys-app/src/main/java'
parser=Parser(Language(tree_sitter_java.language()))
def descendants(node):
    yield node
    for child in node.named_children:yield from descendants(child)
def decision_nodes(node):
    for child in node.named_children:
        if child.type in ['lambda_expression','class_declaration','interface_declaration','record_declaration']:continue
        yield child
        yield from decision_nodes(child)
def count(body,source):
    points=[]
    for n in decision_nodes(body):
        t=n.type;include=t in ['if_statement','for_statement','enhanced_for_statement','while_statement','do_statement','catch_clause','ternary_expression']
        if t=='switch_label':include=source[n.start_byte:n.end_byte].decode().lstrip().startswith('case ')
        if t=='binary_expression':
            op=n.child_by_field_name('operator');include=op is not None and source[op.start_byte:op.end_byte] in [b'&&',b'||']
        if include:points.append({'line':n.start_point.row+1,'type':t,'code':source[n.start_byte:min(n.end_byte,n.start_byte+100)].decode().splitlines()[0]})
    return 1+len(points),points
records=[];errors=[]
for path in sorted(SRC.rglob('*.java')):
    data=path.read_bytes();root=parser.parse(data).root_node
    if root.has_error:errors.append(str(path.relative_to(SRC)))
    imports=[data[n.start_byte:n.end_byte].decode() for n in root.named_children if n.type=='import_declaration']
    imports={s.removeprefix('import ').removeprefix('static ').rstrip(';').strip() for s in imports if s.startswith('import lt.prifkodas.')}
    for node in root.named_children:
        if node.type not in ['class_declaration','interface_declaration','enum_declaration','record_declaration']:continue
        name=data[node.child_by_field_name('name').start_byte:node.child_by_field_name('name').end_byte].decode()
        body=node.child_by_field_name('body');supernode=node.child_by_field_name('superclass');supername=data[supernode.start_byte:supernode.end_byte].decode().removeprefix('extends ').strip() if supernode else None
        methods=[]
        for m in body.named_children if body else []:
            if m.type not in ['method_declaration','constructor_declaration']:continue
            mb=m.child_by_field_name('body')
            if mb is None:continue
            mn=m.child_by_field_name('name');cc,points=count(mb,data)
            methods.append({'name':data[mn.start_byte:mn.end_byte].decode(),'line':m.start_point.row+1,'endLine':m.end_point.row+1,'cc':cc,'decisionPoints':points})
        records.append({'class':name,'kind':node.type,'path':str(path.relative_to(SRC)),'line':node.start_point.row+1,'endLine':node.end_point.row+1,'loc':node.end_point.row-node.start_point.row+1,'declaredConcreteMethodsIncludingConstructors':len(methods),'wmc':sum(x['cc'] for x in methods),'cbo_import':len(imports),'projectImports':sorted(imports),'explicitSuperclass':supername,'methods':methods})
byname={x['class']:x for x in records}
def depth(r,seen=None):
    parent=r['explicitSuperclass']
    if not parent:return 0
    seen=(seen or set())|{r['class']}
    if parent in seen:raise ValueError('Inheritance cycle')
    return 1+(depth(byname[parent],seen) if parent in byname else 0)
for r in records:
    r['dit_explicit']=depth(r);r['noc_direct']=sum(x['explicitSuperclass']==r['class'] for x in records)
assert not errors,errors
# Runnable self-check covers ordinary branch and short-circuit counting.
fixture=b'class Probe { void f(boolean a, boolean b) { if (a && b) return; } }'
ft=parser.parse(fixture).root_node;method=next(n for n in descendants(ft) if n.type=='method_declaration')
assert count(method.child_by_field_name('body'),fixture)[0]==3
out=ROOT/'analysis/java-structure.json';out.write_text(json.dumps({'tool':f'tree-sitter-java {version("tree-sitter-java")} / tree-sitter {version("tree-sitter")} + explicit metric policy','scope':'main Java; top-level declarations; no generated Lombok methods or framework dispatch','ccPolicy':'Base 1 per concrete method/constructor; +1 per if, for, foreach, while, do, catch, ternary, non-default switch label, && or ||; nested lambdas/classes excluded from parent. Decision locations included.','cboPolicy':'distinct explicit imports from lt.prifkodas; proxy only, not resolved type-use CBO','ditPolicy':'explicit extends chain, external root adds one edge; implicit Object excluded','parseErrors':errors,'declarations':records},ensure_ascii=False,indent=2)+'\n')
print(json.dumps({'topLevelDeclarations':len(records),'parseErrors':errors,'selected':[ {k:x[k] for k in ['class','loc','declaredConcreteMethodsIncludingConstructors','wmc','cbo_import','dit_explicit','noc_direct']} for x in records if x['class'] in ['StatsService','LibraryService','RecommendationsService']], 'StatsMethods':[{k:m[k] for k in ['name','line','cc']} for x in records if x['class']=='StatsService' for m in x['methods']]},indent=2))
