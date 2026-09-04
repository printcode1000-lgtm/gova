#!/usr/bin/env python3
import base64, json, os, re, shlex, signal, sqlite3, subprocess, threading, time, uuid, urllib.request, urllib.error
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse, parse_qs

REPO = Path(os.environ.get('GOVA_AGENT_REPO', '/home/hesham/gova')).resolve()
WORKTREE_ROOT = Path(os.environ.get('GOVA_AGENT_WORKTREES', '/home/hesham/gova-agents')).resolve()
RUNTIME = Path(os.environ.get('GOVA_AGENT_RUNTIME', '/home/hesham/.local/share/gova-agent-runtime')).resolve()
AUTH_FILE = Path(os.environ.get('GOVA_AGENT_AUTH_FILE', '/home/hesham/.config/gova-agent/auth')).resolve()
BIND = os.environ.get('GOVA_AGENT_BIND', '0.0.0.0')
PORT = int(os.environ.get('GOVA_AGENT_PORT', '8765'))
DB_PATH = RUNTIME / 'runtime.sqlite3'
COMMAND_DIR = RUNTIME / 'commands'
LOCK_LEASE = int(os.environ.get('GOVA_AGENT_LOCK_LEASE_SECONDS', '180'))
MAX_BODY = 2_000_000
EXECUTION_MODES = {'A', 'B'}
MODE_A_BOOTSTRAP_WORKFLOW = 'local-agent-bootstrap.yml'
MODE_A_BOOTSTRAP_REF = 'main'

for p in (RUNTIME, COMMAND_DIR, WORKTREE_ROOT): p.mkdir(parents=True, exist_ok=True)

def now(): return datetime.now(timezone.utc).isoformat()
def sid(prefix): return f"{prefix}-{uuid.uuid4().hex[:12]}"
def safe(value):
    value = re.sub(r'[^A-Za-z0-9._-]+', '-', str(value)).strip('-')
    return value[:80] or 'x'
def run(args, cwd=REPO, check=True, env=None):
    cp = subprocess.run(args, cwd=str(cwd), text=True, capture_output=True, env=env)
    if check and cp.returncode:
        raise RuntimeError(f"command failed ({cp.returncode}): {' '.join(args)}\n{cp.stderr or cp.stdout}")
    return cp

def db():
    c = sqlite3.connect(DB_PATH, timeout=5, isolation_level=None)
    c.row_factory = sqlite3.Row
    c.execute('PRAGMA journal_mode=WAL')
    c.execute('PRAGMA synchronous=NORMAL')
    c.execute('PRAGMA busy_timeout=5000')
    return c

def init_db():
    c=db(); c.executescript('''
    CREATE TABLE IF NOT EXISTS agents(id TEXT PRIMARY KEY, session_id TEXT, task_id TEXT, worktree TEXT, branch TEXT, status TEXT, last_seen TEXT, latest_checkpoint TEXT, latest_commit TEXT, created_at TEXT, updated_at TEXT);
    CREATE TABLE IF NOT EXISTS sessions(id TEXT PRIMARY KEY, agent_id TEXT, status TEXT, started_at TEXT, last_seen TEXT, ended_at TEXT);
    CREATE TABLE IF NOT EXISTS tasks(id TEXT PRIMARY KEY, goal TEXT, execution_mode TEXT, originating_agent TEXT, current_agent TEXT, worktree TEXT, branch TEXT, status TEXT, completed TEXT, remaining TEXT, decisions TEXT, modified_files TEXT, commits TEXT, commands TEXT, tests TEXT, test_results TEXT, known_failures TEXT, blockers TEXT, dependencies TEXT, next_action TEXT, handoff TEXT, created_at TEXT, updated_at TEXT);
    CREATE TABLE IF NOT EXISTS mode_a_bootstraps(task_id TEXT PRIMARY KEY, agent_id TEXT NOT NULL, state TEXT NOT NULL, workflow TEXT NOT NULL, ref TEXT NOT NULL, requested_at TEXT NOT NULL, updated_at TEXT NOT NULL, error TEXT);
    CREATE TABLE IF NOT EXISTS commands(id TEXT PRIMARY KEY, agent_id TEXT, task_id TEXT, command TEXT, cwd TEXT, pid INTEGER, status TEXT, started_at TEXT, ended_at TEXT, exit_code INTEGER, out_path TEXT, err_path TEXT);
    CREATE TABLE IF NOT EXISTS locks(id TEXT PRIMARY KEY, kind TEXT, scope TEXT, agent_id TEXT, task_id TEXT, lease_until REAL, updated_at TEXT, UNIQUE(kind,scope));
    CREATE TABLE IF NOT EXISTS messages(id INTEGER PRIMARY KEY AUTOINCREMENT, sender TEXT, recipient TEXT, kind TEXT, body TEXT, created_at TEXT);
    CREATE TABLE IF NOT EXISTS handoffs(id INTEGER PRIMARY KEY AUTOINCREMENT, task_id TEXT, from_agent TEXT, to_agent TEXT, notes TEXT, created_at TEXT);
    CREATE TABLE IF NOT EXISTS events(id INTEGER PRIMARY KEY AUTOINCREMENT, type TEXT, agent_id TEXT, task_id TEXT, payload TEXT, created_at TEXT);
    ''')
    columns={row['name'] for row in c.execute('PRAGMA table_info(tasks)').fetchall()}
    if 'execution_mode' not in columns: c.execute('ALTER TABLE tasks ADD COLUMN execution_mode TEXT')
    c.close()
init_db()

def event(kind, agent=None, task=None, payload=None):
    c=db(); c.execute('INSERT INTO events(type,agent_id,task_id,payload,created_at) VALUES(?,?,?,?,?)',(kind,agent,task,json.dumps(payload or {},ensure_ascii=False),now())); c.close()

def checkpoint(task_id, **fields):
    if not task_id: return
    allowed={'status','completed','remaining','decisions','modified_files','commits','commands','tests','test_results','known_failures','blockers','dependencies','next_action','handoff','worktree','branch','current_agent'}
    parts=[]; vals=[]
    for k,v in fields.items():
        if k in allowed:
            parts.append(f'{k}=?'); vals.append(v if isinstance(v,str) else json.dumps(v,ensure_ascii=False))
    if not parts: return
    parts.append('updated_at=?'); vals.append(now()); vals.append(task_id)
    c=db(); c.execute(f"UPDATE tasks SET {','.join(parts)} WHERE id=?", vals); c.close()

def require_task_mode(task_id, expected='A'):
    if not task_id: raise RuntimeError('task_id with an explicit execution mode is required')
    c=db(); row=c.execute('SELECT execution_mode FROM tasks WHERE id=?',(task_id,)).fetchone(); c.close()
    if not row: raise RuntimeError('task not found')
    mode=row['execution_mode']
    if mode not in EXECUTION_MODES: raise RuntimeError('task has no valid execution mode')
    if expected and mode != expected: raise RuntimeError(f'Gateway mutation is unavailable for execution mode {mode}; select Mode A')
    return mode

def require_mode_a_bootstrap(task_id):
    require_task_mode(task_id)
    c=db(); row=c.execute('SELECT state FROM mode_a_bootstraps WHERE task_id=?',(task_id,)).fetchone(); c.close()
    if not row or row['state'] != 'dispatched': raise RuntimeError('Mode A requires exactly one successful GitHub bootstrap dispatch before managed work')

def auth_value():
    try: return AUTH_FILE.read_text().strip()
    except Exception: return ''

def auth_ok(headers):
    expected=auth_value()
    return bool(expected) and headers.get('X-Gova-Agent-Key','') == expected

def reconcile_command(row):
    if not row: return None
    d=dict(row)
    if d['status'] == 'running':
        exit_path=COMMAND_DIR/f"{d['id']}.exit"
        if exit_path.exists():
            try: code=int(exit_path.read_text().strip())
            except Exception: code=255
            c=db(); c.execute("UPDATE commands SET status='completed',ended_at=?,exit_code=? WHERE id=?",(now(),code,d['id'])); c.close()
            d['status']='completed'; d['exit_code']=code; d['ended_at']=now()
        else:
            try: os.kill(int(d['pid']),0)
            except Exception:
                c=db(); c.execute("UPDATE commands SET status='interrupted',ended_at=? WHERE id=?",(now(),d['id'])); c.close(); d['status']='interrupted'
    return d

def create_worktree(agent_id, task_id):
    require_mode_a_bootstrap(task_id)
    a=safe(agent_id); t=safe(task_id)
    path=WORKTREE_ROOT/a/t
    branch=f"agent/{a}/{t}"
    run(['git','fetch','--prune','origin','main','integration'], REPO)
    if path.exists() and (path/'.git').exists(): return str(path), branch
    path.parent.mkdir(parents=True, exist_ok=True)
    existing=run(['git','show-ref','--verify','--quiet',f'refs/heads/{branch}'],REPO,check=False).returncode==0
    if existing: run(['git','worktree','add',str(path),branch],REPO)
    else: run(['git','worktree','add','-b',branch,str(path),'origin/integration'],REPO)
    # Fast dependency reuse only while manifests match canonical main.
    canonical_nm=REPO/'node_modules'; target_nm=path/'node_modules'
    if canonical_nm.is_dir() and not target_nm.exists():
        try: target_nm.symlink_to(canonical_nm, target_is_directory=True)
        except Exception: pass
    c=db(); c.execute('UPDATE agents SET worktree=?,branch=?,task_id=?,updated_at=? WHERE id=?',(str(path),branch,task_id,now(),agent_id)); c.execute('UPDATE tasks SET worktree=?,branch=?,updated_at=? WHERE id=?',(str(path),branch,now(),task_id)); c.close()
    event('worktree-created',agent_id,task_id,{'path':str(path),'branch':branch})
    return str(path),branch

def remove_worktree(agent_id, task_id, force=False):
    c=db(); row=c.execute('SELECT worktree,branch,status FROM tasks WHERE id=?',(task_id,)).fetchone(); c.close()
    if not row: raise RuntimeError('task not found')
    path=row['worktree']; branch=row['branch']
    if path and Path(path).exists():
        st=run(['git','status','--porcelain'],Path(path),check=False).stdout.strip()
        if st and not force: raise RuntimeError('worktree has uncommitted changes')
        run(['git','worktree','remove','--force',str(path)],REPO,check=False) if force else run(['git','worktree','remove',str(path)],REPO)
    if branch: run(['git','branch','-D' if force else '-d',branch],REPO,check=False)
    checkpoint(task_id,worktree='',branch='')
    event('worktree-removed',agent_id,task_id,{})

def start_command(agent_id, task_id, command, cwd=None):
    require_mode_a_bootstrap(task_id)
    cid=sid('cmd')
    if cwd is None and task_id:
        c=db(); row=c.execute('SELECT worktree FROM tasks WHERE id=?',(task_id,)).fetchone(); c.close(); cwd=row['worktree'] if row and row['worktree'] else str(REPO)
    cwd=str(Path(cwd or REPO).resolve())
    out=COMMAND_DIR/f'{cid}.out'; err=COMMAND_DIR/f'{cid}.err'; exitf=COMMAND_DIR/f'{cid}.exit'
    wrapper='''/bin/bash -lc "$1"; rc=$?; printf "%s" "$rc" > "$2"; exit "$rc"'''
    of=open(out,'ab',buffering=0); ef=open(err,'ab',buffering=0)
    p=subprocess.Popen(['/bin/bash','-c',wrapper,'gova-agent',command,str(exitf)],cwd=cwd,stdout=of,stderr=ef,start_new_session=True,env={**os.environ,'GOVA_AGENT_ID':agent_id,'GOVA_AGENT_TASK_ID':task_id or ''})
    of.close(); ef.close()
    c=db(); c.execute('INSERT INTO commands(id,agent_id,task_id,command,cwd,pid,status,started_at,out_path,err_path) VALUES(?,?,?,?,?,?,\'running\',?,?,?)',(cid,agent_id,task_id,command,cwd,p.pid,now(),str(out),str(err))); c.execute('UPDATE agents SET status=\'executing\',last_seen=?,updated_at=? WHERE id=?',(now(),now(),agent_id)); c.close()
    event('command-started',agent_id,task_id,{'command_id':cid,'cwd':cwd})
    return cid,p.pid

def command_status(cid):
    c=db(); row=c.execute('SELECT * FROM commands WHERE id=?',(cid,)).fetchone(); c.close()
    return reconcile_command(row)

def command_logs(cid, tail=20000):
    d=command_status(cid)
    if not d: raise RuntimeError('command not found')
    def readp(p):
        try:
            b=Path(p).read_bytes(); return b[-tail:].decode(errors='replace')
        except Exception: return ''
    return {'command':d,'stdout':readp(d['out_path']),'stderr':readp(d['err_path'])}

def cancel_command(cid):
    d=command_status(cid)
    if not d: raise RuntimeError('command not found')
    if d['status']!='running': return d
    try: os.killpg(int(d['pid']),signal.SIGTERM)
    except ProcessLookupError: pass
    time.sleep(.15)
    try: os.killpg(int(d['pid']),signal.SIGKILL)
    except ProcessLookupError: pass
    c=db(); c.execute("UPDATE commands SET status='cancelled',ended_at=?,exit_code=143 WHERE id=?",(now(),cid)); c.close()
    event('command-cancelled',d['agent_id'],d['task_id'],{'command_id':cid})
    return command_status(cid)

def acquire_lock(agent_id, task_id, kind, scope, lease=None):
    require_mode_a_bootstrap(task_id)
    lease=float(lease or LOCK_LEASE); ts=time.time(); c=db(); c.execute('BEGIN IMMEDIATE')
    row=c.execute('SELECT * FROM locks WHERE kind=? AND scope=?',(kind,scope)).fetchone()
    if row and row['lease_until']>ts and row['agent_id']!=agent_id:
        c.rollback(); c.close(); raise RuntimeError(f"lock conflict: {kind}:{scope} held by {row['agent_id']}")
    lid=row['id'] if row else sid('lock')
    c.execute('INSERT INTO locks(id,kind,scope,agent_id,task_id,lease_until,updated_at) VALUES(?,?,?,?,?,?,?) ON CONFLICT(kind,scope) DO UPDATE SET id=excluded.id,agent_id=excluded.agent_id,task_id=excluded.task_id,lease_until=excluded.lease_until,updated_at=excluded.updated_at',(lid,kind,scope,agent_id,task_id,ts+lease,now())); c.commit(); c.close()
    event('lock-acquired',agent_id,task_id,{'kind':kind,'scope':scope,'lease':lease})
    return lid

def recover_locks():
    ts=time.time(); c=db(); rows=c.execute('SELECT id,agent_id,task_id,kind,scope FROM locks WHERE lease_until<=?',(ts,)).fetchall(); c.execute('DELETE FROM locks WHERE lease_until<=?',(ts,)); c.close()
    for r in rows: event('lock-recovered',r['agent_id'],r['task_id'],{'kind':r['kind'],'scope':r['scope']})
    return len(rows)


def _github_token():
    names=('GOVA_LOCAL_DISPATCH_TOKEN','GITHUB_ADMIN_TOKEN','GOVA_RUNNER_STATUS_TOKEN')
    for n in names:
        v=os.environ.get(n,'').strip()
        if v: return v
    for f in (REPO/'.env.local', REPO/'.env'):
        try: lines=f.read_text().splitlines()
        except Exception: continue
        for line in lines:
            for n in names:
                if line.startswith(n+'='):
                    v=line.split('=',1)[1].strip().strip('"\'')
                    if v: return v
    raise RuntimeError('local GitHub token not found')

def _github_api(method, path, body=None, allow=()):
    data=None if body is None else json.dumps(body).encode()
    req=urllib.request.Request(
        'https://api.github.com/repos/printcode1000-lgtm/gova'+path,
        data=data, method=method,
        headers={'Authorization':'Bearer '+_github_token(),
                 'Accept':'application/vnd.github+json',
                 'X-GitHub-Api-Version':'2022-11-28',
                 'User-Agent':'gova-persistent-agent-gateway',
                 'Content-Type':'application/json'})
    try:
        with urllib.request.urlopen(req,timeout=30) as r:
            raw=r.read()
            return r.status, (json.loads(raw) if raw else None)
    except urllib.error.HTTPError as e:
        raw=e.read().decode(errors='replace')
        if e.code in allow:
            try: obj=json.loads(raw) if raw else None
            except Exception: obj={'raw':raw}
            return e.code,obj
        raise RuntimeError(f'GitHub API {method} {path} failed: {e.code} {raw[:1000]}')

def dispatch_mode_a_bootstrap(agent_id, task_id, dry_run=False):
    require_task_mode(task_id)
    if dry_run:
        return {'task_id':task_id,'workflow':MODE_A_BOOTSTRAP_WORKFLOW,'ref':MODE_A_BOOTSTRAP_REF,'dry_run':True}
    ts=now(); c=db()
    try:
        c.execute('INSERT INTO mode_a_bootstraps(task_id,agent_id,state,workflow,ref,requested_at,updated_at) VALUES(?,?,?,?,?,?,?)',
                  (task_id,agent_id,'requesting',MODE_A_BOOTSTRAP_WORKFLOW,MODE_A_BOOTSTRAP_REF,ts,ts))
    except sqlite3.IntegrityError:
        row=c.execute('SELECT state,workflow,ref,requested_at,error FROM mode_a_bootstraps WHERE task_id=?',(task_id,)).fetchone()
        c.close()
        raise RuntimeError(f'Mode A bootstrap is one-time per task and is already {row["state"]}')
    c.close()
    try:
        _github_api('POST',f'/actions/workflows/{MODE_A_BOOTSTRAP_WORKFLOW}/dispatches',
                    {'ref':MODE_A_BOOTSTRAP_REF,'inputs':{'execution_mode':'A'}})
    except Exception as exc:
        c=db(); c.execute('UPDATE mode_a_bootstraps SET state=?,error=?,updated_at=? WHERE task_id=?',('failed',str(exc),now(),task_id)); c.close()
        event('mode-a-bootstrap-failed',agent_id,task_id,{'workflow':MODE_A_BOOTSTRAP_WORKFLOW})
        raise
    c=db(); c.execute('UPDATE mode_a_bootstraps SET state=?,updated_at=? WHERE task_id=?',('dispatched',now(),task_id)); c.close()
    event('mode-a-bootstrap-dispatched',agent_id,task_id,{'workflow':MODE_A_BOOTSTRAP_WORKFLOW,'ref':MODE_A_BOOTSTRAP_REF})
    return {'task_id':task_id,'workflow':MODE_A_BOOTSTRAP_WORKFLOW,'ref':MODE_A_BOOTSTRAP_REF,'dispatched':True}

def publish_worktree_branch_api(worktree, branch='integration'):
    worktree=Path(worktree)
    status, br=_github_api('GET',f'/branches/{branch}',allow=(404,))
    if status==404:
        _, main=_github_api('GET','/branches/main')
        _github_api('POST','/git/refs',{'ref':f'refs/heads/{branch}','sha':main['commit']['sha']})
        _, br=_github_api('GET',f'/branches/{branch}')
    parent=br['commit']['sha']
    run(['git','fetch','--quiet','origin',branch],worktree)
    _, commit_obj=_github_api('GET',f'/git/commits/{parent}')
    base_tree=commit_obj['tree']['sha']
    raw=subprocess.run(['git','diff','--name-only','-z',parent+'..HEAD'],cwd=str(worktree),capture_output=True,check=True).stdout
    paths=[x.decode('utf-8','surrogateescape') for x in raw.split(b'\0') if x]
    entries=[]
    for rel in paths:
        target=worktree/rel
        if target.exists() or target.is_symlink():
            line=run(['git','ls-tree','HEAD','--',rel],worktree).stdout.strip()
            if not line: continue
            left,_=line.split('\t',1); mode,typ,_local_sha=left.split()
            if typ=='blob':
                blob=subprocess.run(['git','show',f'HEAD:{rel}'],cwd=str(worktree),capture_output=True,check=True).stdout
                _, bo=_github_api('POST','/git/blobs',{'content':base64.b64encode(blob).decode(),'encoding':'base64'})
                entries.append({'path':rel,'mode':mode,'type':'blob','sha':bo['sha']})
            elif typ=='commit':
                entries.append({'path':rel,'mode':mode,'type':'commit','sha':_local_sha})
        else:
            line=run(['git','ls-tree',parent,'--',rel],worktree,check=False).stdout.strip()
            if line:
                left,_=line.split('\t',1); mode,typ,_=left.split()
                entries.append({'path':rel,'mode':mode,'type':typ,'sha':None})
    if not entries:
        return parent
    _, tree=_github_api('POST','/git/trees',{'base_tree':base_tree,'tree':entries})
    msg=run(['git','log','-1','--format=%B'],worktree).stdout.strip() or 'local-agent integration'
    _, newc=_github_api('POST','/git/commits',{'message':msg,'tree':tree['sha'],'parents':[parent]})
    _github_api('PATCH',f'/git/refs/heads/{branch}',{'sha':newc['sha'],'force':False})
    run(['git','fetch','--quiet','origin',branch],worktree)
    run(['git','reset','--hard',f'origin/{branch}'],worktree)
    return newc['sha']

def integration_submit(agent_id, task_id, commit_sha, verification=None):
    require_mode_a_bootstrap(task_id)
    acquire_lock(agent_id,task_id,'ref','integration',600)
    iw=WORKTREE_ROOT/'integration'
    try:
        run(['git','fetch','--prune','origin','main','integration'],REPO)
        if not iw.exists(): run(['git','worktree','add',str(iw),'integration'],REPO)
        if run(['git','status','--porcelain'],iw).stdout.strip(): raise RuntimeError('integration worktree is not clean')
        run(['git','checkout','integration'],iw); run(['git','reset','--hard','origin/integration'],iw)
        cp=run(['git','cherry-pick','--allow-empty',commit_sha],iw,check=False)
        if cp.returncode:
            run(['git','cherry-pick','--abort'],iw,check=False)
            run(['git','reset','--hard','origin/integration'],iw,check=False)
            checkpoint(task_id,status='conflict',next_action='rebase or recreate task commit from latest integration')
            event('integration-conflict',agent_id,task_id,{'stderr':cp.stderr[-2000:]})
            raise RuntimeError(cp.stderr or cp.stdout)
        for cmd in (verification or []):
            cp2=subprocess.run(['/bin/bash','-lc',cmd],cwd=str(iw),text=True,capture_output=True)
            if cp2.returncode:
                run(['git','reset','--hard','origin/integration'],iw,check=False)
                checkpoint(task_id,status='verification-failed',next_action='fix verification failure and resubmit from latest integration')
                raise RuntimeError(f'verification failed: {cmd}\n{cp2.stderr or cp2.stdout}')
        sha=publish_worktree_branch_api(iw,'integration')
        checkpoint(task_id,status='integrated',commits=[commit_sha,sha],next_action='')
        event('integration-pushed',agent_id,task_id,{'sha':sha})
        return sha
    finally:
        c=db(); c.execute("DELETE FROM locks WHERE kind='ref' AND scope='integration' AND agent_id=?",(agent_id,)); c.close()

def list_rows(sql,args=()):
    c=db(); rows=[dict(x) for x in c.execute(sql,args).fetchall()]; c.close(); return rows

class H(BaseHTTPRequestHandler):
    server_version='GovaAgentGateway/1.0'
    def log_message(self,fmt,*args): pass
    def sendj(self,code,obj):
        b=json.dumps(obj,ensure_ascii=False,default=str).encode(); self.send_response(code); self.send_header('Content-Type','application/json'); self.send_header('Content-Length',str(len(b))); self.end_headers(); self.wfile.write(b)
    def body(self):
        n=int(self.headers.get('Content-Length','0') or '0')
        if n>MAX_BODY: raise RuntimeError('body too large')
        return json.loads(self.rfile.read(n) or b'{}')
    def do_GET(self):
        p=urlparse(self.path); path=p.path; q=parse_qs(p.query)
        if path=='/health': return self.sendj(200,{'ok':True,'time':now(),'repo':str(REPO),'runtime':str(RUNTIME),'pid':os.getpid()})
        if not auth_ok(self.headers): return self.sendj(401,{'ok':False,'error':'unauthorized'})
        try:
            if path=='/v1/agents': return self.sendj(200,{'ok':True,'agents':list_rows('SELECT * FROM agents ORDER BY updated_at DESC')})
            if path=='/v1/tasks': return self.sendj(200,{'ok':True,'tasks':list_rows('SELECT * FROM tasks ORDER BY updated_at DESC')})
            if path.startswith('/v1/tasks/'):
                tid=path.rsplit('/',1)[-1]; rows=list_rows('SELECT * FROM tasks WHERE id=?',(tid,)); return self.sendj(200 if rows else 404,{'ok':bool(rows),'task':rows[0] if rows else None})
            if path=='/v1/commands': return self.sendj(200,{'ok':True,'commands':[reconcile_command(r) for r in [sqlite3.Row] if False] or [command_status(r['id']) for r in list_rows('SELECT id FROM commands ORDER BY started_at DESC LIMIT 100')]})
            if path.startswith('/v1/commands/') and path.endswith('/logs'):
                cid=path.split('/')[-2]; return self.sendj(200,{'ok':True,**command_logs(cid,int(q.get('tail',['20000'])[0]) )})
            if path.startswith('/v1/commands/'):
                cid=path.rsplit('/',1)[-1]; d=command_status(cid); return self.sendj(200 if d else 404,{'ok':bool(d),'command':d})
            if path=='/v1/locks': return self.sendj(200,{'ok':True,'locks':list_rows('SELECT * FROM locks ORDER BY updated_at DESC')})
            if path=='/v1/messages':
                recipient=q.get('recipient',[None])[0]; rows=list_rows('SELECT * FROM messages WHERE recipient IN (?,\'all\') ORDER BY id DESC LIMIT 200',(recipient,)) if recipient else list_rows('SELECT * FROM messages ORDER BY id DESC LIMIT 200'); return self.sendj(200,{'ok':True,'messages':rows})
            if path=='/v1/diagnostics':
                return self.sendj(200,{'ok':True,'repo_status':run(['git','status','--porcelain=v1','-b'],REPO,check=False).stdout,'worktrees':run(['git','worktree','list','--porcelain'],REPO,check=False).stdout,'agents':len(list_rows('SELECT id FROM agents')),'tasks':len(list_rows('SELECT id FROM tasks')),'locks':len(list_rows('SELECT id FROM locks'))})
            return self.sendj(404,{'ok':False,'error':'not found'})
        except Exception as e: return self.sendj(500,{'ok':False,'error':str(e)})
    def do_POST(self):
        if not auth_ok(self.headers): return self.sendj(401,{'ok':False,'error':'unauthorized'})
        try: data=self.body(); path=urlparse(self.path).path
        except Exception as e: return self.sendj(400,{'ok':False,'error':str(e)})
        try:
            if path=='/v1/agent/register':
                aid=safe(data['agent_id']); sess=data.get('session_id') or sid('session'); ts=now(); c=db(); c.execute('INSERT INTO agents(id,session_id,status,last_seen,created_at,updated_at) VALUES(?,?,\'idle\',?,?,?) ON CONFLICT(id) DO UPDATE SET session_id=excluded.session_id,status=\'idle\',last_seen=excluded.last_seen,updated_at=excluded.updated_at',(aid,sess,ts,ts,ts)); c.execute('INSERT OR REPLACE INTO sessions(id,agent_id,status,started_at,last_seen) VALUES(?,?,\'active\',?,?)',(sess,aid,ts,ts)); c.close(); event('agent-registered',aid,None,{'session_id':sess}); return self.sendj(200,{'ok':True,'agent_id':aid,'session_id':sess})
            if path=='/v1/task/create':
                aid=safe(data['agent_id']); tid=safe(data.get('task_id') or sid('task')); goal=str(data['goal']); mode=str(data.get('execution_mode','')).upper();
                if mode not in EXECUTION_MODES: raise RuntimeError('execution_mode must be A or B')
                ts=now(); c=db(); c.execute('INSERT INTO tasks(id,goal,execution_mode,originating_agent,current_agent,status,created_at,updated_at) VALUES(?,?,?,?,?,\'active\',?,?)',(tid,goal,mode,aid,aid,ts,ts)); c.execute('UPDATE agents SET task_id=?,updated_at=? WHERE id=?',(tid,ts,aid)); c.close(); event('task-created',aid,tid,{'goal':goal,'execution_mode':mode}); return self.sendj(200,{'ok':True,'task_id':tid,'execution_mode':mode})
            if path=='/v1/task/checkpoint': checkpoint(data['task_id'],**data.get('fields',{})); event('checkpoint',data.get('agent_id'),data['task_id'],data.get('fields',{})); return self.sendj(200,{'ok':True})
            if path=='/v1/task/handoff':
                tid=data['task_id']; to=safe(data['to_agent']); frm=safe(data['from_agent']); notes=str(data.get('notes','')); c=db(); c.execute('INSERT INTO handoffs(task_id,from_agent,to_agent,notes,created_at) VALUES(?,?,?,?,?)',(tid,frm,to,notes,now())); c.execute('UPDATE tasks SET current_agent=?,handoff=?,updated_at=? WHERE id=?',(to,notes,now(),tid)); c.execute('UPDATE agents SET task_id=?,updated_at=? WHERE id=?',(tid,now(),to)); c.close(); event('handoff',frm,tid,{'to':to,'notes':notes}); return self.sendj(200,{'ok':True})
            if path=='/v1/task/complete': checkpoint(data['task_id'],status='completed',completed=data.get('completed',''),remaining=''); event('task-completed',data.get('agent_id'),data['task_id'],{}); return self.sendj(200,{'ok':True})
            if path=='/v1/workspace/create':
                p,b=create_worktree(data['agent_id'],data['task_id']); return self.sendj(200,{'ok':True,'worktree':p,'branch':b})
            if path=='/v1/workspace/remove': remove_worktree(data['agent_id'],data['task_id'],bool(data.get('force',False))); return self.sendj(200,{'ok':True})
            if path=='/v1/mode-a/bootstrap':
                result=dispatch_mode_a_bootstrap(safe(data['agent_id']),data['task_id'],bool(data.get('dry_run',False))); return self.sendj(200,{'ok':True,**result})
            if path=='/v1/exec/start':
                cid,pid=start_command(safe(data['agent_id']),data.get('task_id'),str(data['command']),data.get('cwd')); return self.sendj(200,{'ok':True,'command_id':cid,'pid':pid})
            if path=='/v1/exec/cancel': return self.sendj(200,{'ok':True,'command':cancel_command(data['command_id'])})
            if path=='/v1/lock/acquire': return self.sendj(200,{'ok':True,'lock_id':acquire_lock(safe(data['agent_id']),data.get('task_id'),data.get('kind','path'),str(data['scope']),data.get('lease_seconds'))})
            if path=='/v1/lock/release':
                c=db(); c.execute('DELETE FROM locks WHERE agent_id=? AND kind=? AND scope=?',(safe(data['agent_id']),data.get('kind','path'),str(data['scope']))); c.close(); return self.sendj(200,{'ok':True})
            if path=='/v1/lock/release-all':
                c=db(); cur=c.execute('DELETE FROM locks WHERE agent_id=?',(safe(data['agent_id']),)); n=cur.rowcount; c.close(); return self.sendj(200,{'ok':True,'released':n})
            if path=='/v1/lock/recover': return self.sendj(200,{'ok':True,'recovered':recover_locks()})
            if path=='/v1/message/send':
                sender=safe(data['sender']); recipient=safe(data.get('recipient','all')) if data.get('recipient','all')!='all' else 'all'; kind=str(data.get('kind','note')); body=str(data['body']); c=db(); cur=c.execute('INSERT INTO messages(sender,recipient,kind,body,created_at) VALUES(?,?,?,?,?)',(sender,recipient,kind,body,now())); mid=cur.lastrowid; c.close(); event('message',sender,data.get('task_id'),{'to':recipient,'kind':kind}); return self.sendj(200,{'ok':True,'message_id':mid})
            if path=='/v1/integration/submit':
                sha=integration_submit(safe(data['agent_id']),data['task_id'],data['commit_sha'],data.get('verification') or []); return self.sendj(200,{'ok':True,'integration_sha':sha})
            return self.sendj(404,{'ok':False,'error':'not found'})
        except Exception as e: return self.sendj(409 if 'conflict' in str(e).lower() else 500,{'ok':False,'error':str(e)})

if __name__=='__main__':
    recover_locks()
    srv=ThreadingHTTPServer((BIND,PORT),H)
    print(json.dumps({'event':'gateway-start','bind':BIND,'port':PORT,'runtime':str(RUNTIME),'pid':os.getpid()}),flush=True)
    srv.serve_forever(poll_interval=.2)
