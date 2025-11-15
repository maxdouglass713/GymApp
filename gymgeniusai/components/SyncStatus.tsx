import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { BrandColors } from '@/constants/theme';
import { syncService } from '@/services/syncService';
import { persistenceService } from '@/services/persistenceService';

export default function SyncStatus() {
  const [syncStatus, setSyncStatus] = useState(syncService.getSyncStatus());
  const [pendingCount, setPendingCount] = useState(0);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  useEffect(() => {
    // Update sync status every second
    const interval = setInterval(() => {
      setSyncStatus(syncService.getSyncStatus());
    }, 1000);

    // Load pending sync count
    loadPendingCount();

    // Listen for sync completion
    syncService.onSyncComplete(() => {
      setLastSyncTime(new Date());
      loadPendingCount();
    });

    return () => clearInterval(interval);
  }, []);

  const loadPendingCount = async () => {
    const pendingSyncs = await persistenceService.loadPendingSyncs();
    setPendingCount(pendingSyncs?.length || 0);
  };

  const handleManualSync = async () => {
    await syncService.forcSync();
    setLastSyncTime(new Date());
  };

  const getStatusColor = () => {
    if (!syncStatus.isOnline) return BrandColors.textSecondary;
    if (syncStatus.syncInProgress) return BrandColors.accent;
    if (pendingCount > 0) return '#FFA500'; // Orange for pending
    return '#00FF00'; // Green for synced
  };

  const getStatusText = () => {
    if (!syncStatus.isOnline) return 'Offline';
    if (syncStatus.syncInProgress) return 'Syncing...';
    if (pendingCount > 0) return `${pendingCount} pending`;
    return 'Synced';
  };

  const getStatusIcon = () => {
    if (!syncStatus.isOnline) return '📱';
    if (syncStatus.syncInProgress) return '🔄';
    if (pendingCount > 0) return '⏳';
    return '✅';
  };

  return (
    <View style={styles.container}>
      <View style={styles.statusContainer}>
        <Text style={styles.statusIcon}>{getStatusIcon()}</Text>
        <Text style={[styles.statusText, { color: getStatusColor() }]}>
          {getStatusText()}
        </Text>
      </View>
      
      {lastSyncTime && (
        <Text style={styles.lastSyncText}>
          Last sync: {lastSyncTime.toLocaleTimeString()}
        </Text>
      )}

      {(pendingCount > 0 || !syncStatus.isOnline) && (
        <TouchableOpacity
          style={[
            styles.syncButton,
            { 
              backgroundColor: syncStatus.isOnline ? BrandColors.accent : BrandColors.textSecondary,
              opacity: syncStatus.syncInProgress ? 0.5 : 1
            }
          ]}
          onPress={handleManualSync}
          disabled={syncStatus.syncInProgress || !syncStatus.isOnline}
        >
          <Text style={styles.syncButtonText}>
            {syncStatus.syncInProgress ? 'Syncing...' : 'Sync Now'}
          </Text>
        </TouchableOpacity>
      )}
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
  },
  lastSyncText: {
    fontSize: 12,
    color: BrandColors.textSecondary,
  },
  syncButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  syncButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: BrandColors.text,
  },
});



