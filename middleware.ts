import { auth } from "@/auth";
import { NextResponse } from "next/server";

const roleRoutes: Record<string, string[]> = {
  "/cliente": ["cliente"],
  "/operador": ["OPERADOR", "ADMINISTRADOR"],
  "/admin": ["ADMINISTRADOR"],
};

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;

  const matchedPrefix = Object.keys(roleRoutes).find((prefix) =>
    pathname.startsWith(prefix)
  );

  if (!matchedPrefix) return NextResponse.next();

  if (!session) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const allowedRoles = roleRoutes[matchedPrefix];
  const userRole = session.user?.role;

  if (!allowedRoles.includes(userRole)) {
    // Redirect to correct home based on role
    if (userRole === "cliente") return NextResponse.redirect(new URL("/cliente", req.url));
    if (userRole === "OPERADOR") return NextResponse.redirect(new URL("/operador", req.url));
    if (userRole === "ADMINISTRADOR") return NextResponse.redirect(new URL("/admin", req.url));
    return NextResponse.redirect(new URL("/", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/cliente/:path*", "/operador/:path*", "/admin/:path*"],
};
