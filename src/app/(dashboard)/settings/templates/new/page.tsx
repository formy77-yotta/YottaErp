/**
 * Pagina creazione nuovo modello di stampa PDF
 */

import Link from 'next/link';
import { TemplateEditor } from '@/components/features/templates/TemplateEditor';
import { defaultPrintTemplateConfig } from '@/lib/pdf/template-schema';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default function NewTemplatePage() {
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
        organizationName="La tua organizzazione"
        onSuccess={() => window.location.replace('/settings/templates')}
        onError={(msg) => alert(msg)}
      />
    </div>
  );
}
