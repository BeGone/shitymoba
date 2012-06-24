#!/usr/bin/python

import sys
import ujson as json
from pprint import pprint as pp
from bottle import *
from bottle import jinja2_view as view, jinja2_template as template


cache = {}

#if true, that means you gonna join another team
flag = False;

@get('/<filename:re:.+\.[a-zA-Z0-9]{2,3}>')
def serve_static(filename):
    return static_file(filename, root='./public')


@get('/', template='index')
def index():
    TEMPLATES.clear()
    return locals()

@get('/websocket/:sid')
def ws(sid):
    websocket = request.environ.get('wsgi.websocket')
    if websocket:
        websocket.sid = sid
        cache[sid] = { 'websocket': websocket }
        print '\033[93m'
        pp(cache)
        print '\033[0m'
        positions = []
        for key in cache:
            if key != sid:
                positions.append({ 'id': key, 'type': 'pos', 'pos': cache[key].get('pos') })
        websocket.send(json.dumps(positions))
        while(True):
            message = websocket.receive()
            if not message:
                break
            message = json.loads(message)
            message['id'] = websocket.sid
            print '\033[92m', message, '\033[0m'
            if message.get('type') == 'pos':
                cache[sid]['pos'] = message['pos']
            for key in cache:
                if key != sid:
                    if cache[key]['websocket'].socket:
                        cache[key]['websocket'].send(json.dumps([message]))
                    else:
                        del cache[key]
        websocket.close()
        del cache[sid]
        for key in cache:
            cache[key]['websocket'].send(json.dumps([{ 'id': sid, 'type': 'pos' }]))
    return None



class WebSocketServer(ServerAdapter):

    def run(self, handler):
        from gevent.pywsgi import WSGIServer
        from geventwebsocket.handler import WebSocketHandler
        server = WSGIServer((self.host, self.port), handler, handler_class=WebSocketHandler)
        server.serve_forever()

debug(True)
port = sys.argv[1] if len(sys.argv) > 1 else 80
run(port=port, reloader=True, server=WebSocketServer)
