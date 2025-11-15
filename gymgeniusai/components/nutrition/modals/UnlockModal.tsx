import React from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import { BrandColors } from '@/constants/theme';

interface UnlockModalProps {
  visible: boolean;
  totalPoints: number;
  onClose: () => void;
  onUnlock: () => void;
  colors: typeof BrandColors;
}

export const UnlockModal: React.FC<UnlockModalProps> = ({
  visible,
  totalPoints,
  onClose,
  onUnlock,
  colors,
}) => {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={styles.modalOverlay}>
        <View style={[styles.unlockModalContent, { backgroundColor: colors.background }]}>
          <Text style={[styles.unlockModalTitle, { color: colors.text }]}>
            Snap & Track is locked
          </Text>
          <Text style={[styles.unlockModalText, { color: colors.icon }]}>
            Take a photo of your meal and let AI estimate macros.{'\n'}Cost: 5,000 V{'\n'}You have: {totalPoints.toLocaleString()} V
          </Text>
          
          <View style={styles.unlockModalButtons}>
            <TouchableOpacity
              style={[styles.unlockModalButton, styles.cancelButton, { borderColor: colors.icon }]}
              onPress={onClose}
            >
              <Text style={[styles.unlockModalButtonText, { color: colors.text }]}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.unlockModalButton,
                styles.unlockButton,
                { backgroundColor: totalPoints >= 5000 ? colors.tint : colors.icon }
              ]}
              onPress={onUnlock}
              disabled={totalPoints < 5000}
            >
              <Text style={[styles.unlockModalButtonText, { color: totalPoints >= 5000 ? '#000' : colors.text }]}>
                Unlock with Points
              </Text>
            </TouchableOpacity>
          </View>
          
          <TouchableOpacity
            style={styles.buyPointsButton}
            onPress={() => {
              onClose();
              // This will be handled by parent
            }}
          >
            <Text style={[styles.buyPointsText, { color: colors.tint }]}>Buy V (Coming Soon)</Text>
          </TouchableOpacity>
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
    paddingHorizontal: 20,
  },
  unlockModalContent: {
    borderRadius: 12,
    padding: 20,
    width: '100%',
    maxWidth: 300,
  },
  unlockModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 12,
  },
  unlockModalText: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  unlockModalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  unlockModalButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButton: {
    borderWidth: 1,
  },
  unlockButton: {
    // backgroundColor set dynamically
  },
  unlockModalButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  buyPointsButton: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  buyPointsText: {
    fontSize: 14,
    fontWeight: '500',
  },
});

