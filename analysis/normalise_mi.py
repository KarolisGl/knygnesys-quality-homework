"""Compute explicitly scoped, normalised MI from saved escomplex inputs.
Does not label the size-biased whole-corpus sum as an official system MI.
"""
from pathlib import Path
import argparse, json, math, statistics
p=argparse.ArgumentParser();p.add_argument('input',type=Path);p.add_argument('output',type=Path)
a=p.parse_args();source=json.loads(a.input.read_text())
def mi(v,g,l):
    if v<=0 or l<=0:return None
    return max(0,(171-5.2*math.log(v)-.23*g-16.2*math.log(l))*100/171)
files=[]
for f in source['files']:
    x=f['aggregate']
    files.append({'sourceFile':f['sourceFile'],'halsteadVolume':x['halsteadVolume'],'cyclomaticEmittedJS':x['cyclomatic'],'logicalLocEmittedJS':x['logicalLoc'],'miNormalised':mi(x['halsteadVolume'],x['cyclomatic'],x['logicalLoc'])})
valid=[f['miNormalised'] for f in files if f['miNormalised'] is not None]
methods=[]
for m in source['topMethodsByCyclomatic']:
    if m['name'] in ['loadEpub','applyFilters','resolveStatus','onKeydown','syncProgress']:
        methods.append({**m,'miNormalised':mi(m['halsteadVolume'],m['cyclomatic'],m['logicalLoc'])})
result={'input':a.input.name,'formula':'max(0,(171-5.2*ln(V)-0.23*G-16.2*ln(L))*100/171)','scale':'0..100','scope':source['scope'],'summary':'Median of measured per-file emitted-JavaScript indices; frontend proxy, not whole-system or Visual Studio engine result','medianFileMINormalised':statistics.median(valid),'files':files,'selectedMethods':methods,'rejectedWholeCorpus':{'summedInputs':source['totals'],'reason':'Applying one-file formula to the whole codebase sum is size-biased and not a defensible whole-system quality verdict.'}}
a.output.parent.mkdir(parents=True,exist_ok=True);a.output.write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
assert len(files)==source['scope']['productionTsFiles']
for f in source['files']:
    manual=f['maintainabilityManual']
    if manual is not None:assert math.isclose(manual*100/171,next(x['miNormalised'] for x in files if x['sourceFile']==f['sourceFile']),abs_tol=1e-9)
print(json.dumps({'files':len(files),'medianFileMINormalised':result['medianFileMINormalised'],'selectedMethods':len(methods)},indent=2))
