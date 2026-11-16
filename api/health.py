"""Vercel Python Serverless Function for GET /api/health."""

from __future__ import annotations

import json
from http.server import BaseHTTPRequestHandler


class handler(BaseHTTPRequestHandler):  # noqa: N801 - Vercel requires lowercase `handler`
    def do_GET(self) -> None:  # noqa: N802 - BaseHTTPRequestHandler naming
        encoded = json.dumps({"status": "ok"}).encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(encoded)))
        self.end_headers()
        self.wfile.write(encoded)
