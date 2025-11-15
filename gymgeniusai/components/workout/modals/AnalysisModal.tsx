import React from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import { BrandColors, ComponentStyles } from '@/constants/theme';

interface AnalysisModalProps {
  visible: boolean;
  onClose: () => void;
  onViewAnalysis: () => void;
}

export const AnalysisModal: React.FC<AnalysisModalProps> = ({
  visible,
  onClose,
  onViewAnalysis,
}) => {
  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: BrandColors.background }]}>
          <Text style={[styles.modalTitle, { color: BrandColors.text }]}>Workout Analysis</Text>
          <Text style={[styles.modalText, { color: BrandColors.textSecondary }]}>
            Get detailed analysis of your workout performance and progress.
          </Text>
          <TouchableOpacity
            style={[ComponentStyles.button.primary, styles.modalButton]}
            onPress={onViewAnalysis}
          >
            <Text style={[ComponentStyles.button.primaryText, { color: '#000' }]}>View Analysis</Text>
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

