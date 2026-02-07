/**
 * Pagina Anagrafica Organizzazione
 * 
 * Permette di visualizzare e modificare i dati dell'organizzazione corrente.
 * MULTITENANT: Modifica solo l'organizzazione dell'utente autenticato
 * PERMESSI: Solo OWNER e ADMIN possono modificare
 */

import { Suspense } from 'react';
import { getCurrentOrganizationAction } from '@/services/actions/organization-actions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { OrganizationProfileForm } from '@/components/features/OrganizationProfileForm';

// Forza rendering dinamico perché usa cookies per autenticazione
export const dynamic = 'force-dynamic';

/**
 * Componente principale della pagina
 */
export default function OrganizationPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Anagrafica Organizzazione</h1>
        <p className="text-muted-foreground mt-1">
          Gestisci i dati della tua organizzazione per fatturazione elettronica e stampe
        </p>
      </div>

      {/* Form Anagrafica */}
      <Suspense fallback={<OrganizationFormSkeleton />}>
        <OrganizationFormContent />
      </Suspense>
    </div>
  );
}

/**
 * Form con dati dal server
 */
async function OrganizationFormContent() {
  const result = await getCurrentOrganizationAction();

  if (!result.success) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-destructive">Errore: {result.error}</p>
        </CardContent>
      </Card>
    );
  }

  if (!result.organization) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <p className="text-destructive">Organizzazione non trovata</p>
        </CardContent>
      </Card>
    );
  }

  return <OrganizationProfileForm organization={result.organization} />;
}

/**
 * Skeleton per caricamento form
 */
function OrganizationFormSkeleton() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Anagrafica Organizzazione</CardTitle>
        <CardDescription>Caricamento dati...</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-10 bg-muted animate-pulse rounded" />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
