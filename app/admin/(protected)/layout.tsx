import Link from "next/link";

const links = [
  ["概览", "/admin"],
  ["配置", "/admin/configs"],
  ["分组", "/admin/groups"],
  ["通知", "/admin/notifications"],
  ["设置", "/admin/settings"],
] as const;

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-muted/20">
      <header className="border-b bg-background">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link href="/admin" className="font-semibold">Nbility Status 管理</Link>
          <nav className="flex flex-wrap items-center gap-1">
            {links.map(([label, href]) => (
              <Link key={href} href={href} className="rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground">
                {label}
              </Link>
            ))}
            <form action="/api/admin/auth/signout" method="post">
              <button type="submit" className="rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground">退出</button>
            </form>
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6">{children}</main>
    </div>
  );
}
