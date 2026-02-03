import { type NextRequest, NextResponse } from "next/server"

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname

  const publicRoutes = ["/login", "/register", "/api/auth/login", "/api/auth/register"]

  if (publicRoutes.includes(pathname)) {
    return NextResponse.next()
  }

  if (pathname.startsWith("/api/") || pathname.startsWith("/app/")) {
    const token =
      request.headers.get("authorization")?.replace("Bearer ", "") ||
      request.cookies.get("token")?.value

    if (!token) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }
      return NextResponse.redirect(new URL("/login", request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
}
