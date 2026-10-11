import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, KeyboardAvoidingView, Platform, Alert
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { COLORS, SPACING, RADIUS, FONTS } from '../src/constants/theme';
import { useTranslation } from '../src/i18n';
import { useAppStore } from '../src/store/useAppStore';
import { addFoodLog, upsertHealthLog, getHealthLogByDate } from '../src/database/healthQueries';
import * as Crypto from 'expo-crypto';

const MEAL_TYPES = [
  { key: 'breakfast', emoji: '🌅' },
  { key: 'lunch', emoji: '☀️' },
  { key: 'dinner', emoji: '🌙' },
  { key: 'snack', emoji: '🍎' },
  { key: 'other', emoji: '🍽️' },
];

export default function AddFoodScreen() {
  const t = useTranslation();
  const router = useRouter();
  const { language, loadHealthData } = useAppStore();

  const today = format(new Date(), 'yyyy-MM-dd');
  const [foodName, setFoodName] = useState('');
  const [calories, setCalories] = useState('');
  const [mealType, setMealType] = useState('other');
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!foodName.trim()) {
      Alert.alert('', language === 'uz' ? 'Ovqat nomini kiriting' : 'Enter food name');
      return;
    }
    if (!calories || parseInt(calories) < 0) {
      Alert.alert('', language === 'uz' ? 'Kaloriyani kiriting' : 'Enter calories');
      return;
    }

    setIsSaving(true);
    try {
      const logId = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, today);
      // Ensure health log exists
      const existing = await getHealthLogByDate(today);
      if (!existing) {
        await upsertHealthLog({ id: logId, date: today });
      }

      const foodId = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256, Date.now().toString()
      );
      await addFoodLog({
        id: foodId,
        health_log_id: existing?.id ?? logId,
        date: today,
        food_name: foodName.trim(),
        calories: parseInt(calories),
        meal_type: mealType as any,
      });

      await loadHealthData();
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
          <Text style={styles.title}>{t.health.addFood}</Text>
          <TouchableOpacity
            style={[styles.saveBtn, isSaving && { opacity: 0.5 }]}
            onPress={handleSave}
            disabled={isSaving}
          >
            <Text style={styles.saveBtnText}>{t.common.save}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>{t.health.foodName}</Text>
          <TextInput
            style={styles.input}
            value={foodName}
            onChangeText={setFoodName}
            placeholder={language === 'uz' ? 'Masalan: Non, Palov, Shashlik...' : 'e.g. Rice, Salad, Chicken...'}
            placeholderTextColor={COLORS.textMuted}
            autoFocus
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>{t.health.calories} (kcal)</Text>
          <TextInput
            style={styles.input}
            value={calories}
            onChangeText={setCalories}
            placeholder="0"
            placeholderTextColor={COLORS.textMuted}
            keyboardType="numeric"
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>{t.health.mealType}</Text>
          <View style={styles.mealGrid}>
            {MEAL_TYPES.map(mt => (
              <TouchableOpacity
                key={mt.key}
                style={[styles.mealBtn, mealType === mt.key && styles.mealBtnActive]}
                onPress={() => setMealType(mt.key)}
              >
                <Text style={{ fontSize: 24 }}>{mt.emoji}</Text>
                <Text style={[styles.mealText, mealType === mt.key && styles.mealTextActive]}>
                  {t.health[mt.key as keyof typeof t.health] ?? mt.key}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
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
  section: { padding: SPACING.lg, paddingBottom: SPACING.sm },
  label: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, marginBottom: SPACING.sm, fontWeight: '600' },
  input: {
    backgroundColor: COLORS.bgCard, borderRadius: RADIUS.lg, padding: SPACING.md,
    color: COLORS.textPrimary, fontSize: FONTS.sizes.md,
    borderWidth: 1, borderColor: COLORS.border,
  },
  mealGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm,
  },
  mealBtn: {
    width: '30%', alignItems: 'center', paddingVertical: SPACING.md,
    borderRadius: RADIUS.lg, backgroundColor: COLORS.bgCard,
    borderWidth: 1, borderColor: COLORS.border, gap: 4,
  },
  mealBtnActive: { backgroundColor: COLORS.primary + '22', borderColor: COLORS.primary },
  mealText: { fontSize: FONTS.sizes.xs, color: COLORS.textSecondary, textAlign: 'center' },
  mealTextActive: { color: COLORS.primary, fontWeight: '700' },
});
