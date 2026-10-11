import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  RefreshControl, Alert
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { format, addDays, subDays } from 'date-fns';
import { COLORS, SPACING, RADIUS, FONTS } from '../../src/constants/theme';
import { useTranslation } from '../../src/i18n';
import { useAppStore } from '../../src/store/useAppStore';
import { getTasksByDate, getTasksByDateRange, toggleTask, deleteTask } from '../../src/database/healthQueries';
import { suggestDayPlan } from '../../src/services/openai';
import { addTask } from '../../src/database/healthQueries';
import { cancelTaskReminder, scheduleTaskReminder } from '../../src/services/notifications';
import { Task } from '../../src/types';
import * as Crypto from 'expo-crypto';
// import * as Notifications from 'expo-notifications';

type DayTab = 'today' | 'tomorrow';

const PRIORITY_COLORS = {
  low: COLORS.textMuted,
  normal: COLORS.primary,
  high: COLORS.expense,
};

export default function PlannerScreen() {
  const t = useTranslation();
  const router = useRouter();
  const { language, refreshAll } = useAppStore();
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);

  const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');
  const todayStr = format(new Date(), 'yyyy-MM-dd');

  const loadTasks = useCallback(async () => {
    setIsLoading(true);
    const data = await getTasksByDate(selectedDateStr);
    setTasks(data);
    setIsLoading(false);
  }, [selectedDateStr]);

  useFocusEffect(useCallback(() => { loadTasks(); }, [loadTasks]));

  const handleToggle = async (task: Task) => {
    await toggleTask(task.id, !task.is_done);
    if (!task.is_done) {
      await cancelTaskReminder(task.id);
    }
    loadTasks();
  };

  const handleDelete = (task: Task) => {
    Alert.alert(
      t.common.delete,
      language === 'uz' ? `"${task.title}" vazifasini o'chirmoqchimisiz?` : `Delete "${task.title}"?`,
      [
        { text: t.common.cancel, style: 'cancel' },
        {
          text: t.common.delete, style: 'destructive',
          onPress: async () => { await deleteTask(task.id); await cancelTaskReminder(task.id); loadTasks(); }
        },
      ]
    );
  };

  const handleAISuggest = async () => {
    setIsSuggesting(true);
    try {
      const historyStart = format(subDays(new Date(), 14), 'yyyy-MM-dd');
      const historyEnd = format(subDays(new Date(), 1), 'yyyy-MM-dd');
      const history = await getTasksByDateRange(historyStart, historyEnd);
      const historyStr = history.length
        ? history.map(task => `${task.date} (${format(new Date(`${task.date}T00:00:00`), 'EEEE')}), ${task.time ?? '--:--'}, ${task.is_done ? 'done' : 'unfinished'}: ${task.title}`).join('\n')
        : 'No recent task history.';
      const suggestions = await suggestDayPlan(historyStr, selectedDateStr, language);

      for (const s of suggestions) {
        const id = await Crypto.digestStringAsync(
          Crypto.CryptoDigestAlgorithm.SHA256,
          Date.now().toString() + Math.random()
        );
        const task = {
          id,
          title: s.title,
          date: selectedDateStr,
          time: s.time,
          is_done: 0,
          priority: s.priority as any ?? 'normal',
          category: s.category,
        };
        await addTask(task);
        await scheduleTaskReminder({ ...task, created_at: '' });
      }

      loadTasks();
    } catch (e: any) {
      Alert.alert('Error', e.message);
    } finally {
      setIsSuggesting(false);
    }
  };

  const done = tasks.filter(t => t.is_done).length;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{t.planner.title}</Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => router.push({ pathname: '/add-task', params: { date: selectedDateStr } })}
        >
          <Ionicons name="add" size={24} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {/* Date Selector */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: SPACING.md, marginBottom: SPACING.md }}>
        <TouchableOpacity onPress={() => setSelectedDate(prev => addDays(prev, -1))} style={{ padding: SPACING.sm }}>
          <Ionicons name="chevron-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setSelectedDate(new Date())}>
          <Text style={{ fontSize: 18, fontWeight: 'bold', color: COLORS.textPrimary }}>
            {selectedDateStr === todayStr ? t.planner.todayPlan : format(selectedDate, 'dd MMM, yyyy')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setSelectedDate(prev => addDays(prev, 1))} style={{ padding: SPACING.sm }}>
          <Ionicons name="chevron-forward" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={loadTasks} tintColor={COLORS.primary} />}
      >
        {/* Progress */}
        {tasks.length > 0 && (
          <View style={styles.progressSection}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${(done / tasks.length) * 100}%` }]} />
            </View>
            <Text style={styles.progressText}>
              {done}/{tasks.length} {t.dashboard.tasksCompleted}
            </Text>
          </View>
        )}

        {/* AI Suggest Button (for future dates) */}
        {selectedDateStr > todayStr && (
          <TouchableOpacity
            style={[styles.aiBtn, isSuggesting && styles.aiBtnLoading]}
            onPress={handleAISuggest}
            disabled={isSuggesting}
          >
            <Ionicons name="sparkles" size={20} color={COLORS.primary} />
            <Text style={styles.aiBtnText}>
              {isSuggesting ? t.planner.aiGenerating : t.planner.aiSuggest}
            </Text>
          </TouchableOpacity>
        )}

        {/* Tasks List */}
        {tasks.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={{ fontSize: 40 }}>📋</Text>
            <Text style={styles.emptyText}>{t.planner.noTasks}</Text>
            <TouchableOpacity
              style={styles.addTaskBtn}
              onPress={() => router.push({ pathname: '/add-task', params: { date: selectedDateStr } })}
            >
              <Ionicons name="add-circle" size={18} color={COLORS.primary} />
              <Text style={styles.addTaskBtnText}>{t.planner.addTask}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          tasks.map(task => (
            <View key={task.id} style={styles.taskCard}>
              <TouchableOpacity
                style={styles.checkbox}
                onPress={() => handleToggle(task)}
              >
                <Ionicons
                  name={task.is_done ? 'checkmark-circle' : 'ellipse-outline'}
                  size={26}
                  color={task.is_done ? COLORS.income : COLORS.textMuted}
                />
              </TouchableOpacity>
              <View style={styles.taskContent}>
                <Text style={[styles.taskTitle, task.is_done === 1 && styles.taskDone]}>
                  {task.title}
                </Text>
                {task.description && (
                  <Text style={styles.taskDesc} numberOfLines={2}>{task.description}</Text>
                )}
                <View style={styles.taskMeta}>
                  {task.time && (
                    <View style={styles.metaChip}>
                      <Ionicons name="time-outline" size={12} color={COLORS.textMuted} />
                      <Text style={styles.metaText}>{task.time}</Text>
                    </View>
                  )}
                  <View style={[styles.metaChip, { borderColor: PRIORITY_COLORS[task.priority] + '44' }]}>
                    <View style={[styles.priorityDot, { backgroundColor: PRIORITY_COLORS[task.priority] }]} />
                    <Text style={[styles.metaText, { color: PRIORITY_COLORS[task.priority] }]}>
                      {t.planner[task.priority]}
                    </Text>
                  </View>
                </View>
              </View>
              <View style={styles.taskActions}>
                <TouchableOpacity onPress={() => router.push({ pathname: '/add-task', params: { id: task.id } })}>
                  <Ionicons name="pencil-outline" size={20} color={COLORS.textMuted} />
                </TouchableOpacity>
                {task.time && (
                  <TouchableOpacity onPress={() => scheduleTaskReminder(task)}>
                    <Ionicons name="notifications-outline" size={20} color={COLORS.textMuted} />
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={() => handleDelete(task)}>
                  <Ionicons name="trash-outline" size={20} color={COLORS.textMuted} />
                </TouchableOpacity>
              </View>
            </View>
          ))
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
  addBtn: {
    width: 44, height: 44, borderRadius: RADIUS.full,
    backgroundColor: COLORS.primary + '22', alignItems: 'center', justifyContent: 'center',
  },
  dayTabs: {
    flexDirection: 'row', paddingHorizontal: SPACING.lg,
    gap: SPACING.sm, marginBottom: SPACING.md,
  },
  dayTab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: SPACING.sm, borderRadius: RADIUS.lg, gap: SPACING.sm,
    backgroundColor: COLORS.bgCard, borderWidth: 1, borderColor: COLORS.border,
  },
  dayTabActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  dayTabText: { fontSize: FONTS.sizes.sm, fontWeight: '600', color: COLORS.textSecondary },
  dayTabTextActive: { color: '#fff' },
  badge: {
    backgroundColor: COLORS.textMuted + '44', borderRadius: RADIUS.full,
    paddingHorizontal: 6, paddingVertical: 1,
  },
  badgeActive: { backgroundColor: 'rgba(255,255,255,0.3)' },
  badgeText: { fontSize: FONTS.sizes.xs, color: '#fff', fontWeight: '700' },
  progressSection: {
    paddingHorizontal: SPACING.lg, marginBottom: SPACING.md, gap: SPACING.xs,
  },
  progressBar: {
    height: 6, backgroundColor: COLORS.border, borderRadius: RADIUS.full, overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: COLORS.primary, borderRadius: RADIUS.full },
  progressText: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, textAlign: 'right' },
  aiBtn: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    marginHorizontal: SPACING.lg, marginBottom: SPACING.md,
    padding: SPACING.md, borderRadius: RADIUS.lg,
    backgroundColor: COLORS.primary + '15', borderWidth: 1, borderColor: COLORS.primary + '44',
    justifyContent: 'center',
  },
  aiBtnLoading: { opacity: 0.6 },
  aiBtnText: { fontSize: FONTS.sizes.md, color: COLORS.primary, fontWeight: '600' },
  emptyState: {
    alignItems: 'center', padding: SPACING.xxl, gap: SPACING.md,
  },
  emptyText: { fontSize: FONTS.sizes.lg, color: COLORS.textSecondary },
  addTaskBtn: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    paddingVertical: SPACING.sm, paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.lg, backgroundColor: COLORS.primary + '22',
  },
  addTaskBtnText: { fontSize: FONTS.sizes.md, color: COLORS.primary, fontWeight: '600' },
  taskCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: SPACING.md,
    marginHorizontal: SPACING.lg, marginBottom: SPACING.sm,
    backgroundColor: COLORS.bgCard, borderRadius: RADIUS.lg,
    padding: SPACING.md, borderWidth: 1, borderColor: COLORS.border,
  },
  checkbox: { paddingTop: 2 },
  taskContent: { flex: 1 },
  taskTitle: { fontSize: FONTS.sizes.md, fontWeight: '600', color: COLORS.textPrimary, lineHeight: 22 },
  taskDone: { textDecorationLine: 'line-through', color: COLORS.textMuted },
  taskDesc: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary, marginTop: 4 },
  taskMeta: { flexDirection: 'row', gap: SPACING.sm, marginTop: SPACING.sm, flexWrap: 'wrap' },
  metaChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: SPACING.sm, paddingVertical: 2,
    borderRadius: RADIUS.sm, borderWidth: 1, borderColor: COLORS.border,
    backgroundColor: COLORS.bgInput,
  },
  metaText: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted },
  priorityDot: { width: 6, height: 6, borderRadius: 3 },
  taskActions: { gap: SPACING.sm, alignItems: 'center' },
});
