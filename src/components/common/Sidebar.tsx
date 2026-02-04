/**
 * Sidebar di navigazione principale
 * 
 * Componente di navigazione con menu a tendina per moduli ERP.
 * Responsive: su mobile diventa un Sheet (menu a scomparsa).
 */

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  FileText,
  Package,
  Warehouse,
  Menu,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { useState } from 'react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface NavItem {
  title: string;
  href?: string;
  icon: React.ComponentType<{ className?: string }>;
  children?: NavItem[];
}

const navItems: NavItem[] = [
  {
    title: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    title: 'Anagrafiche',
    icon: Users,
    children: [
      {
        title: 'Lead',
        href: '/entities?type=LEAD',
        icon: Users,
      },
      {
        title: 'Clienti',
        href: '/entities?type=CUSTOMER',
        icon: Users,
      },
      {
        title: 'Fornitori',
        href: '/entities?type=SUPPLIER',
        icon: Users,
      },
    ],
  },
  {
    title: 'Documenti',
    href: '/documents',
    icon: FileText,
  },
  {
    title: 'Magazzino',
    icon: Package,
    children: [
      {
        title: 'Prodotti',
        href: '/products',
        icon: Package,
      },
      {
        title: 'Magazzini',
        href: '/warehouse',
        icon: Warehouse,
      },
    ],
  },
];

/**
 * Componente per singolo item di navigazione
 */
function NavItemComponent({ item, isActive, isChild = false }: { 
  item: NavItem; 
  isActive: boolean;
  isChild?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  
  // Verifica se un item o i suoi figli sono attivi
  const hasActiveChild = item.children?.some(child => {
    if (!child.href) return false;
    const childPath = child.href.split('?')[0];
    return pathname === childPath || pathname.startsWith(childPath + '/');
  });

  if (item.children && item.children.length > 0) {
    return (
      <div className="space-y-1">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            'w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors',
            isActive || hasActiveChild
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
            isChild && 'pl-8'
          )}
        >
          <div className="flex items-center gap-3">
            <item.icon className="h-4 w-4" />
            <span>{item.title}</span>
          </div>
          {isOpen ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </button>
        {isOpen && (
          <div className="ml-4 space-y-1">
            {item.children.map((child) => (
              <NavItemComponent
                key={child.href || child.title}
                item={child}
                isActive={pathname === child.href?.split('?')[0]}
                isChild={true}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  if (!item.href) {
    return null;
  }

  return (
    <Link
      href={item.href}
      className={cn(
        'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
        isActive
          ? 'bg-primary text-primary-foreground'
          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
        isChild && 'pl-8'
      )}
    >
      <item.icon className="h-4 w-4" />
      <span>{item.title}</span>
    </Link>
  );
}

/**
 * Sidebar desktop (sempre visibile su schermi grandi)
 */
function DesktopSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 lg:pt-16 lg:border-r lg:bg-background">
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <nav className="space-y-2">
          {navItems.map((item) => {
            const isActive = item.href
              ? pathname === item.href.split('?')[0] || pathname.startsWith(item.href.split('?')[0] + '/')
              : false;
            
            return (
              <NavItemComponent
                key={item.href || item.title}
                item={item}
                isActive={isActive}
              />
            );
          })}
        </nav>
      </div>
    </aside>
  );
}

/**
 * Sidebar mobile (Sheet)
 * 
 * Mostrato nella Navbar su mobile
 */
export function MobileSidebar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Apri menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-64 p-0">
        <div className="flex flex-col h-full">
          <div className="flex-1 overflow-y-auto px-4 py-6">
            <nav className="space-y-2">
              {navItems.map((item) => {
                const isActive = item.href
                  ? pathname === item.href.split('?')[0] || pathname.startsWith(item.href.split('?')[0] + '/')
                  : false;
                
                return (
                  <div key={item.href || item.title} onClick={() => {
                    // Chiudi il menu quando si clicca su un link senza children
                    if (!item.children) {
                      setIsOpen(false);
                    }
                  }}>
                    <NavItemComponent
                      item={item}
                      isActive={isActive}
                    />
                  </div>
                );
              })}
            </nav>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

/**
 * Componente principale Sidebar
 * 
 * Mostra sidebar desktop su schermi grandi
 */
export function Sidebar() {
  return <DesktopSidebar />;
}
