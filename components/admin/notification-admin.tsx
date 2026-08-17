"use client";

import { useCallback, useEffect, useState } from "react";
import { Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

interface Notice { id: string; message: string; level: "info" | "warning" | "error"; is_active: boolean }
export function NotificationAdmin() {
  const [rows, setRows] = useState<Notice[]>([]);
  const [message, setMessage] = useState("");
  const [level, setLevel] = useState<Notice["level"]>("info");
  const [active, setActive] = useState(true);
  const load = useCallback(async () => { const response = await fetch("/api/admin/notifications", { cache: "no-store" }); if (response.ok) setRows(await response.json()); }, []);
  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
  }, [load]);
  async function create() { if (!message.trim()) return; await fetch("/api/admin/notifications", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message, level, is_active: active }) }); setMessage(""); await load(); }
  async function toggle(row: Notice) { await fetch(`/api/admin/notifications/${row.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ is_active: !row.is_active }) }); await load(); }
  async function remove(row: Notice) { await fetch(`/api/admin/notifications/${row.id}`, { method: "DELETE" }); await load(); }
  return <div className="flex flex-col gap-4"><div><h1 className="text-xl font-semibold">通知管理</h1><p className="text-sm text-muted-foreground">支持 Markdown 的站点通知。</p></div><div className="rounded-lg border bg-background p-4"><div className="flex flex-col gap-3"><Textarea value={message} onChange={(event) => setMessage(event.target.value)} placeholder="输入通知内容" rows={4} /><div className="flex flex-wrap items-center gap-3"><Select value={level} onValueChange={(value) => setLevel(value as Notice["level"])}><SelectTrigger className="w-32"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="info">info</SelectItem><SelectItem value="warning">warning</SelectItem><SelectItem value="error">error</SelectItem></SelectContent></Select><label className="flex items-center gap-2 text-sm"><Switch checked={active} onCheckedChange={setActive} />立即启用</label><Button onClick={() => void create()}>发布通知</Button></div></div></div><div className="divide-y rounded-lg border bg-background">{rows.map((row) => <div key={row.id} className="flex items-start gap-3 p-4"><div className="flex-1 whitespace-pre-wrap text-sm">{row.message}<div className="mt-2 text-xs text-muted-foreground">{row.level}</div></div><Switch checked={row.is_active} onCheckedChange={() => void toggle(row)} /><Button size="icon-sm" variant="ghost" title="删除" onClick={() => void remove(row)}><Trash2 /></Button></div>)}{rows.length === 0 ? <p className="p-8 text-center text-sm text-muted-foreground">暂无通知</p> : null}</div></div>;
}
