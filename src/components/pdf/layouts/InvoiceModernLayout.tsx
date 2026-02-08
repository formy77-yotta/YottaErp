import React from 'react';
import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import { StandardHeader } from '../components/Header/StandardHeader';
import { StandardRecipient } from '../components/RecipientBlock/StandardRecipient';
import { StandardTable } from '../components/Table/StandardTable';
import { StandardTotals } from '../components/Totals/StandardTotals';
import { StandardFooter } from '../components/Footer/StandardFooter';
import type { DocumentSnapshot } from '@/lib/pdf/document-snapshot';
import type { PrintTemplateConfigV2 } from '@/lib/pdf/config-schema-v2';

export interface InvoiceModernLayoutProps {
  document: DocumentSnapshot;
  config: PrintTemplateConfigV2;
  organization: {
    name: string;
    logoUrl?: string | null;
  };
}

/** Layout moderno: stessi blocchi di Standard ma con header centrato e stile più pulito */
const styles = StyleSheet.create({
  page: {
    padding: 36,
    fontFamily: 'Helvetica',
    fontSize: 10,
  },
  notes: {
    marginTop: 16,
    fontSize: 9,
    color: '#64748b',
  },
});

export const InvoiceModernLayout: React.FC<InvoiceModernLayoutProps> = ({
  document: doc,
  config,
  organization,
}) => {
  const formattedDate = format(new Date(doc.date), 'dd MMMM yyyy', { locale: it });
  const headerConfig = {
    ...config.header,
    logoPosition: (config.header.logoPosition === 'left' ? 'center' : config.header.logoPosition) as 'left' | 'center' | 'right',
  };

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
            config={headerConfig}
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
          <StandardTotals
            netTotal={doc.netTotal}
            vatTotal={doc.vatTotal}
            grossTotal={doc.grossTotal}
            primaryColor={config.colors.primary}
            textColor={config.colors.text}
          />
        )}

        {config.sections.showNotes && doc.notes && (
          <View style={{ marginTop: 16 }}>
            <Text style={styles.notes}>Note: {doc.notes}</Text>
          </View>
        )}

        {doc.paymentTerms && (
          <View style={{ marginTop: 6 }}>
            <Text style={styles.notes}>Termini: {doc.paymentTerms}</Text>
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
