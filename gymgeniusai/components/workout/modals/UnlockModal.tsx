import React from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import { BrandColors, ComponentStyles } from '@/constants/theme';

interface UnlockModalProps {
  visible: boolean;
  onClose: () => void;
  onWatchVideos: () => void;
}

export const UnlockModal: React.FC<UnlockModalProps> = ({
  visible,
  onClose,
  onWatchVideos,
}) => {
  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: BrandColors.background }]}>
          <Text style={[styles.modalTitle, { color: BrandColors.text }]}>Feature Locked</Text>
          <Text style={[styles.modalText, { color: BrandColors.textSecondary }]}>
            This feature is locked. Watch videos to unlock community features!
          </Text>
          <TouchableOpacity
            style={[ComponentStyles.button.primary, styles.modalButton]}
            onPress={onWatchVideos}
          >
            <Text style={[ComponentStyles.button.primaryText, { color: '#000' }]}>Watch Videos</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[ComponentStyles.button.secondary, styles.modalButton]}
            onPress={onClose}
          >
            <Text style={[ComponentStyles.button.secondaryText, { color: BrandColors.text }]}>Cancel</Text>
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
  },
  modalContent: {
    borderRadius: 12,
    padding: 24,
    width: '85%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  modalText: {
    fontSize: 16,
    marginBottom: 24,
    textAlign: 'center',
  },
  modalButton: {
    marginBottom: 12,
  },
});

