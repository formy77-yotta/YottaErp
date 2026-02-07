/**
 * Motore di rendering PDF universale per documenti (fatture, DDT, ordini, etc.)
 *
 * Applica dinamicamente gli stili da templateConfig (PrintTemplate.config).
 * Usa decimal.js per formattare i totali con 2 decimali e virgola italiana.
 */

'use client';

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from '@react-pdf/renderer';
import { Decimal } from 'decimal.js';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';
import type { PrintTemplateConfig } from '@/lib/pdf/template-schema';
import { formatDecimalItalian } from '@/lib/decimal-utils';

/** Snapshot riga documento per PDF (amounts come string per Decimal) */
export interface DocumentLineSnapshot {
  productCode: string;
  description: string;
  unitPrice: string;
  quantity: string;
  vatRate: string;
  netAmount: string;
  vatAmount: string;
  grossAmount: string;
}

/** Snapshot documento per rendering PDF */
export interface DocumentSnapshot {
  number: string;
  date: string; // ISO o Date serializable
  documentTypeDescription: string;
  customerNameSnapshot: string;
  customerVatSnapshot?: string | null;
  customerAddressSnapshot: string;
  customerCity: string;
  customerProvince: string;
  customerZip: string;
  customerCountry: string;
  netTotal: string;
  vatTotal: string;
  grossTotal: string;
  notes?: string | null;
  paymentTerms?: string | null;
  lines: DocumentLineSnapshot[];
}

function toDec(s: string): Decimal {
  return new Decimal(s);
}

function fmt(s: string): string {
  return formatDecimalItalian(toDec(s));
}

interface UniversalPdfRendererProps {
  document: DocumentSnapshot;
  templateConfig: PrintTemplateConfig;
  /** Nome organizzazione (intestazione) */
  organizationName?: string;
}

export function UniversalPdfRenderer({
  document: doc,
  templateConfig: config,
  organizationName = 'Organizzazione',
}: UniversalPdfRendererProps) {
  const fs = config.fontSize;
  const primary = config.primaryColor;
  const secondary = config.secondaryColor;
  const headerBg = config.tableStyle.headerColor;
  const striped = config.tableStyle.stripedRows;
  const cols = config.columnsConfig;

  const styles = StyleSheet.create({
    page: {
      padding: 30,
      fontSize: fs,
      fontFamily: 'Helvetica',
    },
    header: {
      marginBottom: 20,
      borderBottomWidth: 2,
      borderBottomColor: primary,
      paddingBottom: 10,
    },
    title: {
      fontSize: fs + 4,
      color: primary,
      marginBottom: 4,
    },
    subtitle: {
      fontSize: fs - 1,
      color: secondary,
    },
    section: {
      marginBottom: 12,
    },
    label: {
      fontSize: fs - 1,
      color: secondary,
      marginBottom: 2,
    },
    value: {
      fontSize: fs,
    },
    twoCol: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 16,
    },
    leftCol: { width: '48%' },
    rightCol: { width: '48%' },
    table: {
      marginTop: 12,
      width: '100%',
    },
    tableRow: {
      flexDirection: 'row',
      borderBottomWidth: 1,
      borderBottomColor: '#e5e7eb',
      paddingVertical: 4,
    },
    tableRowStriped: {
      backgroundColor: '#f9fafb',
    },
    tableHeader: {
      flexDirection: 'row',
      backgroundColor: headerBg,
      color: '#fff',
      paddingVertical: 6,
      paddingHorizontal: 4,
      marginBottom: 0,
    },
    tableCell: {
      paddingHorizontal: 4,
      fontSize: fs - 1,
    },
    colCode: { width: '10%' },
    colDesc: { width: cols.showSku ? '28%' : '38%' },
    colQty: { width: '8%' },
    colPrice: { width: '12%' },
    colVat: { width: cols.showVatRate ? '8%' : '0%' },
    colNet: { width: cols.showNetAmount ? '12%' : '0%' },
    colVatAmt: { width: cols.showVatAmount ? '10%' : '0%' },
    colGross: { width: cols.showGrossAmount ? '12%' : '0%' },
    totals: {
      marginTop: 16,
      alignItems: 'flex-end',
      width: '40%',
      marginLeft: '60%',
    },
    totalRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingVertical: 2,
      paddingHorizontal: 8,
    },
    totalLabel: { color: secondary },
    totalValue: { fontFamily: 'Helvetica-Bold' },
    footer: {
      position: 'absolute',
      bottom: 20,
      left: 30,
      right: 30,
      fontSize: fs - 2,
      color: secondary,
      textAlign: 'center',
    },
    watermark: {
      position: 'absolute',
      top: '40%',
      left: 0,
      right: 0,
      textAlign: 'center',
      fontSize: 48,
      color: primary,
      opacity: 0.1,
      transform: 'rotate(-30deg)',
    },
  });

  const customerAddress = [
    doc.customerAddressSnapshot,
    [doc.customerZip, doc.customerCity, doc.customerProvince].filter(Boolean).join(' '),
    doc.customerCountry,
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {config.showWatermark && (
          <View style={styles.watermark}>
            <Text>{doc.documentTypeDescription.toUpperCase()}</Text>
          </View>
        )}
        <View style={styles.header}>
          {config.showLogo && (
            <Text style={styles.subtitle}>{organizationName}</Text>
          )}
          <Text style={styles.title}>
            {doc.documentTypeDescription} n. {doc.number}
          </Text>
          <Text style={styles.subtitle}>
            Data: {format(new Date(doc.date), 'dd MMMM yyyy', { locale: it })}
          </Text>
        </View>

        <View style={styles.twoCol}>
          <View style={styles.leftCol}>
            <View style={styles.section}>
              <Text style={styles.label}>Destinatario</Text>
              <Text style={styles.value}>{doc.customerNameSnapshot}</Text>
              {doc.customerVatSnapshot && (
                <Text style={styles.value}>P.IVA / CF: {doc.customerVatSnapshot}</Text>
              )}
              <Text style={styles.value}>{customerAddress}</Text>
            </View>
          </View>
          <View style={styles.rightCol} />
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            {cols.showSku && (
              <View style={[styles.tableCell, styles.colCode]}>
                <Text>Cod.</Text>
              </View>
            )}
            <View style={[styles.tableCell, styles.colDesc]}>
              <Text>Descrizione</Text>
            </View>
            <View style={[styles.tableCell, styles.colQty]}>
              <Text>Qtà</Text>
            </View>
            <View style={[styles.tableCell, styles.colPrice]}>
              <Text>Prezzo</Text>
            </View>
            {cols.showVatRate && (
              <View style={[styles.tableCell, styles.colVat]}>
                <Text>IVA%</Text>
              </View>
            )}
            {cols.showNetAmount && (
              <View style={[styles.tableCell, styles.colNet]}>
                <Text>Imponibile</Text>
              </View>
            )}
            {cols.showVatAmount && (
              <View style={[styles.tableCell, styles.colVatAmt]}>
                <Text>IVA</Text>
              </View>
            )}
            {cols.showGrossAmount && (
              <View style={[styles.tableCell, styles.colGross]}>
                <Text>Totale</Text>
              </View>
            )}
          </View>
          {doc.lines.map((line, idx) => (
            <View
              key={idx}
              style={[
                styles.tableRow,
                ...(striped && idx % 2 === 1 ? [styles.tableRowStriped] : []),
              ]}
            >
              {cols.showSku && (
                <View style={[styles.tableCell, styles.colCode]}>
                  <Text>{line.productCode}</Text>
                </View>
              )}
              <View style={[styles.tableCell, styles.colDesc]}>
                <Text>{line.description}</Text>
              </View>
              <View style={[styles.tableCell, styles.colQty]}>
                <Text>{formatDecimalItalian(toDec(line.quantity))}</Text>
              </View>
              <View style={[styles.tableCell, styles.colPrice]}>
                <Text>{fmt(line.unitPrice)}</Text>
              </View>
              {cols.showVatRate && (
                <View style={[styles.tableCell, styles.colVat]}>
                  <Text>{formatDecimalItalian(toDec(line.vatRate).mul(100))}%</Text>
                </View>
              )}
              {cols.showNetAmount && (
                <View style={[styles.tableCell, styles.colNet]}>
                  <Text>{fmt(line.netAmount)}</Text>
                </View>
              )}
              {cols.showVatAmount && (
                <View style={[styles.tableCell, styles.colVatAmt]}>
                  <Text>{fmt(line.vatAmount)}</Text>
                </View>
              )}
              {cols.showGrossAmount && (
                <View style={[styles.tableCell, styles.colGross]}>
                  <Text>{fmt(line.grossAmount)}</Text>
                </View>
              )}
            </View>
          ))}
        </View>

        <View style={styles.totals}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Imponibile:</Text>
            <Text style={styles.totalValue}>{fmt(doc.netTotal)} €</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>IVA:</Text>
            <Text style={styles.totalValue}>{fmt(doc.vatTotal)} €</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalValue}>Totale: {fmt(doc.grossTotal)} €</Text>
          </View>
        </View>

        {(doc.notes || doc.paymentTerms) && (
          <View style={[styles.section, { marginTop: 16 }]}>
            {doc.notes && (
              <>
                <Text style={styles.label}>Note</Text>
                <Text style={styles.value}>{doc.notes}</Text>
              </>
            )}
            {doc.paymentTerms && (
              <>
                <Text style={styles.label}>Termini di pagamento</Text>
                <Text style={styles.value}>{doc.paymentTerms}</Text>
              </>
            )}
          </View>
        )}

        <View style={styles.footer} fixed>
          <Text>
            Documento generato il {format(new Date(), 'dd/MM/yyyy HH:mm', { locale: it })} - {doc.documentTypeDescription} n. {doc.number}
          </Text>
        </View>
      </Page>
    </Document>
  );
}
