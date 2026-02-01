/**
 * Server Actions per gestione organizzazioni (MULTITENANT)
 * 
 * Permette agli utenti di:
 * - Cambiare organizzazione corrente
 * - Visualizzare organizzazioni accessibili
 * - Creare nuove organizzazioni
 * - Invitare utenti in un'organizzazione
 */

'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { getAuthContext, UnauthorizedError, ForbiddenError, requireRole } from '@/lib/auth';

/**
 * Cambia l'organizzazione corrente dell'utente
 * 
 * SICUREZZA: Verifica che l'utente appartenga all'organizzazione richiesta
 * 
 * @param organizationId - ID dell'organizzazione da selezionare
 * @returns Informazioni organizzazione selezionata
 */
export async function switchOrganization(organizationId: string) {
  try {
    // Ottieni utente corrente (senza verificare organizationId)
    const userIdCookie = cookies().get('userId')?.value;
    
    if (!userIdCookie) {
      throw new UnauthorizedError('Utente non autenticato');
    }
    
    // Verifica membership nell'organizzazione richiesta
    const membership = await prisma.userOrganization.findUnique({
      where: {
        userId_organizationId: {
          userId: userIdCookie,
          organizationId
        }
      },
      include: {
        organization: {
          select: {
            id: true,
            businessName: true,
            logoUrl: true,
            plan: true
          }
        }
      }
    });
    
    if (!membership) {
      throw new ForbiddenError('Non hai accesso a questa organizzazione');
    }
    
    // Salva organizzazione corrente in cookie
    cookies().set('currentOrganizationId', organizationId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30 // 30 giorni
    });
    
    // Invalida cache di tutte le pagine
    revalidatePath('/', 'layout');
    
    return {
      success: true,
      organization: membership.organization,
      role: membership.role
    };
  } catch (error) {
    if (error instanceof ForbiddenError || error instanceof UnauthorizedError) {
      return { success: false, error: error.message };
    }
    console.error('Errore cambio organizzazione:', error);
    return { success: false, error: 'Errore nel cambio organizzazione' };
  }
}

/**
 * Ottiene lista di organizzazioni accessibili dall'utente corrente
 * 
 * @returns Array di organizzazioni con ruolo utente
 */
export async function getUserOrganizations() {
  try {
    const userIdCookie = cookies().get('userId')?.value;
    
    if (!userIdCookie) {
      throw new UnauthorizedError('Utente non autenticato');
    }
    
    const memberships = await prisma.userOrganization.findMany({
      where: { userId: userIdCookie },
      include: {
        organization: {
          select: {
            id: true,
            businessName: true,
            logoUrl: true,
            plan: true,
            active: true
          }
        }
      },
      orderBy: {
        createdAt: 'asc' // Prima organizzazione = primaria
      }
    });
    
    return {
      success: true,
      organizations: memberships.map(m => ({
        id: m.organization.id,
        businessName: m.organization.businessName,
        logoUrl: m.organization.logoUrl,
        plan: m.organization.plan,
        role: m.role,
        active: m.organization.active
      }))
    };
  } catch (error) {
    console.error('Errore recupero organizzazioni:', error);
    return { success: false, error: 'Errore nel recupero delle organizzazioni' };
  }
}

/**
 * Crea una nuova organizzazione
 * 
 * L'utente corrente diventa automaticamente OWNER
 * 
 * @param businessName - Ragione sociale dell'organizzazione
 * @returns Organizzazione creata
 */
export async function createOrganization(businessName: string) {
  try {
    const userIdCookie = cookies().get('userId')?.value;
    
    if (!userIdCookie) {
      throw new UnauthorizedError('Utente non autenticato');
    }
    
    if (!businessName || businessName.trim().length < 2) {
      return { success: false, error: 'Ragione sociale obbligatoria (min 2 caratteri)' };
    }
    
    // Crea organizzazione e membership in transazione
    const organization = await prisma.$transaction(async (tx) => {
      // Crea organizzazione
      const org = await tx.organization.create({
        data: {
          businessName: businessName.trim(),
          active: true
        }
      });
      
      // Associa utente come OWNER
      await tx.userOrganization.create({
        data: {
          userId: userIdCookie,
          organizationId: org.id,
          role: 'OWNER'
        }
      });
      
      return org;
    });
    
    // Imposta come organizzazione corrente
    await switchOrganization(organization.id);
    
    return {
      success: true,
      organization: {
        id: organization.id,
        businessName: organization.businessName
      }
    };
  } catch (error) {
    console.error('Errore creazione organizzazione:', error);
    return { success: false, error: 'Errore nella creazione dell\'organizzazione' };
  }
}

/**
 * Invita un utente nell'organizzazione corrente
 * 
 * PERMESSI: Solo OWNER e ADMIN possono invitare utenti
 * 
 * @param email - Email utente da invitare
 * @param role - Ruolo da assegnare (default: USER)
 * @returns Risultato invito
 */
export async function inviteUser(email: string, role: 'ADMIN' | 'USER' | 'READONLY' = 'USER') {
  try {
    const ctx = await getAuthContext();
    
    // Solo OWNER e ADMIN possono invitare
    requireRole(ctx, ['OWNER', 'ADMIN']);
    
    // TODO: Implementare invio email con link di invito
    // Per ora, solo placeholder
    
    return {
      success: true,
      message: `Invito inviato a ${email} con ruolo ${role}`
    };
  } catch (error) {
    if (error instanceof ForbiddenError) {
      return { success: false, error: 'Non hai i permessi per invitare utenti' };
    }
    console.error('Errore invito utente:', error);
    return { success: false, error: 'Errore nell\'invito dell\'utente' };
  }
}

/**
 * Rimuove un utente dall'organizzazione corrente
 * 
 * PERMESSI: Solo OWNER può rimuovere utenti
 * 
 * @param userId - ID utente da rimuovere
 * @returns Risultato rimozione
 */
export async function removeUserFromOrganization(userId: string) {
  try {
    const ctx = await getAuthContext();
    
    // Solo OWNER può rimuovere utenti
    requireRole(ctx, ['OWNER']);
    
    // Non può rimuovere se stesso
    if (userId === ctx.userId) {
      return { success: false, error: 'Non puoi rimuoverti dalla tua organizzazione' };
    }
    
    // Rimuovi membership
    await prisma.userOrganization.delete({
      where: {
        userId_organizationId: {
          userId,
          organizationId: ctx.organizationId
        }
      }
    });
    
    revalidatePath('/settings/team');
    
    return { success: true };
  } catch (error) {
    if (error instanceof ForbiddenError) {
      return { success: false, error: 'Non hai i permessi per rimuovere utenti' };
    }
    console.error('Errore rimozione utente:', error);
    return { success: false, error: 'Errore nella rimozione dell\'utente' };
  }
}
