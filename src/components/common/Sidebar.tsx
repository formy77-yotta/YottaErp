/**
 * Sidebar di navigazione principale
 * 
 * Componente di navigazione con menu a tendina per moduli ERP.
 * Responsive: su mobile diventa un Sheet (menu a scomparsa).
 */

'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  FileText,
  Package,
  Warehouse,
  Menu,
  ChevronDown,
  ChevronRight,
  Settings,
  Ruler,
  Activity,
  CreditCard,
} from 'lucide-react';
import React, { useState } from 'react';
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
        title: 'Organizzazione',
        href: '/settings/organization',
        icon: Users,
      },
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
      {
        title: 'Movimenti Magazzino',
        href: '/stock-movements',
        icon: Activity,
      },
    ],
  },
  {
    title: 'Impostazioni',
    icon: Settings,
    children: [
      {
        title: 'Aliquote IVA',
        href: '/settings/vat-rates',
        icon: Settings,
      },
      {
        title: 'Categorie Articoli',
        href: '/settings/product-categories',
        icon: Package,
      },
      {
        title: 'Tipologie Articoli',
        href: '/settings/product-types',
        icon: Package,
      },
      {
        title: 'Unità di Misura',
        href: '/settings/unit-of-measure',
        icon: Ruler,
      },
      {
        title: 'Tipi Documento',
        href: '/settings/document-types',
        icon: FileText,
      },
      {
        title: 'Modalità di Pagamento',
        href: '/settings/payments',
        icon: CreditCard,
      },
    ],
  },
];

/**
 * Helper per verificare se un href corrisponde al pathname corrente
 * Considera anche i parametri della query string
 */
function isHrefActive(href: string | undefined, pathname: string, searchParams: URLSearchParams): boolean {
  if (!href) return false;
  
  const [hrefPath, hrefQuery] = href.split('?');
  
  // Se il path non corrisponde, non è attivo
  if (pathname !== hrefPath && !pathname.startsWith(hrefPath + '/')) {
    return false;
  }
  
  // Se l'href ha una query string, verifica che i parametri corrispondano
  if (hrefQuery) {
    const hrefParams = new URLSearchParams(hrefQuery);
    
    // Verifica che tutti i parametri dell'href siano presenti e corrispondano
    for (const [key, value] of hrefParams.entries()) {
      if (searchParams.get(key) !== value) {
        return false;
      }
    }
    
    return true;
  }
  
  // Se l'href non ha query string, il path corrisponde è sufficiente
  return true;
}

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
  const searchParams = useSearchParams();

  if (item.children && item.children.length > 0) {
    return (
      <div className="space-y-1">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            'w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition-colors',
            isActive
              ? 'text-slate-900 font-semibold'
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
                isActive={isHrefActive(child.href, pathname, searchParams)}
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
        'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors relative',
        isActive
          ? 'text-slate-900 font-semibold border-l-2 border-blue-600'
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
  const searchParams = useSearchParams();

  return (
    <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 lg:pt-16 lg:border-r lg:bg-background">
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <nav className="space-y-2">
          {navItems.map((item) => {
            const isActive = item.href ? isHrefActive(item.href, pathname, searchParams) : false;
            
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
 * 
 * NOTA: Renderizzato solo sul client per evitare errori di hydration
 * causati da ID casuali generati da Radix UI
 */
export function MobileSidebar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isOpen, setIsOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Renderizza solo sul client per evitare mismatch di hydration
  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    // Renderizza un placeholder durante SSR
    return (
      <Button variant="ghost" size="icon" className="lg:hidden" disabled>
        <Menu className="h-5 w-5" />
        <span className="sr-only">Apri menu</span>
      </Button>
    );
  }

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
                const isActive = item.href ? isHrefActive(item.href, pathname, searchParams) : false;
                
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
