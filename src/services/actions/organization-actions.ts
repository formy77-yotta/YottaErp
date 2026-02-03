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
    const cookieStore = await cookies();
    const userIdCookie = cookieStore.get('userId')?.value;
    
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
    cookieStore.set('currentOrganizationId', organizationId, {
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
 * @returns Array di organizzazioni con ruolo utente e organizzazione corrente
 */
export async function getUserOrganizations() {
  try {
    const cookieStore = await cookies();
    const userIdCookie = cookieStore.get('userId')?.value;
    const currentOrgId = cookieStore.get('currentOrganizationId')?.value;
    
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
      currentOrganizationId: currentOrgId || null,
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
    const cookieStore = await cookies();
    const userIdCookie = cookieStore.get('userId')?.value;
    
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
 * AGGIORNATO: Ora legge dal database il campo isSuperAdmin
 * 
 * @returns true se Super Admin, false altrimenti
 */
async function isSuperAdmin(): Promise<boolean> {
  const cookieStore = await cookies();
  const userIdCookie = cookieStore.get('userId')?.value;
  
  if (!userIdCookie) {
    return false;
  }
  
  // Bypass development
  if (process.env.NODE_ENV === 'development' && process.env.DEV_BYPASS_AUTH === 'true') {
    return true;
  }

  try {
    // Verifica nel database
    const user = await prisma.user.findUnique({
      where: { id: userIdCookie },
      select: { isSuperAdmin: true, active: true },
    });

    return user?.active && user?.isSuperAdmin || false;
  } catch (error) {
    console.error('Errore verifica Super Admin:', error);
    return false;
  }
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
        address: org.address,
        city: org.city,
        province: org.province,
        zipCode: org.zipCode,
        country: org.country,
        email: org.email,
        pec: org.pec,
        phone: org.phone,
        sdiCode: org.sdiCode,
        logoUrl: org.logoUrl,
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
  vatNumber?: string | null;
  fiscalCode?: string | null;
  address?: string | null;
  city?: string | null;
  province?: string | null;
  zipCode?: string | null;
  country?: string;
  email?: string | null;
  pec?: string | null;
  phone?: string | null;
  sdiCode?: string | null;
  logoUrl?: string | null;
  plan?: string;
  maxUsers?: number;
  maxInvoicesPerYear?: number;
  active?: boolean;
  adminUserEmails?: string[]; // Email degli utenti admin da associare
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
    
    // #region agent log
    console.log('[DEBUG] Server Action received data:', JSON.stringify({
      address: data.address,
      zipCode: data.zipCode,
      pec: data.pec,
      sdiCode: data.sdiCode,
      email: data.email,
      phone: data.phone,
      addressType: typeof data.address,
      zipCodeType: typeof data.zipCode,
      addressIsUndefined: data.address === undefined,
      addressIsNull: data.address === null,
      addressIsString: typeof data.address === 'string',
      addressLength: typeof data.address === 'string' ? data.address.length : 'N/A',
    }, null, 2));
    // #endregion
    
    // Crea organizzazione e associa utenti admin in transazione
    const result = await prisma.$transaction(async (tx) => {
      // Helper per normalizzare stringhe: preserva stringhe non vuote, converte tutto il resto in null
      const normalizeString = (value: string | null | undefined): string | null => {
        if (typeof value === 'string' && value.trim() !== '') {
          return value.trim();
        }
        return null;
      };

      const orgData = {
        businessName: data.businessName.trim(),
        vatNumber: normalizeString(data.vatNumber),
        fiscalCode: normalizeString(data.fiscalCode),
        address: normalizeString(data.address),
        city: normalizeString(data.city),
        province: normalizeString(data.province),
        zipCode: normalizeString(data.zipCode),
        country: data.country || 'IT',
        email: normalizeString(data.email),
        pec: normalizeString(data.pec),
        phone: normalizeString(data.phone),
        sdiCode: normalizeString(data.sdiCode),
        logoUrl: normalizeString(data.logoUrl),
        plan: data.plan || 'FREE',
        maxUsers: data.maxUsers ?? 5,
        maxInvoicesPerYear: data.maxInvoicesPerYear ?? 500,
        active: data.active ?? true,
      };
      
      // #region agent log
      console.log('[DEBUG] Data before Prisma create:', {
        address: orgData.address,
        zipCode: orgData.zipCode,
        pec: orgData.pec,
        sdiCode: orgData.sdiCode,
        email: orgData.email,
        phone: orgData.phone,
        addressIsNull: orgData.address === null,
        zipCodeIsNull: orgData.zipCode === null,
      });
      // #endregion
      
      // 1. Crea organizzazione
      const organization = await tx.organization.create({
        data: orgData
      });
      
      // #region agent log
      console.log('[DEBUG] Organization created in DB:', {
        id: organization.id,
        address: organization.address,
        zipCode: organization.zipCode,
        pec: organization.pec,
        sdiCode: organization.sdiCode,
        email: organization.email,
        phone: organization.phone,
      });
      // #endregion

      // 2. Associa utenti admin se specificati
      if (data.adminUserEmails && data.adminUserEmails.length > 0) {
        const validEmails = data.adminUserEmails.filter(email => email && email.trim() !== '');
        
        if (validEmails.length === 0) {
          throw new Error('Inserire almeno un utente admin valido');
        }

        for (const email of validEmails) {
          // Trova utente per email
          const user = await tx.user.findUnique({
            where: { email: email.toLowerCase().trim() },
            select: { id: true, active: true, email: true },
          });

          if (!user) {
            throw new Error(`Utente con email ${email} non trovato. Assicurati che l'utente sia registrato nel sistema.`);
          }

          if (!user.active) {
            throw new Error(`Utente ${email} non è attivo. Attiva l'utente prima di aggiungerlo all'organizzazione.`);
          }

          // Verifica se l'utente è già membro dell'organizzazione
          const existingMembership = await tx.userOrganization.findUnique({
            where: {
              userId_organizationId: {
                userId: user.id,
                organizationId: organization.id,
              },
            },
          });

          if (existingMembership) {
            // Se esiste già, aggiorna il ruolo se necessario
            const isFirstAdmin = validEmails.indexOf(email) === 0;
            await tx.userOrganization.update({
              where: {
                userId_organizationId: {
                  userId: user.id,
                  organizationId: organization.id,
                },
              },
              data: {
                role: isFirstAdmin ? 'OWNER' : 'ADMIN',
              },
            });
          } else {
            // Crea nuova membership come OWNER (primo utente) o ADMIN (altri)
            const isFirstAdmin = validEmails.indexOf(email) === 0;
            await tx.userOrganization.create({
              data: {
                userId: user.id,
                organizationId: organization.id,
                role: isFirstAdmin ? 'OWNER' : 'ADMIN',
              },
            });
          }
        }
      } else {
        // Se non ci sono admin specificati, errore
        throw new Error('È obbligatorio specificare almeno un utente admin per l\'organizzazione');
      }

      return organization;
    });
    
    revalidatePath('/organizations');
    
    return {
      success: true,
      organization: {
        id: result.id,
        businessName: result.businessName,
        plan: result.plan,
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

    // Gestione errore unique constraint UserOrganization
    if (error.code === 'P2002' && error.meta?.target?.includes('userId_organizationId')) {
      return { 
        success: false, 
        error: 'Uno degli utenti è già membro di questa organizzazione' 
      };
    }
    
    // Gestione errori custom (utente non trovato, ecc.)
    if (error.message) {
      return { 
        success: false, 
        error: error.message 
      };
    }
    
    return { success: false, error: 'Errore nella creazione dell\'organizzazione' };
  }
}

/**
 * Ottiene gli utenti di un'organizzazione (Super Admin)
 * 
 * PERMESSI: Solo Super Admin
 * 
 * @param organizationId - ID organizzazione
 * @returns Lista utenti con ruoli
 */
export async function getOrganizationUsers(organizationId: string) {
  try {
    if (!(await isSuperAdmin())) {
      return { success: false, error: 'Accesso negato: richiesti privilegi Super Admin' };
    }
    
    const memberships = await prisma.userOrganization.findMany({
      where: { organizationId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            active: true,
          }
        }
      },
      orderBy: {
        createdAt: 'asc'
      }
    });
    
    return {
      success: true,
      users: memberships.map(m => ({
        id: m.user.id,
        email: m.user.email,
        firstName: m.user.firstName,
        lastName: m.user.lastName,
        role: m.role,
        active: m.user.active,
      }))
    };
  } catch (error) {
    console.error('Errore recupero utenti organizzazione:', error);
    return { success: false, error: 'Errore nel recupero degli utenti' };
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
    adminUserEmails?: string[]; // Email degli utenti admin da aggiungere
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
    
    // Estrai adminUserEmails dai dati (se presente)
    const { adminUserEmails, ...orgData } = data;
    
    // Aggiorna organizzazione e aggiungi utenti in transazione
    const result = await prisma.$transaction(async (tx) => {
      // Aggiorna organizzazione
      const organization = await tx.organization.update({
        where: { id },
        data: {
          ...orgData,
          // Trim strings se presenti
          businessName: orgData.businessName?.trim(),
        }
      });
      
      // Aggiungi utenti admin se specificati
      if (adminUserEmails && adminUserEmails.length > 0) {
        const validEmails = adminUserEmails.filter(email => email && email.trim() !== '');
        
        if (validEmails.length > 0) {
          for (const email of validEmails) {
            // Trova utente per email
            const user = await tx.user.findUnique({
              where: { email: email.toLowerCase().trim() },
              select: { id: true, active: true, email: true },
            });

            if (!user) {
              throw new Error(`Utente con email ${email} non trovato. Assicurati che l'utente sia registrato nel sistema.`);
            }

            if (!user.active) {
              throw new Error(`Utente ${email} non è attivo. Attiva l'utente prima di aggiungerlo all'organizzazione.`);
            }

            // Verifica se l'utente è già membro dell'organizzazione
            const existingMembership = await tx.userOrganization.findUnique({
              where: {
                userId_organizationId: {
                  userId: user.id,
                  organizationId: id,
                },
              },
            });

            if (existingMembership) {
              // Se esiste già, aggiorna il ruolo ad ADMIN se non è già OWNER
              if (existingMembership.role !== 'OWNER') {
                await tx.userOrganization.update({
                  where: {
                    userId_organizationId: {
                      userId: user.id,
                      organizationId: id,
                    },
                  },
                  data: {
                    role: 'ADMIN',
                  },
                });
              }
            } else {
              // Crea nuova membership come ADMIN
              await tx.userOrganization.create({
                data: {
                  userId: user.id,
                  organizationId: id,
                  role: 'ADMIN',
                },
              });
            }
          }
        }
      }
      
      return organization;
    });
    
    revalidatePath('/admin/organizations');
    
    return {
      success: true,
      organization: {
        id: result.id,
        businessName: result.businessName,
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
    
    // Gestione errori custom (utente non trovato, ecc.)
    if (error.message) {
      return { 
        success: false, 
        error: error.message 
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