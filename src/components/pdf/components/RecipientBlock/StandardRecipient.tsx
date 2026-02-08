import React from 'react';
import { View, Text, StyleSheet } from '@react-pdf/renderer';
import type { RecipientBlockProps } from './types';

const styles = StyleSheet.create({
  container: {
    marginBottom: 30,
    padding: 15,
    backgroundColor: '#f8fafc',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  containerLeft: {
    width: '60%',
  },
  containerRight: {
    width: '60%',
    marginLeft: 'auto',
  },
  label: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#64748b',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  name: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 4,
  },
  detail: {
    fontSize: 10,
    color: '#475569',
    marginBottom: 2,
  },
});

export const StandardRecipient: React.FC<RecipientBlockProps> = ({
  customer,
  position,
  showLabel = true,
  textColor,
}) => {
  const containerStyle = position === 'left' ? styles.containerLeft : styles.containerRight;
  const detailStyle = textColor ? [styles.detail, { color: textColor }] : styles.detail;

  return (
    <View style={[styles.container, containerStyle]}>
      {showLabel && <Text style={styles.label}>Destinatario</Text>}
      <Text style={[styles.name, ...(textColor ? [{ color: textColor }] : [])]}>{customer.name}</Text>
      {customer.vat && (
        <Text style={detailStyle}>P.IVA: {customer.vat}</Text>
      )}
      {customer.fiscalCode && !customer.vat && (
        <Text style={detailStyle}>C.F.: {customer.fiscalCode}</Text>
      )}
      <Text style={detailStyle}>{customer.address}</Text>
      <Text style={detailStyle}>
        {customer.zip} {customer.city} ({customer.province})
      </Text>
      {customer.country !== 'IT' && (
        <Text style={detailStyle}>{customer.country}</Text>
      )}
    </View>
  );
};
