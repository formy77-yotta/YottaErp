/**
 * Pagina creazione nuovo modello di stampa PDF
 */

import Link from 'next/link';
import { TemplateEditor } from '@/components/features/templates/TemplateEditor';
import { defaultPrintTemplateConfig } from '@/lib/pdf/template-schema';
import { getCurrentOrganizationAction } from '@/services/actions/organization-actions';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function NewTemplatePage() {
  const orgResult = await getCurrentOrganizationAction();
  const org = orgResult.success && orgResult.organization ? orgResult.organization : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/settings/templates">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Nuovo modello di stampa</h1>
          <p className="text-muted-foreground mt-1">
            Configura colori, layout e colonne. Usa l’AI per generare la configurazione da una descrizione.
          </p>
        </div>
      </div>

      <TemplateEditor
        initialConfig={defaultPrintTemplateConfig}
        initialName=""
        organizationName={org?.businessName ?? 'La tua organizzazione'}
        organizationLogoUrl={org?.logoUrl ?? null}
        redirectPath="/settings/templates"
      />
    </div>
  );
}
