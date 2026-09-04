#!/usr/bin/env python3
"""Local preview. python3 serve.py -> http://localhost:8141

No-store on everything: a service worker plus a browser cache will otherwise
serve you yesterday's build and you will debug a bug you already fixed."""
import functools
import http.server
import pathlib
import socketserver

PORT = 8141
ROOT = pathlib.Path(__file__).resolve().parent


class H(http.server.SimpleHTTPRequestHandler):
    extensions_map = {
        **http.server.SimpleHTTPRequestHandler.extensions_map,
        '.webmanifest': 'application/manifest+json',
        '.js': 'text/javascript',
        '.mjs': 'text/javascript',
        '.svg': 'image/svg+xml',
        '.webp': 'image/webp',
    }

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, must-revalidate')
        self.send_header('Service-Worker-Allowed', '/')
        super().end_headers()

    def log_message(self, *a):
        pass


if __name__ == '__main__':
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(('', PORT),
                                functools.partial(H, directory=str(ROOT))) as httpd:
        print(f'Went To Event  ->  http://localhost:{PORT}')
        httpd.serve_forever()
