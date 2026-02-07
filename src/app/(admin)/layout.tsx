/**
 * Layout per le pagine Admin (Super Admin)
 * 
 * Verifica che l'utente sia Super Admin prima di permettere l'accesso
 * Include sidebar di navigazione e navbar
 */

import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { AdminSidebar } from '@/components/features/admin/AdminSidebar';
import { Navbar } from '@/components/common/Navbar';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Verifica autenticazione
  const cookieStore = await cookies();
  const userId = cookieStore.get('userId')?.value;

  if (!userId) {
    redirect('/login?callbackUrl=/admin');
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
      redirect('/access-denied?reason=super_admin_required&from=/admin');
    }

    // ✅ Utente è Super Admin, permette l'accesso
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Navbar fissa in alto */}
        <Navbar />
        
        {/* Sidebar (desktop) */}
        <AdminSidebar />
        
        {/* Main content con padding per sidebar desktop */}
        <main className="lg:pl-64 pt-16">
          <div className="container mx-auto px-4 py-6">
            {children}
          </div>
        </main>
      </div>
    );
  } catch (error) {
    console.error('Errore verifica Super Admin:', error);
    redirect('/access-denied?reason=forbidden&from=/admin');
  }
}
