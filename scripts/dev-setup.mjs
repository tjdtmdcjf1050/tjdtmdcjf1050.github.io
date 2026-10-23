import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const projectRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const runtimeRoot = join(projectRoot, ".local-runtime");
const home = join(runtimeRoot, "home");
const config = join(runtimeRoot, "config");
const logs = join(runtimeRoot, "wrangler", "logs");
const registry = join(runtimeRoot, "wrangler", "registry");
const localVars = join(projectRoot, ".dev.vars");
const localVarsExample = join(projectRoot, ".dev.vars.example");

for (const directory of [home, config, logs, registry]) mkdirSync(directory, { recursive: true });
if (!existsSync(localVars) && existsSync(localVarsExample)) copyFileSync(localVarsExample, localVars);

const require = createRequire(import.meta.url);
const wrangler = require.resolve("wrangler/bin/wrangler.js");
const result = spawnSync(
  process.execPath,
  [wrangler, "d1", "migrations", "apply", "DB", "--local", "--config", "wrangler.local.jsonc"],
  {
    cwd: projectRoot,
    stdio: "inherit",
    env: {
      ...process.env,
      HOME: home,
      XDG_CONFIG_HOME: config,
      WRANGLER_WRITE_LOGS: "false",
      WRANGLER_LOG_PATH: logs,
      MINIFLARE_REGISTRY_PATH: registry,
    },
  },
);

if (result.error) throw result.error;
process.exit(result.status ?? 1);
