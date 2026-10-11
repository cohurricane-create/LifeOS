import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Alert, Image, RefreshControl
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import * as ImagePicker from 'expo-image-picker';
import { COLORS, SPACING, RADIUS, FONTS } from '../../src/constants/theme';
import { useTranslation } from '../../src/i18n';
import { useAppStore } from '../../src/store/useAppStore';
import { getHealthLogByDate, getFoodLogsByDate, deleteFoodLog, upsertHealthLog } from '../../src/database/healthQueries';
import { HealthLog, FoodLog } from '../../src/types';
import { analyzeFoodImage } from '../../src/services/openai';
import { addFoodLog } from '../../src/database/healthQueries';
import * as Crypto from 'expo-crypto';

export default function HealthScreen() {
  const t = useTranslation();
  const router = useRouter();
  const { language, loadHealthData } = useAppStore();
  const [healthLog, setHealthLog] = useState<HealthLog | null>(null);
  const [foodLogs, setFoodLogs] = useState<FoodLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const today = format(new Date(), 'yyyy-MM-dd');

  const loadData = useCallback(async () => {
    setIsLoading(true);
    const [hl, fl] = await Promise.all([
      getHealthLogByDate(today),
      getFoodLogsByDate(today),
    ]);
    setHealthLog(hl);
    setFoodLogs(fl);
    setIsLoading(false);
  }, [today]);

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const caloriesGoal = parseInt(useAppStore.getState().settings.calories_goal ?? '2000');
  const caloriesConsumed = healthLog?.calories_consumed ?? 0;
  const caloriesPct = Math.min((caloriesConsumed / caloriesGoal) * 100, 100);

  const handlePhotoAnalyze = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      base64: true,
      quality: 0.5,
    });

    if (!result.canceled && result.assets[0].base64) {
      setIsAnalyzing(true);
      try {
        const analysis = await analyzeFoodImage(result.assets[0].base64);

        // Ensure health log exists
        const logId = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, today);
        await upsertHealthLog({ id: logId, date: today });

        const foodId = await Crypto.digestStringAsync(
          Crypto.CryptoDigestAlgorithm.SHA256, Date.now().toString()
        );
        await addFoodLog({
          id: foodId,
          health_log_id: logId,
          date: today,
          food_name: analysis.food_name,
          calories: analysis.calories,
          meal_type: analysis.meal_type as any,
          photo_uri: result.assets[0].uri,
        });

        loadData();
        loadHealthData();
      } catch (e: any) {
        Alert.alert('Error', e.message);
      } finally {
        setIsAnalyzing(false);
      }
    }
  };

  const handleDeleteFood = (food: FoodLog) => {
    Alert.alert(
      t.common.delete,
      language === 'uz' ? `"${food.food_name}" ni o'chirmoqchimisiz?` : `Delete "${food.food_name}"?`,
      [
        { text: t.common.cancel, style: 'cancel' },
        {
          text: t.common.delete, style: 'destructive',
          onPress: async () => {
            await deleteFoodLog(food.id, food.calories, food.date);
            loadData();
            loadHealthData();
          }
        },
      ]
    );
  };

  const mealIcon: Record<string, string> = {
    breakfast: '🌅', lunch: '☀️', dinner: '🌙', snack: '🍎', other: '🍽️'
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={isLoading} onRefresh={loadData} tintColor={COLORS.primary} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{t.health.title}</Text>
        <TouchableOpacity
          style={styles.editBtn}
          onPress={() => router.push({ pathname: '/add-health', params: { date: today } })}
        >
          <Ionicons name="pencil" size={18} color={COLORS.primary} />
        </TouchableOpacity>
      </View>

      {/* Today Summary */}
      <View style={styles.summaryCard}>
        <Text style={styles.cardTitle}>{t.health.todaySummary}</Text>

        {/* Sleep */}
        <View style={styles.metricRow}>
          <View style={[styles.metricIcon, { backgroundColor: COLORS.primary + '22' }]}>
            <Text style={{ fontSize: 20 }}>😴</Text>
          </View>
          <View style={styles.metricInfo}>
            <Text style={styles.metricLabel}>{t.health.sleep}</Text>
            <Text style={styles.metricValue}>
              {healthLog?.sleep_hours
                ? `${healthLog.sleep_hours} ${t.dashboard.hours}`
                : '--'}
            </Text>
            {healthLog?.sleep_start && healthLog?.sleep_end && (
              <Text style={styles.metricSub}>
                {healthLog.sleep_start} → {healthLog.sleep_end}
              </Text>
            )}
          </View>
          <TouchableOpacity onPress={() => router.push({ pathname: '/add-health', params: { date: today, focus: 'sleep' } })}>
            <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Workout */}
        <View style={styles.metricRow}>
          <View style={[styles.metricIcon, { backgroundColor: COLORS.income + '22' }]}>
            <Text style={{ fontSize: 20 }}>💪</Text>
          </View>
          <View style={styles.metricInfo}>
            <Text style={styles.metricLabel}>{t.health.workout}</Text>
            <Text style={styles.metricValue}>
              {healthLog?.workout_minutes
                ? `${healthLog.workout_minutes} ${t.dashboard.minutes}`
                : '--'}
            </Text>
            {healthLog?.workout_type && (
              <Text style={styles.metricSub}>{healthLog.workout_type}</Text>
            )}
          </View>
          <TouchableOpacity onPress={() => router.push({ pathname: '/add-health', params: { date: today, focus: 'workout' } })}>
            <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Water */}
        <View style={styles.metricRow}>
          <View style={[styles.metricIcon, { backgroundColor: COLORS.loan + '22' }]}>
            <Text style={{ fontSize: 20 }}>💧</Text>
          </View>
          <View style={styles.metricInfo}>
            <Text style={styles.metricLabel}>{t.health.water_ml}</Text>
            <Text style={styles.metricValue}>
              {healthLog?.water_ml ? `${healthLog.water_ml} ml` : '--'}
            </Text>
          </View>
          <TouchableOpacity onPress={() => router.push({ pathname: '/add-health', params: { date: today, focus: 'water' } })}>
            <Ionicons name="chevron-forward" size={20} color={COLORS.textMuted} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Calories */}
      <View style={styles.card}>
        <View style={styles.caloriesHeader}>
          <Text style={styles.cardTitle}>🔥 {t.health.calories}</Text>
          <Text style={styles.caloriesGoal}>
            {caloriesConsumed} / {caloriesGoal} kcal
          </Text>
        </View>
        <View style={styles.caloriesBar}>
          <View style={[
            styles.caloriesFill,
            {
              width: `${caloriesPct}%`,
              backgroundColor: caloriesPct > 95 ? COLORS.expense : caloriesPct > 75 ? COLORS.debt : COLORS.income
            }
          ]} />
        </View>

        {/* Food Logs */}
        <View style={styles.foodList}>
          {foodLogs.map(food => (
            <TouchableOpacity
              key={food.id}
              style={styles.foodItem}
              onLongPress={() => handleDeleteFood(food)}
            >
              <Text style={styles.mealIcon}>{mealIcon[food.meal_type] ?? '🍽️'}</Text>
              <View style={styles.foodInfo}>
                <Text style={styles.foodName}>{food.food_name}</Text>
                <Text style={styles.foodCalories}>{food.calories} kcal</Text>
              </View>
              {food.photo_uri && (
                <Image source={{ uri: food.photo_uri }} style={styles.foodPhoto} />
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Add Food Buttons */}
        <View style={styles.addFoodBtns}>
          <TouchableOpacity
            style={styles.addFoodBtn}
            onPress={() => router.push({ pathname: '/add-food' })}
          >
            <Ionicons name="add-circle-outline" size={18} color={COLORS.primary} />
            <Text style={styles.addFoodBtnText}>{t.health.addFood}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.addFoodBtn, { borderColor: COLORS.income + '44' }]}
            onPress={handlePhotoAnalyze}
            disabled={isAnalyzing}
          >
            <Ionicons name="camera" size={18} color={COLORS.income} />
            <Text style={[styles.addFoodBtnText, { color: COLORS.income }]}>
              {isAnalyzing ? '...' : t.health.analyzePhoto}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={{ height: 80 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  content: { padding: SPACING.lg },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: SPACING.lg, paddingTop: SPACING.xxl,
  },
  title: { fontSize: FONTS.sizes.xxl, fontWeight: '800', color: COLORS.textPrimary },
  editBtn: {
    width: 40, height: 40, borderRadius: RADIUS.full,
    backgroundColor: COLORS.primary + '22', alignItems: 'center', justifyContent: 'center',
  },
  summaryCard: {
    backgroundColor: COLORS.bgCard, borderRadius: RADIUS.lg,
    padding: SPACING.lg, marginBottom: SPACING.md,
    borderWidth: 1, borderColor: COLORS.border,
  },
  card: {
    backgroundColor: COLORS.bgCard, borderRadius: RADIUS.lg,
    padding: SPACING.lg, marginBottom: SPACING.md,
    borderWidth: 1, borderColor: COLORS.border,
  },
  cardTitle: { fontSize: FONTS.sizes.lg, fontWeight: '700', color: COLORS.textPrimary, marginBottom: SPACING.md },
  metricRow: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
    paddingVertical: SPACING.sm, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  metricIcon: {
    width: 44, height: 44, borderRadius: RADIUS.full,
    alignItems: 'center', justifyContent: 'center',
  },
  metricInfo: { flex: 1 },
  metricLabel: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary },
  metricValue: { fontSize: FONTS.sizes.lg, fontWeight: '700', color: COLORS.textPrimary },
  metricSub: { fontSize: FONTS.sizes.xs, color: COLORS.textMuted, marginTop: 2 },
  caloriesHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: SPACING.sm,
  },
  caloriesGoal: { fontSize: FONTS.sizes.md, fontWeight: '700', color: COLORS.textPrimary },
  caloriesBar: {
    height: 8, backgroundColor: COLORS.border, borderRadius: RADIUS.full,
    overflow: 'hidden', marginBottom: SPACING.md,
  },
  caloriesFill: { height: '100%', borderRadius: RADIUS.full },
  foodList: { gap: SPACING.sm, marginBottom: SPACING.md },
  foodItem: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    backgroundColor: COLORS.bgInput, borderRadius: RADIUS.md, padding: SPACING.sm,
  },
  mealIcon: { fontSize: 20 },
  foodInfo: { flex: 1 },
  foodName: { fontSize: FONTS.sizes.md, fontWeight: '600', color: COLORS.textPrimary },
  foodCalories: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary },
  foodPhoto: { width: 40, height: 40, borderRadius: RADIUS.sm },
  addFoodBtns: { flexDirection: 'row', gap: SPACING.sm },
  addFoodBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: SPACING.xs, paddingVertical: SPACING.sm, borderRadius: RADIUS.lg,
    borderWidth: 1, borderColor: COLORS.primary + '44',
    backgroundColor: COLORS.primary + '11',
  },
  addFoodBtnText: { fontSize: FONTS.sizes.sm, color: COLORS.primary, fontWeight: '600' },
});
