"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Play, Plus, RefreshCw, Trash2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

interface ConfigRow {
  id: string;
  name: string;
  type: string;
  model: string;
  endpoint: string;
  api_key: string;
  enabled: boolean;
  is_maintenance: boolean;
  group_name: string | null;
  request_header: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  stream_mode: "stream" | "generate" | null;
}

interface FormState {
  name: string;
  type: string;
  model: string;
  endpoint: string;
  api_key: string;
  group_name: string;
  request_header: string;
  metadata: string;
  stream_mode: "stream" | "generate";
  enabled: boolean;
  is_maintenance: boolean;
}

const emptyForm = (): FormState => ({
  name: "",
  type: "openai",
  model: "",
  endpoint: "https://api.openai.com/v1/chat/completions",
  api_key: "",
  group_name: "",
  request_header: "",
  metadata: "",
  stream_mode: "stream",
  enabled: true,
  is_maintenance: false,
});

export function ConfigAdmin() {
  const [rows, setRows] = useState<ConfigRow[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editing, setEditing] = useState<ConfigRow | null>(null);
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    const response = await fetch("/api/admin/configs", { cache: "no-store" });
    if (response.ok) setRows(await response.json());
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);

  const updateForm = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  function startCreate() {
    setEditing(null);
    setForm(emptyForm());
    setMessage("");
    setOpen(true);
  }

  function startEdit(row: ConfigRow) {
    setEditing(row);
    setForm({
      name: row.name,
      type: row.type,
      model: row.model,
      endpoint: row.endpoint,
      api_key: "",
      group_name: row.group_name ?? "",
      request_header: row.request_header ? JSON.stringify(row.request_header, null, 2) : "",
      metadata: row.metadata ? JSON.stringify(row.metadata, null, 2) : "",
      stream_mode: row.stream_mode === "generate" ? "generate" : "stream",
      enabled: row.enabled,
      is_maintenance: row.is_maintenance,
    });
    setMessage("");
    setOpen(true);
  }

  async function save() {
    let requestHeader: unknown = null;
    let metadata: unknown = null;
    try {
      requestHeader = form.request_header.trim() ? JSON.parse(form.request_header) : null;
      metadata = form.metadata.trim() ? JSON.parse(form.metadata) : null;
    } catch {
      setMessage("request header 或 metadata 不是有效 JSON");
      return;
    }
    const response = await fetch(editing ? `/api/admin/configs/${editing.id}` : "/api/admin/configs", {
      method: editing ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, request_header: requestHeader, metadata }),
    });
    if (!response.ok) {
      setMessage((await response.json().catch(() => ({}))).error ?? "保存失败");
      return;
    }
    setOpen(false);
    await load();
  }

  async function toggle(row: ConfigRow, key: "enabled" | "is_maintenance") {
    await fetch(`/api/admin/configs/${row.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [key]: !row[key] }),
    });
    await load();
  }

  async function remove(row: ConfigRow) {
    if (!window.confirm(`确认删除配置“${row.name}”？历史记录也会按数据库外键删除。`)) return;
    await fetch(`/api/admin/configs/${row.id}`, { method: "DELETE" });
    await load();
  }

  async function test(row: ConfigRow) {
    const response = await fetch(`/api/admin/configs/${row.id}/test`, { method: "POST" });
    const result = await response.json().catch(() => ({}));
    window.alert(`${row.name}: ${result.status ?? "error"} ${result.message ?? ""}`);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex-1"><h1 className="text-xl font-semibold">配置管理</h1><p className="text-sm text-muted-foreground">API key 仅保存于服务端，列表只显示末四位。</p></div>
        <Button variant="outline" onClick={() => void load()}><RefreshCw data-icon="inline-start" />刷新</Button>
        <Button onClick={startCreate}><Plus data-icon="inline-start" />新建配置</Button>
      </div>
      <div className="overflow-x-auto rounded-lg border bg-background">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="border-b bg-muted/50 text-left text-xs text-muted-foreground"><tr><th className="p-3">名称</th><th className="p-3">Provider / 模型</th><th className="p-3">端点</th><th className="p-3">状态</th><th className="p-3 text-right">操作</th></tr></thead>
          <tbody>{rows.map((row) => <tr key={row.id} className="border-b last:border-0">
            <td className="p-3"><div className="font-medium">{row.name}</div><div className="text-xs text-muted-foreground">{row.group_name || "未分组"}</div></td>
            <td className="p-3"><div>{row.type}</div><div className="text-xs text-muted-foreground">{row.model} · {row.stream_mode || "stream"}</div></td>
            <td className="max-w-[280px] truncate p-3 font-mono text-xs" title={row.endpoint}>{row.endpoint}</td>
            <td className="p-3"><div className="flex flex-col gap-2 text-xs"><button onClick={() => void toggle(row, "enabled")} className="flex items-center gap-2 text-left"><span className={`size-2 rounded-full ${row.enabled ? "bg-emerald-500" : "bg-muted-foreground"}`} />{row.enabled ? "启用" : "停用"}</button><button onClick={() => void toggle(row, "is_maintenance")} className="text-left text-muted-foreground">{row.is_maintenance ? "维护中" : "正常"}</button></div></td>
            <td className="p-3"><div className="flex justify-end gap-1"><Button size="icon-sm" variant="ghost" title="测试" onClick={() => void test(row)}><Play /></Button><Button size="icon-sm" variant="ghost" title="编辑" onClick={() => startEdit(row)}><Check /></Button><Button size="icon-sm" variant="ghost" title="删除" onClick={() => void remove(row)}><Trash2 /></Button></div></td>
          </tr>)}{rows.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">暂无配置</td></tr>}</tbody>
        </table>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto"><DialogHeader><DialogTitle>{editing ? "编辑配置" : "新建配置"}</DialogTitle></DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            {(["name", "model", "endpoint", "api_key", "group_name"] as const).map((key) => <div key={key} className="flex flex-col gap-2"><Label htmlFor={`config-${key}`}>{key}</Label><Input id={`config-${key}`} value={form[key]} onChange={(event) => updateForm(key, event.target.value)} placeholder={key === "api_key" && editing ? "留空则保留原 key" : undefined} /></div>)}
            <div className="flex flex-col gap-2"><Label>Provider</Label><Select value={form.type} onValueChange={(value) => updateForm("type", value)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="openai">openai</SelectItem><SelectItem value="gemini">gemini</SelectItem><SelectItem value="anthropic">anthropic</SelectItem></SelectContent></Select></div>
            <div className="flex flex-col gap-2"><Label>执行模式</Label><Select value={form.stream_mode} onValueChange={(value) => updateForm("stream_mode", value as FormState["stream_mode"])}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="stream">stream</SelectItem><SelectItem value="generate">generate</SelectItem></SelectContent></Select></div>
            <div className="flex flex-col gap-2 sm:col-span-2"><Label htmlFor="config-request-header">request header JSON</Label><Textarea id="config-request-header" value={form.request_header} onChange={(event) => updateForm("request_header", event.target.value)} rows={3} /></div>
            <div className="flex flex-col gap-2 sm:col-span-2"><Label htmlFor="config-metadata">metadata JSON</Label><Textarea id="config-metadata" value={form.metadata} onChange={(event) => updateForm("metadata", event.target.value)} rows={3} /></div>
            <label className="flex items-center gap-2 text-sm"><Switch checked={form.enabled} onCheckedChange={(checked) => updateForm("enabled", checked)} />启用</label>
            <label className="flex items-center gap-2 text-sm"><Switch checked={form.is_maintenance} onCheckedChange={(checked) => updateForm("is_maintenance", checked)} />维护模式</label>
          </div>
          {message ? <p className="text-sm text-destructive">{message}</p> : null}
          <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}><X data-icon="inline-start" />取消</Button><Button onClick={() => void save()}><Check data-icon="inline-start" />保存</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
