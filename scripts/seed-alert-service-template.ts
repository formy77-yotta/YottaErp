/**
 * Seed template di test "Alert Service" per stili condizionali PDF.
 * Crea un modello che evidenzia le righe con productType === 'SERVICE' in rosso pastello.
 *
 * Esecuzione: npx tsx scripts/seed-alert-service-template.ts
 */

import { prisma } from '../src/lib/prisma';
import { parseTemplateConfigV2 } from '../src/lib/pdf/config-schema-v2';

async function main() {
  console.log('🌱 Seed template "Alert Service"...\n');

  const organization = await prisma.organization.findFirst({ orderBy: { createdAt: 'asc' } });
  if (!organization) {
    console.error('❌ Nessuna organizzazione trovata. Crea prima un\'organizzazione.');
    process.exit(1);
  }

  const existing = await prisma.printTemplate.findFirst({
    where: { organizationId: organization.id, name: 'Alert Service' },
  });

  const config = parseTemplateConfigV2({
    baseLayout: 'invoice-standard',
    conditionalStyles: [
      { target: 'row', condition: 'productType', value: 'SERVICE', backgroundColor: '#fecaca' },
    ],
  }) as object;
  if (existing) {
    await prisma.printTemplate.update({
      where: { id: existing.id },
      data: { config },
    });
    console.log('✅ Template "Alert Service" aggiornato.');
  } else {
    await prisma.printTemplate.create({
      data: {
        organizationId: organization.id,
        name: 'Alert Service',
        config,
        isDefault: false,
      },
    });
    console.log('✅ Template "Alert Service" creato.');
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
