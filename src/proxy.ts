/**
 * Proxy di Sicurezza per YottaErp
 * 
 * SICUREZZA CRITICA:
 * - Protegge route admin (solo Super Admin)
 * - Verifica autenticazione
 * - Previene accesso non autorizzato
 * 
 * NOTA: In Next.js 16+, il middleware è stato rinominato in "proxy"
 * per chiarire meglio il suo scopo di intercettare richieste a livello di rete.
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Lista Super Admin IDs da .env
 * 
 * NOTA: Questa è una verifica leggera per il proxy (Node.js Runtime).
 * La verifica completa con database avviene nelle Server Actions (Node.js runtime).
 * 
 * Per configurare Super Admin, aggiungi al .env:
 * SUPER_ADMIN_IDS=user_id_1,user_id_2,user_id_3
 */
const SUPER_ADMIN_IDS = process.env.SUPER_ADMIN_IDS?.split(',').map(id => id.trim()).filter(Boolean) || [];

/**
 * Verifica se l'utente è Super Admin (verifica leggera per proxy)
 * 
 * SICUREZZA:
 * 1. Legge userId da cookie
 * 2. Verifica se userId è nella lista SUPER_ADMIN_IDS da env
 * 3. In development, puoi abilitare bypass mode
 * 
 * NOTA: Questa è solo una PRIMA LINEA di difesa. La verifica completa
 * con database avviene nelle Server Actions che girano in Node.js runtime.
 */
function isSuperAdmin(request: NextRequest): { isAdmin: boolean; userId?: string } {
  const userId = request.cookies.get('userId')?.value;
  
  if (!userId) {
    return { isAdmin: false };
  }
  
  // In development, puoi bypassare il controllo (RIMUOVI IN PRODUZIONE!)
  if (process.env.NODE_ENV === 'development' && process.env.DEV_BYPASS_AUTH === 'true') {
    return { isAdmin: true, userId };
  }
  
  // Verifica se userId è nella lista Super Admin da env
  const isAdmin = SUPER_ADMIN_IDS.length > 0 && SUPER_ADMIN_IDS.includes(userId);
  
  return { isAdmin, userId };
}

/**
 * Proxy principale
 * 
 * Intercetta tutte le richieste e applica controlli di sicurezza.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // ===== PROTEZIONE ROUTE ORGANIZATIONS (SUPER ADMIN ONLY) =====
  // NOTA: La verifica completa avviene nel layout (admin)/layout.tsx che legge dal database
  // Questo è solo un controllo leggero per performance (opzionale)
  // Se SUPER_ADMIN_IDS non è configurato, il layout gestirà la verifica completa
  if (pathname.startsWith('/organizations')) {
    // Se SUPER_ADMIN_IDS è configurato, fai un controllo leggero
    if (SUPER_ADMIN_IDS.length > 0) {
      const { isAdmin } = isSuperAdmin(request);
      
      if (!isAdmin) {
        // Redirect a pagina di accesso negato
        const url = request.nextUrl.clone();
        url.pathname = '/access-denied';
        url.searchParams.set('reason', 'super_admin_required');
        url.searchParams.set('from', pathname);
        
        return NextResponse.redirect(url);
      }
    }
    // Se SUPER_ADMIN_IDS non è configurato, lascia che il layout gestisca la verifica
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
 * Config: specifica quali route passano dal proxy
 * 
 * NOTA: Il matcher viene eseguito PRIMA della funzione proxy
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
