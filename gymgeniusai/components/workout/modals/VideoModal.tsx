import React from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import { BrandColors, ComponentStyles } from '@/constants/theme';

interface VideoModalProps {
  visible: boolean;
  onClose: () => void;
  onBrowseVideos: () => void;
}

export const VideoModal: React.FC<VideoModalProps> = ({
  visible,
  onClose,
  onBrowseVideos,
}) => {
  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: BrandColors.background }]}>
          <Text style={[styles.modalTitle, { color: BrandColors.text }]}>Watch Videos</Text>
          <Text style={[styles.modalText, { color: BrandColors.textSecondary }]}>
            Watch educational videos to unlock new features and earn points!
          </Text>
          <TouchableOpacity
            style={[ComponentStyles.button.primary, styles.modalButton]}
            onPress={onBrowseVideos}
          >
            <Text style={[ComponentStyles.button.primaryText, { color: '#000' }]}>Browse Videos</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[ComponentStyles.button.secondary, styles.modalButton]}
            onPress={onClose}
          >
            <Text style={[ComponentStyles.button.secondaryText, { color: BrandColors.text }]}>Close</Text>
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

