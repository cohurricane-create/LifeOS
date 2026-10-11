import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../src/constants/theme';

export default function ReportsScreen() {
  return (
    <View style={styles.container}>
      <Text style={{ color: '#fff' }}>Reports Screen</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg, justifyContent: 'center', alignItems: 'center' }
});
