import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, ScrollView } from 'react-native';
import { BrandColors } from '@/constants/theme';

interface DatePickerModalProps {
  visible: boolean;
  onClose: () => void;
  onDateSelect: (date: Date) => void;
  minDate?: Date;
  maxDate?: Date;
  initialDate?: Date;
}

export const DatePickerModal: React.FC<DatePickerModalProps> = ({
  visible,
  onClose,
  onDateSelect,
  minDate,
  maxDate,
  initialDate,
}) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const [selectedDate, setSelectedDate] = useState<Date>(initialDate || today);

  useEffect(() => {
    if (visible) {
      setSelectedDate(initialDate || today);
    }
  }, [initialDate, visible]);
  
  // Generate dates for the next 30 days (including today)
  const generateDates = () => {
    const dates: Date[] = [];
    const startDate = minDate || today;
    const endDate = maxDate || (() => {
      const future = new Date(today);
      future.setDate(future.getDate() + 30);
      return future;
    })();
    
    const current = new Date(startDate);
    while (current <= endDate) {
      dates.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    return dates;
  };

  const dates = generateDates();

  const formatDate = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dateCopy = new Date(date);
    dateCopy.setHours(0, 0, 0, 0);
    
    if (dateCopy.getTime() === today.getTime()) {
      return 'Today';
    }
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (dateCopy.getTime() === tomorrow.getTime()) {
      return 'Tomorrow';
    }
    
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const isToday = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dateCopy = new Date(date);
    dateCopy.setHours(0, 0, 0, 0);
    return dateCopy.getTime() === today.getTime();
  };

  const handleConfirm = () => {
    onDateSelect(selectedDate);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: BrandColors.surface }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: BrandColors.text }]}>
              Select Date
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={[styles.closeButton, { color: BrandColors.accent }]}>✕</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.modalBody}>
            <Text style={[styles.sectionTitle, { color: BrandColors.textSecondary }]}>
              Choose which day to assign this to:
            </Text>
            
            <ScrollView style={styles.datesList} showsVerticalScrollIndicator={false}>
              {dates.map((date) => {
                const dateCopy = new Date(date);
                dateCopy.setHours(0, 0, 0, 0);
                const selectedCopy = new Date(selectedDate);
                selectedCopy.setHours(0, 0, 0, 0);
                const isSelected = dateCopy.getTime() === selectedCopy.getTime();
                
                return (
                  <TouchableOpacity
                    key={date.toISOString()}
                    style={[
                      styles.dateOption,
                      { 
                        backgroundColor: isSelected ? BrandColors.accent : BrandColors.background,
                        borderColor: isSelected ? BrandColors.accent : BrandColors.textSecondary + '20',
                      }
                    ]}
                    onPress={() => setSelectedDate(date)}
                  >
                    <View style={styles.dateInfo}>
                      <Text style={[
                        styles.dateText,
                        { color: isSelected ? '#000' : BrandColors.text }
                      ]}>
                        {formatDate(date)}
                      </Text>
                      {isToday(date) && (
                        <Text style={[styles.todayBadge, { color: BrandColors.accent }]}>
                          Today
                        </Text>
                      )}
                    </View>
                    {isSelected && (
                      <Text style={[styles.selectedIndicator, { color: '#000' }]}>✓</Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
          
          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={[
                styles.button,
                { 
                  backgroundColor: BrandColors.background,
                  borderWidth: 2,
                  borderColor: BrandColors.textSecondary + '40',
                  flex: 1
                }
              ]}
              onPress={onClose}
            >
              <Text style={[styles.buttonText, { color: BrandColors.textSecondary }]}>
                Cancel
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.button,
                { 
                  backgroundColor: BrandColors.accent,
                  flex: 1,
                }
              ]}
              onPress={handleConfirm}
            >
              <Text style={[styles.buttonText, { color: '#000', fontWeight: 'bold' }]}>
                Select Date
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
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
    paddingTop: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  closeButton: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  modalBody: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 14,
    marginBottom: 16,
  },
  datesList: {
    maxHeight: 300,
  },
  dateOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
  },
  dateInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateText: {
    fontSize: 16,
    fontWeight: '600',
  },
  todayBadge: {
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: BrandColors.accent + '20',
  },
  selectedIndicator: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  button: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

