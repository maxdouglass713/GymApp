import { persistenceService, PendingSync } from './persistenceService';
import { workoutService, userService, pointsService } from './firestoreService';

class SyncService {
  private isOnline = true;
  private syncInProgress = false;
  private syncCallbacks: (() => void)[] = [];

  constructor() {
    // Simplified - assume we're always online for now
    this.isOnline = true;
  }

  async isConnected(): Promise<boolean> {
    // Simplified - assume we're always online for now
    return true;
  }

  // Add data to sync queue (for offline mode)
  async queueForSync(type: 'workout' | 'meal' | 'points' | 'profile', data: any, userId: string): Promise<void> {
    await persistenceService.addPendingSync({
      type,
      data,
      userId
    });
    
    // Try to sync immediately if online
    if (this.isOnline) {
      this.syncPendingData();
    }
  }

  // Sync all pending data to Firebase
  async syncPendingData(): Promise<void> {
    if (this.syncInProgress) {
      console.log('🔄 Sync already in progress, skipping...');
      return;
    }

    if (!this.isOnline) {
      console.log('📱 Offline - cannot sync now');
      return;
    }

    this.syncInProgress = true;
    console.log('🔄 Starting sync of pending data...');

    try {
      const pendingSyncs = await persistenceService.loadPendingSyncs();
      
      if (!pendingSyncs || pendingSyncs.length === 0) {
        console.log('✅ No pending syncs found');
        this.syncInProgress = false;
        return;
      }

      console.log(`📤 Found ${pendingSyncs.length} pending syncs`);

      for (const sync of pendingSyncs) {
        try {
          await this.syncSingleItem(sync);
          await persistenceService.removePendingSync(sync.id);
          console.log(`✅ Synced ${sync.type} data`);
        } catch (error) {
          console.error(`❌ Failed to sync ${sync.type}:`, error);
          // Keep the sync in queue for retry later
        }
      }

      // Notify callbacks that sync is complete
      this.syncCallbacks.forEach(callback => callback());
      
    } catch (error) {
      console.error('❌ Error during sync:', error);
    } finally {
      this.syncInProgress = false;
    }
  }

  private async syncSingleItem(sync: PendingSync): Promise<void> {
    switch (sync.type) {
      case 'workout':
        await workoutService.createWorkout(sync.data);
        break;
      case 'meal':
        // await mealService.createMeal(sync.data);
        console.log('🍽️ Meal sync not implemented yet');
        break;
      case 'points':
        await pointsService.addPointEvent(sync.data);
        break;
      case 'profile':
        await userService.updateUser(sync.userId, sync.data);
        break;
      default:
        console.warn(`Unknown sync type: ${sync.type}`);
    }
  }

  // Save data with automatic sync
  async saveWithSync(
    type: 'workout' | 'meal' | 'points' | 'profile',
    data: any,
    userId: string,
    localSaveCallback?: () => void
  ): Promise<void> {
    // Always save locally first
    await persistenceService.autoSave(type, data);
    
    // Call local save callback if provided
    if (localSaveCallback) {
      localSaveCallback();
    }

    // Try to sync to Firebase
    if (this.isOnline) {
      try {
        await this.syncSingleItem({
          id: Date.now().toString(),
          type,
          data,
          userId,
          timestamp: Date.now()
        });
        console.log(`✅ ${type} saved and synced to Firebase`);
      } catch (error) {
        console.error(`❌ Failed to sync ${type} to Firebase:`, error);
        // Add to sync queue for later
        await this.queueForSync(type, data, userId);
      }
    } else {
      // Add to sync queue for when we're back online
      await this.queueForSync(type, data, userId);
      console.log(`📱 ${type} saved locally - will sync when online`);
    }
  }

  // Register callback for sync completion
  onSyncComplete(callback: () => void): void {
    this.syncCallbacks.push(callback);
  }

  // Manual sync trigger
  async forcSync(): Promise<void> {
    console.log('🔄 Force syncing data...');
    await this.syncPendingData();
  }

  // Get sync status
  getSyncStatus(): {
    isOnline: boolean;
    syncInProgress: boolean;
  } {
    return {
      isOnline: this.isOnline,
      syncInProgress: this.syncInProgress
    };
  }

  // Clear all pending syncs (for logout)
  async clearPendingSyncs(): Promise<void> {
    await persistenceService.clearPendingSyncs();
  }
}

export const syncService = new SyncService();
