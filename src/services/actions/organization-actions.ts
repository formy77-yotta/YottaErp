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

// ============================================================================
// SUPER ADMIN - GESTIONE ORGANIZZAZIONI (CRUD Completo)
// ============================================================================

/**
 * Verifica se l'utente corrente è Super Admin
 * 
 * NOTA: Per ora usa una costante. In futuro implementare con tabella separata
 * o con campo 'isSuperAdmin' nel sistema di autenticazione.
 * 
 * @returns true se Super Admin, false altrimenti
 */
async function isSuperAdmin(): Promise<boolean> {
  const userIdCookie = cookies().get('userId')?.value;
  
  if (!userIdCookie) {
    return false;
  }
  
  // TODO: Implementare logica reale Super Admin
  // Per ora, considera Super Admin l'utente con ID specifico o tutti in development
  const SUPER_ADMIN_IDS = process.env.SUPER_ADMIN_IDS?.split(',') || [];
  
  return SUPER_ADMIN_IDS.includes(userIdCookie) || process.env.NODE_ENV === 'development';
}

/**
 * Ottiene lista di TUTTE le organizzazioni (Super Admin)
 * 
 * PERMESSI: Solo Super Admin
 * 
 * @returns Array di tutte le organizzazioni con conteggio utenti
 */
export async function getOrganizations() {
  try {
    if (!(await isSuperAdmin())) {
      return { success: false, error: 'Accesso negato: richiesti privilegi Super Admin' };
    }
    
    // Recupera tutte le organizzazioni con conteggio utenti
    const organizations = await prisma.organization.findMany({
      include: {
        _count: {
          select: {
            users: true,
            entities: true,
            products: true,
            documents: true,
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    return {
      success: true,
      organizations: organizations.map(org => ({
        id: org.id,
        businessName: org.businessName,
        vatNumber: org.vatNumber,
        fiscalCode: org.fiscalCode,
        email: org.email,
        phone: org.phone,
        city: org.city,
        province: org.province,
        plan: org.plan,
        maxUsers: org.maxUsers,
        maxInvoicesPerYear: org.maxInvoicesPerYear,
        active: org.active,
        createdAt: org.createdAt,
        updatedAt: org.updatedAt,
        // Conteggi
        usersCount: org._count.users,
        entitiesCount: org._count.entities,
        productsCount: org._count.products,
        documentsCount: org._count.documents,
      }))
    };
  } catch (error) {
    console.error('Errore recupero organizzazioni:', error);
    return { success: false, error: 'Errore nel recupero delle organizzazioni' };
  }
}

/**
 * Crea una nuova organizzazione (Super Admin)
 * 
 * PERMESSI: Solo Super Admin
 * 
 * @param data - Dati organizzazione da creare
 * @returns Organizzazione creata
 */
export async function createOrganizationAdmin(data: {
  businessName: string;
  vatNumber?: string;
  fiscalCode?: string;
  address?: string;
  city?: string;
  province?: string;
  zipCode?: string;
  country?: string;
  email?: string;
  pec?: string;
  phone?: string;
  sdiCode?: string;
  logoUrl?: string;
  plan?: string;
  maxUsers?: number;
  maxInvoicesPerYear?: number;
  active?: boolean;
}) {
  try {
    if (!(await isSuperAdmin())) {
      return { success: false, error: 'Accesso negato: richiesti privilegi Super Admin' };
    }
    
    // Validazione: almeno P.IVA o Codice Fiscale
    if (!data.vatNumber && !data.fiscalCode) {
      return { success: false, error: 'Inserire almeno P.IVA o Codice Fiscale' };
    }
    
    // Verifica unicità P.IVA (se fornita)
    if (data.vatNumber) {
      const existing = await prisma.organization.findUnique({
        where: { vatNumber: data.vatNumber }
      });
      
      if (existing) {
        return { 
          success: false, 
          error: `P.IVA ${data.vatNumber} già presente nell'organizzazione "${existing.businessName}"` 
        };
      }
    }
    
    // Crea organizzazione
    const organization = await prisma.organization.create({
      data: {
        businessName: data.businessName.trim(),
        vatNumber: data.vatNumber || null,
        fiscalCode: data.fiscalCode || null,
        address: data.address || null,
        city: data.city || null,
        province: data.province || null,
        zipCode: data.zipCode || null,
        country: data.country || 'IT',
        email: data.email || null,
        pec: data.pec || null,
        phone: data.phone || null,
        sdiCode: data.sdiCode || null,
        logoUrl: data.logoUrl || null,
        plan: data.plan || 'FREE',
        maxUsers: data.maxUsers ?? 5,
        maxInvoicesPerYear: data.maxInvoicesPerYear ?? 500,
        active: data.active ?? true,
      }
    });
    
    revalidatePath('/admin/organizations');
    
    return {
      success: true,
      organization: {
        id: organization.id,
        businessName: organization.businessName,
        plan: organization.plan,
      }
    };
  } catch (error: any) {
    console.error('Errore creazione organizzazione:', error);
    
    // Gestione errore unique constraint P.IVA
    if (error.code === 'P2002' && error.meta?.target?.includes('vatNumber')) {
      return { 
        success: false, 
        error: 'P.IVA già presente nel sistema' 
      };
    }
    
    return { success: false, error: 'Errore nella creazione dell\'organizzazione' };
  }
}

/**
 * Aggiorna un'organizzazione esistente (Super Admin)
 * 
 * PERMESSI: Solo Super Admin
 * 
 * @param id - ID organizzazione da aggiornare
 * @param data - Dati da aggiornare
 * @returns Organizzazione aggiornata
 */
export async function updateOrganizationAdmin(
  id: string,
  data: Partial<{
    businessName: string;
    vatNumber: string | null;
    fiscalCode: string | null;
    address: string | null;
    city: string | null;
    province: string | null;
    zipCode: string | null;
    country: string;
    email: string | null;
    pec: string | null;
    phone: string | null;
    sdiCode: string | null;
    logoUrl: string | null;
    plan: string;
    maxUsers: number;
    maxInvoicesPerYear: number;
    active: boolean;
  }>
) {
  try {
    if (!(await isSuperAdmin())) {
      return { success: false, error: 'Accesso negato: richiesti privilegi Super Admin' };
    }
    
    // Verifica esistenza organizzazione
    const existing = await prisma.organization.findUnique({
      where: { id }
    });
    
    if (!existing) {
      return { success: false, error: 'Organizzazione non trovata' };
    }
    
    // Se cambia P.IVA, verifica unicità
    if (data.vatNumber && data.vatNumber !== existing.vatNumber) {
      const duplicate = await prisma.organization.findUnique({
        where: { vatNumber: data.vatNumber }
      });
      
      if (duplicate) {
        return { 
          success: false, 
          error: `P.IVA ${data.vatNumber} già usata da "${duplicate.businessName}"` 
        };
      }
    }
    
    // Aggiorna organizzazione
    const organization = await prisma.organization.update({
      where: { id },
      data: {
        ...data,
        // Trim strings se presenti
        businessName: data.businessName?.trim(),
      }
    });
    
    revalidatePath('/admin/organizations');
    
    return {
      success: true,
      organization: {
        id: organization.id,
        businessName: organization.businessName,
      }
    };
  } catch (error: any) {
    console.error('Errore aggiornamento organizzazione:', error);
    
    // Gestione errore unique constraint P.IVA
    if (error.code === 'P2002' && error.meta?.target?.includes('vatNumber')) {
      return { 
        success: false, 
        error: 'P.IVA già presente nel sistema' 
      };
    }
    
    return { success: false, error: 'Errore nell\'aggiornamento dell\'organizzazione' };
  }
}

/**
 * Attiva/Disattiva un'organizzazione (Super Admin)
 * 
 * PERMESSI: Solo Super Admin
 * NOTA: Disattivare un'organizzazione impedisce l'accesso a tutti gli utenti
 * 
 * @param id - ID organizzazione
 * @param active - true per attivare, false per disattivare
 * @returns Risultato operazione
 */
export async function toggleOrganizationStatus(id: string, active: boolean) {
  try {
    if (!(await isSuperAdmin())) {
      return { success: false, error: 'Accesso negato: richiesti privilegi Super Admin' };
    }
    
    // Verifica esistenza organizzazione
    const existing = await prisma.organization.findUnique({
      where: { id },
      select: { businessName: true }
    });
    
    if (!existing) {
      return { success: false, error: 'Organizzazione non trovata' };
    }
    
    // Aggiorna stato
    await prisma.organization.update({
      where: { id },
      data: { active }
    });
    
    revalidatePath('/admin/organizations');
    
    return {
      success: true,
      message: `Organizzazione "${existing.businessName}" ${active ? 'attivata' : 'disattivata'} con successo`
    };
  } catch (error) {
    console.error('Errore cambio stato organizzazione:', error);
    return { success: false, error: 'Errore nel cambio di stato dell\'organizzazione' };
  }
}

/**
 * Elimina un'organizzazione (Super Admin)
 * 
 * PERMESSI: Solo Super Admin
 * ATTENZIONE: Elimina TUTTI i dati associati (CASCADE)
 * 
 * @param id - ID organizzazione da eliminare
 * @returns Risultato eliminazione
 */
export async function deleteOrganization(id: string) {
  try {
    if (!(await isSuperAdmin())) {
      return { success: false, error: 'Accesso negato: richiesti privilegi Super Admin' };
    }
    
    // Verifica esistenza organizzazione
    const existing = await prisma.organization.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            users: true,
            documents: true,
          }
        }
      }
    });
    
    if (!existing) {
      return { success: false, error: 'Organizzazione non trovata' };
    }
    
    // Avviso se ci sono dati importanti
    if (existing._count.documents > 0) {
      return {
        success: false,
        error: `Impossibile eliminare: l'organizzazione ha ${existing._count.documents} documenti. Disattivala invece di eliminarla.`
      };
    }
    
    // Elimina organizzazione (CASCADE eliminerà tutto)
    await prisma.organization.delete({
      where: { id }
    });
    
    revalidatePath('/admin/organizations');
    
    return {
      success: true,
      message: `Organizzazione "${existing.businessName}" eliminata con successo`
    };
  } catch (error) {
    console.error('Errore eliminazione organizzazione:', error);
    return { success: false, error: 'Errore nell\'eliminazione dell\'organizzazione' };
  }
}