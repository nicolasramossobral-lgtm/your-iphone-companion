const VERIFIED_SUPABASE_URL = "https://flvlopkobywrnttkeedj.supabase.co";
const VERIFIED_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_mWdQ54O_V2N2yiiURAIMvMg_671m1Ieo";

const configuredUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const configuredKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();

// Only accept build-time configuration that points to this project's verified
// public endpoint and verified publishable key. If the host injects an empty,
// truncated, placeholder, or different-project value, keep the browser on the
// known-good project configuration instead of sending an invalid API key.
const hasValidBuildConfig =
  configuredUrl === VERIFIED_SUPABASE_URL &&
  configuredKey === VERIFIED_SUPABASE_PUBLISHABLE_KEY;

export const SUPABASE_URL = hasValidBuildConfig
  ? configuredUrl
  : VERIFIED_SUPABASE_URL;

export const SUPABASE_ANON_KEY = hasValidBuildConfig
  ? configuredKey
  : VERIFIED_SUPABASE_PUBLISHABLE_KEY;

if (!hasValidBuildConfig && (configuredUrl || configuredKey)) {
  console.warn("[supabase] Ignoring invalid build-time client configuration.", {
    urlMatchesProject: configuredUrl === VERIFIED_SUPABASE_URL,
    keyPrefix: configuredKey?.slice(0, 15) || "missing",
    keyLength: configuredKey?.length || 0,
  });
}
