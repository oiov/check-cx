import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/server";

interface LoginPageProps {
  searchParams: Promise<{ error?: string; next?: string }>;
}

async function AdminLoginContent({ searchParams }: LoginPageProps) {
  await connection();
  const params = await searchParams;

  async function signIn(formData: FormData) {
    "use server";

    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    const next = String(formData.get("next") ?? "/admin");
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      redirect(`/admin/login?error=${encodeURIComponent("邮箱或密码错误")}`);
    }
    redirect(next.startsWith("/") ? next : "/admin");
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-sm flex-col justify-center gap-6 px-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold">管理后台</h1>
        <p className="text-sm text-muted-foreground">登录后管理配置、分组和站点设置。</p>
      </div>
      {params.error ? (
        <p className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {params.error}
        </p>
      ) : null}
      <form action={signIn} className="flex flex-col gap-4 rounded-lg border p-5">
        <input type="hidden" name="next" value={params.next ?? "/admin"} />
        <div className="flex flex-col gap-2">
          <Label htmlFor="email">邮箱</Label>
          <Input id="email" name="email" type="email" autoComplete="email" required />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="password">密码</Label>
          <Input id="password" name="password" type="password" autoComplete="current-password" required />
        </div>
        <Button type="submit">登录</Button>
      </form>
    </main>
  );
}

export default function AdminLoginPage(props: LoginPageProps) {
  return (
    <Suspense fallback={<main className="min-h-screen" />}>
      <AdminLoginContent {...props} />
    </Suspense>
  );
}
