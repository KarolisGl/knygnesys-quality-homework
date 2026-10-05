#!/usr/bin/env python3
"""Export publicly readable project evidence from a local homework SonarQube."""
import argparse, json, urllib.parse, urllib.request
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('--url',default='http://127.0.0.1:19000');p.add_argument('--project',default='knygnesys-homework');a=p.parse_args()
out=Path(__file__).resolve().parent/'sonarqube';out.mkdir(exist_ok=True)
def get(path,params=None):
    u=a.url.rstrip('/')+path+('?' + urllib.parse.urlencode(params) if params else '')
    with urllib.request.urlopen(u,timeout=30) as r:return json.load(r)
def save(name,d):(out/name).write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n')
inventory=get('/api/metrics/search',{'ps':500});save('metric-definitions.json',inventory)
known={m['key'] for m in inventory['metrics']}
wanted=['ncloc','files','classes','functions','complexity','cognitive_complexity','duplicated_lines_density','coverage','tests','test_failures','test_errors','software_quality_maintainability_rating','software_quality_maintainability_remediation_effort','software_quality_maintainability_debt_ratio','software_quality_maintainability_issues','software_quality_reliability_rating','software_quality_reliability_issues','software_quality_security_rating','software_quality_security_issues','sqale_rating','sqale_index','sqale_debt_ratio','alert_status']
keys=','.join(x for x in wanted if x in known)
measures=get('/api/measures/component',{'component':a.project,'metricKeys':keys});save('project-measures.json',measures)
save('file-measures.json',get('/api/measures/component_tree',{'component':a.project,'metricKeys':keys,'qualifiers':'FIL','ps':500}))
save('quality-gate.json',get('/api/qualitygates/project_status',{'projectKey':a.project}))
save('quality-profiles.json',get('/api/qualityprofiles/search',{'project':a.project}))
save('server-status.json',get('/api/system/status'))
page=1
while True:
    issues=get('/api/issues/search',{'components':a.project,'ps':500,'p':page,'additionalFields':'_all'});save(f'issues-page-{page}.json',issues)
    if page*500>=issues['paging']['total']:break
    page+=1
print(json.dumps({'project':a.project,'server_version':get('/api/system/status')['version'],'issue_count':issues['paging']['total'],'pages_exported':page,'output':str(out)},indent=2))
