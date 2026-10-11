import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, KeyboardAvoidingView, Platform, Alert
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { COLORS, SPACING, RADIUS, FONTS } from '../src/constants/theme';
import { useTranslation } from '../src/i18n';
import { useAppStore } from '../src/store/useAppStore';
import { upsertHealthLog } from '../src/database/healthQueries';
import * as Crypto from 'expo-crypto';

export default function AddHealthScreen() {
  const params = useLocalSearchParams();
  const t = useTranslation();
  const router = useRouter();
  const { language, loadHealthData } = useAppStore();

  const date = (params.date as string) ?? format(new Date(), 'yyyy-MM-dd');
  const [sleepStart, setSleepStart] = useState('22:00');
  const [sleepEnd, setSleepEnd] = useState('07:00');
  const [workoutMinutes, setWorkoutMinutes] = useState('');
  const [workoutType, setWorkoutType] = useState('');
  const [waterMl, setWaterMl] = useState('');
  const [notes, setNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const calcSleepHours = () => {
    try {
      const [sh, sm] = sleepStart.split(':').map(Number);
      const [eh, em] = sleepEnd.split(':').map(Number);
      let start = sh * 60 + sm;
      let end = eh * 60 + em;
      if (end < start) end += 24 * 60; // next day
      return parseFloat(((end - start) / 60).toFixed(1));
    } catch { return 0; }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const id = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, date);
      await upsertHealthLog({
        id, date,
        sleep_start: sleepStart || undefined,
        sleep_end: sleepEnd || undefined,
        sleep_hours: calcSleepHours(),
        workout_minutes: workoutMinutes ? parseInt(workoutMinutes) : 0,
        workout_type: workoutType || undefined,
        water_ml: waterMl ? parseInt(waterMl) : 0,
        notes: notes || undefined,
      });
      await loadHealthData();
      router.back();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setIsSaving(false);
    }
  };

  const WORKOUT_TYPES = language === 'uz'
    ? ['Yugurish', 'Gym', 'Suzish', 'Velosiped', 'Yoga', 'Boks', 'Futbol', 'Boshqa']
    : ['Running', 'Gym', 'Swimming', 'Cycling', 'Yoga', 'Boxing', 'Football', 'Other'];

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
          <Text style={styles.title}>
            {language === 'uz' ? 'Sog\'liq yozuvi' : 'Health Log'} — {date}
          </Text>
          <TouchableOpacity
            style={[styles.saveBtn, isSaving && { opacity: 0.5 }]}
            onPress={handleSave}
            disabled={isSaving}
          >
            <Text style={styles.saveBtnText}>{t.common.save}</Text>
          </TouchableOpacity>
        </View>

        {/* Sleep */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>😴 {t.health.sleep}</Text>
          <View style={styles.timeRow}>
            <View style={styles.timeField}>
              <Text style={styles.label}>{t.health.sleepStart}</Text>
              <TextInput
                style={styles.input}
                value={sleepStart}
                onChangeText={setSleepStart}
                placeholder="22:00"
                placeholderTextColor={COLORS.textMuted}
                keyboardType="numbers-and-punctuation"
              />
            </View>
            <View style={styles.timeArrow}>
              <Ionicons name="arrow-forward" size={20} color={COLORS.textMuted} />
            </View>
            <View style={styles.timeField}>
              <Text style={styles.label}>{t.health.sleepEnd}</Text>
              <TextInput
                style={styles.input}
                value={sleepEnd}
                onChangeText={setSleepEnd}
                placeholder="07:00"
                placeholderTextColor={COLORS.textMuted}
                keyboardType="numbers-and-punctuation"
              />
            </View>
          </View>
          {sleepStart && sleepEnd && (
            <View style={styles.calcResult}>
              <Ionicons name="moon" size={14} color={COLORS.primary} />
              <Text style={styles.calcText}>
                {calcSleepHours()} {t.dashboard.hours}
              </Text>
            </View>
          )}
        </View>

        {/* Workout */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💪 {t.health.workout}</Text>
          <Text style={styles.label}>{t.health.workoutMinutes} ({language === 'uz' ? 'daqiqa' : 'minutes'})</Text>
          <TextInput
            style={[styles.input, { marginBottom: SPACING.md }]}
            value={workoutMinutes}
            onChangeText={setWorkoutMinutes}
            placeholder="0"
            placeholderTextColor={COLORS.textMuted}
            keyboardType="numeric"
          />
          <Text style={styles.label}>{t.health.workoutType}</Text>
          <View style={styles.chipGrid}>
            {WORKOUT_TYPES.map(wt => (
              <TouchableOpacity
                key={wt}
                style={[styles.chip, workoutType === wt && styles.chipActive]}
                onPress={() => setWorkoutType(wt === workoutType ? '' : wt)}
              >
                <Text style={[styles.chipText, workoutType === wt && styles.chipTextActive]}>{wt}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Water */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💧 {t.health.water}</Text>
          <TextInput
            style={styles.input}
            value={waterMl}
            onChangeText={setWaterMl}
            placeholder="2000"
            placeholderTextColor={COLORS.textMuted}
            keyboardType="numeric"
          />
        </View>

        {/* Notes */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>📝 {language === 'uz' ? 'Eslatmalar' : 'Notes'}</Text>
          <TextInput
            style={[styles.input, { minHeight: 80, textAlignVertical: 'top' }]}
            value={notes}
            onChangeText={setNotes}
            placeholder={language === 'uz' ? 'Bugungi sog\'liq holatingiz...' : 'How are you feeling today...'}
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
  title: { fontSize: FONTS.sizes.md, fontWeight: '700', color: COLORS.textPrimary, flex: 1, textAlign: 'center' },
  saveBtn: {
    backgroundColor: COLORS.primary, paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm, borderRadius: RADIUS.lg,
  },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: FONTS.sizes.md },
  section: {
    margin: SPACING.lg, marginBottom: 0, backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.lg, padding: SPACING.lg,
    borderWidth: 1, borderColor: COLORS.border,
  },
  sectionTitle: {
    fontSize: FONTS.sizes.md, fontWeight: '700', color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  label: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, marginBottom: SPACING.sm, fontWeight: '600' },
  input: {
    backgroundColor: COLORS.bgInput, borderRadius: RADIUS.md, padding: SPACING.md,
    color: COLORS.textPrimary, fontSize: FONTS.sizes.md,
    borderWidth: 1, borderColor: COLORS.border,
  },
  timeRow: { flexDirection: 'row', alignItems: 'flex-end', gap: SPACING.sm },
  timeField: { flex: 1 },
  timeArrow: { paddingBottom: SPACING.md },
  calcResult: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    marginTop: SPACING.sm, backgroundColor: COLORS.primary + '11',
    padding: SPACING.sm, borderRadius: RADIUS.sm,
  },
  calcText: { fontSize: FONTS.sizes.sm, color: COLORS.primary, fontWeight: '700' },
  chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  chip: {
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full, backgroundColor: COLORS.bgInput,
    borderWidth: 1, borderColor: COLORS.border,
  },
  chipActive: { backgroundColor: COLORS.income + '22', borderColor: COLORS.income },
  chipText: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary },
  chipTextActive: { color: COLORS.income, fontWeight: '700' },
});
