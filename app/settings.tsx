import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, KeyboardAvoidingView, Platform, Alert, Switch
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, SPACING, RADIUS, FONTS } from '../src/constants/theme';
import { useTranslation } from '../src/i18n';
import { useAppStore } from '../src/store/useAppStore';
import { getAllSettings, setSetting } from '../src/database/queries';
import * as SecureStore from 'expo-secure-store';

export default function SettingsScreen() {
  const t = useTranslation();
  const router = useRouter();
  const { language, refreshAll } = useAppStore();

  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [usdRate, setUsdRate] = useState('12700');
  const [caloriesGoal, setCaloriesGoal] = useState('2000');
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [selectedLang, setSelectedLang] = useState(language);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    async function loadSettings() {
      const settings = await getAllSettings();
      const secureKey = await SecureStore.getItemAsync('openai_key');
      setApiKey(secureKey ?? settings.openai_key ?? '');
      setUsdRate(settings.usd_rate ?? '12700');
      setCaloriesGoal(settings.calories_goal ?? '2000');
      setNotificationsEnabled(settings.notifications_enabled === 'true');
      setSelectedLang((settings.language as 'uz' | 'en') ?? 'uz');
    }

    loadSettings();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Save API key securely
      await SecureStore.setItemAsync('openai_key', apiKey.trim());
      await setSetting('usd_rate', usdRate);
      await setSetting('calories_goal', caloriesGoal);
      await setSetting('notifications_enabled', notificationsEnabled.toString());
      await setSetting('language', selectedLang);
      await refreshAll();
      Alert.alert('✅', language === 'uz' ? 'Sozlamalar saqlandi' : 'Settings saved');
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
            <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.title}>{t.settings.title}</Text>
          <TouchableOpacity
            style={[styles.saveBtn, isSaving && { opacity: 0.5 }]}
            onPress={handleSave}
            disabled={isSaving}
          >
            <Text style={styles.saveBtnText}>{t.common.save}</Text>
          </TouchableOpacity>
        </View>

        {/* API Key */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🤖 OpenAI</Text>
          <Text style={styles.label}>{t.settings.apiKey}</Text>
          <View style={styles.apiKeyRow}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              value={apiKey}
              onChangeText={setApiKey}
              placeholder={t.settings.apiKeyPlaceholder}
              placeholderTextColor={COLORS.textMuted}
              secureTextEntry={!showKey}
              autoCorrect={false}
            />
            <TouchableOpacity
              style={styles.eyeBtn}
              onPress={() => setShowKey(p => !p)}
            >
              <Ionicons name={showKey ? 'eye-off' : 'eye'} size={20} color={COLORS.textMuted} />
            </TouchableOpacity>
          </View>
          <View style={styles.infoBox}>
            <Ionicons name="shield-checkmark" size={14} color={COLORS.income} />
            <Text style={styles.infoText}>{t.settings.dataStorage}</Text>
          </View>
        </View>

        {/* Language */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🌐 {t.settings.language}</Text>
          <View style={styles.langRow}>
            <TouchableOpacity
              style={[styles.langBtn, selectedLang === 'uz' && styles.langBtnActive]}
              onPress={() => setSelectedLang('uz')}
            >
              <Text style={styles.langFlag}>🇺🇿</Text>
              <Text style={[styles.langText, selectedLang === 'uz' && styles.langTextActive]}>O&apos;zbek</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.langBtn, selectedLang === 'en' && styles.langBtnActive]}
              onPress={() => setSelectedLang('en')}
            >
              <Text style={styles.langFlag}>🇬🇧</Text>
              <Text style={[styles.langText, selectedLang === 'en' && styles.langTextActive]}>English</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Finance Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💰 {language === 'uz' ? 'Moliya' : 'Finance'}</Text>
          <Text style={styles.label}>{t.settings.usdRate}</Text>
          <TextInput
            style={styles.input}
            value={usdRate}
            onChangeText={setUsdRate}
            keyboardType="numeric"
            placeholderTextColor={COLORS.textMuted}
          />
        </View>

        {/* Health Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>💪 {language === 'uz' ? 'Sog\'liq' : 'Health'}</Text>
          <Text style={styles.label}>{t.settings.caloriesGoal}</Text>
          <TextInput
            style={styles.input}
            value={caloriesGoal}
            onChangeText={setCaloriesGoal}
            keyboardType="numeric"
            placeholderTextColor={COLORS.textMuted}
          />
        </View>

        {/* Notifications */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔔 {language === 'uz' ? 'Bildirishnomalar' : 'Notifications'}</Text>
          <View style={styles.switchRow}>
            <Text style={styles.label}>{t.settings.notifications}</Text>
            <Switch
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
              trackColor={{ false: COLORS.border, true: COLORS.primary }}
              thumbColor={notificationsEnabled ? '#fff' : COLORS.textMuted}
            />
          </View>
        </View>

        {/* PIN Lock */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔐 {language === 'uz' ? 'Ilova qulfi' : 'App Lock'}</Text>
          <TouchableOpacity
            style={{
              flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
              backgroundColor: COLORS.bgInput, padding: SPACING.md,
              borderRadius: RADIUS.md, borderWidth: 1, borderColor: COLORS.border,
            }}
            onPress={async () => {
              const SecureStore = await import('expo-secure-store');
              const existing = await SecureStore.getItemAsync('lifeos_pin');
              Alert.alert(
                language === 'uz' ? 'PIN kod' : 'PIN Code',
                existing
                  ? (language === 'uz' ? 'PIN kodni o\'chirmoqchimisiz?' : 'Remove PIN code?')
                  : (language === 'uz' ? 'PIN kod o\'rnatish uchun ilovani qayta oching' : 'Reopen the app to set a PIN'),
                existing ? [
                  { text: language === 'uz' ? 'Bekor' : 'Cancel', style: 'cancel' },
                  {
                    text: language === 'uz' ? 'O\'chirish' : 'Remove',
                    style: 'destructive',
                    onPress: async () => {
                      await SecureStore.deleteItemAsync('lifeos_pin');
                      Alert.alert('✅', language === 'uz' ? 'PIN kod o\'chirildi' : 'PIN removed');
                    }
                  }
                ] : [{ text: 'OK' }]
              );
            }}
          >
            <Text style={{ fontSize: FONTS.sizes.md, color: COLORS.textPrimary }}>
              {language === 'uz' ? 'PIN kodni boshqarish' : 'Manage PIN'}
            </Text>
            <Ionicons name="chevron-forward" size={18} color={COLORS.textMuted} />
          </TouchableOpacity>
          <Text style={{ fontSize: FONTS.sizes.xs, color: COLORS.textMuted, marginTop: SPACING.xs }}>
            {language === 'uz'
              ? 'PIN o\'rnatish uchun ilovani yoping va qayta oching'
              : 'Close and reopen the app to set a new PIN'}
          </Text>
        </View>

        {/* About */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ℹ️ {t.settings.aboutApp}</Text>
          <View style={styles.aboutCard}>
            <Text style={styles.appName}>LifeOS</Text>
            <Text style={styles.appVersion}>{t.settings.version}</Text>
            <Text style={styles.appDesc}>
              {language === 'uz'
                ? 'Shaxsiy hayot yordamchisi — moliya, reja va sog\'liq'
                : 'Personal life assistant — finance, planning & health'}
            </Text>
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
  apiKeyRow: { flexDirection: 'row', gap: SPACING.sm, alignItems: 'center' },
  eyeBtn: {
    width: 44, height: 44, backgroundColor: COLORS.bgInput,
    borderRadius: RADIUS.md, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: COLORS.border,
  },
  infoBox: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    backgroundColor: COLORS.income + '11', padding: SPACING.sm,
    borderRadius: RADIUS.sm, marginTop: SPACING.sm,
  },
  infoText: { fontSize: FONTS.sizes.xs, color: COLORS.income, flex: 1 },
  langRow: { flexDirection: 'row', gap: SPACING.sm },
  langBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: SPACING.sm, paddingVertical: SPACING.md, borderRadius: RADIUS.lg,
    backgroundColor: COLORS.bgInput, borderWidth: 1, borderColor: COLORS.border,
  },
  langBtnActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primary + '22' },
  langFlag: { fontSize: 20 },
  langText: { fontSize: FONTS.sizes.md, color: COLORS.textSecondary, fontWeight: '600' },
  langTextActive: { color: COLORS.primary },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  aboutCard: { alignItems: 'center', padding: SPACING.md, gap: SPACING.xs },
  appName: { fontSize: FONTS.sizes.xxl, fontWeight: '800', color: COLORS.primary },
  appVersion: { fontSize: FONTS.sizes.sm, color: COLORS.textMuted },
  appDesc: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, textAlign: 'center', marginTop: SPACING.xs },
});
