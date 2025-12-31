#!/usr/bin/env python3
import os
from http.server import SimpleHTTPRequestHandler, HTTPServer

ROOT = os.path.dirname(os.path.abspath(__file__))
STORIES_PATH = os.path.join(ROOT, 'assets', 'stories.txt')

class Handler(SimpleHTTPRequestHandler):
    def end_headers(self):
        # Basic CORS for local development
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def do_POST(self):
        if self.path == '/api/submit-story':
            length = int(self.headers.get('Content-Length', '0'))
            data = self.rfile.read(length) if length > 0 else b''
            text = data.decode('utf-8', errors='ignore')
            # Ensure directory exists
            os.makedirs(os.path.join(ROOT, 'assets'), exist_ok=True)
            # Append one line per submission
            with open(STORIES_PATH, 'a', encoding='utf-8') as f:
                # Normalize to single line with trailing newline
                # Incoming format is expected as "Q||...\n" already.
                # If multiple lines accidentally sent, keep as-is.
                f.write(text)
                if not text.endswith('\n'):
                    f.write('\n')
            self.send_response(200)
            self.end_headers()
            self.wfile.write(b'OK')
        else:
            self.send_response(404)
            self.end_headers()

if __name__ == '__main__':
    os.chdir(ROOT)
    port = int(os.environ.get('PORT', '8000'))
    server = HTTPServer(('0.0.0.0', port), Handler)
    print(f"Serving on http://0.0.0.0:{port} (root: {ROOT})")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
