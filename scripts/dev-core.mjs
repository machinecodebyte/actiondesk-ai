import { spawn } from "node:child_process";
import readline from "node:readline";

const services = [
  ["gateway", "@actiondesk/api-gateway"],
  ["auth", "@actiondesk/auth-service"],
  ["integration", "@actiondesk/integration-service"],
  ["mail", "@actiondesk/mail-service"],
  ["calendar", "@actiondesk/calendar-service"],
  ["command", "@actiondesk/command-service"]
];

const pnpmCommand = process.env.npm_execpath ? process.execPath : "pnpm";
const pnpmArgs = process.env.npm_execpath ? [process.env.npm_execpath] : [];
const children = new Map();
let shuttingDown = false;

for (const [label, filter] of services) {
  const child = spawn(pnpmCommand, [...pnpmArgs, "--filter", filter, "dev"], {
    cwd: process.cwd(),
    env: process.env,
    stdio: ["ignore", "pipe", "pipe"]
  });

  children.set(label, child);
  pipeWithPrefix(label, child.stdout);
  pipeWithPrefix(label, child.stderr);

  child.on("exit", (code, signal) => {
    children.delete(label);
    if (shuttingDown) {
      return;
    }

    const reason = signal ? `signal ${signal}` : `code ${code ?? 0}`;
    console.error(`[${label}] exited with ${reason}`);
    stopAll();
    process.exitCode = code && code > 0 ? code : 1;
  });

  child.on("error", (error) => {
    children.delete(label);
    console.error(`[${label}] failed to start: ${error.message}`);
    stopAll();
    process.exitCode = 1;
  });
}

process.on("SIGINT", stopAll);
process.on("SIGTERM", stopAll);

function pipeWithPrefix(label, stream) {
  const lines = readline.createInterface({ input: stream });
  lines.on("line", (line) => {
    console.log(`[${label}] ${line}`);
  });
}

function stopAll() {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  for (const child of children.values()) {
    stopProcessTree(child);
  }
}

function stopProcessTree(child) {
  if (process.platform === "win32") {
    spawn("taskkill", ["/pid", String(child.pid), "/t", "/f"], {
      stdio: "ignore"
    });
    return;
  }

  child.kill();
}
