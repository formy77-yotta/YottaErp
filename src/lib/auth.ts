/**
 * Authentication and Authorization utilities for YottaErp
 * 
 * MULTITENANT: Gestisce autenticazione e isolamento tra organizzazioni
 * 
 * IMPORTANTE: Questo file è server-only e non può essere importato
 * in client components. Usa Server Actions per interazioni dal client.
 * 
 * UTILIZZO:
 * ```typescript
 * const ctx = await getAuthContext();
 * const products = await prisma.product.findMany({
 *   where: { organizationId: ctx.organizationId }
 * });
 * ```
 */

import 'server-only';

import { cookies } from 'next/headers';
import { prisma } from './prisma';

/**
 * Ruoli utente in un'organizzazione
 */
export type UserRole = 'OWNER' | 'ADMIN' | 'USER' | 'READONLY';

/**
 * Context di autenticazione con informazioni organizzazione
 * 
 * DEVE essere passato a TUTTE le funzioni che accedono al database
 */
export interface AuthContext {
  userId: string;           // ID utente autenticato
  organizationId: string;   // Organizzazione corrente
  role: UserRole;           // Ruolo utente in questa organizzazione
}

/**
 * Errore personalizzato per accesso non autorizzato
 */
export class UnauthorizedError extends Error {
  constructor(message: string = 'Non autenticato') {
    super(message);
    this.name = 'UnauthorizedError';
  }
}

/**
 * Errore personalizzato per accesso negato
 */
export class ForbiddenError extends Error {
  constructor(message: string = 'Accesso negato') {
    super(message);
    this.name = 'ForbiddenError';
  }
}

/**
 * Ottiene il contesto di autenticazione corrente
 * 
 * MULTITENANT: Include organizationId e verifica membership
 * 
 * @throws {UnauthorizedError} Se l'utente non è autenticato
 * @throws {ForbiddenError} Se l'utente non ha accesso all'organizzazione
 * @returns Context con userId, organizationId e role
 * 
 * @example
 * ```typescript
 * const ctx = await getAuthContext();
 * console.log(ctx.organizationId); // "org_123abc"
 * ```
 */
export async function getAuthContext(): Promise<AuthContext> {
  const cookieStore = await cookies();
  const userIdCookie = cookieStore.get('userId')?.value;
  const organizationIdCookie = cookieStore.get('currentOrganizationId')?.value;
  
  if (!userIdCookie) {
    throw new UnauthorizedError('Utente non autenticato');
  }
  
  // Verifica che l'utente esista e sia attivo
  const user = await prisma.user.findUnique({
    where: { id: userIdCookie },
    select: { id: true, active: true },
  });

  if (!user || !user.active) {
    throw new UnauthorizedError('Utente non trovato o disattivato');
  }
  
  if (!organizationIdCookie) {
    throw new ForbiddenError('Nessuna organizzazione selezionata');
  }
  
  // Verifica che l'utente appartenga all'organizzazione
  const membership = await prisma.userOrganization.findUnique({
    where: {
      userId_organizationId: {
        userId: userIdCookie,
        organizationId: organizationIdCookie
      }
    }
  });
  
  if (!membership) {
    throw new ForbiddenError('Accesso negato a questa organizzazione');
  }
  
  return {
    userId: userIdCookie,
    organizationId: organizationIdCookie,
    role: membership.role as UserRole
  };
}

/**
 * Verifica che l'utente abbia almeno uno dei ruoli specificati
 * 
 * @throws {ForbiddenError} Se l'utente non ha il ruolo richiesto
 * 
 * @example
 * ```typescript
 * const ctx = await getAuthContext();
 * requireRole(ctx, ['OWNER', 'ADMIN']); // OK se OWNER o ADMIN, altrimenti throw
 * ```
 */
export function requireRole(ctx: AuthContext, allowedRoles: UserRole[]): void {
  if (!allowedRoles.includes(ctx.role)) {
    throw new ForbiddenError(
      `Questa operazione richiede uno dei seguenti ruoli: ${allowedRoles.join(', ')}`
    );
  }
}

/**
 * Verifica che un record appartenga all'organizzazione corrente
 * 
 * SICUREZZA MULTITENANT: Previene accesso cross-organization
 * 
 * @throws {ForbiddenError} Se il record appartiene a un'altra organizzazione
 * 
 * @example
 * ```typescript
 * const product = await prisma.product.findUnique({ where: { id } });
 * verifyOrganizationAccess(ctx, product);
 * ```
 */
export function verifyOrganizationAccess(
  ctx: AuthContext,
  record: { organizationId: string } | null
): void {
  if (!record) {
    throw new Error('Record non trovato');
  }
  
  if (record.organizationId !== ctx.organizationId) {
    throw new ForbiddenError(
      'Non hai accesso a questo record (appartiene a un\'altra organizzazione)'
    );
  }
}

/**
 * Helper per verificare se l'utente è proprietario dell'organizzazione
 */
export function isOwner(ctx: AuthContext): boolean {
  return ctx.role === 'OWNER';
}

/**
 * Helper per verificare se l'utente è admin o proprietario
 */
export function isAdminOrOwner(ctx: AuthContext): boolean {
  return ctx.role === 'OWNER' || ctx.role === 'ADMIN';
}

/**
 * Helper per verificare se l'utente ha permessi di scrittura
 */
export function canWrite(ctx: AuthContext): boolean {
  return ctx.role !== 'READONLY';
}
