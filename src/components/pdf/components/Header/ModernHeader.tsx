import React from 'react';
import { View, Text, Image, StyleSheet } from '@react-pdf/renderer';
import { formatDate } from '@/lib/pdf/format-utils';
import type { BaseHeaderProps } from './types';

const styles = StyleSheet.create({
  container: {
    marginBottom: 40,
  },
  topBar: {
    backgroundColor: '#1e40af',
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logo: {
    width: 120,
    height: 'auto',
    maxHeight: 50,
  },
  orgName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  dateText: {
    fontSize: 12,
    color: '#ffffff',
  },
  titleBar: {
    backgroundColor: '#f8fafc',
    padding: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1e40af',
  },
  number: {
    fontSize: 18,
    color: '#64748b',
  },
});

export const ModernHeader: React.FC<BaseHeaderProps> = ({
  logo,
  organizationName,
  title,
  number,
  date,
  config,
}) => {
  const formattedDate = formatDate(date, 'd MMMM yyyy');
  const bgColor = config.backgroundColor ?? '#1e40af';

  return (
    <View style={styles.container}>
      <View style={[styles.topBar, { backgroundColor: bgColor }]}>
        <View>
          {logo ? (
            <Image src={logo} style={styles.logo} />
          ) : (
            <Text style={styles.orgName}>{organizationName}</Text>
          )}
        </View>
        {config.showDate && <Text style={styles.dateText}>{formattedDate}</Text>}
      </View>
      <View style={styles.titleBar}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.number}>N. {number}</Text>
      </View>
    </View>
  );
};
