/**
 * Layout per le pagine Admin (Super Admin)
 * 
 * Verifica che l'utente sia Super Admin prima di permettere l'accesso
 */

import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Verifica autenticazione
  const cookieStore = await cookies();
  const userId = cookieStore.get('userId')?.value;

  if (!userId) {
    redirect('/login?callbackUrl=/organizations');
  }

  // Verifica che l'utente sia Super Admin
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { 
        id: true, 
        isSuperAdmin: true, 
        active: true,
        email: true,
      },
    });

    if (!user || !user.active) {
      // Utente non valido, cancella cookie e reindirizza
      cookieStore.delete('userId');
      cookieStore.delete('currentOrganizationId');
      redirect('/login');
    }

    if (!user.isSuperAdmin) {
      // Utente non è Super Admin, reindirizza a access-denied
      redirect('/access-denied?reason=super_admin_required&from=/organizations');
    }

    // ✅ Utente è Super Admin, permette l'accesso
    return <>{children}</>;
  } catch (error) {
    console.error('Errore verifica Super Admin:', error);
    redirect('/access-denied?reason=forbidden&from=/organizations');
  }
}
