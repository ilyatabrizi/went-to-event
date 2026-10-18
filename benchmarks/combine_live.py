import json
from pathlib import Path
root=Path(__file__).resolve().parent
paths=sorted(root.glob('live-*/results.json'),key=lambda p:p.stat().st_mtime)
runs=[json.loads(p.read_text()) for p in paths]
out={'generatedAt':runs[-1]['generatedAt'],'preflight':next(r['preflight'] for r in runs if r['preflight'].get('eventIdHashesMatch')),'runner':runs[-1]['runner'],'stoppedReason':'; '.join(r['stoppedReason'] for r in runs if r.get('stoppedReason')),'runs':[],'stages':[],'samples':[]}
for p,run in zip(paths,runs):
 mapping={s['id']:i+len(out['stages'])+1 for i,s in enumerate(run['stages'])}
 out['runs'].append({'source':str(p.relative_to(root.parent)),'controlled':run.get('controlled',False),'stoppedReason':run.get('stoppedReason')})
 out['stages'].extend({**s,'id':mapping[s['id']]} for s in run['stages'])
 out['samples'].extend({**s,'stage':mapping[s['stage']]} for s in run['samples'])
dest=paths[0].parent/'combined-results.json';dest.write_text(json.dumps(out));print(dest)
