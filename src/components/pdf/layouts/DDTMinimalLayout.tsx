import React from 'react';
import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { Decimal } from 'decimal.js';
import { formatDecimalItalian } from '@/lib/decimal-utils';
import { StandardHeader } from '../components/Header/StandardHeader';
import { StandardRecipient } from '../components/RecipientBlock/StandardRecipient';
import { StandardTable } from '../components/Table/StandardTable';
import { StandardFooter } from '../components/Footer/StandardFooter';
import type { DocumentSnapshot } from '@/lib/pdf/document-snapshot';
import type { PrintTemplateConfigV2 } from '@/lib/pdf/config-schema-v2';

export interface DDTMinimalLayoutProps {
  document: DocumentSnapshot;
  config: PrintTemplateConfigV2;
  organization: {
    name: string;
    logoUrl?: string | null;
  };
}

/** Layout minimal per DDT: tabella essenziale, totali e note opzionali via sections */
const styles = StyleSheet.create({
  page: {
    padding: 24,
    fontFamily: 'Helvetica',
    fontSize: 9,
  },
  notes: {
    marginTop: 12,
    fontSize: 8,
    color: '#64748b',
  },
});

export const DDTMinimalLayout: React.FC<DDTMinimalLayoutProps> = ({
  document: doc,
  config,
  organization,
}) => {
  const formattedDate = format(new Date(doc.date), 'dd/MM/yyyy', { locale: it });

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {config.sections.showHeader && (
          <StandardHeader
            logo={organization.logoUrl}
            organizationName={organization.name}
            title={doc.documentTypeDescription}
            number={doc.number}
            date={formattedDate}
            config={config.header}
          />
        )}

        {config.sections.showRecipient && (
          <StandardRecipient
            customer={{
              name: doc.customerNameSnapshot,
              vat: doc.customerVatSnapshot,
              address: doc.customerAddressSnapshot,
              city: doc.customerCity,
              zip: doc.customerZip,
              province: doc.customerProvince,
              country: doc.customerCountry,
            }}
            position="left"
            textColor={config.colors.text}
          />
        )}

        {config.sections.showTable && (
          <StandardTable
            lines={doc.lines}
            columns={config.table.columns}
            style={config.table.style}
            conditionalStyles={config.conditionalStyles}
          />
        )}

        {config.sections.showTotals && (
          <View style={{ marginTop: 12 }}>
            <Text style={{ fontSize: 9 }}>Totale: {formatDecimalItalian(new Decimal(doc.grossTotal))} €</Text>
          </View>
        )}

        {config.sections.showNotes && doc.notes && (
          <View style={{ marginTop: 12 }}>
            <Text style={styles.notes}>{doc.notes}</Text>
          </View>
        )}

        {config.sections.showFooter && (
          <StandardFooter
            documentType={doc.documentTypeDescription}
            documentNumber={doc.number}
            textColor={config.colors.secondary}
          />
        )}
      </Page>
    </Document>
  );
};
