import React, { useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  RefreshControl, Dimensions
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { uz as uzLocale } from 'date-fns/locale';
import { COLORS, SPACING, RADIUS, FONTS } from '../../src/constants/theme';
import { useAppStore } from '../../src/store/useAppStore';
import { useTranslation } from '../../src/i18n';
import { DonutChart } from '../../src/components/DonutChart';
import { StatCard } from '../../src/components/StatCard';
import { DebtSummaryCard } from '../../src/components/DebtSummaryCard';

const { width } = Dimensions.get('window');

export default function HomeScreen() {
  const t = useTranslation();
  const router = useRouter();
  const {
    balance, monthlyIncome, monthlyExpense, categoryBreakdown,
    debts, todayTasks, todayHealth, isLoading, refreshAll, formatAmount, language,
    isBalanceHidden, toggleBalanceHidden
  } = useAppStore();

  useFocusEffect(
    useCallback(() => {
      refreshAll();
    }, [])
  );

  const today = format(new Date(), 'dd MMMM, yyyy', {
    locale: language === 'uz' ? uzLocale : undefined
  });

  const tasksDone = todayTasks.filter(t => t.is_done).length;
  const tasksTotal = todayTasks.length;

  const borrowedTotal = debts
    .filter(d => d.type === 'borrowed' && !d.is_paid)
    .reduce((s, d) => s + (d.currency === 'USD' ? d.amount * useAppStore.getState().usdRate : d.amount), 0);

  const lentTotal = debts
    .filter(d => d.type === 'lent' && !d.is_paid)
    .reduce((s, d) => s + (d.currency === 'USD' ? d.amount * useAppStore.getState().usdRate : d.amount), 0);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl refreshing={isLoading} onRefresh={refreshAll} tintColor={COLORS.primary} />
      }
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>{t.dashboard.title}</Text>
          <Text style={styles.date}>{today}</Text>
        </View>
        <TouchableOpacity
          style={styles.settingsBtn}
          onPress={() => router.push('/settings' as any)}
        >
          <Ionicons name="settings-outline" size={22} color={COLORS.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Balance Card */}
      <TouchableOpacity
        style={styles.balanceCard}
        onPress={() => router.push('/edit-balance' as any)}
        activeOpacity={0.85}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={styles.balanceLabel}>{t.dashboard.balance}</Text>
          <TouchableOpacity onPress={() => toggleBalanceHidden()} style={{ padding: 4 }}>
            <Ionicons name={isBalanceHidden ? "eye-off" : "eye"} size={20} color="rgba(255,255,255,0.7)" />
          </TouchableOpacity>
        </View>
        <Text style={styles.balanceAmount}>
          {isBalanceHidden ? '••••••' : formatAmount(balance.amount_uzs)}
        </Text>
        {balance.amount_usd > 0 && !isBalanceHidden && (
          <Text style={styles.balanceUSD}>
            + {formatAmount(balance.amount_usd, 'USD')}
          </Text>
        )}
        <View style={styles.balanceRow}>
          <View style={styles.balanceStat}>
            <Ionicons name="arrow-up-circle" size={16} color={COLORS.income} />
            <Text style={[styles.balanceStatText, { color: COLORS.income }]}>
              {isBalanceHidden ? '••••' : formatAmount(monthlyIncome)}
            </Text>
          </View>
          <View style={styles.balanceStat}>
            <Ionicons name="arrow-down-circle" size={16} color={COLORS.expense} />
            <Text style={[styles.balanceStatText, { color: COLORS.expense }]}>
              {isBalanceHidden ? '••••' : formatAmount(monthlyExpense)}
            </Text>
          </View>
        </View>
        <View style={styles.editHint}>
          <Ionicons name="pencil-outline" size={12} color={COLORS.textMuted} />
          <Text style={styles.editHintText}>{t.dashboard.editBalance}</Text>
        </View>
      </TouchableOpacity>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <TouchableOpacity
          style={[styles.quickBtn, { backgroundColor: COLORS.expense + '22' }]}
          onPress={() => router.push({ pathname: '/add-transaction', params: { type: 'expense' } })}
        >
          <Ionicons name="remove-circle" size={24} color={COLORS.expense} />
          <Text style={[styles.quickBtnText, { color: COLORS.expense }]}>{t.finance.expense}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.quickBtn, { backgroundColor: COLORS.income + '22' }]}
          onPress={() => router.push({ pathname: '/add-transaction', params: { type: 'income' } })}
        >
          <Ionicons name="add-circle" size={24} color={COLORS.income} />
          <Text style={[styles.quickBtnText, { color: COLORS.income }]}>{t.finance.income}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.quickBtn, { backgroundColor: COLORS.primary + '22' }]}
          onPress={() => router.push('/ai' as any)}
        >
          <Ionicons name="mic" size={24} color={COLORS.primary} />
          <Text style={[styles.quickBtnText, { color: COLORS.primary }]}>{t.voice.tapToSpeak}</Text>
        </TouchableOpacity>
      </View>

      {/* Spending Donut Chart */}
      {categoryBreakdown.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t.dashboard.spending}</Text>
          <DonutChart data={categoryBreakdown} />
        </View>
      )}

      {/* Stats Row */}
      <View style={styles.statsRow}>
        <StatCard
          icon="moon"
          label={t.dashboard.sleep}
          value={todayHealth?.sleep_hours ? `${todayHealth.sleep_hours} ${t.dashboard.hours}` : '--'}
          color={COLORS.primary}
        />
        <StatCard
          icon="barbell"
          label={t.dashboard.workout}
          value={todayHealth?.workout_minutes ? `${todayHealth.workout_minutes} ${t.dashboard.minutes}` : '--'}
          color={COLORS.income}
        />
        <StatCard
          icon="flame"
          label={t.dashboard.calories}
          value={todayHealth?.calories_consumed ? `${todayHealth.calories_consumed}` : '--'}
          color={COLORS.expense}
        />
      </View>

      {/* Debts Summary */}
      {(borrowedTotal > 0 || lentTotal > 0) && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t.finance.debts}</Text>
          <View style={styles.debtRow}>
            {borrowedTotal > 0 && (
              <DebtSummaryCard
                label={t.dashboard.debtOwed}
                amount={formatAmount(borrowedTotal)}
                color={COLORS.expense}
                icon="arrow-down-circle"
              />
            )}
            {lentTotal > 0 && (
              <DebtSummaryCard
                label={t.dashboard.debtLent}
                amount={formatAmount(lentTotal)}
                color={COLORS.income}
                icon="arrow-up-circle"
              />
            )}
          </View>
        </View>
      )}

      {/* Today's Tasks */}
      {tasksTotal > 0 && (
        <TouchableOpacity
          style={styles.card}
          onPress={() => router.push('/planner' as any)}
          activeOpacity={0.85}
        >
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>{t.dashboard.todayTasks}</Text>
            <Text style={styles.taskProgress}>
              {tasksDone}/{tasksTotal} {t.dashboard.tasksCompleted}
            </Text>
          </View>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                { width: tasksTotal > 0 ? `${(tasksDone / tasksTotal) * 100}%` : '0%' }
              ]}
            />
          </View>
          {todayTasks.slice(0, 3).map(task => (
            <View key={task.id} style={styles.taskItem}>
              <Ionicons
                name={task.is_done ? 'checkmark-circle' : 'ellipse-outline'}
                size={18}
                color={task.is_done ? COLORS.income : COLORS.textMuted}
              />
              <Text
                style={[
                  styles.taskTitle,
                  task.is_done === 1 && styles.taskDone
                ]}
                numberOfLines={1}
              >
                {task.title}
              </Text>
              {task.time && (
                <Text style={styles.taskTime}>{task.time}</Text>
              )}
            </View>
          ))}
        </TouchableOpacity>
      )}

      <View style={{ height: 20 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: SPACING.lg },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.lg,
    paddingTop: SPACING.xl,
  },
  greeting: { fontSize: FONTS.sizes.xxl, fontWeight: '700', color: COLORS.textPrimary },
  date: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, marginTop: 2 },
  settingsBtn: {
    width: 40, height: 40, borderRadius: RADIUS.full,
    backgroundColor: COLORS.bgCard, alignItems: 'center', justifyContent: 'center',
  },
  balanceCard: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    marginBottom: SPACING.lg,
  },
  balanceLabel: { fontSize: FONTS.sizes.sm, color: 'rgba(255,255,255,0.75)', marginBottom: SPACING.xs },
  balanceAmount: { fontSize: FONTS.sizes.xxxl, fontWeight: '800', color: '#fff', marginBottom: 4 },
  balanceUSD: { fontSize: FONTS.sizes.md, color: 'rgba(255,255,255,0.75)', marginBottom: SPACING.md },
  balanceRow: { flexDirection: 'row', gap: SPACING.xl, marginTop: SPACING.sm },
  balanceStat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  balanceStatText: { fontSize: FONTS.sizes.sm, fontWeight: '600' },
  editHint: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    marginTop: SPACING.sm, opacity: 0.6,
  },
  editHintText: { fontSize: FONTS.sizes.xs, color: 'rgba(255,255,255,0.8)' },
  quickActions: {
    flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.lg,
  },
  quickBtn: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingVertical: SPACING.md, borderRadius: RADIUS.lg, gap: 4,
  },
  quickBtnText: { fontSize: FONTS.sizes.xs, fontWeight: '600' },
  card: {
    backgroundColor: COLORS.bgCard, borderRadius: RADIUS.lg,
    padding: SPACING.lg, marginBottom: SPACING.lg,
    borderWidth: 1, borderColor: COLORS.border,
  },
  cardTitle: { fontSize: FONTS.sizes.lg, fontWeight: '700', color: COLORS.textPrimary, marginBottom: SPACING.md },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.sm },
  statsRow: { flexDirection: 'row', gap: SPACING.sm, marginBottom: SPACING.lg },
  debtRow: { flexDirection: 'row', gap: SPACING.sm },
  taskProgress: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary },
  progressBar: {
    height: 4, backgroundColor: COLORS.border, borderRadius: RADIUS.full,
    marginBottom: SPACING.md, overflow: 'hidden',
  },
  progressFill: {
    height: '100%', backgroundColor: COLORS.primary, borderRadius: RADIUS.full,
  },
  taskItem: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    paddingVertical: SPACING.xs,
  },
  taskTitle: { flex: 1, fontSize: FONTS.sizes.md, color: COLORS.textPrimary },
  taskDone: { textDecorationLine: 'line-through', color: COLORS.textMuted },
  taskTime: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted },
});
