import React from 'react';
import { View, Text, StyleSheet } from '@react-pdf/renderer';
import { Decimal } from 'decimal.js';
import { formatDecimalItalian, getContrastColor } from '@/lib/pdf/format-utils';
import type { BaseTableProps, DocumentLineSnapshot, ConditionalStyle } from './types';

const createStyles = (fontSize: string) =>
  StyleSheet.create({
    table: {
      marginTop: 20,
      marginBottom: 20,
    },
    headerRow: {
      flexDirection: 'row',
      borderBottomWidth: 2,
      borderBottomColor: '#cbd5e1',
      paddingVertical: 10,
      paddingHorizontal: 8,
    },
    dataRow: {
      flexDirection: 'row',
      borderBottomWidth: 1,
      borderBottomColor: '#f1f5f9',
      paddingVertical: 8,
      paddingHorizontal: 8,
      minHeight: 30,
    },
    cell: {
      fontSize: parseInt(fontSize, 10),
      paddingHorizontal: 4,
    },
    headerCell: {
      fontSize: parseInt(fontSize, 10),
      fontWeight: 'bold',
      paddingHorizontal: 4,
    },
    alignRight: {
      textAlign: 'right',
    },
  });

function getRowStyles(line: DocumentLineSnapshot, conditionalStyles: ConditionalStyle[]): Record<string, unknown> & { color?: string } {
  const applied: Record<string, unknown> & { color?: string } = {};
  const lineRecord = line as unknown as Record<string, unknown>;
  for (const rule of conditionalStyles) {
    if (rule.target !== 'row') continue;
    const fieldValue = lineRecord[rule.condition];
    if (String(fieldValue ?? '') !== String(rule.value)) continue;
    applied.backgroundColor = rule.backgroundColor;
    applied.color = rule.color ?? getContrastColor(rule.backgroundColor);
    break;
  }
  return applied;
}

export const StandardTable: React.FC<BaseTableProps> = ({
  lines,
  columns,
  style: tableStyle,
  conditionalStyles = [],
}) => {
  const styles = createStyles(tableStyle.fontSize);
  const columnWidths = {
    sku: columns.showSku ? 1 : 0,
    description: columns.showDescription ? 3.5 : 0,
    quantity: columns.showQuantity ? 1 : 0,
    unitPrice: columns.showUnitPrice ? 1.2 : 0,
    discount: columns.showDiscount ? 1 : 0,
    vatRate: columns.showVatRate ? 0.8 : 0,
    netAmount: columns.showNetAmount ? 1.3 : 0,
    vatAmount: columns.showVatAmount ? 1.2 : 0,
    grossAmount: columns.showGrossAmount ? 1.3 : 0,
  };
  const headerTextColor = '#ffffff';
  const borderStyle = tableStyle.showBorders
    ? { borderBottomWidth: 1, borderBottomColor: '#f1f5f9' }
    : {};

  return (
    <View style={styles.table}>
      <View style={[styles.headerRow, { backgroundColor: tableStyle.headerColor }]}>
        {columns.showSku && (
          <Text style={[styles.headerCell, { flex: columnWidths.sku, color: headerTextColor }]}>Codice</Text>
        )}
        {columns.showDescription && (
          <Text style={[styles.headerCell, { flex: columnWidths.description, color: headerTextColor }]}>Descrizione</Text>
        )}
        {columns.showQuantity && (
          <Text style={[styles.headerCell, styles.alignRight, { flex: columnWidths.quantity, color: headerTextColor }]}>Qtà</Text>
        )}
        {columns.showUnitPrice && (
          <Text style={[styles.headerCell, styles.alignRight, { flex: columnWidths.unitPrice, color: headerTextColor }]}>Prezzo</Text>
        )}
        {columns.showDiscount && (
          <Text style={[styles.headerCell, styles.alignRight, { flex: columnWidths.discount, color: headerTextColor }]}>Sconto</Text>
        )}
        {columns.showVatRate && (
          <Text style={[styles.headerCell, styles.alignRight, { flex: columnWidths.vatRate, color: headerTextColor }]}>IVA%</Text>
        )}
        {columns.showNetAmount && (
          <Text style={[styles.headerCell, styles.alignRight, { flex: columnWidths.netAmount, color: headerTextColor }]}>Imponibile</Text>
        )}
        {columns.showVatAmount && (
          <Text style={[styles.headerCell, styles.alignRight, { flex: columnWidths.vatAmount, color: headerTextColor }]}>IVA</Text>
        )}
        {columns.showGrossAmount && (
          <Text style={[styles.headerCell, styles.alignRight, { flex: columnWidths.grossAmount, color: headerTextColor }]}>Totale</Text>
        )}
      </View>

      {lines.map((line, idx) => {
        const rowStyles = getRowStyles(line, conditionalStyles);
        const isStriped = tableStyle.stripedRows && idx % 2 === 1;
        const vatRatePercent = formatDecimalItalian(new Decimal(line.vatRate).mul(100).toString());

        return (
          <View
            key={idx}
            style={[
              styles.dataRow,
              borderStyle,
              isStriped && { backgroundColor: '#f8fafc' },
              rowStyles,
            ]}
          >
            {columns.showSku && (
              <Text style={[styles.cell, { flex: columnWidths.sku }, rowStyles.color && { color: rowStyles.color }]}>
                {line.productCode}
              </Text>
            )}
            {columns.showDescription && (
              <Text style={[styles.cell, { flex: columnWidths.description }, rowStyles.color && { color: rowStyles.color }]}>
                {line.description}
              </Text>
            )}
            {columns.showQuantity && (
              <Text style={[styles.cell, styles.alignRight, { flex: columnWidths.quantity }, rowStyles.color && { color: rowStyles.color }]}>
                {formatDecimalItalian(line.quantity)}
              </Text>
            )}
            {columns.showUnitPrice && (
              <Text style={[styles.cell, styles.alignRight, { flex: columnWidths.unitPrice }, rowStyles.color && { color: rowStyles.color }]}>
                {formatDecimalItalian(line.unitPrice)}
              </Text>
            )}
            {columns.showDiscount && (
              <Text style={[styles.cell, styles.alignRight, { flex: columnWidths.discount }, rowStyles.color && { color: rowStyles.color }]}>
                {line.discount ? `${line.discount}%` : '-'}
              </Text>
            )}
            {columns.showVatRate && (
              <Text style={[styles.cell, styles.alignRight, { flex: columnWidths.vatRate }, rowStyles.color && { color: rowStyles.color }]}>
                {vatRatePercent}%
              </Text>
            )}
            {columns.showNetAmount && (
              <Text style={[styles.cell, styles.alignRight, { flex: columnWidths.netAmount }, rowStyles.color && { color: rowStyles.color }]}>
                {formatDecimalItalian(line.netAmount)}
              </Text>
            )}
            {columns.showVatAmount && (
              <Text style={[styles.cell, styles.alignRight, { flex: columnWidths.vatAmount }, rowStyles.color && { color: rowStyles.color }]}>
                {formatDecimalItalian(line.vatAmount)}
              </Text>
            )}
            {columns.showGrossAmount && (
              <Text style={[styles.cell, styles.alignRight, { flex: columnWidths.grossAmount }, rowStyles.color && { color: rowStyles.color }]}>
                {formatDecimalItalian(line.grossAmount)}
              </Text>
            )}
          </View>
        );
      })}
    </View>
  );
};
