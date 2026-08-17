import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { checkRateLimit, DASHBOARD_RATE_LIMIT } from "@/lib/utils/rate-limiter";

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get("x-real-ip") ??
    request.headers.get("x-forwarded-for")?.split(",")[0].trim() ??
    "unknown"
  );
}

function applyDashboardRateLimit(request: NextRequest): NextResponse {
  const route = request.nextUrl.pathname.startsWith("/api/group/")
    ? "group"
    : "dashboard";
  const result = checkRateLimit(
    getClientIp(request),
    route,
    DASHBOARD_RATE_LIMIT
  );
  const headers = {
    "X-RateLimit-Limit": String(DASHBOARD_RATE_LIMIT.maxRequests),
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(Math.ceil(result.resetMs / 1000)),
  };

  if (!result.allowed) {
    return NextResponse.json(
      { error: "Too Many Requests" },
      {
        status: 429,
        headers: {
          ...headers,
          "Retry-After": String(Math.ceil(result.resetMs / 1000)),
        },
      }
    );
  }

  const response = NextResponse.next({ request });
  for (const [key, value] of Object.entries(headers)) {
    response.headers.set(key, value);
  }
  return response;
}

export async function middleware(request: NextRequest) {
  if (
    request.nextUrl.pathname === "/api/dashboard" ||
    request.nextUrl.pathname.startsWith("/api/group/")
  ) {
    return applyDashboardRateLimit(request);
  }

  const response = NextResponse.next({ request });
  const supabase = createServerClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_OR_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(cookies) {
          cookies.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const { data } = await supabase.auth.getClaims();
  if (data?.claims) {
    return response;
  }

  if (request.nextUrl.pathname === "/admin/login") {
    return response;
  }

  if (request.nextUrl.pathname.startsWith("/api/admin/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = "/admin/login";
  loginUrl.searchParams.set("next", request.nextUrl.pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    "/api/dashboard",
    "/api/group/:path*",
    "/admin/:path*",
    "/api/admin/:path*",
  ],
};
