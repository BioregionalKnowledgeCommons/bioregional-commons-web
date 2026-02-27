import { NextRequest, NextResponse } from "next/server";
import { verifySessionEdge } from "@/lib/auth/verify-session-edge";

const PROTECTED_PATTERNS = [
  /^\/commons\/api\/nodes\/[^/]+\/commons\/decide/,
  /^\/commons\/api\/nodes\/[^/]+\/commons\/resolve-merges/,
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isProtected = PROTECTED_PATTERNS.some((p) => p.test(pathname));
  if (!isProtected) return NextResponse.next();

  const token = request.cookies.get("bkc_session")?.value;
  if (!token) {
    return NextResponse.json(
      { error: "Authentication required" },
      { status: 401 }
    );
  }

  const session = await verifySessionEdge(token);
  if (!session) {
    return NextResponse.json(
      { error: "Invalid or expired session" },
      { status: 401 }
    );
  }

  // JWT is valid at the edge level. Route handler will do full DB check.
  return NextResponse.next();
}

export const config = {
  matcher: ["/commons/api/:path*"],
};
