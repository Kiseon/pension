import { spawn } from "node:child_process";

const backend = spawn("python3", ["-m", "pension_service.server", "--host", "127.0.0.1", "--port", "8000"], {
  stdio: "inherit"
});

const frontend = spawn("npx", ["vite"], {
  stdio: "inherit"
});

function shutdown(signal) {
  backend.kill(signal);
  frontend.kill(signal);
  process.exit(0);
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

backend.on("exit", (code) => {
  if (code !== null && code !== 0) {
    frontend.kill();
    process.exit(code);
  }
});

frontend.on("exit", (code) => {
  backend.kill();
  process.exit(code ?? 0);
});
