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

function upsertEnv(name, value) {
  console.log(
    "[vercel] upsert",
    name,
    "len=" + value.length,
    "prefix=" + value.slice(0, Math.min(10, value.length))
  );
  spawnSync("npx", ["vercel", "env", "rm", name, "production", "-y"], {
    encoding: "utf8",
    shell: true,
  });
  const add = spawnSync(
    "npx",
    ["vercel", "env", "add", name, "production"],
    { encoding: "utf8", shell: true, input: value + "\n" }
  );
  process.stdout.write(add.stdout || "");
  process.stderr.write(add.stderr || "");
  if (add.status) process.exit(add.status);
}

const map = loadEnvLocal();
for (const name of [
  "SUPABASE_SERVICE_ROLE_KEY",
  "RESEND_API_KEY",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
]) {
  if (!map[name]) {
    console.warn("[skip] missing in .env.local:", name);
    continue;
  }
  upsertEnv(name, map[name]);
}
console.log("[vercel] env sync done");
