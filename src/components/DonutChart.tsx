import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path, G } from 'react-native-svg';
import { COLORS, CATEGORY_ICONS, CATEGORY_LABELS_UZ, FONTS, SPACING } from '../constants/theme';
import { useAppStore } from '../store/useAppStore';

interface DataItem {
  category: string;
  total: number;
  percentage: number;
}

interface DonutChartProps {
  data: DataItem[];
  size?: number;
}

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`;
}

export function DonutChart({ data, size = 180 }: DonutChartProps) {
  const { formatAmount } = useAppStore();
  const language = useAppStore(s => s.language);
  const cx = size / 2;
  const cy = size / 2;
  const radius = size / 2 - 20;
  const strokeWidth = 28;
  const innerRadius = radius - strokeWidth / 2;

  const total = data.reduce((s, d) => s + d.total, 0);

  const chartColors = COLORS.chartColors;

  return (
    <View style={styles.container}>
      <View style={styles.chartWrap}>
        <Svg width={size} height={size}>
          <G>
            {total > 0 && data.map((item, i) => {
              const angle = (item.total / total) * 360;
              const startAngle = data
                .slice(0, i)
                .reduce((angleTotal, previousItem) => angleTotal + (previousItem.total / total) * 360, 0);
              const endAngle = startAngle + angle - 1.5; // small gap

              if (angle < 3) return null;

              return (
                <Path
                  key={item.category}
                  d={describeArc(cx, cy, radius, startAngle, endAngle)}
                  stroke={chartColors[i % chartColors.length]}
                  strokeWidth={strokeWidth}
                  fill="none"
                  strokeLinecap="round"
                />
              );
            })}
          </G>
        </Svg>
        <View style={[styles.centerLabel, { width: innerRadius * 1.4, height: innerRadius * 1.4, borderRadius: innerRadius }]}>
          <Text style={styles.centerTotal}>{formatAmount(total)}</Text>
          <Text style={styles.centerSub}>Jami harajat</Text>
        </View>
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        {data.slice(0, 6).map((item, i) => {
          const label = language === 'uz'
            ? CATEGORY_LABELS_UZ[item.category] ?? item.category
            : item.category;
          const icon = CATEGORY_ICONS[item.category] ?? '📦';
          return (
            <View key={item.category} style={styles.legendItem}>
              <View style={[styles.dot, { backgroundColor: chartColors[i % chartColors.length] }]} />
              <Text style={styles.legendIcon}>{icon}</Text>
              <Text style={styles.legendLabel} numberOfLines={1}>{label}</Text>
              <Text style={styles.legendPct}>{item.percentage}%</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center' },
  chartWrap: { position: 'relative', alignItems: 'center', justifyContent: 'center' },
  centerLabel: {
    position: 'absolute', alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.bgCard,
  },
  centerTotal: {
    fontSize: FONTS.sizes.sm, fontWeight: '800',
    color: COLORS.textPrimary, textAlign: 'center',
  },
  centerSub: { fontSize: FONTS.sizes.xs, color: COLORS.textSecondary, marginTop: 2 },
  legend: { width: '100%', marginTop: SPACING.md, gap: SPACING.xs },
  legendItem: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    paddingVertical: 2,
  },
  dot: { width: 10, height: 10, borderRadius: 5 },
  legendIcon: { fontSize: 14 },
  legendLabel: { flex: 1, fontSize: FONTS.sizes.sm, color: COLORS.textSecondary },
  legendPct: { fontSize: FONTS.sizes.sm, fontWeight: '700', color: COLORS.textPrimary },
});
