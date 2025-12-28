import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, Modal, TextInput, StyleSheet, Alert } from 'react-native';
import { BrandColors, ComponentStyles } from '@/constants/theme';
import { useWeightStore } from '@/stores/weightStore';
import { useAuth } from '@/components/AuthProvider';
import { eventBus } from '@/lib/eventBus';
import { useUserStore } from '@/stores/userStore';

interface WeightLogModalProps {
  visible: boolean;
  onClose: () => void;
  onWeightLogged?: () => void;
}

export const WeightLogModal: React.FC<WeightLogModalProps> = ({
  visible,
  onClose,
  onWeightLogged,
}) => {
  const { user } = useAuth();
  const { logWeight, syncWeightsToFirebase, dailyWeights, getWeightForDate, loadWeightsFromFirebase } = useWeightStore();
  const { profile, updateUserDoc, fetchUserDoc } = useUserStore();
  const [weightInput, setWeightInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (visible) {
      // Pre-fill with today's weight if it exists
      const today = new Date();
      const todayWeight = getWeightForDate(today);
      if (todayWeight) {
        setWeightInput(todayWeight.weight.toString());
      } else {
        setWeightInput('');
      }
    }
  }, [visible, getWeightForDate]);

  const handleSubmit = async () => {
    const weight = parseFloat(weightInput);
    
    if (isNaN(weight) || weight <= 0) {
      Alert.alert('Invalid Weight', 'Please enter a valid weight.');
      return;
    }

    if (weight > 1000) {
      Alert.alert('Invalid Weight', 'Please enter a realistic weight value.');
      return;
    }

    setIsSubmitting(true);
    try {
      // Step 1: Log weight to local store
      console.log('⚖️ About to log weight:', weight);
      await logWeight(weight);
      
      // Small delay to ensure store update propagates
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Get weights immediately after logging (before Firebase sync)
      const weightsAfterLog = useWeightStore.getState().dailyWeights;
      console.log('⚖️ Weights after log (before sync):', weightsAfterLog);
      console.log('⚖️ Weights after log length:', weightsAfterLog?.length || 0);
      console.log('⚖️ Weights after log is array?', Array.isArray(weightsAfterLog));
      
      // Step 2: Sync to Firebase
      if (user?.uid) {
        await syncWeightsToFirebase(user.uid);
        console.log('⚖️ Synced to Firebase');
        
        // Step 3: Update profile weight
        if (weightsAfterLog.length > 0) {
          const sorted = [...weightsAfterLog].sort((a, b) => 
            new Date(b.date).getTime() - new Date(a.date).getTime()
          );
          const mostRecent = sorted[0].weight;
          
          await updateUserDoc(user.uid, {
            weight: {
              value: mostRecent,
              unit: profile?.weight?.unit || 'lb',
            },
          });
          await fetchUserDoc(user.uid);
        }
        
      }
      
      // Step 4: Notify other components immediately
      // The store already has the weight, so Zustand will trigger re-renders automatically
      // We'll reload from Firebase later for persistence, but UI updates happen now
      console.log('⚖️ Emitting weightLogged event...');
      eventBus.emit('weightLogged');
      console.log('⚖️ weightLogged event emitted');
      
      // Don't reload from Firebase immediately - it might overwrite local data
      // The store already has the weight, components should use that
      // Firebase sync will happen in background for persistence
      
      Alert.alert('Success', 'Weight logged successfully!', [
        {
          text: 'OK',
          onPress: () => {
            onWeightLogged?.();
            onClose();
          },
        },
      ]);
    } catch (error) {
      console.error('❌ Error logging weight:', error);
      Alert.alert('Error', 'Failed to log weight. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContainer, { backgroundColor: BrandColors.surface }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: BrandColors.text }]}>
              Log Daily Morning Weight
            </Text>
            <TouchableOpacity onPress={onClose} disabled={isSubmitting}>
              <Text style={[styles.closeButton, { color: BrandColors.accent }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.modalContent}>
            <Text style={[styles.description, { color: BrandColors.textSecondary }]}>
              Log your weight to track your progress over time.
            </Text>
            
            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: BrandColors.text }]}>
                Weight (lbs)
              </Text>
              <TextInput
                style={[styles.weightInput, { color: BrandColors.text, borderColor: BrandColors.textSecondary }]}
                value={weightInput}
                onChangeText={setWeightInput}
                placeholder="Enter your weight"
                placeholderTextColor={BrandColors.textSecondary}
                keyboardType="decimal-pad"
                autoFocus
                editable={!isSubmitting}
              />
            </View>

            <TouchableOpacity
              style={[
                ComponentStyles.button.primary,
                styles.submitButton,
                isSubmitting && { opacity: 0.6 },
              ]}
              onPress={handleSubmit}
              disabled={isSubmitting}
            >
              <Text style={ComponentStyles.button.primaryText}>
                {isSubmitting ? 'Logging...' : 'Log Weight'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    width: '90%',
    maxWidth: 400,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: BrandColors.gray700,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  closeButton: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalContent: {
    gap: 20,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
  },
  inputGroup: {
    gap: 8,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  weightInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    fontSize: 18,
    fontWeight: '600',
  },
  submitButton: {
    marginTop: 8,
  },
});

