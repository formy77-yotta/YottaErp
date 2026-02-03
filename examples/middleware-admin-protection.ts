/**
 * Proxy per proteggere le route admin (ESEMPIO)
 * 
 * NOTA: Questo è un esempio. Adattalo al tuo sistema di autenticazione
 * (NextAuth, Clerk, Supabase Auth, ecc.)
 * 
 * POSIZIONAMENTO: src/proxy.ts
 * 
 * NOTA: In Next.js 16+, il middleware è stato rinominato in "proxy"
 * per chiarire meglio il suo scopo di intercettare richieste a livello di rete.
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Verifica se l'utente è Super Admin
 * 
 * NOTA: Questa funzione è un esempio. In produzione dovrebbe:
 * - Verificare il token JWT/session
 * - Controllare il database o cache Redis
 * - Validare i permessi
 */
async function isSuperAdmin(request: NextRequest): Promise<boolean> {
  // ESEMPIO 1: Verifica cookie userId
  const userId = request.cookies.get('userId')?.value;
  
  if (!userId) {
    return false;
  }
  
  // ESEMPIO 2: Lista Super Admin da variabili ambiente
  const superAdminIds = process.env.SUPER_ADMIN_IDS?.split(',') || [];
  
  // In development, tutti sono Super Admin
  if (process.env.NODE_ENV === 'development') {
    return true;
  }
  
  return superAdminIds.includes(userId);
}

/**
 * Proxy Next.js
 * 
 * Protegge le route che iniziano con /admin/
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Verifica se la route richiede protezione Super Admin
  if (pathname.startsWith('/organizations')) {
    const isAdmin = await isSuperAdmin(request);
    
    if (!isAdmin) {
      // Redirect a pagina di accesso negato o login
      const url = request.nextUrl.clone();
      url.pathname = '/access-denied';
      url.searchParams.set('reason', 'super_admin_required');
      return NextResponse.redirect(url);
    }
  }
  
  return NextResponse.next();
}

/**
 * Config: specifica quali route devono passare dal proxy
 */
export const config = {
  matcher: [
    '/organizations/:path*',  // Proteggi route organizations
    // Aggiungi altre route admin qui
  ],
};

/**
 * ESEMPIO ALTERNATIVO CON NEXTAUTH:
 * 
 * import { withAuth } from 'next-auth/middleware';
 * 
 * export default withAuth({
 *   callbacks: {
 *     authorized: ({ token }) => {
 *       // Verifica se l'utente è Super Admin
 *       return token?.role === 'SUPER_ADMIN';
 *     },
 *   },
 * });
 * 
 * export const config = {
 *   matcher: ['/organizations/:path*'],
 * };
 */

/**
 * ESEMPIO ALTERNATIVO CON CLERK:
 * 
 * import { authMiddleware } from '@clerk/nextjs';
 * 
 * export default authMiddleware({
 *   publicRoutes: ['/'],
 *   afterAuth(auth, req) {
 *     // Se la route è /organizations e l'utente non è Super Admin
 *     if (req.nextUrl.pathname.startsWith('/organizations')) {
 *       const superAdminIds = process.env.SUPER_ADMIN_IDS?.split(',') || [];
 *       
 *       if (!auth.userId || !superAdminIds.includes(auth.userId)) {
 *         return NextResponse.redirect(new URL('/access-denied', req.url));
 *       }
 *     }
 *   },
 * });
 * 
 * export const config = {
 *   matcher: ['/((?!.+\\.[\\w]+$|_next).*)', '/', '/(api|trpc)(.*)'],
 * };
 */
