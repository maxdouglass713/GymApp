import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, ScrollView, StyleSheet } from 'react-native';
import { BrandColors } from '@/constants/theme';
import { DatePickerModal } from '@/components/shared/DatePickerModal';

interface Player {
  id: string;
  name: string;
}

interface PlayerSelectionModalProps {
  visible: boolean;
  availablePlayers: Player[];
  selectedPlayers: string[];
  loadingPlayers: boolean;
  onClose: () => void;
  onTogglePlayer: (playerId: string) => void;
  onConfirm: (assignedDate?: Date) => void;
  colors: typeof BrandColors;
}

export const PlayerSelectionModal: React.FC<PlayerSelectionModalProps> = ({
  visible,
  availablePlayers,
  selectedPlayers,
  loadingPlayers,
  onClose,
  onTogglePlayer,
  onConfirm,
  colors,
}) => {
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [assignedDate, setAssignedDate] = useState<Date>(new Date());
  
  const formatSelectedDate = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dateCopy = new Date(assignedDate);
    dateCopy.setHours(0, 0, 0, 0);
    
    if (dateCopy.getTime() === today.getTime()) {
      return 'Today';
    }
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (dateCopy.getTime() === tomorrow.getTime()) {
      return 'Tomorrow';
    }
    
    return assignedDate.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const handleConfirm = () => {
    onConfirm(assignedDate);
  };

  const handleDateSelect = (date: Date) => {
    setAssignedDate(date);
  };
  return (
    <Modal 
      visible={visible} 
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0, 0, 0, 0.7)' }]}>
        <View style={[styles.playerSelectionModal, { backgroundColor: colors.background }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Select Players
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={[styles.closeButton, { color: colors.tint }]}>Cancel</Text>
            </TouchableOpacity>
          </View>

          <Text style={[styles.playerSelectionSubtitle, { color: colors.icon }]}>
            Choose which players to send this meal plan to
          </Text>

          {/* Date Selection */}
          <View style={styles.dateSelectionContainer}>
            <Text style={[styles.dateSelectionLabel, { color: colors.text }]}>
              Assignment Date
            </Text>
            <TouchableOpacity
              style={[
                styles.dateButton,
                { 
                  backgroundColor: colors.surface,
                  borderColor: colors.tint,
                }
              ]}
              onPress={() => setShowDatePicker(true)}
            >
              <Text style={[styles.dateButtonText, { color: colors.text }]}>
                📅 {formatSelectedDate()}
              </Text>
              <Text style={[styles.dateButtonSubtext, { color: colors.icon }]}>
                Tap to change
              </Text>
            </TouchableOpacity>
          </View>

          {loadingPlayers ? (
            <View style={styles.loadingContainer}>
              <Text style={[styles.loadingText, { color: colors.text }]}>Loading players...</Text>
            </View>
          ) : (
            <ScrollView style={styles.playerList}>
              {availablePlayers.map((player) => {
                const isSelected = selectedPlayers.includes(player.id);
                return (
                  <TouchableOpacity
                    key={player.id}
                    style={[
                      styles.playerSelectionItem,
                      { 
                        backgroundColor: isSelected ? colors.tint + '20' : colors.surface,
                        borderColor: isSelected ? colors.tint : colors.icon + '40'
                      }
                    ]}
                    onPress={() => onTogglePlayer(player.id)}
                  >
                    <View style={styles.playerSelectionCheckbox}>
                      {isSelected && (
                        <Text style={[styles.checkmark, { color: colors.tint }]}>✓</Text>
                      )}
                    </View>
                    <Text style={[styles.playerSelectionName, { color: colors.text }]}>
                      {player.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}

          <View style={styles.playerSelectionActions}>
            <TouchableOpacity
              style={[
                styles.sendButton,
                { 
                  backgroundColor: selectedPlayers.length > 0 ? colors.tint : colors.icon,
                  opacity: selectedPlayers.length > 0 ? 1 : 0.5
                }
              ]}
              onPress={onConfirm}
              disabled={selectedPlayers.length === 0 || loadingPlayers}
            >
              <Text style={[styles.sendButtonText, { color: '#000' }]}>
                Send to {selectedPlayers.length} Player{selectedPlayers.length !== 1 ? 's' : ''}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
      
      <DatePickerModal
        visible={showDatePicker}
        onClose={() => setShowDatePicker(false)}
        onDateSelect={handleDateSelect}
        initialDate={assignedDate}
        minDate={new Date()}
      />
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  playerSelectionModal: {
    borderRadius: 12,
    padding: 20,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  closeButton: {
    fontSize: 16,
    fontWeight: '600',
  },
  playerSelectionSubtitle: {
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'center',
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
  },
  playerList: {
    maxHeight: 300,
    marginBottom: 16,
  },
  playerSelectionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
  },
  playerSelectionCheckbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: BrandColors.tint,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkmark: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  playerSelectionName: {
    fontSize: 16,
    flex: 1,
  },
  dateSelectionContainer: {
    marginBottom: 16,
  },
  dateSelectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  dateButton: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  dateButtonText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  dateButtonSubtext: {
    fontSize: 12,
  },
  playerSelectionActions: {
    marginTop: 16,
  },
  sendButton: {
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  sendButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});

