"use client";

import { useCallback, useEffect, useState } from "react";
import { Copy, Power, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface Setting { key: string; value: string | null; description: string | null; editable: boolean; value_type: string }
interface Token { id: string; name: string; tokenPrefix: string; enabled: boolean; lastUsedAt: string | null; createdAt: string }
const siteKeys = ["site.title", "site.description", "site.url", "site.keywords", "site.logo_url", "site.favicon_url", "site.github_url"];

export function SettingsAdmin() {
  const [settings, setSettings] = useState<Setting[]>([]);
  const [site, setSite] = useState<Record<string, string>>({});
  const [tokens, setTokens] = useState<Token[]>([]);
  const [tokenName, setTokenName] = useState("");
  const [issuedToken, setIssuedToken] = useState("");
  const [message, setMessage] = useState("");
  const load = useCallback(async () => {
    const [settingsResponse, siteResponse, tokenResponse] = await Promise.all([fetch("/api/admin/settings"), fetch("/api/admin/site-config"), fetch("/api/admin/scheduler-tokens")]);
    if (settingsResponse.ok) setSettings(await settingsResponse.json());
    if (siteResponse.ok) setSite(Object.fromEntries((await siteResponse.json()).map((row: { key: string; value: string | null }) => [row.key, row.value ?? ""])));
    if (tokenResponse.ok) setTokens(await tokenResponse.json());
  }, []);
  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);
  async function saveSetting(key: string, value: string) { const response = await fetch(`/api/admin/settings/${encodeURIComponent(key)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ value }) }); setMessage(response.ok ? `${key} 已保存` : "保存失败"); await load(); }
  async function createToken() { if (!tokenName.trim()) return; const response = await fetch("/api/admin/scheduler-tokens", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: tokenName }) }); const data = await response.json(); if (!response.ok) { setMessage(data.error ?? "创建失败"); return; } setIssuedToken(data.rawToken ?? ""); setTokenName(""); setMessage("Token 已创建，仅展示一次"); await load(); }
  async function toggleToken(token: Token) { await fetch(`/api/admin/scheduler-tokens/${token.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ enabled: !token.enabled }) }); await load(); }
  async function removeToken(token: Token) { if (!window.confirm(`确认删除 ${token.name}？`)) return; await fetch(`/api/admin/scheduler-tokens/${token.id}`, { method: "DELETE" }); await load(); }
  return <div className="flex flex-col gap-6"><div><h1 className="text-xl font-semibold">系统设置</h1><p className="text-sm text-muted-foreground">运行参数从数据库读取，轮询下一轮会应用修改。</p></div>
    <section className="rounded-lg border bg-background p-4"><h2 className="mb-4 font-medium">站点元数据</h2><div className="grid gap-4 sm:grid-cols-2">{siteKeys.map((key) => <div key={key} className="flex flex-col gap-2"><Label htmlFor={`site-${key}`}>{key}</Label><Input id={`site-${key}`} value={site[key] ?? ""} onChange={(event) => setSite((current) => ({ ...current, [key]: event.target.value }))} onBlur={() => void saveSetting(key, site[key] ?? "")} /></div>)}</div></section>
    <section className="rounded-lg border bg-background p-4"><h2 className="mb-4 font-medium">运行参数</h2><div className="divide-y">{settings.filter((setting) => !siteKeys.includes(setting.key)).map((setting) => <div key={setting.key} className="flex flex-wrap items-center gap-3 py-3"><div className="min-w-52 flex-1"><div className="font-mono text-sm">{setting.key}</div><div className="text-xs text-muted-foreground">{setting.description}</div></div><Input className="max-w-48" defaultValue={setting.value ?? ""} type={setting.value_type === "number" ? "number" : "text"} onBlur={(event) => void saveSetting(setting.key, event.target.value)} /></div>)}</div>{message ? <p className="mt-3 text-sm text-muted-foreground">{message}</p> : null}</section>
    <section className="rounded-lg border bg-background p-4"><h2 className="mb-4 font-medium">Scheduler Token</h2><div className="flex flex-wrap gap-2"><Input className="max-w-64" placeholder="调用方名称" value={tokenName} onChange={(event) => setTokenName(event.target.value)} /><Button onClick={() => void createToken()}>创建 Token</Button></div>{issuedToken ? <div className="mt-3 flex items-center gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 p-3 font-mono text-xs break-all"><span className="flex-1">{issuedToken}</span><Button size="icon-sm" variant="ghost" title="复制" onClick={() => void navigator.clipboard.writeText(issuedToken)}><Copy /></Button></div> : null}<div className="mt-4 divide-y">{tokens.map((token) => <div key={token.id} className="flex flex-wrap items-center gap-3 py-3"><div className="flex-1"><div className="font-medium">{token.name}</div><div className="font-mono text-xs text-muted-foreground">{token.tokenPrefix}</div></div><Button size="sm" variant="outline" onClick={() => void toggleToken(token)}><Power data-icon="inline-start" />{token.enabled ? "停用" : "启用"}</Button><Button size="icon-sm" variant="ghost" title="删除" onClick={() => void removeToken(token)}><Trash2 /></Button></div>)}</div></section>
  </div>;
}
