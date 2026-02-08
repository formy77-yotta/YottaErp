import React from 'react';
import { View, Text, StyleSheet } from '@react-pdf/renderer';
import { formatDate } from '@/lib/pdf/format-utils';

export interface StandardFooterProps {
  documentType: string;
  documentNumber: string;
  customText?: string;
  textColor?: string;
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 10,
  },
  text: {
    fontSize: 8,
    color: '#94a3b8',
    textAlign: 'center',
  },
});

export const StandardFooter: React.FC<StandardFooterProps> = ({
  documentType,
  documentNumber,
  customText,
  textColor = '#94a3b8',
}) => {
  const now = new Date().toISOString();
  const generatedDate = formatDate(now, "d MMMM yyyy 'alle' HH:mm");
  const displayText =
    customText ?? `Documento generato il ${generatedDate} - ${documentType} n. ${documentNumber}`;

  return (
    <View style={styles.container} fixed>
      <Text style={[styles.text, { color: textColor }]}>{displayText}</Text>
    </View>
  );
};
