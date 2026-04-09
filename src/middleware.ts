import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

interface CookieToSet {
  name: string;
  value: string;
  options?: Record<string, unknown>;
}

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  const publicRoutes = ["/", "/register", "/auth/callback"];
  const isPublicRoute = publicRoutes.some(
    (r) => pathname === r || pathname.startsWith("/register/")
  );

  // Helper para copiar cookies de supabaseResponse al redirect
  function redirectWithCookies(url: string) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = url;
    const response = NextResponse.redirect(redirectUrl);
    supabaseResponse.cookies.getAll().forEach(({ name, value, ...rest }) => {
      response.cookies.set(name, value, rest);
    });
    return response;
  }

  if (!user && !isPublicRoute) {
    return redirectWithCookies("/");
  }

  if (user && pathname === "/") {
    return redirectWithCookies("/dashboard");
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
