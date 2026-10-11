import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, Alert
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS, FONTS } from '../src/constants/theme';
import { useTranslation } from '../src/i18n';
import { useAppStore } from '../src/store/useAppStore';

export default function EditBalanceScreen() {
  const t = useTranslation();
  const router = useRouter();
  const { balance, setBalance, language } = useAppStore();

  const [uzsAmount, setUzsAmount] = useState(balance.amount_uzs.toString());
  const [usdAmount, setUsdAmount] = useState(balance.amount_usd.toString());
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await setBalance(parseFloat(uzsAmount || '0'), parseFloat(usdAmount || '0'));
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
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="close" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>{t.dashboard.editBalance}</Text>
        <TouchableOpacity
          style={[styles.saveBtn, isSaving && { opacity: 0.5 }]}
          onPress={handleSave}
          disabled={isSaving}
        >
          <Text style={styles.saveBtnText}>{t.common.save}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <View style={styles.field}>
          <Text style={styles.label}>
            {language === 'uz' ? 'So\'mdagi balans' : 'Balance in UZS'}
          </Text>
          <View style={styles.inputRow}>
            <Text style={styles.currencyTag}>UZS</Text>
            <TextInput
              style={styles.input}
              value={uzsAmount}
              onChangeText={setUzsAmount}
              keyboardType="numeric"
              autoFocus
              placeholder="0"
              placeholderTextColor={COLORS.textMuted}
            />
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>
            {language === 'uz' ? 'Dollardagi balans' : 'Balance in USD'}
          </Text>
          <View style={styles.inputRow}>
            <Text style={styles.currencyTag}>USD</Text>
            <TextInput
              style={styles.input}
              value={usdAmount}
              onChangeText={setUsdAmount}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor={COLORS.textMuted}
            />
          </View>
        </View>

        <View style={styles.note}>
          <Ionicons name="information-circle-outline" size={16} color={COLORS.textMuted} />
          <Text style={styles.noteText}>
            {language === 'uz'
              ? 'Bu yerda hozirgi real balansingizni kiriting. Daromad va harajatlar avtomatik hisoblanadi.'
              : 'Enter your current real balance. Income and expenses are calculated automatically.'}
          </Text>
        </View>
      </View>
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
  content: { padding: SPACING.lg, gap: SPACING.lg },
  field: { gap: SPACING.sm },
  label: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, fontWeight: '600' },
  inputRow: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
    backgroundColor: COLORS.bgCard, borderRadius: RADIUS.lg,
    padding: SPACING.md, borderWidth: 1, borderColor: COLORS.border,
  },
  currencyTag: {
    fontSize: FONTS.sizes.sm, fontWeight: '700', color: COLORS.primary,
    backgroundColor: COLORS.primary + '22', paddingHorizontal: SPACING.sm,
    paddingVertical: 4, borderRadius: RADIUS.sm,
  },
  input: {
    flex: 1, fontSize: FONTS.sizes.xxl, fontWeight: '800',
    color: COLORS.textPrimary, padding: 0,
  },
  note: {
    flexDirection: 'row', gap: SPACING.sm, alignItems: 'flex-start',
    backgroundColor: COLORS.bgCard, padding: SPACING.md,
    borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border,
  },
  noteText: { fontSize: FONTS.sizes.sm, color: COLORS.textMuted, flex: 1, lineHeight: 20 },
});
