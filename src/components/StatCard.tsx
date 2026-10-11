import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS, SPACING, RADIUS } from '../constants/theme';

interface StatCardProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  color: string;
}

export function StatCard({ icon, label, value, color }: StatCardProps) {
  return (
    <View style={[styles.card, { borderColor: color + '33' }]}>
      <View style={[styles.iconWrap, { backgroundColor: color + '22' }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text style={styles.value} numberOfLines={1}>{value}</Text>
      <Text style={styles.label} numberOfLines={1}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.lg,
    padding: SPACING.md,
    alignItems: 'center',
    gap: SPACING.xs,
    borderWidth: 1,
  },
  iconWrap: {
    width: 40, height: 40, borderRadius: RADIUS.full,
    alignItems: 'center', justifyContent: 'center',
  },
  value: {
    fontSize: FONTS.sizes.md, fontWeight: '700',
    color: COLORS.textPrimary, textAlign: 'center',
  },
  label: { fontSize: FONTS.sizes.xs, color: COLORS.textSecondary, textAlign: 'center' },
});
