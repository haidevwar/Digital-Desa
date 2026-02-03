import { type NextRequest, NextResponse } from "next/server"

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  // Public routes that don't require authentication
  const publicRoutes = [
    "/login", 
    "/register", 
    "/api/auth/login", 
    "/api/auth/register",
    "/api/health",
  ]

  if (publicRoutes.includes(pathname)) {
    return NextResponse.next()
  }

  // Check for token in cookie or Authorization header
  if (pathname.startsWith("/api/") || pathname.startsWith("/app/")) {
    const cookieToken = request.cookies.get("token")?.value
    const authHeader = request.headers.get("authorization")
    const bearerToken = authHeader?.startsWith("Bearer ") 
      ? authHeader.substring(7) 
      : null

    const token = cookieToken || bearerToken

    if (!token) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }
      // For app routes, let client-side handle redirect (for offline support)
      // This allows the page to load and check IndexedDB for cached auth
      return NextResponse.next()
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|service-worker.js|manifest.json).*)"],
}
