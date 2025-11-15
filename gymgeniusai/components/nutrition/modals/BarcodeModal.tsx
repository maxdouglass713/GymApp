import React from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import { CameraView, CameraPermissionStatus } from 'expo-camera';
import { BrandColors } from '@/constants/theme';

interface BarcodeModalProps {
  visible: boolean;
  permission: CameraPermissionStatus | null;
  onClose: () => void;
  onBarcodeScanned: (data: { type: string; data: string }) => void;
  onRequestPermission: () => void;
  onMockScan: () => void;
  colors: typeof BrandColors;
}

export const BarcodeModal: React.FC<BarcodeModalProps> = ({
  visible,
  permission,
  onClose,
  onBarcodeScanned,
  onRequestPermission,
  onMockScan,
  colors,
}) => {
  return (
    <Modal visible={visible} animationType="slide">
      <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
        <View style={styles.modalHeader}>
          <Text style={[styles.modalTitle, { color: colors.text }]}>Scan Barcode</Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={[styles.closeButton, { color: colors.tint }]}>Cancel</Text>
          </TouchableOpacity>
        </View>
        
        {permission?.granted ? (
          <View style={styles.cameraContainer}>
            <CameraView
              style={styles.camera}
              facing="back"
              onBarcodeScanned={onBarcodeScanned}
              barcodeScannerSettings={{
                barcodeTypes: ['qr', 'pdf417', 'ean13', 'ean8', 'code128', 'code39'],
              }}
            />
            <View style={styles.scanOverlay}>
              <View style={styles.scanFrame} />
              <Text style={[styles.scanInstruction, { color: colors.text }]}>
                Point camera at barcode
              </Text>
            </View>
          </View>
        ) : (
          <View style={styles.scanPlaceholder}>
            <Text style={[styles.scanPlaceholderText, { color: colors.icon }]}>
              📷 Camera Permission Required
            </Text>
            <Text style={[styles.scanPlaceholderSubtext, { color: colors.icon }]}>
              Please allow camera access to scan barcodes
            </Text>
            <TouchableOpacity
              style={[styles.scanButton, { backgroundColor: colors.tint }]}
              onPress={onRequestPermission}
            >
              <Text style={[styles.scanButtonText, { color: '#FFFFFF' }]}>Grant Permission</Text>
            </TouchableOpacity>
          </View>
        )}
        
        <TouchableOpacity
          style={[styles.mockScanButton, { backgroundColor: colors.icon }]}
          onPress={onMockScan}
        >
          <Text style={[styles.mockScanButtonText, { color: colors.text }]}>Mock Scan (Demo)</Text>
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
  cameraContainer: {
    flex: 1,
    position: 'relative',
  },
  camera: {
    flex: 1,
  },
  scanOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanFrame: {
    width: 250,
    height: 150,
    borderWidth: 2,
    borderColor: '#fff',
    borderRadius: 12,
    backgroundColor: 'transparent',
  },
  scanInstruction: {
    position: 'absolute',
    bottom: 50,
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
  scanPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  scanPlaceholderText: {
    fontSize: 24,
    marginBottom: 8,
  },
  scanPlaceholderSubtext: {
    fontSize: 16,
    textAlign: 'center',
  },
  scanButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
    minHeight: 44,
  },
  scanButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  mockScanButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 12,
    minHeight: 44,
  },
  mockScanButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
});

