import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, KeyboardAvoidingView, Platform, Alert, Switch
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS, FONTS } from '../src/constants/theme';
import { useTranslation } from '../src/i18n';
import { useAppStore } from '../src/store/useAppStore';
import { addDebt } from '../src/database/queries';
import * as Crypto from 'expo-crypto';

export default function AddDebtScreen() {
  const t = useTranslation();
  const router = useRouter();
  const { language, loadFinanceData } = useAppStore();

  const [type, setType] = useState<'borrowed' | 'lent'>('borrowed');
  const [personName, setPersonName] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<'UZS' | 'USD'>('UZS');
  const [note, setNote] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!personName.trim()) {
      Alert.alert('', language === 'uz' ? 'Shaxs ismini kiriting' : 'Enter person name');
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
      Alert.alert('', language === 'uz' ? 'Miqdorni kiriting' : 'Enter amount');
      return;
    }

    setIsSaving(true);
    try {
      const id = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        Date.now().toString() + Math.random()
      );
      await addDebt({
        id,
        person_name: personName.trim(),
        amount: parseFloat(amount),
        currency,
        type,
        note: note.trim() || undefined,
        due_date: dueDate.trim() || undefined,
        is_paid: 0,
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
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="close" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.title}>{t.finance.addDebt}</Text>
          <TouchableOpacity
            style={[styles.saveBtn, isSaving && { opacity: 0.5 }]}
            onPress={handleSave}
            disabled={isSaving}
          >
            <Text style={styles.saveBtnText}>{t.common.save}</Text>
          </TouchableOpacity>
        </View>

        {/* Type Toggle */}
        <View style={styles.typeToggle}>
          <TouchableOpacity
            style={[styles.typeBtn, type === 'borrowed' && { backgroundColor: COLORS.expense, borderColor: COLORS.expense }]}
            onPress={() => setType('borrowed')}
          >
            <Ionicons name="arrow-down-circle" size={18} color={type === 'borrowed' ? '#fff' : COLORS.expense} />
            <Text style={[styles.typeBtnText, { color: type === 'borrowed' ? '#fff' : COLORS.expense }]}>
              {t.finance.borrowed}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.typeBtn, type === 'lent' && { backgroundColor: COLORS.income, borderColor: COLORS.income }]}
            onPress={() => setType('lent')}
          >
            <Ionicons name="arrow-up-circle" size={18} color={type === 'lent' ? '#fff' : COLORS.income} />
            <Text style={[styles.typeBtnText, { color: type === 'lent' ? '#fff' : COLORS.income }]}>
              {t.finance.lent}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.infoBox}>
          <Ionicons name="information-circle" size={16} color={COLORS.primary} />
          <Text style={styles.infoText}>
            {type === 'borrowed'
              ? (language === 'uz' ? 'Siz birovdan pul oldingiz' : 'You borrowed money from someone')
              : (language === 'uz' ? 'Siz birovga pul berdingiz' : 'You lent money to someone')}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>{t.finance.personName}</Text>
          <TextInput
            style={styles.input}
            value={personName}
            onChangeText={setPersonName}
            placeholder={language === 'uz' ? 'Ism kiriting...' : 'Enter name...'}
            placeholderTextColor={COLORS.textMuted}
            autoFocus
          />
        </View>

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
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>{t.finance.dueDate} ({language === 'uz' ? 'ixtiyoriy' : 'optional'})</Text>
          <TextInput
            style={styles.input}
            value={dueDate}
            onChangeText={setDueDate}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={COLORS.textMuted}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>{t.common.note}</Text>
          <TextInput
            style={[styles.input, { minHeight: 60, textAlignVertical: 'top' }]}
            value={note}
            onChangeText={setNote}
            placeholder={language === 'uz' ? 'Izoh...' : 'Note...'}
            placeholderTextColor={COLORS.textMuted}
            multiline
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
  infoBox: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    marginHorizontal: SPACING.lg, backgroundColor: COLORS.primary + '11',
    padding: SPACING.md, borderRadius: RADIUS.md,
    borderWidth: 1, borderColor: COLORS.primary + '33',
  },
  infoText: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, flex: 1 },
  section: { padding: SPACING.lg, paddingBottom: SPACING.sm },
  label: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, marginBottom: SPACING.sm, fontWeight: '600' },
  input: {
    backgroundColor: COLORS.bgCard, borderRadius: RADIUS.lg, padding: SPACING.md,
    color: COLORS.textPrimary, fontSize: FONTS.sizes.md,
    borderWidth: 1, borderColor: COLORS.border,
  },
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
});
