import React from 'react';
import { Tabs } from 'expo-router';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, FONTS } from '../../src/constants/theme';
import { useTranslation } from '../../src/i18n';

type IconName = keyof typeof Ionicons.glyphMap;

function TabIcon({ name, focused }: { name: IconName; focused: boolean }) {
  return (
    <View style={styles.tabItem}>
      <Ionicons
        name={focused ? name : `${name}-outline` as IconName}
        size={26}
        color={focused ? COLORS.primary : COLORS.textMuted}
      />
    </View>
  );
}

export default function TabLayout() {
  const t = useTranslation();

  return (
    <Tabs
      initialRouteName="planner"
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon name="home" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="finance"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon name="wallet" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="planner"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon name="calendar" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="health"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon name="heart" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="ai"
        options={{
          tabBarIcon: ({ focused }) => (
            <TabIcon name="mic" focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: COLORS.bgCard,
    borderTopColor: COLORS.border,
    borderTopWidth: 1,
    height: Platform.OS === 'ios' ? 85 : 65,
    paddingBottom: Platform.OS === 'ios' ? 25 : 8,
    paddingTop: 8,
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  tabLabel: {
    fontSize: FONTS.sizes.xs,
    fontWeight: '500',
  },
});
