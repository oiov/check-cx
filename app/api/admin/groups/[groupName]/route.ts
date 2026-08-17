import { NextResponse, type NextRequest } from "next/server";

import { getAdminClaims } from "@/lib/admin/auth";
import { createAdminClient } from "@/lib/supabase/admin";

interface Context { params: Promise<{ groupName: string }> }
async function authenticated() { return Boolean(await getAdminClaims()); }

export async function PUT(request: NextRequest, context: Context) {
  if (!(await authenticated())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { groupName } = await context.params;
  const body = await request.json();
  const { error } = await createAdminClient().from("group_info").update({
    display_name: body.display_name ? String(body.display_name).trim() : null,
    description: body.description ? String(body.description).trim() : null,
    website_url: body.website_url ? String(body.website_url).trim() : null,
    icon_url: body.icon_url ? String(body.icon_url).trim() : null,
    tags: body.tags ? String(body.tags).trim() : "",
  }).eq("group_name", decodeURIComponent(groupName));
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(_: NextRequest, context: Context) {
  if (!(await authenticated())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { groupName } = await context.params;
  const { error } = await createAdminClient().from("group_info").delete().eq("group_name", decodeURIComponent(groupName));
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
