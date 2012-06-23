#!/usr/bin/python

import sys
from bottle import *

cache = {}


@get('/<filename:re:.+\.[a-zA-Z0-9]{2,3}>')
def serve_static(filename):
    return static_file(filename, root='./public')


@get('/', template='index')
def index():
    TEMPLATES.clear()
    return locals()


class WebSocketServer(ServerAdapter):

    def run(self, handler):
        from gevent.pywsgi import WSGIServer
        from geventwebsocket.handler import WebSocketHandler
        server = WSGIServer((self.host, self.port), handler, handler_class=WebSocketHandler)
        server.serve_forever()

debug(True)
port = sys.argv[1] if len(sys.argv) > 1 else 80
run(port=port, reloader=True, server=WebSocketServer)
