import "server-only";

import { createHash, randomBytes } from "node:crypto";

import { createAdminClient } from "@/lib/supabase/admin";

export interface SchedulerTokenRecord {
  id: string;
  name: string;
  tokenPrefix: string;
  scope: string;
  enabled: boolean;
  lastUsedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
}

interface SchedulerTokenRow {
  id: string;
  name: string;
  token_prefix: string;
  scope: string;
  enabled: boolean;
  last_used_at: string | null;
  expires_at: string | null;
  created_at: string;
}

const TOKEN_PREFIX = "ckcx_sk_";
const columns = "id,name,token_prefix,scope,enabled,last_used_at,expires_at,created_at";
const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");
const mapRow = (row: SchedulerTokenRow): SchedulerTokenRecord => ({
  id: row.id,
  name: row.name,
  tokenPrefix: row.token_prefix,
  scope: row.scope,
  enabled: row.enabled,
  lastUsedAt: row.last_used_at,
  expiresAt: row.expires_at,
  createdAt: row.created_at,
});

export async function listSchedulerTokens(): Promise<SchedulerTokenRecord[]> {
  const { data, error } = await createAdminClient().from("scheduler_tokens").select(columns).order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row) => mapRow(row as SchedulerTokenRow));
}

export async function createSchedulerToken(name: string) {
  const rawToken = `${TOKEN_PREFIX}${randomBytes(24).toString("base64url")}`;
  const { data, error } = await createAdminClient().from("scheduler_tokens").insert({
    name: name.trim(),
    token_hash: hashToken(rawToken),
    token_prefix: rawToken.slice(0, 16),
    scope: "checks:run",
  }).select(columns).single();
  if (error || !data) throw error ?? new Error("创建 Token 失败");
  return { record: mapRow(data as SchedulerTokenRow), rawToken };
}

export async function verifySchedulerToken(token: string): Promise<SchedulerTokenRecord | null> {
  if (!token) return null;
  const { data, error } = await createAdminClient().from("scheduler_tokens").select(columns).eq("token_hash", hashToken(token)).eq("enabled", true).maybeSingle();
  if (error || !data) return null;
  const row = data as SchedulerTokenRow;
  if (row.expires_at && Date.parse(row.expires_at) <= Date.now()) return null;
  return mapRow(row);
}

export async function touchSchedulerToken(id: string): Promise<void> {
  await createAdminClient().from("scheduler_tokens").update({ last_used_at: new Date().toISOString() }).eq("id", id);
}

export async function setSchedulerTokenEnabled(id: string, enabled: boolean): Promise<void> {
  const { error } = await createAdminClient().from("scheduler_tokens").update({ enabled }).eq("id", id);
  if (error) throw error;
}

export async function deleteSchedulerToken(id: string): Promise<void> {
  const { error } = await createAdminClient().from("scheduler_tokens").delete().eq("id", id);
  if (error) throw error;
}
