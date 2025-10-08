import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';
import { hasRouteAccess, getUnauthorizedRedirect } from '@/lib/rbac';

// ============================================
// CONFIGURACIÓN DE RUTAS
// ============================================

/**
 * Rutas públicas que NO requieren autenticación
 */
const PUBLIC_ROUTES = [
  '/auth/login',
  '/auth/register',
  '/auth/forgot-password',
  '/auth/reset-password',
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
];

/**
 * Rutas protegidas que requieren autenticación
 */
const PROTECTED_ROUTES = [
  '/',
  '/dashboard',
  '/onboarding',
];

/**
 * Rutas de API que requieren autenticación
 */
const PROTECTED_API_ROUTES = [
  '/api/auth/logout',
];

// ============================================
// HELPERS
// ============================================

/**
 * Verifica si una ruta es pública
 */
function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some(route => pathname.startsWith(route));
}

/**
 * Verifica si una ruta es protegida
 */
function isProtectedRoute(pathname: string): boolean {
  return PROTECTED_ROUTES.some(route => pathname.startsWith(route));
}

/**
 * Verifica si es una ruta de API protegida
 */
function isProtectedApiRoute(pathname: string): boolean {
  return PROTECTED_API_ROUTES.some(route => pathname.startsWith(route));
}

/**
 * Verifica si es una ruta de onboarding
 */
function isOnboardingRoute(pathname: string): boolean {
  return pathname.startsWith('/onboarding');
}

/**
 * Verifica si es una ruta de dashboard
 */
function isDashboardRoute(pathname: string): boolean {
  return pathname.startsWith('/dashboard');
}

/**
 * Crea respuesta de redirect a login
 */
function redirectToLogin(request: NextRequest, clearCookie = false): NextResponse {
  const loginUrl = new URL('/auth/login', request.url);
  loginUrl.searchParams.set('redirect', request.nextUrl.pathname);

  const response = NextResponse.redirect(loginUrl);

  if (clearCookie) {
    response.cookies.delete('auth-token');
  }

  return response;
}

/**
 * Crea respuesta de redirect a onboarding
 */
function redirectToOnboarding(request: NextRequest): NextResponse {
  const onboardingUrl = new URL('/onboarding', request.url);
  return NextResponse.redirect(onboardingUrl);
}

/**
 * Crea respuesta de redirect a dashboard
 */
function redirectToDashboard(request: NextRequest): NextResponse {
  const dashboardUrl = new URL('/dashboard', request.url);
  return NextResponse.redirect(dashboardUrl);
}

// ============================================
// MIDDLEWARE PRINCIPAL
// ============================================

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Permitir rutas públicas sin verificación
  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }

  // 2. Verificar autenticación en rutas protegidas y API protegida
  const requiresAuth = isProtectedRoute(pathname) || isProtectedApiRoute(pathname);

  if (requiresAuth) {
    // Obtener token de la cookie
    const token = request.cookies.get('auth-token')?.value;

    // No hay token → redirigir a login
    if (!token) {
      return redirectToLogin(request);
    }

    try {
      // Verificar JWT usando jose (compatible con Edge Runtime)
      const secret = new TextEncoder().encode(process.env.JWT_SECRET);

      if (!secret || secret.length === 0) {
        console.error('JWT_SECRET is not defined in environment variables');
        return redirectToLogin(request, true);
      }

      const { payload } = await jwtVerify(token, secret);

      // Validar payload
      if (!payload || !payload.userId) {
        console.warn('Invalid token payload');
        return redirectToLogin(request, true);
      }

      // Extraer datos del usuario del JWT
      const userId = payload.userId as string;
      const email = payload.email as string;
      const role = payload.role as string;
      const organizationId = payload.organizationId as string | null;
      const storeId = payload.storeId as string | null | undefined;

      // 4. Role-based redirects

      // Usuario en onboarding pero ya tiene organización → redirect a dashboard
      if (isOnboardingRoute(pathname) && organizationId) {
        return redirectToDashboard(request);
      }

      // Usuario sin organización intenta acceder a dashboard → redirect a onboarding
      if (isDashboardRoute(pathname) && !organizationId) {
        return redirectToOnboarding(request);
      }

      // 5. Role-based route access control
      if (isDashboardRoute(pathname)) {
        const hasAccess = hasRouteAccess(role, pathname);

        if (!hasAccess) {
          console.warn(`User with role ${role} attempted to access restricted route: ${pathname}`);
          const redirectPath = getUnauthorizedRedirect();
          const redirectUrl = new URL(redirectPath, request.url);
          return NextResponse.redirect(redirectUrl);
        }
      }

      // 3. Agregar user info a headers para acceso en server components
      const response = NextResponse.next();

      // Agregar headers con información del usuario
      response.headers.set('x-user-id', userId);
      response.headers.set('x-user-email', email);
      response.headers.set('x-user-role', role);

      if (organizationId) {
        response.headers.set('x-organization-id', organizationId);
      }

      if (storeId) {
        response.headers.set('x-store-id', storeId);
      }

      // JWT válido → permitir acceso
      return response;

    } catch (error) {
      // Error verificando token (expirado, malformado, etc.)
      console.error('JWT verification error:', error);
      return redirectToLogin(request, true);
    }
  }

  // Otras rutas → permitir acceso
  return NextResponse.next();
}

// ============================================
// CONFIGURACIÓN DEL MATCHER
// ============================================

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)$).*)',
  ],
};
