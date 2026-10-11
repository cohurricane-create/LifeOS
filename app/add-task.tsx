import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, KeyboardAvoidingView, Platform, Alert
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { format, addDays } from 'date-fns';
import { COLORS, SPACING, RADIUS, FONTS } from '../src/constants/theme';
import { useTranslation } from '../src/i18n';
import { useAppStore } from '../src/store/useAppStore';
import { addTask, getTaskById, updateTask } from '../src/database/healthQueries';
import { scheduleTaskReminder } from '../src/services/notifications';
import * as Crypto from 'expo-crypto';

const TASK_CATEGORIES = ['work', 'health', 'personal', 'finance', 'learning', 'general', 'other'];
const PRIORITIES = ['low', 'normal', 'high'] as const;

export default function AddTaskScreen() {
  const params = useLocalSearchParams();
  const t = useTranslation();
  const router = useRouter();
  const { language, loadTodayTasks } = useAppStore();
  const isEditing = !!params.id;

  const defaultDate = (params.date as string) ?? format(new Date(), 'yyyy-MM-dd');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(defaultDate);
  const [time, setTime] = useState('');
  const [priority, setPriority] = useState<'low' | 'normal' | 'high'>('normal');
  const [category, setCategory] = useState('general');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isEditing) {
      getTaskById(params.id as string).then(task => {
        if (task) {
          setTitle(task.title);
          setDescription(task.description || '');
          setDate(task.date);
          setTime(task.time || '');
          setPriority(task.priority as any);
          setCategory(task.category || 'general');
        }
      });
    }
  }, [params.id]);

  const PRIORITY_COLORS = {
    low: COLORS.textMuted,
    normal: COLORS.primary,
    high: COLORS.expense,
  };

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('', language === 'uz' ? 'Vazifa nomini kiriting' : 'Enter task title');
      return;
    }

    setIsSaving(true);
    try {
      if (isEditing) {
        await updateTask(params.id as string, {
          title: title.trim(),
          description: description.trim() || undefined,
          date,
          time: time.trim() || undefined,
          priority,
          category,
        });
        await scheduleTaskReminder({
          id: params.id as string,
          title: title.trim(),
          description: description.trim() || undefined,
          date,
          time: time.trim() || undefined,
          is_done: 0,
          priority,
          category,
          created_at: '',
        });
      } else {
        const id = await Crypto.digestStringAsync(
          Crypto.CryptoDigestAlgorithm.SHA256,
          Date.now().toString() + Math.random()
        );
        const task = {
          id, title: title.trim(), description: description.trim() || undefined,
          date, time: time.trim() || undefined, is_done: 0,
          priority, category,
        };
        await addTask(task);
        await scheduleTaskReminder({ ...task, created_at: '' });
      }
      await loadTodayTasks();
      router.back();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setIsSaving(false);
    }
  };

  const catEmojis: Record<string, string> = {
    work: '💼', health: '💪', personal: '👤', finance: '💰',
    learning: '📚', general: '📋', other: '📦',
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
          <Text style={styles.title}>{t.planner.addTask}</Text>
          <TouchableOpacity
            style={[styles.saveBtn, isSaving && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={isSaving}
          >
            <Text style={styles.saveBtnText}>{t.common.save}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>{t.planner.taskTitle}</Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder={language === 'uz' ? 'Vazifa nomi...' : 'Task title...'}
            placeholderTextColor={COLORS.textMuted}
            autoFocus
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>{t.planner.taskDescription}</Text>
          <TextInput
            style={[styles.input, styles.multiline]}
            value={description}
            onChangeText={setDescription}
            placeholder={language === 'uz' ? 'Tavsif...' : 'Description...'}
            placeholderTextColor={COLORS.textMuted}
            multiline
          />
        </View>

        <View style={styles.row}>
          <View style={[styles.section, { flex: 1 }]}>
            <Text style={styles.label}>{t.common.date}</Text>
            <TextInput
              style={styles.input}
              value={date}
              onChangeText={setDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor={COLORS.textMuted}
            />
          </View>
          <View style={[styles.section, { flex: 1 }]}>
            <Text style={styles.label}>{t.common.time}</Text>
            <TextInput
              style={styles.input}
              value={time}
              onChangeText={setTime}
              placeholder="HH:MM"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="numbers-and-punctuation"
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>{t.planner.priority}</Text>
          <View style={styles.chipRow}>
            {PRIORITIES.map(p => (
              <TouchableOpacity
                key={p}
                style={[styles.chip, priority === p && { backgroundColor: PRIORITY_COLORS[p] + '22', borderColor: PRIORITY_COLORS[p] }]}
                onPress={() => setPriority(p)}
              >
                <Text style={[styles.chipText, priority === p && { color: PRIORITY_COLORS[p], fontWeight: '700' }]}>
                  {t.planner[p]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>{t.common.category}</Text>
          <View style={styles.catGrid}>
            {TASK_CATEGORIES.map(cat => (
              <TouchableOpacity
                key={cat}
                style={[styles.catBtn, category === cat && styles.catBtnActive]}
                onPress={() => setCategory(cat)}
              >
                <Text>{catEmojis[cat]}</Text>
                <Text style={[styles.catText, category === cat && styles.catTextActive]}>
                  {cat}
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
  saveBtnDisabled: { opacity: 0.5 },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: FONTS.sizes.md },
  section: { padding: SPACING.lg, paddingBottom: SPACING.sm },
  row: { flexDirection: 'row' },
  label: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, marginBottom: SPACING.sm, fontWeight: '600' },
  input: {
    backgroundColor: COLORS.bgCard, borderRadius: RADIUS.lg, padding: SPACING.md,
    color: COLORS.textPrimary, fontSize: FONTS.sizes.md,
    borderWidth: 1, borderColor: COLORS.border,
  },
  multiline: { minHeight: 80, textAlignVertical: 'top' },
  chipRow: { flexDirection: 'row', gap: SPACING.sm },
  chip: {
    flex: 1, paddingVertical: SPACING.sm, borderRadius: RADIUS.lg,
    backgroundColor: COLORS.bgCard, borderWidth: 1, borderColor: COLORS.border,
    alignItems: 'center',
  },
  chipText: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary },
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.sm },
  catBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
    borderRadius: RADIUS.lg, backgroundColor: COLORS.bgCard,
    borderWidth: 1, borderColor: COLORS.border,
  },
  catBtnActive: { backgroundColor: COLORS.primary + '22', borderColor: COLORS.primary },
  catText: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary },
  catTextActive: { color: COLORS.primary, fontWeight: '700' },
});
