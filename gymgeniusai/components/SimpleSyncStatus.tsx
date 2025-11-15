import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { BrandColors } from '@/constants/theme';

export default function SimpleSyncStatus() {
  return (
    <View style={styles.container}>
      <View style={styles.statusContainer}>
        <Text style={styles.statusIcon}>✅</Text>
        <Text style={styles.statusText}>
          Data Saved Locally
        </Text>
      </View>
      
      <Text style={styles.infoText}>
        All workout data is automatically saved
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: BrandColors.background,
    borderBottomWidth: 1,
    borderBottomColor: BrandColors.gray800,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#00FF00',
  },
  infoText: {
    fontSize: 12,
    color: BrandColors.textSecondary,
  },
});



