#!/usr/bin/env python3
"""Simple test server that serves custom 404.html for missing files"""
import http.server
import socketserver
import os

class Custom404Handler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        # Try to serve the requested file
        path = self.translate_path(self.path)
        if os.path.isfile(path):
            super().do_GET()
        else:
            # Serve 404.html for missing files
            self.send_response(404)
            self.send_header('Content-type', 'text/html')
            self.end_headers()
            try:
                with open('404.html', 'rb') as f:
                    self.wfile.write(f.read())
            except FileNotFoundError:
                self.wfile.write(b'404.html not found')

PORT = 8000
with socketserver.TCPServer(("", PORT), Custom404Handler) as httpd:
    print(f"Server running at http://localhost:{PORT}")
    print(f"Test the redirect by visiting: http://localhost:{PORT}/post/memex-my-personal-knowledge-base.html")
    print("Press Ctrl+C to stop")
    httpd.serve_forever()
