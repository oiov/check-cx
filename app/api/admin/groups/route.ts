import { NextResponse, type NextRequest } from "next/server";

import { getAdminClaims } from "@/lib/admin/auth";
import { createAdminClient } from "@/lib/supabase/admin";

async function authenticated() { return Boolean(await getAdminClaims()); }

export async function GET() {
  if (!(await authenticated())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data, error } = await createAdminClient().from("group_info").select("*").order("group_name");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(request: NextRequest) {
  if (!(await authenticated())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await request.json();
  const groupName = String(body.group_name ?? "").trim();
  if (!groupName) return NextResponse.json({ error: "group_name 必填" }, { status: 400 });
  const { error } = await createAdminClient().from("group_info").insert({
    group_name: groupName,
    display_name: body.display_name ? String(body.display_name).trim() : null,
    description: body.description ? String(body.description).trim() : null,
    website_url: body.website_url ? String(body.website_url).trim() : null,
    icon_url: body.icon_url ? String(body.icon_url).trim() : null,
    tags: body.tags ? String(body.tags).trim() : "",
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true }, { status: 201 });
}
