/**
 * Navbar principale con Organization Switcher
 * 
 * Componente da inserire nel layout per le pagine autenticate
 */

'use client';

import Link from 'next/link';
import { Building2, LogOut } from 'lucide-react';
import { OrganizationSwitcher } from './OrganizationSwitcher';
import { MobileSidebar } from './Sidebar';
import { Button } from '@/components/ui/button';
import { logoutAction } from '@/services/actions/auth-actions';
import { useRouter } from 'next/navigation';

export function Navbar() {
  const router = useRouter();

  async function handleLogout() {
    await logoutAction();
    router.push('/login');
  }

  return (
    <header className="border-b bg-white/80 backdrop-blur-sm fixed top-0 left-0 right-0 z-50">
      <div className="container mx-auto px-4 py-4 flex justify-between items-center">
        <div className="flex items-center gap-4">
          {/* Menu mobile (mostrato solo su mobile) */}
          <div className="lg:hidden">
            <MobileSidebar />
          </div>
          
          <Link href="/dashboard" className="flex items-center gap-2">
            <Building2 className="h-8 w-8 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">YottaErp</h1>
          </Link>
        </div>

        <div className="flex items-center gap-4">
          {/* Organization Switcher */}
          <OrganizationSwitcher />

          {/* Logout Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleLogout}
            className="gap-2"
          >
            <LogOut className="h-4 w-4" />
            Esci
          </Button>
        </div>
      </div>
    </header>
  );
}
