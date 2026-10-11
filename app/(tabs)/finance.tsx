import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  RefreshControl, Alert, FlatList
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear } from 'date-fns';
import { COLORS, SPACING, RADIUS, FONTS, CATEGORY_ICONS, CATEGORY_LABELS_UZ } from '../../src/constants/theme';
import { useAppStore } from '../../src/store/useAppStore';
import { useTranslation } from '../../src/i18n';
import { DonutChart } from '../../src/components/DonutChart';
import { getTransactionsByDateRange, deleteTransaction, getTotalByType, getCategoryBreakdown, getDebts } from '../../src/database/queries';
import { Transaction, Debt } from '../../src/types';

type Period = 'weekly' | 'monthly' | 'yearly';
type FinanceTab = 'transactions' | 'debts';

export default function FinanceScreen() {
  const t = useTranslation();
  const router = useRouter();
  const { formatAmount, language, loadFinanceData, categoryBreakdown, monthlyIncome, monthlyExpense, isBalanceHidden } = useAppStore();

  const [period, setPeriod] = useState<Period>('monthly');
  const [activeTab, setActiveTab] = useState<FinanceTab>('transactions');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [periodBreakdown, setPeriodBreakdown] = useState(categoryBreakdown);
  const [periodIncome, setPeriodIncome] = useState(monthlyIncome);
  const [periodExpense, setPeriodExpense] = useState(monthlyExpense);
  const [isLoading, setIsLoading] = useState(false);

  const getPeriodRange = (p: Period) => {
    const now = new Date();
    switch (p) {
      case 'weekly':
        return { from: format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd'), to: format(endOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd') };
      case 'yearly':
        return { from: format(startOfYear(now), 'yyyy-MM-dd'), to: format(endOfYear(now), 'yyyy-MM-dd') };
      default:
        return { from: format(startOfMonth(now), 'yyyy-MM-dd'), to: format(endOfMonth(now), 'yyyy-MM-dd') };
    }
  };

  const loadData = useCallback(async () => {
    setIsLoading(true);
    const { from, to } = getPeriodRange(period);
    const [txs, dbs, income, expense, breakdown] = await Promise.all([
      getTransactionsByDateRange(from, to),
      getDebts(),
      getTotalByType('income', from, to),
      getTotalByType('expense', from, to),
      getCategoryBreakdown(from, to),
    ]);
    const totalExp = breakdown.reduce((s, b) => s + b.total, 0);
    setTransactions(txs);
    setDebts(dbs);
    setPeriodIncome(income);
    setPeriodExpense(expense);
    setPeriodBreakdown(breakdown.map(b => ({
      ...b,
      percentage: totalExp > 0 ? Math.round((b.total / totalExp) * 100) : 0,
    })));
    setIsLoading(false);
  }, [period]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const handleDelete = (id: string) => {
    Alert.alert(
      language === 'uz' ? 'O\'chirish' : 'Delete',
      language === 'uz' ? 'Bu tranzaksiyani o\'chirmoqchimisiz?' : 'Delete this transaction?',
      [
        { text: t.common.cancel, style: 'cancel' },
        {
          text: t.common.delete, style: 'destructive',
          onPress: async () => {
            await deleteTransaction(id);
            loadData();
            loadFinanceData();
          }
        },
      ]
    );
  };

  const handleMarkPaid = async (debt: Debt) => {
    const { markDebtPaid } = await import('../../src/database/queries');
    await markDebtPaid(debt.id);
    loadData();
  };

  const handleDeleteDebt = async (id: string) => {
    Alert.alert(
      language === 'uz' ? 'O\'chirish' : 'Delete',
      language === 'uz' ? 'Bu qarzni o\'chirmoqchimisiz?' : 'Delete this debt?',
      [
        { text: t.common.cancel, style: 'cancel' },
        {
          text: t.common.delete, style: 'destructive',
          onPress: async () => {
            const { deleteDebt } = await import('../../src/database/queries');
            await deleteDebt(id);
            loadData();
            loadFinanceData();
          }
        },
      ]
    );
  };

  const getCategoryLabel = (cat: string) => {
    if (language === 'uz') return CATEGORY_LABELS_UZ[cat] ?? cat;
    return cat;
  };

  const renderTransaction = ({ item }: { item: Transaction }) => (
    <TouchableOpacity
      style={styles.txItem}
      onLongPress={() => handleDelete(item.id)}
      activeOpacity={0.7}
    >
      <View style={[styles.txIcon, { backgroundColor: item.type === 'income' ? COLORS.income + '22' : COLORS.expense + '22' }]}>
        <Text style={{ fontSize: 18 }}>{CATEGORY_ICONS[item.category] ?? '💰'}</Text>
      </View>
      <View style={styles.txInfo}>
        <Text style={styles.txCategory}>{getCategoryLabel(item.category)}</Text>
        {item.note ? <Text style={styles.txNote} numberOfLines={1}>{item.note}</Text> : null}
        <Text style={styles.txDate}>{item.date}</Text>
      </View>
      <View style={{ alignItems: 'flex-end', gap: 4 }}>
        <Text style={[styles.txAmount, { color: item.type === 'income' ? COLORS.income : COLORS.expense }]}>
          {item.type === 'income' ? '+' : '-'}{formatAmount(item.amount_uzs)}
        </Text>
        <TouchableOpacity onPress={() => handleDelete(item.id)} style={{ padding: 4 }}>
          <Ionicons name="trash-outline" size={16} color={COLORS.danger || '#ef4444'} />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  const renderDebt = ({ item }: { item: Debt }) => (
    <View style={[styles.debtItem, item.is_paid ? styles.debtPaid : null]}>
      <View style={[styles.txIcon, { backgroundColor: item.type === 'borrowed' ? COLORS.expense + '22' : COLORS.income + '22' }]}>
        <Ionicons
          name={item.type === 'borrowed' ? 'arrow-down-circle' : 'arrow-up-circle'}
          size={22}
          color={item.type === 'borrowed' ? COLORS.expense : COLORS.income}
        />
      </View>
      <View style={styles.txInfo}>
        <Text style={styles.txCategory}>{item.person_name}</Text>
        <Text style={styles.txNote}>
          {item.type === 'borrowed' ? t.finance.borrowed : t.finance.lent}
        </Text>
        {item.due_date && <Text style={styles.txDate}>{t.finance.dueDate}: {item.due_date}</Text>}
      </View>
      <View style={styles.debtRight}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={[styles.txAmount, { color: item.type === 'borrowed' ? COLORS.expense : COLORS.income }]}>
            {formatAmount(item.amount, item.currency)}
          </Text>
          <TouchableOpacity onPress={() => handleDeleteDebt(item.id)}>
            <Ionicons name="trash-outline" size={18} color={COLORS.danger || '#ef4444'} />
          </TouchableOpacity>
        </View>
        {Number(item.is_paid) === 0 ? (
          <TouchableOpacity style={styles.paidBtn} onPress={() => handleMarkPaid(item)}>
            <Text style={styles.paidBtnText}>{t.finance.markPaid}</Text>
          </TouchableOpacity>
        ) : (
          <Text style={styles.paidLabel}>✅ {t.finance.paidBack}</Text>
        )}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{t.finance.title}</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.addBtn}
            onPress={() => router.push({ pathname: '/add-debt' })}
          >
            <Ionicons name="people" size={20} color={COLORS.debt} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.addBtn, { backgroundColor: COLORS.income + '22' }]}
            onPress={() => router.push({ pathname: '/add-transaction', params: { type: 'income' } })}
          >
            <Ionicons name="add" size={22} color={COLORS.income} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.addBtn, { backgroundColor: COLORS.expense + '22' }]}
            onPress={() => router.push({ pathname: '/add-transaction', params: { type: 'expense' } })}
          >
            <Ionicons name="remove" size={22} color={COLORS.expense} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Period Selector */}
      <View style={styles.periodSelector}>
        {(['weekly', 'monthly', 'yearly'] as Period[]).map(p => (
          <TouchableOpacity
            key={p}
            style={[styles.periodBtn, period === p && styles.periodBtnActive]}
            onPress={() => setPeriod(p)}
          >
            <Text style={[styles.periodText, period === p && styles.periodTextActive]}>
              {t.finance[p]}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView showsVerticalScrollIndicator={false} refreshControl={
        <RefreshControl refreshing={isLoading} onRefresh={loadData} tintColor={COLORS.primary} />
      }>
        {/* Summary */}
        <View style={styles.summaryRow}>
          <View style={[styles.summaryCard, { borderColor: COLORS.income + '44' }]}>
            <Ionicons name="arrow-up-circle" size={20} color={COLORS.income} />
            <Text style={styles.summaryLabel}>{t.finance.income}</Text>
            <Text style={[styles.summaryAmount, { color: COLORS.income }]}>{isBalanceHidden ? '••••' : formatAmount(periodIncome)}</Text>
          </View>
          <View style={[styles.summaryCard, { borderColor: COLORS.expense + '44' }]}>
            <Ionicons name="arrow-down-circle" size={20} color={COLORS.expense} />
            <Text style={styles.summaryLabel}>{t.finance.expense}</Text>
            <Text style={[styles.summaryAmount, { color: COLORS.expense }]}>{isBalanceHidden ? '••••' : formatAmount(periodExpense)}</Text>
          </View>
        </View>

        {/* Donut Chart */}
        {periodBreakdown.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{t.finance.breakdown}</Text>
            <DonutChart data={periodBreakdown} />
          </View>
        )}

        {/* Tabs */}
        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'transactions' && styles.tabActive]}
            onPress={() => setActiveTab('transactions')}
          >
            <Text style={[styles.tabText, activeTab === 'transactions' && styles.tabTextActive]}>
              {t.common.all}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'debts' && styles.tabActive]}
            onPress={() => setActiveTab('debts')}
          >
            <Text style={[styles.tabText, activeTab === 'debts' && styles.tabTextActive]}>
              {t.finance.debts}
            </Text>
          </TouchableOpacity>
        </View>

        {activeTab === 'transactions' ? (
          transactions.length > 0 ? (
            transactions.map(item => (
              <View key={item.id}>{renderTransaction({ item })}</View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>{t.common.noData}</Text>
            </View>
          )
        ) : (
          debts.length > 0 ? (
            debts.map(item => (
              <View key={item.id}>{renderDebt({ item })}</View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>{t.common.noData}</Text>
            </View>
          )
        )}

        <View style={{ height: 80 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: SPACING.lg, paddingTop: SPACING.xxl + SPACING.lg, paddingBottom: SPACING.md,
  },
  title: { fontSize: FONTS.sizes.xxl, fontWeight: '800', color: COLORS.textPrimary },
  headerActions: { flexDirection: 'row', gap: SPACING.sm },
  addBtn: {
    width: 40, height: 40, borderRadius: RADIUS.full,
    backgroundColor: COLORS.bgCard, alignItems: 'center', justifyContent: 'center',
  },
  periodSelector: {
    flexDirection: 'row', gap: SPACING.sm,
    paddingHorizontal: SPACING.lg, marginBottom: SPACING.md,
  },
  periodBtn: {
    flex: 1, paddingVertical: SPACING.sm, borderRadius: RADIUS.lg,
    backgroundColor: COLORS.bgCard, alignItems: 'center',
    borderWidth: 1, borderColor: COLORS.border,
  },
  periodBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  periodText: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, fontWeight: '600' },
  periodTextActive: { color: '#fff' },
  summaryRow: {
    flexDirection: 'row', gap: SPACING.sm,
    paddingHorizontal: SPACING.lg, marginBottom: SPACING.md,
  },
  summaryCard: {
    flex: 1, backgroundColor: COLORS.bgCard, borderRadius: RADIUS.lg,
    padding: SPACING.md, alignItems: 'center', gap: 4, borderWidth: 1,
  },
  summaryLabel: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary },
  summaryAmount: { fontSize: FONTS.sizes.md, fontWeight: '700' },
  card: {
    backgroundColor: COLORS.bgCard, borderRadius: RADIUS.lg,
    padding: SPACING.lg, marginHorizontal: SPACING.lg,
    marginBottom: SPACING.md, borderWidth: 1, borderColor: COLORS.border,
  },
  cardTitle: { fontSize: FONTS.sizes.lg, fontWeight: '700', color: COLORS.textPrimary, marginBottom: SPACING.md },
  tabs: {
    flexDirection: 'row', paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.md, gap: SPACING.sm,
  },
  tab: {
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full, backgroundColor: COLORS.bgCard,
    borderWidth: 1, borderColor: COLORS.border,
  },
  tabActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  tabText: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, fontWeight: '600' },
  tabTextActive: { color: '#fff' },
  txItem: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  txIcon: {
    width: 44, height: 44, borderRadius: RADIUS.full,
    alignItems: 'center', justifyContent: 'center',
  },
  txInfo: { flex: 1 },
  txCategory: { fontSize: FONTS.sizes.md, fontWeight: '600', color: COLORS.textPrimary },
  txNote: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, marginTop: 2 },
  txDate: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted, marginTop: 2 },
  txAmount: { fontSize: FONTS.sizes.md, fontWeight: '700' },
  debtItem: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  debtPaid: { opacity: 0.5 },
  debtRight: { alignItems: 'flex-end', gap: 4 },
  paidBtn: {
    backgroundColor: COLORS.income + '22', paddingHorizontal: SPACING.sm,
    paddingVertical: 4, borderRadius: RADIUS.sm,
  },
  paidBtnText: { fontSize: FONTS.sizes.xs, color: COLORS.income, fontWeight: '600' },
  paidLabel: { fontSize: FONTS.sizes.xs, color: COLORS.income },
  emptyState: { alignItems: 'center', padding: SPACING.xxl },
  emptyText: { fontSize: FONTS.sizes.md, color: COLORS.textMuted },
});
