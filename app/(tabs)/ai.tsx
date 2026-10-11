import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  TextInput, KeyboardAvoidingView, Platform, ActivityIndicator, Alert, Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioRecorder,
} from 'expo-audio';
import * as ImagePicker from 'expo-image-picker';
import { format } from 'date-fns';
import { COLORS, SPACING, RADIUS, FONTS } from '../../src/constants/theme';
import { useTranslation } from '../../src/i18n';
import { useAppStore } from '../../src/store/useAppStore';
import { transcribeAudio, parseUserAction, parseTaskList, sendAIChat } from '../../src/services/openai';
import { addTransaction } from '../../src/database/queries';
import { addTask } from '../../src/database/healthQueries';
import { scheduleTaskReminder } from '../../src/services/notifications';
import { AIMessage } from '../../src/types';
import * as Crypto from 'expo-crypto';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  savedExpense?: boolean;
}

const LOCAL_HISTORY_LIMIT = 50;

export default function AIScreen() {
  const t = useTranslation();
  const { language, formatAmount, loadFinanceData } = useAppStore();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '0',
      role: 'assistant',
      content: t.ai.greeting,
      timestamp: new Date(),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.5,
        base64: true,
      });

      if (!result.canceled && result.assets[0]?.base64) {
        setSelectedImage(result.assets[0].base64);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image');
    }
  };
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    import('../../src/database/queries').then(({ getSetting }) => {
      getSetting('ai_chat_history').then(hist => {
        if (hist) {
          try {
            const parsed = JSON.parse(hist).map((m: any) => ({
              ...m,
              timestamp: new Date(m.timestamp)
            }));
            setMessages(parsed);
          } catch {}
        }
      });
    });
  }, []);

  useEffect(() => {
    if (messages.length > 1) {
      import('../../src/database/queries').then(({ setSetting }) => {
        setSetting('ai_chat_history', JSON.stringify(messages.slice(-LOCAL_HISTORY_LIMIT)));
      });
    }
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  }, [messages]);

  const getAnonymousContext = () => {
    const { monthlyIncome, monthlyExpense, categoryBreakdown, todayHealth, todayTasks } = useAppStore.getState();
    return JSON.stringify({
      monthlyIncome: Math.round(monthlyIncome / 1000) + 'k UZS',
      monthlyExpense: Math.round(monthlyExpense / 1000) + 'k UZS',
      topCategories: categoryBreakdown.slice(0, 3).map(c => c.category),
      sleepHours: todayHealth?.sleep_hours,
      workoutMin: todayHealth?.workout_minutes,
      calories: todayHealth?.calories_consumed,
      tasksTotal: todayTasks.length,
      tasksDone: todayTasks.filter(t => t.is_done).length,
    });
  };

  const uniqueId = () =>
    Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, Date.now().toString() + Math.random().toString());

  const looksLikeAction = (text: string) => {
    const lower = text.toLowerCase();
    // Only call parseUserAction if the message sounds like a command/action
    return (
      /\d+/.test(text) || // contains numbers → likely financial
      /oldim|topdim|berdim|to'ladim|sotib|xarajat|daromad|uchrashuv|vazifa|qo'sh|ov[qk]at|kaloriy|yedim|ichim/.test(lower)
    );
  };

  const sendMessage = async (text: string, imageBase64?: string) => {
    if (!text.trim() && !imageBase64) return;

    const messageText = replyTo ? `Replying to: "${replyTo}"\n${text}` : text;
    const userMsg: ChatMessage = {
      id: Date.now().toString() + Math.random(),
      role: 'user',
      content: messageText || '📸 Rasm',
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMsg]);
    setInputText('');
    setSelectedImage(null);
    setReplyTo(null);
    setIsLoading(true);

    try {
      const isTaskListRequest = !!imageBase64 && /task|vazifa|reja|ish|daftar|list|todo/i.test(text);
      if (isTaskListRequest && imageBase64) {
        const parsedTasks = await parseTaskList(text, imageBase64);
        for (const parsedTask of parsedTasks) {
          const task = {
            id: await uniqueId(),
            title: parsedTask.title,
            date: parsedTask.date,
            time: parsedTask.time,
            is_done: 0 as const,
            priority: parsedTask.priority,
            category: parsedTask.category,
          };
          await addTask(task);
          await scheduleTaskReminder({ ...task, created_at: '' });
        }
        await useAppStore.getState().loadTodayTasks();
        setMessages(prev => [...prev, {
          id: Date.now().toString() + Math.random(),
          role: 'assistant',
          content: parsedTasks.length
            ? `✅ ${parsedTasks.length} ta task alohida tartibda saqlandi.`
            : 'Rasmda aniq task topilmadi. Iltimos, rasmni tiniqroq yuboring.',
          timestamp: new Date(),
        }]);
      } else {
        // Only parse for action if the message sounds like a command or has an image.
        const parsed = (looksLikeAction(text) || imageBase64)
          ? await parseUserAction(messageText || 'Rasmga qarang', imageBase64)
        : null;

      if (!isTaskListRequest && parsed && parsed.action === 'expense' && parsed.amount) {
        const usdRate = parseInt(useAppStore.getState().settings.usd_rate ?? '12700');
        const amount_uzs = parsed.currency === 'USD' ? parsed.amount * usdRate : parsed.amount;

        await addTransaction({
          id: await uniqueId(),
          type: parsed.type,
          amount: parsed.amount,
          currency: parsed.currency,
          amount_uzs,
          category: parsed.category,
          note: parsed.note,
          date: format(new Date(), 'yyyy-MM-dd'),
        });

        await loadFinanceData();

        const confirmMsg: ChatMessage = {
          id: Date.now().toString() + Math.random(),
          role: 'assistant',
          content: `✅ ${parsed.type === 'expense' ? '📤' : '📥'} **${formatAmount(parsed.amount, parsed.currency)}** — ${parsed.note}\n\n${t.ai.expenseSaved || 'Saqlandi!'}`,
          timestamp: new Date(),
          savedExpense: true,
        };
        setMessages(prev => [...prev, confirmMsg]);
      } else if (!isTaskListRequest && parsed && parsed.action === 'task') {
        const task = {
          id: await uniqueId(),
          title: parsed.title,
          date: parsed.date,
          time: parsed.time,
          is_done: 0,
          priority: parsed.priority,
          category: parsed.category,
        };
        await addTask(task);
        await scheduleTaskReminder({ ...task, created_at: '' });
        await useAppStore.getState().loadTodayTasks();

        const confirmMsg: ChatMessage = {
          id: Date.now().toString() + Math.random(),
          role: 'assistant',
          content: `✅ 📅 Yangi reja qo'shildi:\n**${parsed.title}**${parsed.time ? ` (${parsed.time})` : ''}`,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, confirmMsg]);
      } else if (!isTaskListRequest && parsed && parsed.action === 'food') {
        const { addFoodLog } = await import('../../src/database/healthQueries');
        await addFoodLog({
          id: await uniqueId(),
          health_log_id: format(new Date(), 'yyyy-MM-dd'),
          date: parsed.date,
          food_name: parsed.food_name,
          calories: parsed.calories,
          meal_type: parsed.meal_type,
          photo_uri: imageBase64 ? `data:image/jpeg;base64,${imageBase64}` : undefined,
        });

        const confirmMsg: ChatMessage = {
          id: Date.now().toString() + Math.random(),
          role: 'assistant',
          content: `✅ 🍎 Kaloriya qo'shildi:\n**${parsed.food_name}** — ${parsed.calories} kkal`,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, confirmMsg]);
      } else if (!isTaskListRequest) {
        const history: AIMessage[] = messages.slice(-6).map(m => ({
          role: m.role,
          content: m.content,
        }));

        const response = await sendAIChat(
          messageText || 'Bu nima?',
          history,
          getAnonymousContext(),
          language,
          imageBase64
        );

        const assistantMsg: ChatMessage = {
          id: Date.now().toString() + Math.random(),
          role: 'assistant',
          content: response,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, assistantMsg]);
      }
      }
    } catch (error: any) {
      const errMsg: ChatMessage = {
        id: Date.now().toString() + Math.random(),
        role: 'assistant',
        content: `❌ ${error.message ?? t.common.error}`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMessageMenu = (message: ChatMessage) => {
    Alert.alert('Xabar', undefined, [
      { text: 'Copy', onPress: () => Clipboard.setStringAsync(message.content) },
      { text: 'Reply', onPress: () => setReplyTo(message.content) },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const startRecording = async () => {
    try {
      const permission = await AudioModule.requestRecordingPermissionsAsync();
      if (permission.granted) {
        await setAudioModeAsync({
          allowsRecording: true,
          playsInSilentMode: true,
        });
        await audioRecorder.prepareToRecordAsync();
        audioRecorder.record();
        setIsRecording(true);
      } else {
        Alert.alert('Xatolik', 'Mikrofonga ruxsat berilmadi');
      }
    } catch (err) {
      console.error('Ovoz yozishda xatolik:', err);
    }
  };

  const stopRecording = async () => {
    setIsRecording(false);
    setIsTranscribing(true);
    try {
      await audioRecorder.stop();
      const uri = audioRecorder.uri;
      if (uri) {
        const text = await transcribeAudio(uri);
        sendMessage(text);
      }
    } catch (err: any) {
      Alert.alert('Xatolik', err.message || 'Ovozni aniqlab bo\'lmadi');
    } finally {
      setIsTranscribing(false);
    }
  };

  const formatTime = (date: Date) =>
    date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 70}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.aiAvatar}>
          <Image source={require('../../assets/ai-avatar.png')} style={{ width: 44, height: 44, borderRadius: 22 }} />
        </View>
        <View>
          <Text style={styles.title}>{t.ai.title}</Text>
          <Text style={styles.subtitle}>{t.ai.voiceHint}</Text>
        </View>
      </View>

      {/* Messages */}
      <ScrollView
        ref={scrollRef}
        style={styles.messages}
        contentContainerStyle={styles.messagesContent}
        showsVerticalScrollIndicator={false}
      >
        {messages.map(msg => (
          <TouchableOpacity
            key={msg.id}
            activeOpacity={0.85}
            onLongPress={() => handleMessageMenu(msg)}
            delayLongPress={300}
            style={[
              styles.bubble,
              msg.role === 'user' ? styles.userBubble : styles.aiBubble,
            ]}
          >
            <Text selectable style={[
              styles.bubbleText,
              msg.role === 'user' ? styles.userText : styles.aiText,
            ]}>
              {msg.content}
            </Text>
            <Text style={[
              styles.timestamp,
              msg.role === 'user' ? styles.userTimestamp : styles.aiTimestamp,
            ]}>
              {formatTime(msg.timestamp)}
            </Text>
          </TouchableOpacity>
        ))}

        {(isLoading || isTranscribing) && (
          <View style={[styles.bubble, styles.aiBubble]}>
            <View style={styles.typingDots}>
              <ActivityIndicator size="small" color={COLORS.primary} />
              <Text style={styles.typingText}>
                {isTranscribing ? t.voice.transcribing : t.ai.processing}
              </Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Input Area */}
      <View style={{ backgroundColor: COLORS.bgCard, borderTopWidth: 1, borderTopColor: COLORS.border, padding: SPACING.md }}>
        {!!replyTo && (
          <View style={styles.replyPreview}>
            <Text numberOfLines={1} style={styles.replyText}>Reply: {replyTo}</Text>
            <TouchableOpacity onPress={() => setReplyTo(null)}>
              <Ionicons name="close" size={18} color={COLORS.textMuted} />
            </TouchableOpacity>
          </View>
        )}
        {!!selectedImage && (
          <View style={{ marginBottom: SPACING.sm, flexDirection: 'row' }}>
            <View>
              <Image source={{ uri: `data:image/jpeg;base64,${selectedImage}` }} style={{ width: 80, height: 80, borderRadius: RADIUS.md }} />
              <TouchableOpacity
                style={{ position: 'absolute', top: -5, right: -5, backgroundColor: COLORS.bgCard, borderRadius: 12 }}
                onPress={() => setSelectedImage(null)}
              >
                <Ionicons name="close-circle" size={24} color={COLORS.danger || '#ef4444'} />
              </TouchableOpacity>
            </View>
          </View>
        )}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACING.sm }}>
          <TouchableOpacity onPress={pickImage} style={{ padding: 4 }}>
            <Ionicons name="image" size={24} color={COLORS.textMuted} />
          </TouchableOpacity>
          <TextInput
            style={styles.input}
            value={inputText}
            onChangeText={setInputText}
            placeholder={t.ai.placeholder}
            placeholderTextColor={COLORS.textMuted}
            multiline
            maxLength={500}
            onSubmitEditing={() => sendMessage(inputText, selectedImage || undefined)}
          />
          {inputText.trim() || selectedImage ? (
            <TouchableOpacity
              style={[styles.sendBtn, { backgroundColor: COLORS.primary }]}
              onPress={() => sendMessage(inputText, selectedImage || undefined)}
              disabled={isLoading}
            >
              <Ionicons name="send" size={20} color="#fff" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[
                styles.sendBtn,
                { backgroundColor: isRecording ? COLORS.expense : COLORS.primary }
              ]}
              onPress={isRecording ? stopRecording : startRecording}
              disabled={isTranscribing || isLoading}
            >
              <Ionicons
                name={isRecording ? 'stop' : 'mic'}
                size={22}
                color="#fff"
              />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {isRecording && (
        <View style={styles.recordingBanner}>
          <View style={styles.recordingDot} />
          <Text style={styles.recordingText}>{t.voice.recording}</Text>
          <Text style={styles.recordingHint}>{t.voice.tapToStop}</Text>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.md,
    paddingHorizontal: SPACING.lg, paddingTop: SPACING.xxl + SPACING.lg,
    paddingBottom: SPACING.md, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  aiAvatar: {
    width: 44, height: 44, borderRadius: RADIUS.full,
    backgroundColor: COLORS.primary + '33', alignItems: 'center', justifyContent: 'center',
  },
  title: { fontSize: FONTS.sizes.lg, fontWeight: '700', color: COLORS.textPrimary },
  subtitle: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary },
  messages: { flex: 1 },
  messagesContent: { padding: SPACING.lg, gap: SPACING.sm },
  bubble: {
    maxWidth: '82%', borderRadius: RADIUS.lg, padding: SPACING.md,
    marginBottom: SPACING.xs,
  },
  userBubble: {
    alignSelf: 'flex-end', backgroundColor: COLORS.primary,
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    alignSelf: 'flex-start', backgroundColor: COLORS.bgCard,
    borderBottomLeftRadius: 4, borderWidth: 1, borderColor: COLORS.border,
  },
  bubbleText: { fontSize: FONTS.sizes.md, lineHeight: 22 },
  userText: { color: '#fff' },
  aiText: { color: COLORS.textPrimary },
  timestamp: { fontSize: FONTS.sizes.xs, marginTop: 4 },
  userTimestamp: { color: 'rgba(255,255,255,0.6)', textAlign: 'right' },
  aiTimestamp: { color: COLORS.textMuted },
  typingDots: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  typingText: { fontSize: FONTS.sizes.sm, color: COLORS.textSecondary },
  inputArea: {
    flexDirection: 'row', alignItems: 'flex-end', gap: SPACING.sm,
    padding: SPACING.md, borderTopWidth: 1, borderTopColor: COLORS.border,
    backgroundColor: COLORS.bgCard,
  },
  input: {
    flex: 1, backgroundColor: COLORS.bgInput, borderRadius: RADIUS.xl,
    paddingHorizontal: SPACING.lg, paddingVertical: SPACING.sm,
    color: COLORS.textPrimary, fontSize: FONTS.sizes.md,
    maxHeight: 100, borderWidth: 1, borderColor: COLORS.border,
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: RADIUS.full,
    alignItems: 'center', justifyContent: 'center',
  },
  recordingBanner: {
    flexDirection: 'row', alignItems: 'center', gap: SPACING.sm,
    backgroundColor: COLORS.expense + '22', padding: SPACING.md,
    borderTopWidth: 1, borderTopColor: COLORS.expense + '44',
  },
  recordingDot: {
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: COLORS.expense,
  },
  recordingText: { fontSize: FONTS.sizes.sm, color: COLORS.expense, fontWeight: '600' },
  recordingHint: { fontSize: FONTS.sizes.xs, color: COLORS.textSecondary, marginLeft: 'auto' },
  replyPreview: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: COLORS.bgInput, borderLeftWidth: 3, borderLeftColor: COLORS.primary,
    padding: SPACING.sm, marginBottom: SPACING.sm, borderRadius: RADIUS.sm,
  },
  replyText: { flex: 1, color: COLORS.textSecondary, fontSize: FONTS.sizes.sm, marginRight: SPACING.sm },
});
