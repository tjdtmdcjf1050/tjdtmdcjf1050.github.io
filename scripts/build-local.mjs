import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const projectRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const runtimeRoot = join(projectRoot, ".local-runtime");
const home = join(runtimeRoot, "home");
const config = join(runtimeRoot, "config");
const tmp = join(runtimeRoot, "tmp");
const logs = join(runtimeRoot, "wrangler", "logs");
const registry = join(runtimeRoot, "wrangler", "registry");

for (const directory of [home, config, tmp, logs, registry]) mkdirSync(directory, { recursive: true });

const env = {
  ...process.env,
  HOME: home,
  XDG_CONFIG_HOME: config,
  TMPDIR: tmp,
  WRANGLER_WRITE_LOGS: "false",
  WRANGLER_LOG_PATH: logs,
  MINIFLARE_REGISTRY_PATH: registry,
};

function run(entry, args = []) {
  const result = spawnSync(process.execPath, [entry, ...args], { cwd: projectRoot, stdio: "inherit", env });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

console.log("Running production build...");
run(join(projectRoot, "node_modules", "vinext", "dist", "cli.js"), ["build"]);
run(join(projectRoot, "scripts", "validate-artifact.mjs"));
