/**
 * Pagina modifica modello di stampa PDF
 */

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getAuthContext, verifyOrganizationAccess } from '@/lib/auth';
import { TemplateEditor } from '@/components/features/templates/TemplateEditor';
import { parseTemplateConfig } from '@/lib/pdf/template-schema';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export const dynamic = 'force-dynamic';

interface EditTemplatePageProps {
  params: Promise<{ id: string }>;
}

export default async function EditTemplatePage({ params }: EditTemplatePageProps) {
  const { id } = await params;
  const ctx = await getAuthContext();
  const template = await prisma.printTemplate.findUnique({
    where: { id },
    select: { id: true, organizationId: true, name: true, config: true },
  });

  if (!template) {
    notFound();
  }
  verifyOrganizationAccess(ctx, { organizationId: template.organizationId });

  const parsed = parseTemplateConfig(template.config);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/settings/templates">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Modifica modello</h1>
          <p className="text-muted-foreground mt-1">
            {template.name}
          </p>
        </div>
      </div>

      <TemplateEditor
        key={template.id}
        initialConfig={parsed.data}
        initialName={template.name}
        templateId={template.id}
        organizationName="La tua organizzazione"
        onSuccess={() => window.location.replace('/settings/templates')}
        onError={(msg) => alert(msg)}
      />
    </div>
  );
}
