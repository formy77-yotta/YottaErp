import React from 'react';
import { View, Text, StyleSheet } from '@react-pdf/renderer';
import { formatDate } from '@/lib/pdf/format-utils';
import type { BaseHeaderProps } from './types';

const styles = StyleSheet.create({
  container: {
    marginBottom: 30,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  details: {
    fontSize: 11,
    color: '#64748b',
  },
});

export const MinimalHeader: React.FC<BaseHeaderProps> = ({
  organizationName,
  title,
  number,
  date,
  config,
}) => {
  const formattedDate = formatDate(date, 'dd/MM/yyyy');

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Text style={styles.title}>{organizationName}</Text>
        {config.showDate && <Text style={styles.details}>{formattedDate}</Text>}
      </View>
      <View style={[styles.row, { marginTop: 8 }]}>
        <Text style={styles.details}>{title}</Text>
        <Text style={styles.details}>N. {number}</Text>
      </View>
    </View>
  );
};
