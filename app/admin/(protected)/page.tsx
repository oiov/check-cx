import Link from "next/link";

export default function AdminHomePage() {
  return <div className="flex flex-col gap-4"><h1 className="text-xl font-semibold">管理概览</h1><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[["配置", "/admin/configs", "管理模型端点、密钥和执行模式"], ["分组", "/admin/groups", "维护前台分组显示信息"], ["通知", "/admin/notifications", "发布或停用站点通知"], ["设置", "/admin/settings", "站点元数据、轮询和 scheduler token"]].map(([title, href, description]) => <Link key={href} href={href} className="rounded-lg border bg-background p-4 transition hover:border-foreground/30"><div className="font-medium">{title}</div><div className="mt-1 text-sm text-muted-foreground">{description}</div></Link>)}</div></div>;
}
