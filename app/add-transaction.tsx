import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, KeyboardAvoidingView, Platform, Alert, Switch
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { COLORS, SPACING, RADIUS, FONTS, CATEGORY_ICONS, CATEGORY_LABELS_UZ } from '../src/constants/theme';
import { useTranslation } from '../src/i18n';
import { useAppStore } from '../src/store/useAppStore';
import { addTransaction } from '../src/database/queries';
import { setSetting, getSetting } from '../src/database/queries';
import * as Crypto from 'expo-crypto';
import { useLocalSearchParams } from 'expo-router';

const EXPENSE_CATEGORIES = ['food', 'transport', 'entertainment', 'health', 'education', 'clothing', 'utilities', 'other'];
const INCOME_CATEGORIES = ['salary', 'freelance', 'gift', 'other'];

export default function AddTransactionScreen() {
  const params = useLocalSearchParams();
  const t = useTranslation();
  const router = useRouter();
  const { language, loadFinanceData, usdRate } = useAppStore();

  const initialType = (params.type as 'income' | 'expense') ?? 'expense';
  const [type, setType] = useState<'income' | 'expense'>(initialType);
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<'UZS' | 'USD'>('UZS');
  const [category, setCategory] = useState('');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [isSaving, setIsSaving] = useState(false);

  const categories = type === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;

  const getCatLabel = (cat: string) => {
    if (language === 'uz') return CATEGORY_LABELS_UZ[cat] ?? cat;
    const enLabels: Record<string, string> = {
      food: 'Food', transport: 'Transport', entertainment: 'Entertainment',
      health: 'Health', education: 'Education', clothing: 'Clothing',
      utilities: 'Utilities', other: 'Other', salary: 'Salary',
      freelance: 'Freelance', gift: 'Gift',
    };
    return enLabels[cat] ?? cat;
  };

  const handleSave = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert('', language === 'uz' ? 'Miqdorni kiriting' : 'Enter amount');
      return;
    }
    if (!category) {
      Alert.alert('', language === 'uz' ? 'Kategoriyani tanlang' : 'Select category');
      return;
    }

    setIsSaving(true);
    try {
      const numAmount = parseFloat(amount.replace(/,/g, ''));
      const amount_uzs = currency === 'USD' ? numAmount * usdRate : numAmount;
      const id = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        Date.now().toString() + Math.random()
      );

      await addTransaction({
        id, type, amount: numAmount, currency, amount_uzs, category, note, date,
      });

      await loadFinanceData();
      router.back();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="close" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.title}>
            {type === 'expense' ? t.finance.addExpense : t.finance.addIncome}
          </Text>
          <TouchableOpacity
            style={[styles.saveBtn, isSaving && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={isSaving}
          >
            <Text style={styles.saveBtnText}>{t.common.save}</Text>
          </TouchableOpacity>
        </View>

        {/* Type Toggle */}
        <View style={styles.typeToggle}>
          <TouchableOpacity
            style={[styles.typeBtn, type === 'expense' && { backgroundColor: COLORS.expense, borderColor: COLORS.expense }]}
            onPress={() => { setType('expense'); setCategory(''); }}
          >
            <Ionicons name="arrow-down-circle" size={18} color={type === 'expense' ? '#fff' : COLORS.expense} />
            <Text style={[styles.typeBtnText, { color: type === 'expense' ? '#fff' : COLORS.expense }]}>
              {t.finance.expense}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.typeBtn, type === 'income' && { backgroundColor: COLORS.income, borderColor: COLORS.income }]}
            onPress={() => { setType('income'); setCategory(''); }}
          >
            <Ionicons name="arrow-up-circle" size={18} color={type === 'income' ? '#fff' : COLORS.income} />
            <Text style={[styles.typeBtnText, { color: type === 'income' ? '#fff' : COLORS.income }]}>
              {t.finance.income}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Amount */}
        <View style={styles.section}>
          <Text style={styles.label}>{t.common.amount}</Text>
          <View style={styles.amountRow}>
            <TouchableOpacity
              style={styles.currencyBtn}
              onPress={() => setCurrency(prev => prev === 'UZS' ? 'USD' : 'UZS')}
            >
              <Text style={styles.currencyText}>{currency}</Text>
              <Ionicons name="swap-horizontal" size={14} color={COLORS.primary} />
            </TouchableOpacity>
            <TextInput
              style={styles.amountInput}
              value={amount}
              onChangeText={setAmount}
              placeholder="0"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="numeric"
              autoFocus
            />
          </View>
          {currency === 'USD' && amount && parseFloat(amount) > 0 && (
            <Text style={styles.convertedText}>
              ≈ {Math.round(parseFloat(amount) * usdRate).toLocaleString()} so&apos;m
            </Text>
          )}
        </View>

        {/* Category */}
        <View style={styles.section}>
          <Text style={styles.label}>{t.common.category}</Text>
          <View style={styles.categoryGrid}>
            {categories.map(cat => (
              <TouchableOpacity
                key={cat}
                style={[styles.catBtn, category === cat && styles.catBtnActive]}
                onPress={() => setCategory(cat)}
              >
                <Text style={styles.catIcon}>{CATEGORY_ICONS[cat] ?? '📦'}</Text>
                <Text style={[styles.catLabel, category === cat && styles.catLabelActive]}>
                  {getCatLabel(cat)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Note */}
        <View style={styles.section}>
          <Text style={styles.label}>{t.common.note}</Text>
          <TextInput
            style={styles.noteInput}
            value={note}
            onChangeText={setNote}
            placeholder={language === 'uz' ? 'Izoh qo\'shish...' : 'Add note...'}
            placeholderTextColor={COLORS.textMuted}
            multiline
          />
        </View>

        {/* Date */}
        <View style={styles.section}>
          <Text style={styles.label}>{t.common.date}</Text>
          <TextInput
            style={styles.dateInput}
            value={date}
            onChangeText={setDate}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={COLORS.textMuted}
          />
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: SPACING.lg, paddingTop: SPACING.xxl,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  title: { fontSize: FONTS.sizes.lg, fontWeight: '700', color: COLORS.textPrimary },
  saveBtn: {
    backgroundColor: COLORS.primary, paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm, borderRadius: RADIUS.lg,
  },
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: FONTS.sizes.md },
  typeToggle: {
    flexDirection: 'row', gap: SPACING.sm,
    padding: SPACING.lg, paddingBottom: SPACING.sm,
  },
  typeBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: SPACING.sm, paddingVertical: SPACING.md, borderRadius: RADIUS.lg,
    backgroundColor: COLORS.bgCard, borderWidth: 1.5, borderColor: COLORS.border,
  },
  typeBtnText: { fontSize: FONTS.sizes.md, fontWeight: '700' },
  section: { padding: SPACING.lg, paddingTop: SPACING.md },
  label: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, marginBottom: SPACING.sm, fontWeight: '600' },
  amountRow: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    backgroundColor: COLORS.bgCard, borderRadius: RADIUS.lg,
    padding: SPACING.md, borderWidth: 1, borderColor: COLORS.border,
  },
  currencyBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: COLORS.primary + '22', paddingHorizontal: SPACING.sm,
    paddingVertical: 4, borderRadius: RADIUS.sm,
  },
  currencyText: { fontSize: FONTS.sizes.sm, fontWeight: '700', color: COLORS.primary },
  amountInput: {
    flex: 1, fontSize: FONTS.sizes.xxl, fontWeight: '800',
    color: COLORS.textPrimary, padding: 0,
  },
  convertedText: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, marginTop: SPACING.xs },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  catBtn: {
    width: '30%', alignItems: 'center', paddingVertical: SPACING.sm,
    borderRadius: RADIUS.lg, backgroundColor: COLORS.bgCard,
    borderWidth: 1, borderColor: COLORS.border, gap: 4,
  },
  catBtnActive: { backgroundColor: COLORS.primary + '22', borderColor: COLORS.primary },
  catIcon: { fontSize: 22 },
  catLabel: { fontSize: FONTS.sizes.xs, color: COLORS.textSecondary, textAlign: 'center' },
  catLabelActive: { color: COLORS.primary, fontWeight: '700' },
  noteInput: {
    backgroundColor: COLORS.bgCard, borderRadius: RADIUS.lg, padding: SPACING.md,
    color: COLORS.textPrimary, fontSize: FONTS.sizes.md,
    borderWidth: 1, borderColor: COLORS.border, minHeight: 80, textAlignVertical: 'top',
  },
  dateInput: {
    backgroundColor: COLORS.bgCard, borderRadius: RADIUS.lg, padding: SPACING.md,
    color: COLORS.textPrimary, fontSize: FONTS.sizes.md,
    borderWidth: 1, borderColor: COLORS.border,
  },
});
