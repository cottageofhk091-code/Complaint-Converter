/* eslint-disable no-console */
const fs = require("fs");
const { spawnSync } = require("child_process");

function loadEnvLocal() {
  const raw = fs.readFileSync(".env.local", "utf8");
  const map = {};
  for (const line of raw.split(/\r?\n/)) {
    const t = line.replace(/^\uFEFF/, "").trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 0) continue;
    let v = t.slice(i + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    map[t.slice(0, i).trim()] = v;
  }
  return map;
}

const map = loadEnvLocal();
const key = map.SUPABASE_SERVICE_ROLE_KEY;
if (!key) {
  console.error("no SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

console.log(
  "[vercel] updating SUPABASE_SERVICE_ROLE_KEY",
  "len=" + key.length,
  "prefix=" + key.slice(0, 10)
);

const rm = spawnSync(
  "npx",
  ["vercel", "env", "rm", "SUPABASE_SERVICE_ROLE_KEY", "production", "-y"],
  { encoding: "utf8", shell: true }
);
process.stdout.write(rm.stdout || "");
process.stderr.write(rm.stderr || "");

const add = spawnSync(
  "npx",
  ["vercel", "env", "add", "SUPABASE_SERVICE_ROLE_KEY", "production"],
  { encoding: "utf8", shell: true, input: key + "\n" }
);
process.stdout.write(add.stdout || "");
process.stderr.write(add.stderr || "");
process.exit(add.status || 0);
