/* eslint-disable no-console */
const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

function loadEnvLocal() {
  const envPath = path.join(process.cwd(), ".env.local");
  const raw = fs.readFileSync(envPath, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const t = line.replace(/^\uFEFF/, "").trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i < 0) continue;
    const k = t.slice(0, i).trim();
    let v = t.slice(i + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    if (!process.env[k]) process.env[k] = v;
  }
}

async function main() {
  loadEnvLocal();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  const resend = process.env.RESEND_API_KEY || "";

  console.log("[env] URL host=", url ? new URL(url).host : "(none)");
  console.log(
    "[env] SERVICE_ROLE set=",
    !!service,
    "prefix=",
    service.slice(0, 10)
  );
  console.log("[env] RESEND set=", !!resend, "prefix=", resend.slice(0, 3));

  if (!url || !service) {
    console.error("[API Register Error]: missing supabase admin env");
    process.exit(1);
  }

  const admin = createClient(url, service, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const email = "cottageofhk@yahoo.co.jp";
  let found = null;
  for (let page = 1; page <= 10; page++) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage: 200,
    });
    if (error) {
      console.error("[API Register Error]:", error);
      console.error("[API Register Error] fields:", {
        message: error.message,
        status: error.status,
        code: error.code,
        name: error.name,
      });
      process.exit(1);
    }
    found = (data.users || []).find(
      (u) => (u.email || "").toLowerCase() === email
    );
    if (found) break;
    if (!data.users || data.users.length < 200) break;
  }

  if (found) {
    console.log("[user] EXISTS", {
      id: found.id,
      email: found.email,
      confirmed: !!found.email_confirmed_at,
      created: found.created_at,
    });
  } else {
    console.log("[user] NOT FOUND for", email);
  }

  const probe = `probe_${Date.now()}@example.com`;
  const { data: created, error: createError } = await admin.auth.admin.createUser(
    {
      email: probe,
      password: "TestPass123!",
      email_confirm: false,
    }
  );
  if (createError) {
    console.error("[API Register Error]:", createError);
    console.error("[API Register Error] fields:", {
      message: createError.message,
      status: createError.status,
      code: createError.code,
    });
  } else {
    console.log("[probe] createUser OK", created.user?.id);
    await admin.auth.admin.deleteUser(created.user.id);
    console.log("[probe] deleted");
  }

  // Simulate duplicate create for yahoo if exists
  if (found) {
    const { error: dupErr } = await admin.auth.admin.createUser({
      email,
      password: "TestPass123!",
      email_confirm: false,
    });
    console.error("[API Register Error]: duplicate create attempt:", dupErr);
    console.error("[API Register Error] dup fields:", {
      message: dupErr?.message,
      status: dupErr?.status,
      code: dupErr?.code,
    });
  }
}

main().catch((err) => {
  console.error("[API Register Error]:", err);
  process.exit(1);
});
