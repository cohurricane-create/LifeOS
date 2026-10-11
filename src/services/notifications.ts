import type * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { Task } from '../types';

const CHANNEL_ID = 'lifeos-reminders';

async function getNotifications(): Promise<typeof Notifications | null> {
  if (Constants.appOwnership === 'expo') return null;
  return import('expo-notifications');
}

function getTaskDate(task: Task): Date | null {
  if (!task.time) return null;
  const [year, month, day] = task.date.split('-').map(Number);
  const [hour, minute] = task.time.split(':').map(Number);
  if (![year, month, day, hour, minute].every(Number.isFinite)) return null;
  return new Date(year, month - 1, day, hour, minute, 0, 0);
}

export async function requestNotificationPermissions(): Promise<boolean> {
  const Notifications = await getNotifications();
  if (!Notifications) return false;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'LifeOS reminders',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      sound: 'default',
    });
  }

  const current = await Notifications.getPermissionsAsync();
  if (current.granted || current.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL) {
    return true;
  }

  const requested = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowBadge: true, allowSound: true },
  });
  return requested.granted || requested.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
}

export async function scheduleTaskReminder(task: Task): Promise<void> {
  const date = getTaskDate(task);
  if (!date || task.is_done || date.getTime() <= Date.now()) return;
  const Notifications = await getNotifications();
  if (!Notifications || !(await requestNotificationPermissions())) return;

  try {
    await Notifications.cancelScheduledNotificationAsync(task.id);
  } catch {
    // The notification may not have been scheduled yet.
  }

  await Notifications.scheduleNotificationAsync({
    identifier: task.id,
    content: {
      title: 'LifeOS re eslatmasi',
      body: task.title,
      data: { taskId: task.id },
      sound: 'default',
    },
    trigger: Platform.OS === 'android'
      ? { type: Notifications.SchedulableTriggerInputTypes.DATE, date, channelId: CHANNEL_ID }
      : { type: Notifications.SchedulableTriggerInputTypes.DATE, date },
  });
}

export async function cancelTaskReminder(taskId: string): Promise<void> {
  const Notifications = await getNotifications();
  if (!Notifications) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(taskId);
  } catch {
    // Ignore missing reminders.
  }
}
