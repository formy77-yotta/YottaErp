import React from 'react';
import { View, Text, StyleSheet } from '@react-pdf/renderer';

export interface WatermarkProps {
  text: string;
  color?: string;
  opacity?: number;
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: '40%',
    left: '20%',
    right: '20%',
    transform: 'rotate(-45deg)',
    zIndex: -1,
  },
  text: {
    fontSize: 80,
    fontWeight: 'bold',
    textAlign: 'center',
    opacity: 0.08,
  },
});

export const Watermark: React.FC<WatermarkProps> = ({
  text,
  color = '#64748b',
  opacity = 0.08,
}) => {
  return (
    <View style={styles.container} fixed>
      <Text style={[styles.text, { color, opacity }]}>{text}</Text>
    </View>
  );
};
