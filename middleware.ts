import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  if (req.nextUrl.pathname.startsWith("/admin")) {
    // Fresh session name first (login sets av_session2), legacy fallback.
    const session = req.cookies.get("av_session2")?.value || req.cookies.get("av_session")?.value;
    if (!session) {
      return NextResponse.redirect(new URL("/login", req.url));
    }
  }
}

export const config = {
  matcher: ["/admin/:path*"],
};
