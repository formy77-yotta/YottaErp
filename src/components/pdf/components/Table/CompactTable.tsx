import React from 'react';
import { View, Text, StyleSheet } from '@react-pdf/renderer';
import { formatDecimalItalian } from '@/lib/pdf/format-utils';
import type { BaseTableProps } from './types';

const styles = StyleSheet.create({
  table: {
    marginTop: 15,
    marginBottom: 15,
  },
  row: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingVertical: 5,
    paddingHorizontal: 6,
  },
  description: {
    flex: 4,
    fontSize: 9,
  },
  quantity: {
    flex: 1,
    fontSize: 9,
    textAlign: 'right',
  },
  amount: {
    flex: 1.5,
    fontSize: 9,
    textAlign: 'right',
    fontWeight: 'bold',
  },
});

export const CompactTable: React.FC<BaseTableProps> = ({ lines }) => {
  return (
    <View style={styles.table}>
      {lines.map((line, idx) => (
        <View key={idx} style={styles.row}>
          <Text style={styles.description}>
            {line.productCode} - {line.description}
          </Text>
          <Text style={styles.quantity}>{formatDecimalItalian(line.quantity)}</Text>
          <Text style={styles.amount}>{formatDecimalItalian(line.grossAmount)}</Text>
        </View>
      ))}
    </View>
  );
};
