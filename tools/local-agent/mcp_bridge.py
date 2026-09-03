#!/usr/bin/env python3
import hmac
import json
import os
import urllib.error
import urllib.parse
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

BIND = os.environ.get('GOVA_AGENT_MCP_BIND', '127.0.0.1')
PORT = int(os.environ.get('GOVA_AGENT_MCP_PORT', '8767'))
GATEWAY = os.environ.get('GOVA_AGENT_MCP_GATEWAY', 'http://127.0.0.1:8765').rstrip('/')
AUTH_FILE = Path(os.environ.get('GOVA_AGENT_AUTH_FILE', '/home/hesham/.config/gova-agent/auth')).resolve()
MAX_BODY = 2_000_000
PROTOCOL_VERSION = '2025-06-18'
SERVER_NAME = 'gova-local-agent'
SERVER_VERSION = '1.0.0'


def auth_value():
    try:
        return AUTH_FILE.read_text().strip()
    except Exception:
        return ''


def auth_ok(headers):
    expected = auth_value()
    if not expected:
        return False
    supplied = headers.get('X-Gova-Agent-Key', '')
    bearer = headers.get('Authorization', '')
    if bearer.lower().startswith('bearer '):
        supplied = bearer[7:].strip()
    return bool(supplied) and hmac.compare_digest(supplied, expected)


def gateway_json(method, path, body=None):
    data = None if body is None else json.dumps(body).encode()
    req = urllib.request.Request(
        GATEWAY + path,
        data=data,
        method=method,
        headers={
            'X-Gova-Agent-Key': auth_value(),
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'User-Agent': 'gova-agent-mcp-bridge',
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as response:
            raw = response.read()
            return response.status, json.loads(raw) if raw else {}
    except urllib.error.HTTPError as error:
        raw = error.read().decode(errors='replace')
        try:
            payload = json.loads(raw) if raw else {'error': f'HTTP {error.code}'}
        except Exception:
            payload = {'error': raw or f'HTTP {error.code}'}
        return error.code, payload


def tool_specs():
    return [
        {
            'name': 'gova_health',
            'title': 'Gova Gateway Health',
            'description': 'Check whether the local Gova agent gateway is healthy.',
            'inputSchema': {'type': 'object', 'properties': {}, 'additionalProperties': False},
            'annotations': {'readOnlyHint': True, 'destructiveHint': False, 'idempotentHint': True, 'openWorldHint': False},
        },
        {
            'name': 'gova_diagnostics',
            'title': 'Gova Diagnostics',
            'description': 'Read repository, worktree, agent, task, and lock diagnostics from the local gateway.',
            'inputSchema': {'type': 'object', 'properties': {}, 'additionalProperties': False},
            'annotations': {'readOnlyHint': True, 'destructiveHint': False, 'idempotentHint': True, 'openWorldHint': False},
        },
        {
            'name': 'gova_command_start',
            'title': 'Run Local Command',
            'description': 'Start a shell command on the authorized local Gova machine. This can modify files, services, repositories, and the operating system according to the command and local user privileges.',
            'inputSchema': {
                'type': 'object',
                'properties': {
                    'command': {'type': 'string', 'minLength': 1, 'description': 'Shell command to execute.'},
                    'cwd': {'type': 'string', 'description': 'Optional absolute working directory. Defaults to the Gova repository.'},
                    'agent_id': {'type': 'string', 'default': 'remote-mcp', 'description': 'Optional runtime agent identity.'},
                    'task_id': {'type': ['string', 'null'], 'description': 'Optional existing Gova task ID.'},
                },
                'required': ['command'],
                'additionalProperties': False,
            },
            'annotations': {'readOnlyHint': False, 'destructiveHint': True, 'idempotentHint': False, 'openWorldHint': True},
        },
        {
            'name': 'gova_command_status',
            'title': 'Command Status',
            'description': 'Read status and exit information for a command started through the Gova gateway.',
            'inputSchema': {
                'type': 'object',
                'properties': {'command_id': {'type': 'string', 'minLength': 1}},
                'required': ['command_id'],
                'additionalProperties': False,
            },
            'annotations': {'readOnlyHint': True, 'destructiveHint': False, 'idempotentHint': True, 'openWorldHint': False},
        },
        {
            'name': 'gova_command_logs',
            'title': 'Command Logs',
            'description': 'Read stdout and stderr for a command started through the Gova gateway.',
            'inputSchema': {
                'type': 'object',
                'properties': {
                    'command_id': {'type': 'string', 'minLength': 1},
                    'tail': {'type': 'integer', 'minimum': 1, 'maximum': 200000, 'default': 20000},
                },
                'required': ['command_id'],
                'additionalProperties': False,
            },
            'annotations': {'readOnlyHint': True, 'destructiveHint': False, 'idempotentHint': True, 'openWorldHint': False},
        },
        {
            'name': 'gova_command_cancel',
            'title': 'Cancel Command',
            'description': 'Terminate a currently running command on the local Gova machine.',
            'inputSchema': {
                'type': 'object',
                'properties': {'command_id': {'type': 'string', 'minLength': 1}},
                'required': ['command_id'],
                'additionalProperties': False,
            },
            'annotations': {'readOnlyHint': False, 'destructiveHint': True, 'idempotentHint': True, 'openWorldHint': False},
        },
    ]


def tool_result(payload, is_error=False):
    text = json.dumps(payload, ensure_ascii=False, default=str)
    result = {'content': [{'type': 'text', 'text': text}], 'structuredContent': payload}
    if is_error:
        result['isError'] = True
    return result


def call_tool(name, args):
    if name == 'gova_health':
        status, payload = gateway_json('GET', '/health')
        return tool_result(payload, status >= 400)
    if name == 'gova_diagnostics':
        status, payload = gateway_json('GET', '/v1/diagnostics')
        return tool_result(payload, status >= 400)
    if name == 'gova_command_start':
        body = {
            'agent_id': str(args.get('agent_id') or 'remote-mcp'),
            'task_id': args.get('task_id'),
            'command': str(args['command']),
        }
        if args.get('cwd'):
            body['cwd'] = str(args['cwd'])
        status, payload = gateway_json('POST', '/v1/exec/start', body)
        return tool_result(payload, status >= 400)
    if name == 'gova_command_status':
        cid = urllib.parse.quote(str(args['command_id']), safe='')
        status, payload = gateway_json('GET', f'/v1/commands/{cid}')
        return tool_result(payload, status >= 400)
    if name == 'gova_command_logs':
        cid = urllib.parse.quote(str(args['command_id']), safe='')
        tail = max(1, min(int(args.get('tail', 20000)), 200000))
        status, payload = gateway_json('GET', f'/v1/commands/{cid}/logs?tail={tail}')
        return tool_result(payload, status >= 400)
    if name == 'gova_command_cancel':
        status, payload = gateway_json('POST', '/v1/exec/cancel', {'command_id': str(args['command_id'])})
        return tool_result(payload, status >= 400)
    raise ValueError(f'unknown tool: {name}')


def rpc_error(request_id, code, message, data=None):
    error = {'code': code, 'message': message}
    if data is not None:
        error['data'] = data
    return {'jsonrpc': '2.0', 'id': request_id, 'error': error}


def rpc_result(request_id, result):
    return {'jsonrpc': '2.0', 'id': request_id, 'result': result}


def process_rpc(message):
    if not isinstance(message, dict) or message.get('jsonrpc') != '2.0':
        return rpc_error(message.get('id') if isinstance(message, dict) else None, -32600, 'Invalid Request')
    method = message.get('method')
    request_id = message.get('id')
    params = message.get('params') or {}

    if method == 'notifications/initialized':
        return None
    if method == 'initialize':
        requested = str(params.get('protocolVersion') or PROTOCOL_VERSION)
        supported = {'2025-06-18', '2025-03-26', '2024-11-05'}
        version = requested if requested in supported else PROTOCOL_VERSION
        return rpc_result(request_id, {
            'protocolVersion': version,
            'capabilities': {'tools': {'listChanged': False}},
            'serverInfo': {'name': SERVER_NAME, 'version': SERVER_VERSION},
            'instructions': 'Authenticated bridge to the user-owned Gova local agent gateway. Command tools can modify the local machine and should be used only when explicitly requested by the user.',
        })
    if method == 'ping':
        return rpc_result(request_id, {})
    if method == 'tools/list':
        return rpc_result(request_id, {'tools': tool_specs()})
    if method == 'tools/call':
        try:
            name = str(params['name'])
            arguments = params.get('arguments') or {}
            if not isinstance(arguments, dict):
                raise ValueError('arguments must be an object')
            return rpc_result(request_id, call_tool(name, arguments))
        except KeyError as error:
            return rpc_error(request_id, -32602, f'missing parameter: {error.args[0]}')
        except Exception as error:
            return rpc_result(request_id, tool_result({'ok': False, 'error': str(error)}, True))
    if method == 'resources/list':
        return rpc_result(request_id, {'resources': []})
    if method == 'prompts/list':
        return rpc_result(request_id, {'prompts': []})
    return rpc_error(request_id, -32601, 'Method not found')


class Handler(BaseHTTPRequestHandler):
    server_version = 'GovaAgentMCP/1.0'

    def log_message(self, fmt, *args):
        pass

    def send_json(self, code, payload):
        data = json.dumps(payload, ensure_ascii=False, default=str).encode()
        self.send_response(code)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(data)))
        self.send_header('MCP-Protocol-Version', PROTOCOL_VERSION)
        self.end_headers()
        self.wfile.write(data)

    def send_empty(self, code=202):
        self.send_response(code)
        self.send_header('Content-Length', '0')
        self.send_header('MCP-Protocol-Version', PROTOCOL_VERSION)
        self.end_headers()

    def read_body(self):
        length = int(self.headers.get('Content-Length', '0') or '0')
        if length > MAX_BODY:
            raise ValueError('body too large')
        return json.loads(self.rfile.read(length) or b'{}')

    def proxy(self):
        path = self.path
        method = self.command
        body = None
        if method in ('POST', 'PUT', 'PATCH'):
            length = int(self.headers.get('Content-Length', '0') or '0')
            if length > MAX_BODY:
                return self.send_json(413, {'ok': False, 'error': 'body too large'})
            body = self.rfile.read(length)
        headers = {'User-Agent': 'gova-agent-mcp-bridge'}
        for name in ('Content-Type', 'X-Gova-Agent-Key', 'Authorization'):
            value = self.headers.get(name)
            if value:
                headers[name] = value
        request = urllib.request.Request(GATEWAY + path, data=body, method=method, headers=headers)
        try:
            with urllib.request.urlopen(request, timeout=30) as response:
                raw = response.read()
                self.send_response(response.status)
                self.send_header('Content-Type', response.headers.get('Content-Type', 'application/json'))
                self.send_header('Content-Length', str(len(raw)))
                self.end_headers()
                self.wfile.write(raw)
        except urllib.error.HTTPError as error:
            raw = error.read()
            self.send_response(error.code)
            self.send_header('Content-Type', error.headers.get('Content-Type', 'application/json'))
            self.send_header('Content-Length', str(len(raw)))
            self.end_headers()
            self.wfile.write(raw)
        except Exception as error:
            self.send_json(502, {'ok': False, 'error': f'gateway unavailable: {error}'})

    def do_GET(self):
        path = urllib.parse.urlparse(self.path).path
        if path == '/mcp':
            if not auth_ok(self.headers):
                return self.send_json(401, {'error': 'unauthorized'})
            self.send_response(405)
            self.send_header('Allow', 'POST')
            self.send_header('Content-Length', '0')
            self.end_headers()
            return
        return self.proxy()

    def do_POST(self):
        path = urllib.parse.urlparse(self.path).path
        if path != '/mcp':
            return self.proxy()
        if not auth_ok(self.headers):
            return self.send_json(401, {'jsonrpc': '2.0', 'id': None, 'error': {'code': -32001, 'message': 'Unauthorized'}})
        try:
            body = self.read_body()
        except Exception as error:
            return self.send_json(400, rpc_error(None, -32700, 'Parse error', str(error)))

        if isinstance(body, list):
            if not body:
                return self.send_json(400, rpc_error(None, -32600, 'Invalid Request'))
            responses = [result for result in (process_rpc(item) for item in body) if result is not None]
            if not responses:
                return self.send_empty()
            return self.send_json(200, responses)

        response = process_rpc(body)
        if response is None:
            return self.send_empty()
        return self.send_json(200, response)


if __name__ == '__main__':
    ThreadingHTTPServer((BIND, PORT), Handler).serve_forever()
