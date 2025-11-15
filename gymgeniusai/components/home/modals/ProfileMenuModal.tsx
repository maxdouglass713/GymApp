import React from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { BrandColors, Typography, Spacing, BorderRadius } from '@/constants/theme';

interface ProfileMenuModalProps {
  visible: boolean;
  onClose: () => void;
  onEditProfile: () => void;
  onSignOut: () => void;
}

export const ProfileMenuModal: React.FC<ProfileMenuModalProps> = ({
  visible,
  onClose,
  onEditProfile,
  onSignOut,
}) => {
  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={true}
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.menuOverlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <View style={styles.profileMenu}>
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => {
              onClose();
              onEditProfile();
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.menuItemText}>Edit Profile</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => {
              onClose();
              router.push('/(tabs)/profile');
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.menuItemText}>View Profile</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.menuItem, styles.signOutMenuItem]}
            onPress={() => {
              onClose();
              onSignOut();
            }}
            activeOpacity={0.8}
          >
            <Text style={styles.signOutMenuItemText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  menuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  profileMenu: {
    backgroundColor: BrandColors.surface,
    borderTopLeftRadius: BorderRadius.lg,
    borderTopRightRadius: BorderRadius.lg,
    paddingVertical: Spacing.lg,
    paddingHorizontal: Spacing.lg,
  },
  menuItem: {
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
  },
  menuItemText: {
    color: BrandColors.text,
    fontSize: Typography.fontSize.base,
    fontFamily: Typography.fontFamily,
    textAlign: 'center',
  },
  signOutMenuItem: {
    backgroundColor: BrandColors.error + '20',
    borderWidth: 1,
    borderColor: BrandColors.error,
  },
  signOutMenuItemText: {
    color: BrandColors.error,
    fontSize: Typography.fontSize.base,
    fontFamily: Typography.fontFamily,
    textAlign: 'center',
    fontWeight: Typography.fontWeight.semibold,
  },
});

