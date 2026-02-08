/**
 * Pagina dettaglio Anagrafica
 * 
 * Mostra i dettagli completi di un'anagrafica con possibilità di modifica
 * e toggle per attivare/disattivare.
 * MULTITENANT: Verifica che l'entità appartenga all'organizzazione corrente
 */

import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { getEntityAction } from '@/services/actions/entity-actions';
import { EntityFormWrapper } from '@/components/features/EntityFormWrapper';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { ToggleEntityActive } from '@/components/features/ToggleEntityActive';
import { EntityAddressesSection } from '@/components/features/EntityAddressesSection';

interface EntityDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function EntityDetailPage({ params }: EntityDetailPageProps) {
  const { id } = await params;
  
  // Recupera entità
  const result = await getEntityAction(id);

  if (!result.success) {
    if (result.error.includes('non trovata') || result.error.includes('Accesso negato')) {
      notFound();
    }
    // Altri errori: reindirizza alla lista
    redirect('/entities');
  }

  const entity = result.data;

  const typeLabels: Record<typeof entity.type, string> = {
    CUSTOMER: 'Cliente',
    SUPPLIER: 'Fornitore',
    LEAD: 'Lead',
  };

  const typeVariants: Record<typeof entity.type, 'default' | 'secondary' | 'outline'> = {
    CUSTOMER: 'default',
    SUPPLIER: 'secondary',
    LEAD: 'outline',
  };

  return (
    <div className="space-y-6">
      {/* Header con breadcrumb */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/entities">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">{entity.businessName}</h1>
            <p className="text-muted-foreground mt-1">
              Dettaglio anagrafica
            </p>
          </div>
        </div>
        <Badge variant={typeVariants[entity.type]}>
          {typeLabels[entity.type]}
        </Badge>
      </div>

      {/* Card Stato */}
      <Card>
        <CardHeader>
          <CardTitle>Stato Anagrafica</CardTitle>
          <CardDescription>
            Attiva o disattiva l'anagrafica
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ToggleEntityActive entityId={entity.id} initialActive={entity.active} />
        </CardContent>
      </Card>

      {/* Card Dati Anagrafici */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Dati Anagrafici</CardTitle>
              <CardDescription>
                Informazioni principali dell'anagrafica
              </CardDescription>
            </div>
            <Badge variant={entity.active ? 'default' : 'secondary'}>
              {entity.active ? 'Attiva' : 'Disattiva'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2">
            <div>
              <Label className="text-muted-foreground">Ragione Sociale</Label>
              <p className="text-lg font-medium">{entity.businessName}</p>
            </div>
            
            {entity.vatNumber && (
              <div>
                <Label className="text-muted-foreground">Partita IVA</Label>
                <p className="text-lg">{entity.vatNumber}</p>
              </div>
            )}
            
            {entity.fiscalCode && (
              <div>
                <Label className="text-muted-foreground">Codice Fiscale</Label>
                <p className="text-lg">{entity.fiscalCode}</p>
              </div>
            )}
            
            {entity.email && (
              <div>
                <Label className="text-muted-foreground">Email</Label>
                <p className="text-lg">
                  <a 
                    href={`mailto:${entity.email}`}
                    className="text-blue-600 hover:underline"
                  >
                    {entity.email}
                  </a>
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Card Indirizzo (sede principale dall'anagrafica) */}
      {(entity.address || entity.city || entity.province || entity.zipCode) && (
        <Card>
          <CardHeader>
            <CardTitle>Indirizzo principale</CardTitle>
            <CardDescription>
              Indirizzo salvato sull&apos;anagrafica (puoi gestire sedi multiple nella sezione sotto)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {entity.address && (
                <p className="text-lg">{entity.address}</p>
              )}
              <p className="text-muted-foreground">
                {[entity.zipCode, entity.city, entity.province]
                  .filter(Boolean)
                  .join(' ')}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Sedi e Destinazioni */}
      <EntityAddressesSection entityId={entity.id} addresses={entity.addresses ?? []} />

      {/* Card Modifica */}
      <Card>
        <CardHeader>
          <CardTitle>Modifica Anagrafica</CardTitle>
          <CardDescription>
            Modifica i dati dell'anagrafica. La P.IVA deve essere unica per organizzazione.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <EntityFormWrapper entity={entity} />
        </CardContent>
      </Card>
    </div>
  );
}
