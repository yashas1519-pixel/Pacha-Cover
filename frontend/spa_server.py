"""SPA-aware static file server. Serves index.html for all unknown routes."""
import http.server
import os

DIST_DIR = os.path.join(os.path.dirname(__file__), "dist")

class SPAHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIST_DIR, **kwargs)

    def do_GET(self):
        # If the file exists, serve it normally (JS, CSS, images)
        file_path = os.path.join(DIST_DIR, self.path.lstrip("/"))
        if os.path.isfile(file_path):
            return super().do_GET()
        # Otherwise serve index.html (SPA fallback)
        self.path = "/index.html"
        return super().do_GET()

if __name__ == "__main__":
    port = 5173
    server = http.server.HTTPServer(("", port), SPAHandler)
    print(f"\n  SPA Server running at http://localhost:{port}/\n")
    server.serve_forever()
