import React, { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator } from 'react-native';
import Constants from 'expo-constants';
import { initDatabase } from '../src/database/init';
import { useAppStore } from '../src/store/useAppStore';
import { COLORS } from '../src/constants/theme';
import * as SecureStore from 'expo-secure-store';
import PinLock from './pin-lock';
import { getUpcomingTasks } from '../src/database/healthQueries';
import { scheduleTaskReminder } from '../src/services/notifications';

const PIN_KEY = 'lifeos_pin';

export default function RootLayout() {
  const refreshAll = useAppStore(s => s.refreshAll);
  const [isDbReady, setIsDbReady] = useState(false);
  const [isLocked, setIsLocked] = useState(false);

  useEffect(() => {
    async function init() {
      try {
        if (Constants.appOwnership !== 'expo') {
          const Notifications = await import('expo-notifications');
          Notifications.setNotificationHandler({
            handleNotification: async () => ({
              shouldShowBanner: true,
              shouldShowList: true,
              shouldPlaySound: true,
              shouldSetBadge: false,
            }),
          });
        }
        await initDatabase();
        await refreshAll();
        const upcomingTasks = await getUpcomingTasks();
        await Promise.all(upcomingTasks.map(scheduleTaskReminder));
        // Check if PIN is set
        await SecureStore.getItemAsync(PIN_KEY);
        setIsLocked(true);
      } catch (e) {
        console.error('Init error:', e);
      } finally {
        // Always mark DB as ready so app doesn't stay stuck on loading screen
        setIsDbReady(true);
      }
    }
    init();
  }, []);

  if (!isDbReady) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.bg, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (isLocked) {
    return <PinLock onUnlock={() => setIsLocked(false)} />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.bg }}>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: COLORS.bg } }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="onboarding" options={{ presentation: 'fullScreenModal' }} />
        <Stack.Screen name="add-transaction" options={{ presentation: 'modal' }} />
        <Stack.Screen name="add-task" options={{ presentation: 'modal' }} />
        <Stack.Screen name="add-debt" options={{ presentation: 'modal' }} />
        <Stack.Screen name="add-food" options={{ presentation: 'modal' }} />
        <Stack.Screen name="add-health" options={{ presentation: 'modal' }} />
        <Stack.Screen name="edit-balance" options={{ presentation: 'modal' }} />
        <Stack.Screen name="settings" />
        <Stack.Screen name="reports" />
      </Stack>
    </View>
  );
}
