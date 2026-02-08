import React from 'react';
import { View, Text, Image, StyleSheet } from '@react-pdf/renderer';
import { formatDate } from '@/lib/pdf/format-utils';
import type { BaseHeaderProps } from './types';

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 30,
    paddingBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: '#e5e7eb',
  },
  leftBlock: {
    width: '30%',
  },
  centerBlock: {
    width: '40%',
    alignItems: 'center',
  },
  rightBlock: {
    width: '30%',
    alignItems: 'flex-end',
  },
  logo: {
    width: 100,
    height: 'auto',
    maxHeight: 60,
  },
  orgName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1e40af',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  number: {
    fontSize: 16,
    color: '#64748b',
    marginBottom: 4,
  },
  date: {
    fontSize: 11,
    color: '#94a3b8',
  },
});

export const StandardHeader: React.FC<BaseHeaderProps> = ({
  logo,
  organizationName,
  title,
  number,
  date,
  config,
}) => {
  const formattedDate = formatDate(date, 'd MMMM yyyy');
  const textColor = config.textColor ?? '#0f172a';

  const LogoBlock = () => (
    <>
      {logo ? (
        <Image src={logo} style={styles.logo} />
      ) : (
        <Text style={[styles.orgName, { color: textColor }]}>{organizationName}</Text>
      )}
    </>
  );

  return (
    <View style={[styles.container, config.backgroundColor && { backgroundColor: config.backgroundColor }]}>
      <View style={styles.leftBlock}>
        {config.logoPosition === 'left' && <LogoBlock />}
      </View>
      <View style={styles.centerBlock}>
        {config.logoPosition === 'center' && <LogoBlock />}
        <Text style={[styles.title, { color: textColor }]}>{title}</Text>
        <Text style={[styles.number, { color: textColor }]}>N. {number}</Text>
        {config.showDate && (
          <Text style={[styles.date, { color: textColor }]}>{formattedDate}</Text>
        )}
      </View>
      <View style={styles.rightBlock}>
        {config.logoPosition === 'right' && <LogoBlock />}
      </View>
    </View>
  );
};
