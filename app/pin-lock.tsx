import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, Alert, Vibration
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import * as LocalAuthentication from 'expo-local-authentication';
import { COLORS, SPACING, RADIUS, FONTS } from '../src/constants/theme';

const PIN_KEY = 'lifeos_pin';

interface PinLockProps {
  onUnlock: () => void;
}

export default function PinLock({ onUnlock }: PinLockProps) {
  const [pin, setPin] = useState('');
  const [mode, setMode] = useState<'unlock' | 'setup' | 'confirm'>('unlock');
  const [tempPin, setTempPin] = useState('');
  const [savedPin, setSavedPin] = useState<string | null>(null);
  const [shake, setShake] = useState(false);
  const [hasBiometric, setHasBiometric] = useState(false);

  const tryBiometric = useCallback(async () => {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'LifeOS ga kirish',
        fallbackLabel: 'PIN kiriting',
        disableDeviceFallback: false,
        cancelLabel: 'Bekor',
      });
      if (result.success) {
        onUnlock();
      }
    } catch (e) {
      // silently ignore, user can use PIN
    }
  }, [onUnlock]);

  useEffect(() => {
    async function init() {
      const p = await SecureStore.getItemAsync(PIN_KEY);
      if (!p) {
        setMode('setup');
      } else {
        setSavedPin(p);
        setMode('unlock');
        // Check biometric availability
        const compatible = await LocalAuthentication.hasHardwareAsync();
        const enrolled = await LocalAuthentication.isEnrolledAsync();
        if (compatible && enrolled) {
          setHasBiometric(true);
          // Auto-trigger biometric on open
          tryBiometric();
        }
      }
    }
    init();
  }, [tryBiometric]);

  const triggerShake = () => {
    setShake(true);
    Vibration.vibrate([0, 80, 60, 80]);
    setTimeout(() => setShake(false), 600);
    setPin('');
  };

  const handlePress = (digit: string) => {
    if (pin.length >= 4) return;
    const newPin = pin + digit;
    setPin(newPin);

    if (newPin.length === 4) {
      setTimeout(() => {
        if (mode === 'unlock') {
          if (newPin === savedPin) {
            onUnlock();
          } else {
            triggerShake();
          }
        } else if (mode === 'setup') {
          setTempPin(newPin);
          setPin('');
          setMode('confirm');
        } else if (mode === 'confirm') {
          if (newPin === tempPin) {
            SecureStore.setItemAsync(PIN_KEY, newPin).then(() => {
              Alert.alert('✅', 'PIN kod o\'rnatildi!');
              onUnlock();
            });
          } else {
            Alert.alert('Xato', 'PIN kodlar mos kelmadi, qayta kiriting');
            setTempPin('');
            setPin('');
            setMode('setup');
          }
        }
      }, 150);
    }
  };

  const handleDelete = () => {
    setPin(prev => prev.slice(0, -1));
  };

  const dots = [0, 1, 2, 3];
  const keys = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['biometric', '0', 'del'],
  ];

  const title = mode === 'setup'
    ? "4 xonali PIN o'rnating"
    : mode === 'confirm'
    ? 'PIN kodni tasdiqlang'
    : 'PIN kodni kiriting';

  return (
    <View style={styles.container}>
      {/* Logo area */}
      <View style={styles.logoArea}>
        <View style={styles.logoCircle}>
          <Ionicons name="lock-closed" size={32} color={COLORS.primary} />
        </View>
        <Text style={styles.appName}>LifeOS</Text>
        <Text style={styles.subtitle}>{title}</Text>
      </View>

      {/* PIN dots */}
      <View style={[styles.dotsRow, shake && styles.shake]}>
        {dots.map(i => (
          <View
            key={i}
            style={[
              styles.dot,
              pin.length > i && styles.dotFilled,
            ]}
          />
        ))}
      </View>

      {/* Keypad */}
      <View style={styles.keypad}>
        {keys.map((row, ri) => (
          <View key={ri} style={styles.keyRow}>
            {row.map((key, ki) => {
              // Biometric button (bottom-left)
              if (key === 'biometric') {
                if (mode !== 'unlock' || !hasBiometric) {
                  return <View key={ki} style={styles.keyEmpty} />;
                }
                return (
                  <TouchableOpacity
                    key={ki}
                    style={styles.keyBtn}
                    onPress={tryBiometric}
                    activeOpacity={0.6}
                  >
                    <Ionicons name="finger-print" size={28} color={COLORS.primary} />
                  </TouchableOpacity>
                );
              }

              // Delete button
              if (key === 'del') return (
                <TouchableOpacity
                  key={ki}
                  style={styles.keyBtn}
                  onPress={handleDelete}
                  activeOpacity={0.6}
                >
                  <Ionicons name="backspace-outline" size={24} color={COLORS.textSecondary} />
                </TouchableOpacity>
              );

              // Number buttons
              return (
                <TouchableOpacity
                  key={ki}
                  style={styles.keyBtn}
                  onPress={() => handlePress(key)}
                  activeOpacity={0.6}
                >
                  <Text style={styles.keyText}>{key}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        ))}
      </View>

      {/* Biometric hint text */}
      {hasBiometric && mode === 'unlock' && (
        <TouchableOpacity style={styles.biometricHint} onPress={tryBiometric}>
          <Ionicons name="finger-print" size={16} color={COLORS.textMuted} />
          <Text style={styles.biometricHintText}>Barmoq izi bilan kirish</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xxl,
  },
  logoArea: {
    alignItems: 'center',
    marginBottom: SPACING.xxl,
    gap: SPACING.sm,
  },
  logoCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.primary + '22',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  appName: {
    fontSize: FONTS.sizes.xxl,
    fontWeight: '800',
    color: COLORS.textPrimary,
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textSecondary,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: SPACING.lg,
    marginBottom: SPACING.xxl,
  },
  shake: {
    opacity: 0.5,
  },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: COLORS.primary,
    backgroundColor: 'transparent',
  },
  dotFilled: {
    backgroundColor: COLORS.primary,
  },
  keypad: {
    gap: SPACING.md,
    width: '100%',
  },
  keyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: SPACING.md,
  },
  keyBtn: {
    flex: 1,
    aspectRatio: 1.6,
    backgroundColor: COLORS.bgCard,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  keyEmpty: {
    flex: 1,
    aspectRatio: 1.6,
  },
  keyText: {
    fontSize: 24,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  biometricHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginTop: SPACING.xl,
    padding: SPACING.sm,
  },
  biometricHintText: {
    fontSize: FONTS.sizes.sm,
    color: COLORS.textMuted,
  },
});
