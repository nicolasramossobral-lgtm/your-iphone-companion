const VERIFIED_SUPABASE_URL = "https://flvlopkobywrnttkeedj.supabase.co";
const VERIFIED_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZsdmxvcGtvYnl3cm50dGtlZWRqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAwNDUxMzcsImV4cCI6MjEwNTYyMTEzN30.u6jL4eQyXzIXs50attLm9Eu7L48nyZqAHlA2PA0_5wU";
const REJECTED_PUBLISHABLE_KEY = "sb_publishable_mWdQ54O_V2N2yiiURAIMvMg_671m1Ieo";

const configuredUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const configuredAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();
const configuredPublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();

function isProjectAnonKey(value: string | undefined) {
  if (!value?.startsWith("eyJ")) return false;

  try {
    const payload = JSON.parse(
      atob(value.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")),
    ) as { ref?: string; role?: string };

    return payload.ref === "flvlopkobywrnttkeedj" && payload.role === "anon";
  } catch {
    return false;
  }
}

function isUsablePublicKey(value: string | undefined) {
  return (
    isProjectAnonKey(value) ||
    (!!value &&
      value.startsWith("sb_publishable_") &&
      value !== REJECTED_PUBLISHABLE_KEY)
  );
}

const SUPABASE_URL =
  configuredUrl === VERIFIED_SUPABASE_URL
    ? configuredUrl
    : VERIFIED_SUPABASE_URL;

// Prefer an explicitly configured, project-scoped anon key. A publishable key
// is also accepted for future rotation, while the previously rejected key is
// never allowed to override the verified fallback.
const SUPABASE_ANON_KEY =
  isProjectAnonKey(configuredAnonKey)
    ? configuredAnonKey
    : isUsablePublicKey(configuredPublishableKey)
      ? configuredPublishableKey
      : VERIFIED_SUPABASE_ANON_KEY;

if (
  (configuredAnonKey && !isProjectAnonKey(configuredAnonKey)) ||
  (configuredPublishableKey && configuredPublishableKey === REJECTED_PUBLISHABLE_KEY)
) {
  console.warn("[supabase] Ignoring invalid or obsolete browser key configuration.", {
    anonKeyLooksValid: isProjectAnonKey(configuredAnonKey),
    publishableKeyLooksUsable: isUsablePublicKey(configuredPublishableKey),
    publishableKeyPrefix: configuredPublishableKey?.slice(0, 15) || "missing",
  });
}

export { SUPABASE_URL, SUPABASE_ANON_KEY };
