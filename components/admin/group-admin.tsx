"use client";

import { useCallback, useEffect, useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface GroupRow { group_name: string; display_name: string | null; description: string | null; website_url: string | null; icon_url: string | null; tags: string | null }
interface FormState { group_name: string; display_name: string; description: string; website_url: string; icon_url: string; tags: string }
const emptyForm = (): FormState => ({ group_name: "", display_name: "", description: "", website_url: "", icon_url: "", tags: "" });

export function GroupAdmin() {
  const [rows, setRows] = useState<GroupRow[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editing, setEditing] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const load = useCallback(async () => { const response = await fetch("/api/admin/groups", { cache: "no-store" }); if (response.ok) setRows(await response.json()); }, []);
  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);
  const update = <K extends keyof FormState>(key: K, value: string) => setForm((current) => ({ ...current, [key]: value }));
  function edit(row: GroupRow) { setEditing(row.group_name); setForm({ group_name: row.group_name, display_name: row.display_name ?? "", description: row.description ?? "", website_url: row.website_url ?? "", icon_url: row.icon_url ?? "", tags: row.tags ?? "" }); }
  async function save() {
    const name = form.group_name.trim();
    if (!name) { setMessage("group_name 必填"); return; }
    const response = await fetch(editing ? `/api/admin/groups/${encodeURIComponent(editing)}` : "/api/admin/groups", { method: editing ? "PUT" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    if (!response.ok) { setMessage((await response.json().catch(() => ({}))).error ?? "保存失败"); return; }
    setEditing(null); setForm(emptyForm()); setMessage(""); await load();
  }
  async function remove(name: string) { if (!window.confirm(`确认删除分组“${name}”？`)) return; await fetch(`/api/admin/groups/${encodeURIComponent(name)}`, { method: "DELETE" }); await load(); }
  return <div className="flex flex-col gap-4">
    <div><h1 className="text-xl font-semibold">分组管理</h1><p className="text-sm text-muted-foreground">显示名、描述、图标和标签会用于前台分组页。</p></div>
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div className="overflow-x-auto rounded-lg border bg-background"><table className="w-full text-sm"><thead className="border-b bg-muted/50 text-left text-xs text-muted-foreground"><tr><th className="p-3">标识</th><th className="p-3">显示名</th><th className="p-3">描述</th><th className="p-3 text-right">操作</th></tr></thead><tbody>{rows.map((row) => <tr key={row.group_name} className="border-b last:border-0"><td className="p-3 font-mono">{row.group_name}</td><td className="p-3">{row.display_name || row.group_name}</td><td className="max-w-[260px] truncate p-3 text-muted-foreground">{row.description || "-"}</td><td className="p-3"><div className="flex justify-end gap-1"><Button size="icon-sm" variant="ghost" onClick={() => edit(row)} title="编辑"><Pencil /></Button><Button size="icon-sm" variant="ghost" onClick={() => void remove(row.group_name)} title="删除"><Trash2 /></Button></div></td></tr>)}{rows.length === 0 && <tr><td colSpan={4} className="p-8 text-center text-muted-foreground">暂无分组</td></tr>}</tbody></table></div>
      <div className="flex flex-col gap-3 rounded-lg border bg-background p-4"><div className="flex items-center justify-between"><h2 className="font-medium">{editing ? "编辑分组" : "新建分组"}</h2>{editing ? <Button size="sm" variant="ghost" onClick={() => { setEditing(null); setForm(emptyForm()); }}>取消</Button> : null}</div>{(["group_name", "display_name", "website_url", "icon_url", "tags"] as const).map((key) => <div key={key} className="flex flex-col gap-2"><Label htmlFor={`group-${key}`}>{key}</Label><Input id={`group-${key}`} value={form[key]} disabled={editing !== null && key === "group_name"} onChange={(event) => update(key, event.target.value)} /></div>)}<div className="flex flex-col gap-2"><Label htmlFor="group-description">description</Label><Textarea id="group-description" value={form.description} onChange={(event) => update("description", event.target.value)} rows={4} /></div>{message ? <p className="text-sm text-destructive">{message}</p> : null}<Button onClick={() => void save()}><Plus data-icon="inline-start" />{editing ? "保存分组" : "创建分组"}</Button></div>
    </div>
  </div>;
}
