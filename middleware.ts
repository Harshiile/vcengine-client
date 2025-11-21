import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
    const token = req.cookies.get("auth-acs")?.value;

    // If no token → redirect to login
    if (!token) {
        return NextResponse.redirect(new URL("/login", req.url));
    }

    // Allow request
    return NextResponse.next();
}

// Protect specific routes
export const config = {
    matcher: [
        "/dashboard/:path*",
        "/upload/:path*",
        "/video-player/:path*",
        "/workspace/:path*",
        "/edit/:path*",
    ],
};
