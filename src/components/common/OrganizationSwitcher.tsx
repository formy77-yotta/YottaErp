/**
 * Componente per cambio organizzazione
 * 
 * Mostra un Select con le organizzazioni dell'utente e permette il cambio.
 * Dopo il cambio, ricarica la pagina per applicare il nuovo contesto.
 */

'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { switchOrganization, getUserOrganizations } from '@/services/actions/organization-actions';
import { Building2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type Organization = {
  id: string;
  businessName: string;
  logoUrl: string | null;
  plan: string;
  role: string;
  active: boolean;
};

export function OrganizationSwitcher() {
  const router = useRouter();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [currentOrgId, setCurrentOrgId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  // Carica organizzazioni e organizzazione corrente
  useEffect(() => {
    async function loadOrganizations() {
      try {
        const result = await getUserOrganizations();
        
        if (result.success && result.organizations) {
          // Filtra solo organizzazioni attive
          const activeOrgs = result.organizations.filter((org: Organization) => org.active);
          setOrganizations(activeOrgs);
          
          // Usa l'organizzazione corrente dal server o la prima disponibile
          const orgId = result.currentOrganizationId || (activeOrgs.length > 0 ? activeOrgs[0].id : null);
          setCurrentOrgId(orgId);
        }
      } catch (error) {
        console.error('Errore caricamento organizzazioni:', error);
      } finally {
        setIsLoading(false);
      }
    }

    loadOrganizations();
  }, []);

  // Handler cambio organizzazione
  async function handleOrganizationChange(organizationId: string) {
    if (organizationId === currentOrgId) {
      return; // Nessun cambio necessario
    }

    startTransition(async () => {
      try {
        const result = await switchOrganization(organizationId);
        
        if (result.success) {
          setCurrentOrgId(organizationId);
          
          // Ricarica la pagina per applicare il nuovo contesto
          router.refresh();
        } else {
          console.error('Errore cambio organizzazione:', result.error);
          // TODO: Mostrare toast di errore
        }
      } catch (error) {
        console.error('Errore cambio organizzazione:', error);
      }
    });
  }

  // Se non ci sono organizzazioni, non mostrare nulla
  if (isLoading) {
    return (
      <div className="flex items-center gap-2 px-3 py-2">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        <span className="text-sm text-muted-foreground">Caricamento...</span>
      </div>
    );
  }

  if (organizations.length === 0) {
    return null;
  }

  // Se c'è solo una organizzazione, mostra solo il nome (senza select)
  if (organizations.length === 1) {
    const org = organizations[0];
    return (
      <div className="flex items-center gap-2 px-3 py-2 text-sm">
        <Building2 className="h-4 w-4 text-muted-foreground" />
        <span className="font-medium">{org.businessName}</span>
      </div>
    );
  }

  // Mostra select con tutte le organizzazioni
  const currentOrg = organizations.find(org => org.id === currentOrgId) || organizations[0];

  return (
    <Select
      value={currentOrgId || undefined}
      onValueChange={handleOrganizationChange}
      disabled={isPending}
    >
      <SelectTrigger
        className={cn(
          'w-[200px]',
          isPending && 'opacity-50 cursor-not-allowed'
        )}
      >
        <div className="flex items-center gap-2">
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Building2 className="h-4 w-4 text-muted-foreground" />
          )}
          <SelectValue placeholder="Seleziona organizzazione">
            {currentOrg?.businessName || 'Seleziona organizzazione'}
          </SelectValue>
        </div>
      </SelectTrigger>
      <SelectContent>
        {organizations.map((org) => (
          <SelectItem key={org.id} value={org.id}>
            <div className="flex items-center gap-2">
              {org.logoUrl ? (
                <Image
                  src={org.logoUrl}
                  alt={org.businessName}
                  width={16}
                  height={16}
                  className="h-4 w-4 rounded"
                />
              ) : (
                <Building2 className="h-4 w-4 text-muted-foreground" />
              )}
              <span>{org.businessName}</span>
              {org.role === 'OWNER' && (
                <span className="text-xs text-muted-foreground">(Owner)</span>
              )}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
