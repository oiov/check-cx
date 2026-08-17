import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

const CACHE_TTL_MS = 30_000;

let cache: Record<string, string> = {};
let cacheUpdatedAt = 0;
let refreshPromise: Promise<void> | null = null;

export function getSiteSettingSync(key: string, fallback: string): string {
  return cache[key] ?? fallback;
}

export async function refreshSiteSettings(options?: {
  force?: boolean;
}): Promise<void> {
  const force = options?.force ?? false;
  if (!force && Date.now() - cacheUpdatedAt < CACHE_TTL_MS) {
    return;
  }

  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("site_settings")
      .select("key, value");

    if (error) {
      throw error;
    }

    const nextCache: Record<string, string> = {};
    for (const row of data ?? []) {
      if (typeof row.key === "string" && row.value != null) {
        nextCache[row.key] = String(row.value);
      }
    }

    cache = nextCache;
    cacheUpdatedAt = Date.now();
  })().finally(() => {
    refreshPromise = null;
  });

  return refreshPromise;
}

export async function getAllSiteSettings(): Promise<Record<string, string>> {
  await refreshSiteSettings();
  return { ...cache };
}
