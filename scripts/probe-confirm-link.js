/* eslint-disable no-console */
const fs = require("fs");
const { createClient } = require("@supabase/supabase-js");

function loadEnv() {
  const raw = fs.readFileSync(".env.local", "utf8");
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
    if (!process.env[t.slice(0, i).trim()]) {
      process.env[t.slice(0, i).trim()] = v;
    }
  }
}

async function main() {
  loadEnv();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "");
  const admin = createClient(url, service, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const email = "cottageofhk@yahoo.co.jp";
  const { data, error } = await admin.auth.admin.generateLink({
    type: "signup",
    email,
    options: {
      redirectTo: `${appUrl}/auth/callback`,
    },
  });
  if (error) {
    console.error("generateLink error", error);
    // try without password
    process.exit(1);
  }
  const props = data.properties || {};
  console.log("generateLink keys", Object.keys(props));
  console.log("action_link host", props.action_link ? new URL(props.action_link).host : null);
  console.log("action_link path", props.action_link ? new URL(props.action_link).pathname : null);
  console.log("action_link search keys", props.action_link ? [...new URL(props.action_link).searchParams.keys()] : null);
  console.log("redirect_to", props.redirect_to || props.redirectTo);
  console.log("hashed_token present", !!props.hashed_token);
  console.log("verification_type", props.verification_type);
  console.log("email_otp present", !!props.email_otp);

  // Build our custom URL
  const custom = `${appUrl}/auth/callback?token_hash=${encodeURIComponent(props.hashed_token)}&type=signup`;
  console.log("custom callback url (truncated)", custom.slice(0, 120) + "...");

  // Try verify with anon client (no cookies) - just to see if token works
  const anon = createClient(url, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const v1 = await anon.auth.verifyOtp({
    type: "signup",
    token_hash: props.hashed_token,
  });
  console.log("verifyOtp signup:", v1.error?.message || "OK", v1.data?.user?.id, "confirmed=", !!v1.data?.user?.email_confirmed_at);

  // regenerate and try type email
  const { data: data2, error: err2 } = await admin.auth.admin.generateLink({
    type: "signup",
    email,
    options: { redirectTo: `${appUrl}/auth/callback` },
  });
  if (err2) {
    console.error(err2);
    return;
  }
  const h2 = data2.properties.hashed_token;
  const v2 = await anon.auth.verifyOtp({ type: "email", token_hash: h2 });
  console.log("verifyOtp email:", v2.error?.message || "OK", v2.data?.user?.id);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
