import React, { useState, useEffect } from 'react';
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
  const [scanned, setScanned] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isReady, setIsReady] = useState(false);

  // Reset scanned state when modal becomes visible
  useEffect(() => {
    if (visible) {
      setScanned(false);
      setHasError(false);
      setIsReady(false);
      
      // Only initialize camera after modal is fully visible and permission is confirmed
      if (permission?.granted) {
        // Longer delay to ensure:
        // 1. Modal animation completes (slide animation takes ~300ms)
        // 2. Permission dialog is fully dismissed
        // 3. UI is stable and ready
        const timer = setTimeout(() => {
          setIsReady(true);
        }, 800);
        return () => {
          clearTimeout(timer);
          setIsReady(false);
        };
      } else {
        // If permission not granted, keep camera not ready
        setIsReady(false);
      }
    } else {
      setIsReady(false);
    }
  }, [visible, permission?.granted]);

  const handleBarcodeScanned = ({ type, data }: { type: string; data: string }) => {
    if (!scanned && data) {
      setScanned(true);
      onBarcodeScanned({ type, data });
    }
  };

  const isPermissionGranted = permission && permission.granted;

  return (
    <Modal 
      visible={visible} 
      animationType="fade"
      transparent={false}
      onRequestClose={onClose}
    >
      <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
        <View style={styles.modalHeader}>
          <Text style={[styles.modalTitle, { color: colors.text }]}>Scan Barcode</Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={[styles.closeButton, { color: colors.tint }]}>Cancel</Text>
          </TouchableOpacity>
        </View>
        
        {isPermissionGranted ? (
          <View style={styles.cameraContainer}>
            {!isReady ? (
              <View style={styles.scanningIndicator}>
                <Text style={[styles.scanningText, { color: colors.text }]}>
                  Initializing camera...
                </Text>
                <Text style={[styles.scanningSubtext, { color: colors.icon }]}>
                  Please wait
                </Text>
              </View>
            ) : !scanned && !hasError ? (
              <View style={styles.cameraWrapper}>
                <CameraView
                  style={styles.camera}
                  facing="back"
                  onBarcodeScanned={handleBarcodeScanned}
                  barcodeScannerSettings={{
                    barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e', 'code128', 'code39'],
                  }}
                />
                <View style={styles.scanOverlay} pointerEvents="none">
                  <View style={styles.scanFrame} />
                  <Text style={[styles.scanInstruction, { color: colors.text }]}>
                    Point camera at barcode
                  </Text>
                </View>
              </View>
            ) : scanned ? (
              <View style={styles.scanningIndicator}>
                <Text style={[styles.scanningText, { color: colors.text }]}>
                  Processing barcode...
                </Text>
              </View>
            ) : (
              <View style={styles.scanningIndicator}>
                <Text style={[styles.scanningText, { color: colors.text }]}>
                  Camera Error
                </Text>
                <TouchableOpacity
                  style={[styles.scanButton, { backgroundColor: colors.tint, marginTop: 16 }]}
                  onPress={() => {
                    setHasError(false);
                    setIsReady(false);
                    setTimeout(() => setIsReady(true), 500);
                  }}
                >
                  <Text style={[styles.scanButtonText, { color: '#FFFFFF' }]}>Retry</Text>
                </TouchableOpacity>
              </View>
            )}
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
    backgroundColor: '#000000',
  },
  cameraWrapper: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  camera: {
    flex: 1,
    width: '100%',
    height: '100%',
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
  scanningIndicator: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanningText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  scanningSubtext: {
    fontSize: 14,
  },
});

