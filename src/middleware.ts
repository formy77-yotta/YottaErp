/**
 * Middleware di Sicurezza per YottaErp
 * 
 * SICUREZZA CRITICA:
 * - Protegge route admin (solo Super Admin)
 * - Verifica autenticazione
 * - Previene accesso non autorizzato
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * Lista Super Admin IDs da .env (DEPRECATO - ora usiamo flag DB)
 * 
 * NOTA: Questa variabile è mantenuta per backwards compatibility
 * ma ora si usa il campo `isSuperAdmin` nel database
 */
const SUPER_ADMIN_IDS = process.env.SUPER_ADMIN_IDS?.split(',').map(id => id.trim()) || [];

/**
 * Verifica se l'utente è Super Admin
 * 
 * SICUREZZA:
 * 1. Legge userId da cookie
 * 2. Verifica nel database se l'utente è Super Admin
 * 3. In development, puoi abilitare debug mode
 */
async function isSuperAdmin(request: NextRequest): Promise<{ isAdmin: boolean; userId?: string }> {
  // Leggi userId da cookie
  const userId = request.cookies.get('userId')?.value;
  
  if (!userId) {
    console.warn('[AUTH] Tentativo accesso senza userId cookie');
    return { isAdmin: false };
  }
  
  // In development, puoi bypassare il controllo (RIMUOVI IN PRODUZIONE!)
  if (process.env.NODE_ENV === 'development' && process.env.DEV_BYPASS_AUTH === 'true') {
    console.warn('[AUTH] ⚠️ DEVELOPMENT MODE: Bypass autenticazione attivo!');
    return { isAdmin: true, userId };
  }
  
  try {
    // Verifica nel database se l'utente è Super Admin
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { 
        id: true, 
        isSuperAdmin: true,
        active: true 
      },
    });

    if (!user || !user.active) {
      console.warn(`[AUTH] User ${userId} non trovato o disattivato`);
      return { isAdmin: false, userId };
    }

    const isAdmin = user.isSuperAdmin;
    
    if (!isAdmin) {
      console.warn(`[AUTH] Accesso negato per userId: ${userId} (non Super Admin)`);
    }
    
    return { isAdmin, userId };
  } catch (error) {
    console.error('[AUTH] Errore verifica Super Admin:', error);
    return { isAdmin: false, userId };
  }
}

/**
 * Middleware principale
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  console.log(`[MIDDLEWARE] ${request.method} ${pathname}`);
  
  // ===== PROTEZIONE ROUTE ORGANIZATIONS (SUPER ADMIN ONLY) =====
  if (pathname.startsWith('/organizations')) {
    const { isAdmin, userId } = await isSuperAdmin(request);
    
    if (!isAdmin) {
      console.error(`[SECURITY] ❌ Tentativo accesso non autorizzato a ${pathname}`);
      
      // Redirect a pagina di accesso negato
      const url = request.nextUrl.clone();
      url.pathname = '/access-denied';
      url.searchParams.set('reason', 'super_admin_required');
      url.searchParams.set('from', pathname);
      
      return NextResponse.redirect(url);
    }
    
    console.log(`[SECURITY] ✅ Super Admin ${userId} accede a ${pathname}`);
  }
  
  // ===== PROTEZIONE ROUTE STANDARD (AUTENTICAZIONE BASE) =====
  // Esempio: Proteggi tutte le route tranne public
  const publicRoutes = ['/', '/login', '/register', '/access-denied'];
  
  if (!publicRoutes.some(route => pathname === route || pathname.startsWith('/api/public'))) {
    const userId = request.cookies.get('userId')?.value;
    
    if (!userId) {
      // Redirect al login
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      url.searchParams.set('callbackUrl', pathname);
      
      return NextResponse.redirect(url);
    }
  }
  
  return NextResponse.next();
}

/**
 * Config: specifica quali route passano dal middleware
 * 
 * NOTA: Il matcher viene eseguato PRIMA delle funzioni middleware
 */
export const config = {
  matcher: [
    /*
     * Match tutte le route tranne:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * - file pubblici (*.png, *.jpg, ecc.)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico)$).*)',
  ],
};
