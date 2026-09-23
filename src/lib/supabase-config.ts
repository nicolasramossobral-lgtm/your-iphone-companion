const VERIFIED_SUPABASE_URL = "https://flvlopkobywrnttkeedj.supabase.co";
const VERIFIED_SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZsdmxvcGtvYnl3cm50dGtlZWRqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAwNDUxMzcsImV4cCI6MjEwNTYyMTEzN30.u6jL4eQyXzIXs50attLm9Eu7L48nyZqAHlA2PA0_5wU";
const REJECTED_PUBLISHABLE_FINGERPRINT = 0xf3e82ece;

const configuredUrl = import.meta.env["VITE_SUPABASE_URL"]?.trim();
const configuredAnonKey = import.meta.env["VITE_SUPABASE_ANON_KEY"]?.trim();
const configuredPublishableKey = import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"]?.trim();

function fingerprint(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return hash;
}

function isProjectAnonKey(value: string | undefined) {
  if (!value?.startsWith("eyJ")) return false;

  try {
    const payloadSegment = value.split(".")[1];
    if (!payloadSegment) return false;
    const payload = JSON.parse(
      atob(payloadSegment.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(payloadSegment.length / 4) * 4, "=")),
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
      fingerprint(value) !== REJECTED_PUBLISHABLE_FINGERPRINT)
  );
}

const SUPABASE_URL =
  configuredUrl === VERIFIED_SUPABASE_URL
    ? configuredUrl
    : VERIFIED_SUPABASE_URL;

// Only trust a browser key when it is explicitly tied to the verified project
// URL. If Lovable injects credentials for a different project, keep the known
// working project key instead of sending that mismatched key to Supabase.
const SUPABASE_ANON_KEY =
  configuredUrl === VERIFIED_SUPABASE_URL && isUsablePublicKey(configuredAnonKey)
    ? configuredAnonKey
    : configuredUrl === VERIFIED_SUPABASE_URL && isUsablePublicKey(configuredPublishableKey)
      ? configuredPublishableKey
      : VERIFIED_SUPABASE_ANON_KEY;

if (
  (configuredAnonKey && !isProjectAnonKey(configuredAnonKey)) ||
  (configuredPublishableKey && fingerprint(configuredPublishableKey) === REJECTED_PUBLISHABLE_FINGERPRINT) ||
  (configuredUrl && configuredUrl !== VERIFIED_SUPABASE_URL)
) {
  console.warn("[supabase] Ignoring invalid or mismatched browser configuration.", {
    urlMatchesProject: configuredUrl === VERIFIED_SUPABASE_URL,
    anonKeyLooksValid: isProjectAnonKey(configuredAnonKey),
    publishableKeyLooksUsable: isUsablePublicKey(configuredPublishableKey),
    publishableKeyPrefix: configuredPublishableKey?.slice(0, 15) || "missing",
  });
}

export { SUPABASE_URL, SUPABASE_ANON_KEY };
