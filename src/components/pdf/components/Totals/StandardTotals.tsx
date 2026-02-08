import React from 'react';
import { View, Text, StyleSheet } from '@react-pdf/renderer';
import { formatCurrency } from '@/lib/pdf/format-utils';

export interface StandardTotalsProps {
  netTotal: string;
  vatTotal: string;
  grossTotal: string;
  showBreakdown?: boolean;
  primaryColor?: string;
  textColor?: string;
}

const styles = StyleSheet.create({
  container: {
    marginTop: 30,
    marginBottom: 20,
    alignItems: 'flex-end',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: 300,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  label: {
    fontSize: 11,
    color: '#64748b',
  },
  value: {
    fontSize: 11,
    color: '#0f172a',
    fontWeight: 'bold',
  },
  totalRow: {
    backgroundColor: '#f1f5f9',
    borderTopWidth: 2,
    borderTopColor: '#cbd5e1',
    borderBottomWidth: 2,
    borderBottomColor: '#cbd5e1',
    marginTop: 4,
  },
  totalLabel: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#1e40af',
  },
  totalValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1e40af',
  },
});

export const StandardTotals: React.FC<StandardTotalsProps> = ({
  netTotal,
  vatTotal,
  grossTotal,
  showBreakdown = true,
  primaryColor = '#1e40af',
  textColor,
}) => {
  const valueStyle = textColor ? [styles.value, { color: textColor }] : styles.value;
  const totalStyle = { ...styles.totalValue, color: primaryColor };

  return (
    <View style={styles.container}>
      {showBreakdown && (
        <>
          <View style={styles.row}>
            <Text style={styles.label}>Imponibile</Text>
            <Text style={valueStyle}>{formatCurrency(netTotal)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>IVA</Text>
            <Text style={valueStyle}>{formatCurrency(vatTotal)}</Text>
          </View>
        </>
      )}
      <View style={[styles.row, styles.totalRow]}>
        <Text style={styles.totalLabel}>TOTALE</Text>
        <Text style={totalStyle}>{formatCurrency(grossTotal)}</Text>
      </View>
    </View>
  );
};
