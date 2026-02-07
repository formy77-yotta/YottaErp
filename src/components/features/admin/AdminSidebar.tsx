/**
 * Sidebar di navigazione per area Super Admin
 * 
 * Navigazione dedicata per le funzionalità Super Admin
 */

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Building2,
  Settings,
  Shield,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface AdminNavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  description?: string;
}

const adminNavItems: AdminNavItem[] = [
  {
    title: 'Panoramica',
    href: '/admin',
    icon: LayoutDashboard,
    description: 'Home Super Admin',
  },
  {
    title: 'Organizzazioni',
    href: '/admin/organizations',
    icon: Building2,
    description: 'Gestisci tutte le organizzazioni',
  },
  {
    title: 'Configurazioni Standard',
    href: '/admin/standard-configs',
    icon: Settings,
    description: 'Aliquote IVA, unità di misura, tipi documento',
  },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 lg:pt-16 lg:border-r lg:bg-background z-10">
      <div className="flex-1 overflow-y-auto px-4 py-6">
        {/* Header */}
        <div className="mb-6 px-3">
          <div className="flex items-center gap-2 mb-1">
            <Shield className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Super Admin</h2>
          </div>
          <p className="text-xs text-muted-foreground">
            Area amministrativa centrale
          </p>
        </div>

        {/* Navigation */}
        <nav className="space-y-1">
          {adminNavItems.map((item) => {
            const isActive = pathname === item.href || 
              (item.href !== '/admin' && pathname.startsWith(item.href));
            
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors group',
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                )}
              >
                <item.icon className={cn(
                  'h-4 w-4 flex-shrink-0',
                  isActive ? 'text-primary-foreground' : 'text-muted-foreground group-hover:text-accent-foreground'
                )} />
                <div className="flex-1 min-w-0">
                  <div className="font-medium">{item.title}</div>
                  {item.description && (
                    <div className={cn(
                      'text-xs mt-0.5 truncate',
                      isActive ? 'text-primary-foreground/80' : 'text-muted-foreground'
                    )}>
                      {item.description}
                    </div>
                  )}
                </div>
                {isActive && (
                  <ChevronRight className="h-4 w-4 flex-shrink-0 text-primary-foreground" />
                )}
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
