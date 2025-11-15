import React from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import { BrandColors } from '@/constants/theme';

interface SnapTrackModalProps {
  visible: boolean;
  onClose: () => void;
  onCapture: () => void;
  colors: typeof BrandColors;
}

export const SnapTrackModal: React.FC<SnapTrackModalProps> = ({
  visible,
  onClose,
  onCapture,
  colors,
}) => {
  return (
    <Modal visible={visible} animationType="slide">
      <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
        <View style={styles.modalHeader}>
          <Text style={[styles.modalTitle, { color: colors.text }]}>Snap & Track</Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={[styles.closeButton, { color: colors.tint }]}>Cancel</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.cameraPlaceholder}>
          <Text style={[styles.cameraPlaceholderText, { color: colors.icon }]}>
            📸 Camera Placeholder
          </Text>
          <Text style={[styles.cameraPlaceholderSubtext, { color: colors.icon }]}>
            Point camera at your meal
          </Text>
        </View>
        
        <TouchableOpacity
          style={[styles.captureButton, { backgroundColor: colors.tint }]}
          onPress={onCapture}
        >
          <Text style={[styles.captureButtonText, { color: '#000' }]}>Capture</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 50,
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
  cameraPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  cameraPlaceholderText: {
    fontSize: 24,
    marginBottom: 8,
  },
  cameraPlaceholderSubtext: {
    fontSize: 16,
    textAlign: 'center',
  },
  captureButton: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  captureButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});

