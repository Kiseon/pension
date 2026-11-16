import json
import threading
import unittest
from http.server import HTTPServer
from pathlib import Path
from urllib.request import Request, urlopen

from api.health import handler as HealthHandler
from api.projections import handler as ProjectionsHandler

ROOT = Path(__file__).resolve().parent.parent


class VercelApiHandlerTests(unittest.TestCase):
    def test_health_handler_returns_ok(self) -> None:
        server = HTTPServer(("127.0.0.1", 0), HealthHandler)
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        try:
            port = server.server_address[1]
            with urlopen(f"http://127.0.0.1:{port}/api/health") as resp:
                self.assertEqual(resp.status, 200)
                body = json.loads(resp.read().decode("utf-8"))
                self.assertEqual(body, {"status": "ok"})
        finally:
            server.shutdown()
            server.server_close()

    def test_projections_handler_computes_sample(self) -> None:
        sample = (ROOT / "sample_projection.json").read_bytes()
        server = HTTPServer(("127.0.0.1", 0), ProjectionsHandler)
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        try:
            port = server.server_address[1]
            req = Request(
                f"http://127.0.0.1:{port}/api/projections",
                data=sample,
                headers={"Content-Type": "application/json"},
                method="POST",
            )
            with urlopen(req) as resp:
                self.assertEqual(resp.status, 200)
                body = json.loads(resp.read().decode("utf-8"))
                self.assertEqual(body["currency"], "KRW")
                self.assertGreater(len(body["monthly"]), 0)
        finally:
            server.shutdown()
            server.server_close()


if __name__ == "__main__":
    unittest.main()
