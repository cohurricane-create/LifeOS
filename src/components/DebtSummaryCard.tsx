import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, RADIUS } from '../constants/theme';

interface DebtSummaryCardProps {
  label: string;
  amount: string;
  color: string;
  icon: keyof typeof Ionicons.glyphMap;
}

export function DebtSummaryCard({ label, amount, color, icon }: DebtSummaryCardProps) {
  return (
    <View style={[styles.card, { borderColor: color + '44' }]}>
      <Ionicons name={icon} size={20} color={color} />
      <Text style={[styles.amount, { color }]}>{amount}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1, borderRadius: RADIUS.md, padding: SPACING.md,
    alignItems: 'center', gap: 4, borderWidth: 1,
    backgroundColor: COLORS.bgInput,
  },
  amount: { fontSize: FONTS.sizes.md, fontWeight: '700' },
  label: { fontSize: FONTS.sizes.xs, color: COLORS.textSecondary, textAlign: 'center' },
});
