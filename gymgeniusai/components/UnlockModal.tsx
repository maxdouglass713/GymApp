import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { BrandColors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { usePointsStore, FEATURE_CATALOG } from '@/stores/pointsStore';
import { useAuth } from './AuthProvider';
import { isFeatureEnabled, checkFeatureOrShowComingSoon } from '@/utils/features/featureFlags';

interface UnlockModalProps {
  visible: boolean;
  onClose: () => void;
  featureKey: string;
  onUnlocked?: () => void;
}

export function UnlockModal({ visible, onClose, featureKey, onUnlocked }: UnlockModalProps) {
  const colorScheme = useColorScheme();
  const colors = BrandColors;
  const { user } = useAuth();
  const { totalPoints, spendPointsToUnlock, isFeatureUnlocked } = usePointsStore();
  
  const cost = FEATURE_CATALOG[featureKey] || 0;
  const isUnlocked = isFeatureUnlocked(featureKey);
  const canAfford = totalPoints >= cost;
  
  const getFeatureName = (key: string) => {
    const names: Record<string, string> = {
      'community_challenges': 'Community Features',
      'community_slot_2': 'Second Community Slot',
      'community_slot_3': 'Third Community Slot',
      'nutrition_planner': 'Nutrition Planner',
      'photo_macros': 'Photo-to-Macros',
      'ai_coach': 'AI Coach',
      'advanced_insights': 'Advanced Insights',
      'form_feedback': 'Form Feedback',
      'workout_plans_pro': 'Pro Workout Plans',
    };
    return names[key] || key;
  };
  
  const handleUnlock = async () => {
    if (user?.uid) {
      const success = await spendPointsToUnlock(featureKey, user.uid);
      if (success) {
        // Don't show alert here for community_challenges - let the main screen handle it
        if (featureKey === 'community_challenges') {
          onUnlocked?.();
          onClose();
        } else {
          Alert.alert(
            'Feature Unlocked!',
            `You've successfully unlocked ${getFeatureName(featureKey)}!`,
            [{ text: 'Great!', onPress: () => {
              onUnlocked?.();
              onClose();
            }}]
          );
        }
      } else {
        Alert.alert(
          'Insufficient Points',
          `You need ${cost} GP to unlock this feature. You currently have ${totalPoints} GP.`,
          [{ text: 'OK' }]
        );
      }
    }
  };
  
  const handleBuyGP = () => {
    // Check feature flag - show "Coming Soon" if disabled
    if (!checkFeatureOrShowComingSoon('gpPurchasing', 'Buy GP Packs')) {
      return;
    }
    // TODO: Implement IAP/RevenueCat integration when feature is enabled
    Alert.alert(
      'Buy GP Packs',
      'GP purchase feature coming soon! Earn more points by completing workouts, logging meals, and maintaining streaks.',
      [{ text: 'OK' }]
    );
  };
  
  if (isUnlocked) {
    return null;
  }
  
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.modal, { backgroundColor: colors.background, borderColor: colors.icon + '20' }]}>
          <Text style={[styles.title, { color: colors.text }]}>
            Unlock {getFeatureName(featureKey)}
          </Text>
          
          <Text style={[styles.description, { color: colors.icon }]}>
            Cost: {cost.toLocaleString()} GP
          </Text>
          
          <Text style={[styles.balance, { color: colors.text }]}>
            Your Balance: {totalPoints.toLocaleString()} GP
          </Text>
          
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[
                styles.button,
                styles.primaryButton,
                { backgroundColor: canAfford ? colors.tint : colors.icon + '40' },
              ]}
              onPress={handleUnlock}
              disabled={!canAfford}
            >
              <Text style={[styles.buttonText, styles.primaryButtonText]}>
                Unlock with Points
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.button, styles.secondaryButton, { borderColor: colors.tint }]}
              onPress={handleBuyGP}
            >
              <Text style={[styles.buttonText, { color: colors.tint }]}>
                Buy GP (Coming Soon)
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.button, styles.cancelButton]}
              onPress={onClose}
            >
              <Text style={[styles.buttonText, { color: colors.icon }]}>
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modal: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    fontFamily: 'ui-rounded',
    textAlign: 'center',
    marginBottom: 16,
  },
  description: {
    fontSize: 18,
    fontFamily: 'ui-rounded',
    textAlign: 'center',
    marginBottom: 8,
  },
  balance: {
    fontSize: 16,
    fontFamily: 'ui-rounded',
    textAlign: 'center',
    marginBottom: 24,
  },
  buttonContainer: {
    gap: 12,
  },
  button: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryButton: {
    // backgroundColor set dynamically
  },
  secondaryButton: {
    borderWidth: 2,
  },
  cancelButton: {
    // No special styling
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'ui-rounded',
  },
  primaryButtonText: {
    color: '#FFFFFF',
  },
});
