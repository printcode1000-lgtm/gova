#!/usr/bin/env python3
"""Self-contained disaster-recovery bundle for the persistent Gova agent runtime."""
from __future__ import annotations
import argparse, hashlib, json, os, shutil, socket, sqlite3, subprocess, tarfile, tempfile
from datetime import datetime, timezone
from pathlib import Path

REPO=Path(os.environ.get('GOVA_AGENT_REPO','/home/hesham/gova')).resolve()
RUNTIME=Path(os.environ.get('GOVA_AGENT_RUNTIME','/home/hesham/.local/share/gova-agent-runtime')).resolve()
DB=RUNTIME/'runtime.sqlite3'
ROOT='gova-agent-recovery'; VERSION=1
REQUIRED=(
 '.github/workflows/local-agent-bootstrap.yml','tools/local-agent/gateway.py','tools/local-agent/cli.py',
 'tools/local-agent/monitor.py','tools/local-agent/recovery.py','tools/local-agent/git_credential.py',
 'tools/local-agent/install.sh','tools/local-agent/gova-agent-gateway.service','tools/local-agent/selftest.py',
 'tools/local-agent/codex_test.py','docs/06-super-admin-and-operations/local-agent-runtime.md',
 'docs/06-super-admin-and-operations/local-agent-recovery.md')
SECRET_PARTS={'node_modules','.git','.codex','.ssh','.gnupg','_work','_diag'}
SECRET_NAMES={'auth','.credentials','.runner','.env','.env.local','.env.production','.env.development','.env.test'}
SECRET_WORDS=('secret','token','credential','password','private-key','private_key')

def run(args,cwd=REPO,check=True,binary=False):
 c=subprocess.run(args,cwd=str(cwd),capture_output=True,text=not binary)
 if check and c.returncode:
  err=c.stderr.decode(errors='replace') if binary else c.stderr
  out=c.stdout.decode(errors='replace') if binary else c.stdout
  raise RuntimeError(f"command failed ({c.returncode}): {' '.join(map(str,args))}\n{err or out}")
 return c

def now(): return datetime.now(timezone.utc).isoformat()
def sha(path):
 h=hashlib.sha256()
 with path.open('rb') as f:
  for b in iter(lambda:f.read(1024*1024),b''): h.update(b)
 return h.hexdigest()
def ref(name):
 c=run(['git','rev-parse','--verify',name],check=False); return c.stdout.strip() if c.returncode==0 else ''
def safe_name(s): return ''.join(ch if ch.isalnum() or ch in '._-' else '_' for ch in s)[:120]
def safe_untracked(rel):
 p=Path(rel); low=[x.lower() for x in p.parts]; n=p.name.lower()
 if any(x in SECRET_PARTS for x in low): return False
 if n in SECRET_NAMES or n.startswith('.env.'): return False
 return not any(w in n for w in SECRET_WORDS)

def worktrees():
 out=[]; txt=run(['git','worktree','list','--porcelain']).stdout
 for block in txt.strip().split('\n\n'):
  if not block.strip(): continue
  d={'path':'','head':'','branch':None,'detached':False}
  for line in block.splitlines():
   if line.startswith('worktree '): d['path']=line[9:]
   elif line.startswith('HEAD '): d['head']=line[5:]
   elif line.startswith('branch '): d['branch']=line[7:].removeprefix('refs/heads/')
   elif line=='detached': d['detached']=True
  if d['path']: out.append(d)
 return out

def sqlite_snapshot(dst):
 dst.parent.mkdir(parents=True,exist_ok=True)
 a=sqlite3.connect(f'file:{DB}?mode=ro',uri=True,timeout=10); b=sqlite3.connect(dst)
 try:
  a.backup(b); row=b.execute('PRAGMA integrity_check').fetchone()
  if not row or row[0]!='ok': raise RuntimeError(f'SQLite integrity check failed: {row}')
 finally: b.close(); a.close()

def capture_wt(stage,i,w):
 p=Path(w['path']).resolve(); d=stage/'worktrees'/f'{i:03d}'; d.mkdir(parents=True)
 status=run(['git','status','--porcelain=v1','--untracked-files=all'],cwd=p,check=False).stdout
 (d/'status.txt').write_text(status)
 (d/'staged.patch').write_bytes(run(['git','diff','--binary','--cached','HEAD'],cwd=p,check=False,binary=True).stdout)
 (d/'working.patch').write_bytes(run(['git','diff','--binary'],cwd=p,check=False,binary=True).stdout)
 raw=run(['git','ls-files','--others','--exclude-standard','-z'],cwd=p,check=False,binary=True).stdout
 kept=[]; excluded=[]
 for b in raw.split(b'\0'):
  if not b: continue
  rel=b.decode('utf-8','surrogateescape')
  if not safe_untracked(rel): excluded.append(rel); continue
  src=p/rel
  if src.is_file() and not src.is_symlink():
   dst=d/'untracked'/rel; dst.parent.mkdir(parents=True,exist_ok=True); shutil.copy2(src,dst); kept.append(rel)
 return {**w,'canonical':p==REPO,'capture':f'worktrees/{i:03d}','dirty':bool(status.strip()),'untracked':kept,'excluded_untracked':excluded}

def required_inventory(integration_ref):
 out=[]; missing=[]
 for path in REQUIRED:
  c=run(['git','rev-parse',f'{integration_ref}:{path}'],check=False)
  (out if c.returncode==0 else missing).append({'path':path,'blob':c.stdout.strip()} if c.returncode==0 else path)
 if missing: raise RuntimeError('required runtime source missing: '+', '.join(missing))
 return out

def checksums(root):
 return {p.relative_to(root).as_posix():sha(p) for p in sorted(root.rglob('*')) if p.is_file() and p.name!='checksums.json'}

def create(output,include_logs=False):
 output=Path(output).expanduser().resolve(); output.parent.mkdir(parents=True,exist_ok=True)
 ir='integration' if ref('integration') else 'origin/integration'; isha=ref(ir); msha=ref('origin/main') or ref('main')
 if not isha: raise RuntimeError('integration ref unavailable')
 inv=required_inventory(ir)
 with tempfile.TemporaryDirectory(prefix='gova-recovery-') as td:
  stage=Path(td)/ROOT; stage.mkdir()
  bundle=stage/'repository.bundle'; run(['git','bundle','create',str(bundle),'--all'])
  if isha not in run(['git','bundle','list-heads',str(bundle)]).stdout: raise RuntimeError('integration commit absent from Git bundle')
  dbrel=None
  if DB.exists(): dbrel='runtime/runtime.sqlite3'; sqlite_snapshot(stage/dbrel)
  captured=[capture_wt(stage,i,w) for i,w in enumerate(worktrees(),1)]
  logs=0
  if include_logs and (RUNTIME/'commands').is_dir():
   dst=stage/'runtime'/'commands'; dst.mkdir(parents=True,exist_ok=True)
   for p in (RUNTIME/'commands').iterdir():
    if p.is_file() and p.stat().st_size<=25*1024*1024: shutil.copy2(p,dst/p.name); logs+=1
  remote=run(['git','remote','get-url','origin'],check=False).stdout.strip()
  manifest={'format_version':VERSION,'created_at':now(),'hostname':socket.gethostname(),'repo':str(REPO),
   'integration_sha':isha,'main_sha':msha,'remote_origin':remote,'required_source':inv,'runtime_db':dbrel,
   'worktrees':captured,'command_logs_included':include_logs,'command_log_files':logs,
   'excluded_by_design':['gateway auth key','GitHub/API tokens','.env files','Codex credentials','runner credentials','node_modules'],
   'reinstall_source':'tools/local-agent/install.sh'}
  (stage/'manifest.json').write_text(json.dumps(manifest,indent=2,ensure_ascii=False)+'\n')
  (stage/'checksums.json').write_text(json.dumps(checksums(stage),indent=2,sort_keys=True)+'\n')
  tmp=output.with_suffix(output.suffix+'.tmp')
  with tarfile.open(tmp,'w:gz') as t: t.add(stage,arcname=ROOT)
  os.chmod(tmp,0o600); os.replace(tmp,output)
 return {'ok':True,'archive':str(output),'sha256':sha(output),'integration_sha':isha,'main_sha':msha,
  'worktrees':len(captured),'runtime_db':bool(dbrel),'secrets_included':False,'command_logs_included':include_logs}

def extract(archive,target):
 with tarfile.open(archive,'r:gz') as t:
  base=target.resolve()
  for m in t.getmembers():
   p=(base/m.name).resolve()
   if p!=base and base not in p.parents: raise RuntimeError(f'unsafe archive member: {m.name}')
  t.extractall(base)
 root=target/ROOT
 if not root.is_dir(): raise RuntimeError('archive root missing')
 return root

def verify_root(root):
 man=json.loads((root/'manifest.json').read_text()); sums=json.loads((root/'checksums.json').read_text())
 if man.get('format_version')!=VERSION: raise RuntimeError('unsupported recovery format')
 for rel,want in sums.items():
  p=root/rel
  if not p.is_file() or sha(p)!=want: raise RuntimeError(f'checksum mismatch: {rel}')
 heads=run(['git','bundle','list-heads',str(root/'repository.bundle')],cwd=root).stdout
 if man['integration_sha'] not in heads: raise RuntimeError('integration SHA absent from bundle')
 if man.get('runtime_db'):
  c=sqlite3.connect(f"file:{root/man['runtime_db']}?mode=ro",uri=True)
  try:
   if c.execute('PRAGMA integrity_check').fetchone()[0]!='ok': raise RuntimeError('runtime DB integrity failure')
   tables={x[0] for x in c.execute("SELECT name FROM sqlite_master WHERE type='table'")}
   need={'agents','tasks','commands','locks','messages','handoffs','events'}
   if need-tables: raise RuntimeError('runtime DB missing tables: '+','.join(sorted(need-tables)))
  finally:c.close()
 return {'ok':True,'integration_sha':man['integration_sha'],'main_sha':man.get('main_sha'),'worktrees':len(man['worktrees']),
  'runtime_db':bool(man.get('runtime_db')),'required_source_files':len(man['required_source']),'secrets_included':False}

def verify(archive):
 archive=Path(archive).expanduser().resolve()
 with tempfile.TemporaryDirectory(prefix='gova-recovery-verify-') as td: result=verify_root(extract(archive,Path(td)))
 return {'archive':str(archive),'sha256':sha(archive),**result}

def apply_capture(root,meta,target):
 cap=root/meta['capture']; staged=cap/'staged.patch'; working=cap/'working.patch'
 if staged.stat().st_size: run(['git','apply','--index',str(staged)],cwd=target)
 if working.stat().st_size: run(['git','apply',str(working)],cwd=target)
 for rel in meta.get('untracked',[]):
  src=cap/'untracked'/rel; dst=target/rel; dst.parent.mkdir(parents=True,exist_ok=True); shutil.copy2(src,dst)

def restore(archive,target_root):
 archive=Path(archive).expanduser().resolve(); target_root=Path(target_root).expanduser().resolve()
 if target_root.exists() and any(target_root.iterdir()): raise RuntimeError(f'restore target must be empty: {target_root}')
 target_root.mkdir(parents=True,exist_ok=True)
 with tempfile.TemporaryDirectory(prefix='gova-recovery-restore-') as td:
  root=extract(archive,Path(td)); v=verify_root(root); man=json.loads((root/'manifest.json').read_text())
  repo=target_root/'repo'; run(['git','clone',str(root/'repository.bundle'),str(repo)],cwd=target_root)
  run(['git','checkout','-B','integration',man['integration_sha']],cwd=repo)
  runtime=target_root/'runtime'; runtime.mkdir()
  if man.get('runtime_db'): shutil.copy2(root/man['runtime_db'],runtime/'runtime.sqlite3')
  restored=[]
  for i,w in enumerate(man['worktrees'],1):
   if w.get('canonical'):
    if w['head']==man['integration_sha']: apply_capture(root,w,repo)
    restored.append({'original':w['path'],'restored':str(repo),'canonical':True}); continue
   label=f"{i:03d}-{safe_name(w.get('branch') or 'detached-'+w['head'][:12])}"; dst=target_root/'worktrees'/label; dst.parent.mkdir(parents=True,exist_ok=True)
   branch=w.get('branch')
   exists=run(['git','rev-parse','--verify',f'refs/heads/{branch}'],cwd=repo,check=False).returncode==0 if branch else False
   if branch and branch!='integration' and exists: run(['git','worktree','add',str(dst),branch],cwd=repo)
   else: run(['git','worktree','add','--detach',str(dst),w['head']],cwd=repo)
   apply_capture(root,w,dst); restored.append({'original':w['path'],'restored':str(dst),'branch':branch})
  shutil.copy2(root/'manifest.json',target_root/'manifest.json')
  (target_root/'RECOVERY.json').write_text(json.dumps({'restored_at':now(),'integration_sha':man['integration_sha'],'repo':str(repo),'runtime':str(runtime),
   'worktrees':restored,'live_system_modified':False,'secrets_restored':False,
   'next_steps':['Review excluded_untracked in manifest.json','Stop the live gateway before replacing its runtime DB','Run tools/local-agent/install.sh from the recovered integration checkout','Generate a new gateway auth key; credentials are intentionally excluded']},indent=2)+'\n')
 return {'ok':True,'target_root':str(target_root),'repo':str(repo),'runtime_db':str(runtime/'runtime.sqlite3') if (runtime/'runtime.sqlite3').exists() else None,
  'integration_sha':v['integration_sha'],'worktrees':len(restored),'live_system_modified':False,'secrets_restored':False}

def main():
 p=argparse.ArgumentParser(prog='gova-agent-recovery'); s=p.add_subparsers(dest='cmd',required=True)
 a=s.add_parser('create'); a.add_argument('archive'); a.add_argument('--include-logs',action='store_true')
 a=s.add_parser('verify'); a.add_argument('archive')
 a=s.add_parser('restore'); a.add_argument('archive'); a.add_argument('target_root')
 x=p.parse_args()
 try:
  result=create(x.archive,x.include_logs) if x.cmd=='create' else verify(x.archive) if x.cmd=='verify' else restore(x.archive,x.target_root)
  print(json.dumps(result,indent=2,ensure_ascii=False))
 except Exception as e:
  print(json.dumps({'ok':False,'error':str(e)},indent=2,ensure_ascii=False)); raise SystemExit(2)
if __name__=='__main__': main()
