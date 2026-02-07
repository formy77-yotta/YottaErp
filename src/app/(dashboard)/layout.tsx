/**
 * Layout per le pagine Dashboard
 * 
 * Verifica autenticazione e reindirizza al login se necessario
 */

import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import { Navbar } from '@/components/common/Navbar';
import { Sidebar } from '@/components/common/Sidebar';
import { CopilotFab } from '@/components/features/copilot/CopilotFab';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Verifica autenticazione
  const cookieStore = await cookies();
  const userId = cookieStore.get('userId')?.value;
  const organizationId = cookieStore.get('currentOrganizationId')?.value;

  // Se non c'è userId, reindirizza al login
  if (!userId) {
    redirect('/login');
  }

  // Verifica che l'utente esista e sia attivo
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, active: true },
  });

  if (!user || !user.active) {
    // Utente non valido, cancella cookie e reindirizza
    cookieStore.delete('userId');
    cookieStore.delete('currentOrganizationId');
    redirect('/login');
  }

  // Se non c'è organizationId ma l'utente ha organizzazioni, imposta la prima
  let finalOrganizationId = organizationId;
  if (!organizationId) {
    const userWithOrgs = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        organizations: {
          include: {
            organization: true,
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
      },
    });

    if (userWithOrgs && userWithOrgs.organizations.length > 0) {
      const firstOrg = userWithOrgs.organizations[0].organization;
      cookieStore.set('currentOrganizationId', firstOrg.id, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7,
      });
      finalOrganizationId = firstOrg.id;
    } else {
      // Utente senza organizzazioni, reindirizza alla home
      redirect('/');
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navbar fissa in alto */}
      <Navbar />
      
      {/* Sidebar (desktop) e menu mobile */}
      <Sidebar />
      
      {/* Main content con padding per sidebar desktop */}
      <main className="lg:pl-64 pt-16">
        <div className="container mx-auto px-4 py-6">
          {children}
        </div>
      </main>

      {/* AI Copilot FAB */}
      <CopilotFab />
    </div>
  );
}
