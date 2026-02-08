import React from 'react';
import { View, Text, StyleSheet } from '@react-pdf/renderer';
import { Decimal } from 'decimal.js';
import { formatDecimalItalian, formatCurrency } from '@/lib/pdf/format-utils';
import type { BaseTableProps } from './types';

const styles = StyleSheet.create({
  table: {
    marginTop: 20,
    marginBottom: 20,
  },
  row: {
    marginBottom: 15,
    padding: 12,
    backgroundColor: '#f8fafc',
    borderLeftWidth: 3,
    borderLeftColor: '#3b82f6',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  productCode: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#3b82f6',
  },
  description: {
    fontSize: 11,
    color: '#0f172a',
    marginBottom: 8,
  },
  details: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 9,
    color: '#64748b',
  },
  total: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#0f172a',
    textAlign: 'right',
    marginTop: 6,
  },
});

export const DetailedTable: React.FC<BaseTableProps> = ({ lines }) => {
  return (
    <View style={styles.table}>
      {lines.map((line, idx) => (
        <View key={idx} style={styles.row}>
          <View style={styles.header}>
            <Text style={styles.productCode}>{line.productCode}</Text>
            <Text style={styles.productCode}>
              {formatDecimalItalian(line.quantity)} x {formatCurrency(line.unitPrice)}
            </Text>
          </View>
          <Text style={styles.description}>{line.description}</Text>
          <View style={styles.details}>
            <Text>Imponibile: {formatCurrency(line.netAmount)}</Text>
            <Text>
              IVA ({formatDecimalItalian(new Decimal(line.vatRate).mul(100).toString())}%):{' '}
              {formatCurrency(line.vatAmount)}
            </Text>
          </View>
          <Text style={styles.total}>Totale: {formatCurrency(line.grossAmount)}</Text>
        </View>
      ))}
    </View>
  );
};
