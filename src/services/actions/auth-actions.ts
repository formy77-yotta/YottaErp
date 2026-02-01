/**
 * Server Actions per Autenticazione
 * 
 * Gestisce login, registrazione e logout con bcrypt per hash password
 */

'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

// ============================================================================
// VALIDAZIONE SCHEMI
// ============================================================================

const loginSchema = z.object({
  email: z.string().email('Email non valida'),
  password: z.string().min(6, 'Password deve avere almeno 6 caratteri'),
});

const registerSchema = z.object({
  email: z.string().email('Email non valida'),
  password: z.string().min(8, 'Password deve avere almeno 8 caratteri'),
  firstName: z.string().min(2, 'Nome deve avere almeno 2 caratteri'),
  lastName: z.string().min(2, 'Cognome deve avere almeno 2 caratteri'),
  phone: z.string().optional(),
});

// ============================================================================
// AUTENTICAZIONE
// ============================================================================

/**
 * Login utente
 * 
 * Verifica credenziali e imposta cookie di sessione
 */
export async function loginAction(data: { email: string; password: string }) {
  try {
    // Validazione input
    const validated = loginSchema.parse(data);

    // Trova utente per email
    const user = await prisma.user.findUnique({
      where: { email: validated.email.toLowerCase() },
      include: {
        organizations: {
          include: {
            organization: true,
          },
        },
      },
    });

    if (!user) {
      return {
        success: false,
        error: 'Credenziali non valide',
      };
    }

    // Verifica password
    const passwordMatch = await bcrypt.compare(validated.password, user.passwordHash);

    if (!passwordMatch) {
      return {
        success: false,
        error: 'Credenziali non valide',
      };
    }

    // Verifica account attivo
    if (!user.active) {
      return {
        success: false,
        error: 'Account disattivato. Contatta l\'amministratore.',
      };
    }

    // Imposta cookie di sessione
    cookies().set('userId', user.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 giorni
    });

    // Se l'utente ha organizzazioni, imposta la prima come corrente
    if (user.organizations.length > 0) {
      const firstOrg = user.organizations[0].organization;
      cookies().set('currentOrganizationId', firstOrg.id, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7,
      });
    }

    // Aggiorna last login
    await prisma.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
        // lastLoginIp: req.ip, // TODO: Ottieni IP dalla richiesta
      },
    });

    // Revalidate per aggiornare UI
    revalidatePath('/', 'layout');

    return {
      success: true,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        isSuperAdmin: user.isSuperAdmin,
        hasOrganizations: user.organizations.length > 0,
      },
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.errors[0].message,
      };
    }

    console.error('Errore login:', error);
    return {
      success: false,
      error: 'Errore durante il login. Riprova.',
    };
  }
}

/**
 * Registrazione nuovo utente
 * 
 * Crea nuovo account e organizzazione di default
 */
export async function registerAction(data: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
}) {
  try {
    // Validazione input
    const validated = registerSchema.parse(data);

    // Verifica che l'email non sia già registrata
    const existingUser = await prisma.user.findUnique({
      where: { email: validated.email.toLowerCase() },
    });

    if (existingUser) {
      return {
        success: false,
        error: 'Email già registrata',
      };
    }

    // Hash password
    const passwordHash = await bcrypt.hash(validated.password, 10);

    // Crea utente e organizzazione in transazione
    const result = await prisma.$transaction(async (tx) => {
      // 1. Crea utente
      const user = await tx.user.create({
        data: {
          email: validated.email.toLowerCase(),
          passwordHash,
          firstName: validated.firstName,
          lastName: validated.lastName,
          phone: validated.phone || null,
          active: true,
          emailVerified: false, // TODO: Implementare verifica email
        },
      });

      // 2. Crea organizzazione di default
      const organizationName = `${validated.firstName} ${validated.lastName}`;
      const organization = await tx.organization.create({
        data: {
          businessName: organizationName,
          active: true,
        },
      });

      // 3. Collega utente come OWNER dell'organizzazione
      await tx.userOrganization.create({
        data: {
          userId: user.id,
          organizationId: organization.id,
          role: 'OWNER',
        },
      });

      return { user, organization };
    });

    // Auto-login dopo registrazione
    cookies().set('userId', result.user.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
    });

    cookies().set('currentOrganizationId', result.organization.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
    });

    revalidatePath('/', 'layout');

    return {
      success: true,
      user: {
        id: result.user.id,
        email: result.user.email,
        firstName: result.user.firstName,
        lastName: result.user.lastName,
      },
      organization: {
        id: result.organization.id,
        businessName: result.organization.businessName,
      },
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.errors[0].message,
      };
    }

    console.error('Errore registrazione:', error);
    return {
      success: false,
      error: 'Errore durante la registrazione. Riprova.',
    };
  }
}

/**
 * Logout utente
 * 
 * Cancella cookie di sessione
 */
export async function logoutAction() {
  try {
    // Cancella cookie
    cookies().delete('userId');
    cookies().delete('currentOrganizationId');

    revalidatePath('/', 'layout');

    return { success: true };
  } catch (error) {
    console.error('Errore logout:', error);
    return {
      success: false,
      error: 'Errore durante il logout',
    };
  }
}

/**
 * Ottiene l'utente corrente dalla sessione
 */
export async function getCurrentUser() {
  try {
    const userId = cookies().get('userId')?.value;

    if (!userId) {
      return { success: false, user: null };
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        avatar: true,
        isSuperAdmin: true,
        active: true,
        organizations: {
          include: {
            organization: {
              select: {
                id: true,
                businessName: true,
                logoUrl: true,
                plan: true,
                active: true,
              },
            },
          },
        },
      },
    });

    if (!user || !user.active) {
      // Utente non trovato o disattivato - cancella cookie
      cookies().delete('userId');
      cookies().delete('currentOrganizationId');
      return { success: false, user: null };
    }

    return {
      success: true,
      user: {
        ...user,
        fullName: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
      },
    };
  } catch (error) {
    console.error('Errore getCurrentUser:', error);
    return { success: false, user: null };
  }
}

/**
 * Crea primo Super Admin (solo se non ce ne sono)
 * 
 * UTILITY: Da usare in seed o script di setup
 */
export async function createSuperAdmin(data: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}) {
  try {
    // Verifica se esiste già un Super Admin
    const existingSuperAdmin = await prisma.user.findFirst({
      where: { isSuperAdmin: true },
    });

    if (existingSuperAdmin) {
      return {
        success: false,
        error: 'Esiste già un Super Admin nel sistema',
      };
    }

    // Hash password
    const passwordHash = await bcrypt.hash(data.password, 10);

    // Crea Super Admin
    const superAdmin = await prisma.user.create({
      data: {
        email: data.email.toLowerCase(),
        passwordHash,
        firstName: data.firstName,
        lastName: data.lastName,
        isSuperAdmin: true,
        active: true,
        emailVerified: true,
      },
    });

    return {
      success: true,
      user: {
        id: superAdmin.id,
        email: superAdmin.email,
      },
    };
  } catch (error) {
    console.error('Errore creazione Super Admin:', error);
    return {
      success: false,
      error: 'Errore durante la creazione del Super Admin',
    };
  }
}
