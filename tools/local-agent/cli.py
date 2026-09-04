#!/usr/bin/env python3
import argparse, json, os, subprocess, sys, urllib.error, urllib.parse, urllib.request
from pathlib import Path
BASE=os.environ.get('GOVA_AGENT_URL','http://127.0.0.1:8765').rstrip('/')
AUTH=Path(os.environ.get('GOVA_AGENT_AUTH_FILE','/home/hesham/.config/gova-agent/auth'))

def key():
    try:return AUTH.read_text().strip()
    except Exception:return ''
def call(method,path,data=None):
    raw=None if data is None else json.dumps(data).encode()
    h={'Accept':'application/json'}
    if path!='/health': h['X-Gova-Agent-Key']=key()
    if raw is not None:h['Content-Type']='application/json'
    req=urllib.request.Request(BASE+path,data=raw,headers=h,method=method)
    try:
        with urllib.request.urlopen(req,timeout=30) as r: out=json.loads(r.read() or b'{}')
    except urllib.error.HTTPError as e:
        out=json.loads(e.read() or b'{}'); print(json.dumps(out,indent=2,ensure_ascii=False)); sys.exit(2)
    print(json.dumps(out,indent=2,ensure_ascii=False)); return out

def main():
    p=argparse.ArgumentParser(prog='gova-agent'); sp=p.add_subparsers(dest='cmd',required=True)
    sp.add_parser('health'); sp.add_parser('agents'); sp.add_parser('tasks'); sp.add_parser('locks'); sp.add_parser('diagnostics')
    a=sp.add_parser('register'); a.add_argument('agent_id'); a.add_argument('--session-id')
    a=sp.add_parser('task-create'); a.add_argument('agent_id'); a.add_argument('goal'); a.add_argument('--task-id'); a.add_argument('--mode',required=True,choices=('A','B')); a.add_argument('--cloud-bridge',action='store_true',help='Use managed transport for a cloud Mode-B task, then project its integration commit into the canonical checkout')
    a=sp.add_parser('mode-a-bootstrap'); a.add_argument('agent_id'); a.add_argument('task_id'); a.add_argument('--dry-run',action='store_true')
    a=sp.add_parser('task-status'); a.add_argument('task_id')
    a=sp.add_parser('task-handoff'); a.add_argument('task_id'); a.add_argument('from_agent'); a.add_argument('to_agent'); a.add_argument('--notes',default='')
    a=sp.add_parser('task-complete'); a.add_argument('task_id'); a.add_argument('agent_id'); a.add_argument('--completed',default='')
    a=sp.add_parser('checkpoint'); a.add_argument('task_id'); a.add_argument('agent_id'); a.add_argument('fields_json')
    a=sp.add_parser('workspace-create'); a.add_argument('agent_id'); a.add_argument('task_id')
    a=sp.add_parser('workspace-remove'); a.add_argument('agent_id'); a.add_argument('task_id'); a.add_argument('--force',action='store_true')
    a=sp.add_parser('exec'); a.add_argument('agent_id'); a.add_argument('command'); a.add_argument('--task-id'); a.add_argument('--cwd')
    a=sp.add_parser('exec-status'); a.add_argument('command_id')
    a=sp.add_parser('exec-logs'); a.add_argument('command_id'); a.add_argument('--tail',type=int,default=20000)
    a=sp.add_parser('exec-cancel'); a.add_argument('command_id')
    a=sp.add_parser('lock-acquire'); a.add_argument('agent_id'); a.add_argument('scope'); a.add_argument('--task-id'); a.add_argument('--kind',default='path'); a.add_argument('--lease',type=int)
    a=sp.add_parser('lock-release'); a.add_argument('agent_id'); a.add_argument('scope'); a.add_argument('--kind',default='path')
    sp.add_parser('lock-recover')
    a=sp.add_parser('message-send'); a.add_argument('sender'); a.add_argument('recipient'); a.add_argument('body'); a.add_argument('--kind',default='note')
    a=sp.add_parser('messages'); a.add_argument('--recipient')
    a=sp.add_parser('integration-submit'); a.add_argument('agent_id'); a.add_argument('task_id'); a.add_argument('commit_sha'); a.add_argument('--verify',action='append',default=[])
    recovery=sp.add_parser('recovery'); rsp=recovery.add_subparsers(dest='recovery_cmd',required=True)
    a=rsp.add_parser('create'); a.add_argument('archive'); a.add_argument('--include-logs',action='store_true')
    a=rsp.add_parser('verify'); a.add_argument('archive')
    a=rsp.add_parser('restore'); a.add_argument('archive'); a.add_argument('target_root')
    x=p.parse_args()
    if x.cmd=='recovery':
        script=Path(__file__).resolve().with_name('recovery.py')
        argv=[sys.executable,str(script),x.recovery_cmd]
        if x.recovery_cmd=='create':
            argv.append(x.archive)
            if x.include_logs: argv.append('--include-logs')
        elif x.recovery_cmd=='verify': argv.append(x.archive)
        else: argv.extend([x.archive,x.target_root])
        raise SystemExit(subprocess.call(argv))
    if x.cmd=='health': return call('GET','/health')
    if x.cmd=='agents': return call('GET','/v1/agents')
    if x.cmd=='tasks': return call('GET','/v1/tasks')
    if x.cmd=='locks': return call('GET','/v1/locks')
    if x.cmd=='diagnostics': return call('GET','/v1/diagnostics')
    if x.cmd=='register': return call('POST','/v1/agent/register',{'agent_id':x.agent_id,'session_id':x.session_id})
    if x.cmd=='task-create': return call('POST','/v1/task/create',{'agent_id':x.agent_id,'goal':x.goal,'task_id':x.task_id,'execution_mode':x.mode,'cloud_bridge':x.cloud_bridge})
    if x.cmd=='mode-a-bootstrap': return call('POST','/v1/mode-a/bootstrap',{'agent_id':x.agent_id,'task_id':x.task_id,'dry_run':x.dry_run})
    if x.cmd=='task-status': return call('GET','/v1/tasks/'+urllib.parse.quote(x.task_id))
    if x.cmd=='task-handoff': return call('POST','/v1/task/handoff',{'task_id':x.task_id,'from_agent':x.from_agent,'to_agent':x.to_agent,'notes':x.notes})
    if x.cmd=='task-complete': return call('POST','/v1/task/complete',{'task_id':x.task_id,'agent_id':x.agent_id,'completed':x.completed})
    if x.cmd=='checkpoint': return call('POST','/v1/task/checkpoint',{'task_id':x.task_id,'agent_id':x.agent_id,'fields':json.loads(x.fields_json)})
    if x.cmd=='workspace-create': return call('POST','/v1/workspace/create',{'agent_id':x.agent_id,'task_id':x.task_id})
    if x.cmd=='workspace-remove': return call('POST','/v1/workspace/remove',{'agent_id':x.agent_id,'task_id':x.task_id,'force':x.force})
    if x.cmd=='exec': return call('POST','/v1/exec/start',{'agent_id':x.agent_id,'task_id':x.task_id,'command':x.command,'cwd':x.cwd})
    if x.cmd=='exec-status': return call('GET','/v1/commands/'+urllib.parse.quote(x.command_id))
    if x.cmd=='exec-logs': return call('GET','/v1/commands/'+urllib.parse.quote(x.command_id)+'/logs?tail='+str(x.tail))
    if x.cmd=='exec-cancel': return call('POST','/v1/exec/cancel',{'command_id':x.command_id})
    if x.cmd=='lock-acquire': return call('POST','/v1/lock/acquire',{'agent_id':x.agent_id,'task_id':x.task_id,'kind':x.kind,'scope':x.scope,'lease_seconds':x.lease})
    if x.cmd=='lock-release': return call('POST','/v1/lock/release',{'agent_id':x.agent_id,'kind':x.kind,'scope':x.scope})
    if x.cmd=='lock-recover': return call('POST','/v1/lock/recover',{})
    if x.cmd=='message-send': return call('POST','/v1/message/send',{'sender':x.sender,'recipient':x.recipient,'kind':x.kind,'body':x.body})
    if x.cmd=='messages': return call('GET','/v1/messages'+(('?recipient='+urllib.parse.quote(x.recipient)) if x.recipient else ''))
    if x.cmd=='integration-submit': return call('POST','/v1/integration/submit',{'agent_id':x.agent_id,'task_id':x.task_id,'commit_sha':x.commit_sha,'verification':x.verify})
if __name__=='__main__': main()
