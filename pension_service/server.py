"""Small HTTP server for the retirement income MVP."""

from __future__ import annotations

import json
import argparse
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse

from pension_service.projection import project

ROOT = Path(__file__).resolve().parent.parent
STATIC_DIR = ROOT / "static"


class PensionHandler(BaseHTTPRequestHandler):
    server_version = "PensionMVP/0.1"

    def do_GET(self) -> None:  # noqa: N802 - http.server uses this naming
        path = urlparse(self.path).path
        if path == "/":
            self._send_file(STATIC_DIR / "index.html", "text/html; charset=utf-8")
            return
        if path == "/static/app.js":
            self._send_file(STATIC_DIR / "app.js", "application/javascript; charset=utf-8")
            return
        if path == "/static/styles.css":
            self._send_file(STATIC_DIR / "styles.css", "text/css; charset=utf-8")
            return
        if path == "/api/health":
            self._send_json({"status": "ok"})
            return
        self.send_error(404, "Not Found")

    def do_POST(self) -> None:  # noqa: N802 - http.server uses this naming
        path = urlparse(self.path).path
        if path != "/api/projections":
            self.send_error(404, "Not Found")
            return

        try:
            length = int(self.headers.get("Content-Length", "0"))
            body = self.rfile.read(length)
            payload = json.loads(body.decode("utf-8") or "{}")
            result = project(payload)
        except Exception as exc:  # pragma: no cover - exercised manually
            self._send_json({"error": str(exc)}, status=400)
            return

        self._send_json(result)

    def log_message(self, format: str, *args: object) -> None:
        # Keep development logs free of raw request bodies.
        print(f"{self.address_string()} - {format % args}")

    def _send_json(self, payload: dict, status: int = 200) -> None:
        encoded = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(encoded)))
        self.end_headers()
        self.wfile.write(encoded)

    def _send_file(self, path: Path, content_type: str) -> None:
        if not path.exists():
            self.send_error(404, "Not Found")
            return
        encoded = path.read_bytes()
        self.send_response(200)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(encoded)))
        self.end_headers()
        self.wfile.write(encoded)


def run(host: str = "127.0.0.1", port: int = 8000) -> None:
    server = ThreadingHTTPServer((host, port), PensionHandler)
    print(f"Serving Pension MVP at http://{host}:{port}")
    server.serve_forever()


def main() -> None:
    parser = argparse.ArgumentParser(description="Run the Pension MVP HTTP server.")
    parser.add_argument("--host", default="127.0.0.1", help="Host interface to bind")
    parser.add_argument("--port", type=int, default=8000, help="Port to listen on")
    args = parser.parse_args()
    run(args.host, args.port)


if __name__ == "__main__":
    main()
