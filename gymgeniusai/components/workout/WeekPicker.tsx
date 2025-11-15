import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { BrandColors } from '@/constants/theme';

interface WeekPickerProps {
  selectedDate: Date;
  weekOffset: number;
  onDateSelect: (date: Date) => void;
  onWeekOffsetChange: (offset: number | ((prev: number) => number)) => void;
}

export const WeekPicker: React.FC<WeekPickerProps> = ({
  selectedDate,
  weekOffset,
  onDateSelect,
  onWeekOffsetChange,
}) => {
  const today = new Date();
  
  // Calculate the start of the current week (Sunday)
  const currentWeekStart = new Date(today);
  currentWeekStart.setDate(today.getDate() - today.getDay());
  
  // Apply week offset to get the displayed week
  const displayedWeekStart = new Date(currentWeekStart);
  displayedWeekStart.setDate(currentWeekStart.getDate() + (weekOffset * 7));
  
  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(displayedWeekStart);
    date.setDate(displayedWeekStart.getDate() + i);
    return date;
  });

  // Get month and year for the week display
  const firstDay = weekDays[0];
  const lastDay = weekDays[6];
  const monthYearText = firstDay.getMonth() === lastDay.getMonth()
    ? firstDay.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : `${firstDay.toLocaleDateString('en-US', { month: 'short' })} - ${lastDay.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`;

  // Create swipe gesture
  const swipeGesture = Gesture.Pan()
    .onEnd((event) => {
      if (event.translationX > 50) {
        // Swipe right - go to previous week
        onWeekOffsetChange((prev: number) => prev - 1);
      } else if (event.translationX < -50) {
        // Swipe left - go to next week
        onWeekOffsetChange((prev: number) => prev + 1);
      }
    });

  return (
    <View style={styles.weekPickerContainer}>
      <View style={styles.weekHeader}>
        <TouchableOpacity
          style={styles.weekNavButton}
          onPress={() => onWeekOffsetChange((prev: number) => prev - 1)}
        >
          <Text style={[styles.weekNavButtonText, { color: BrandColors.accent }]}>←</Text>
        </TouchableOpacity>
        
        <View style={styles.weekHeaderCenter}>
          <Text style={[styles.monthYearText, { color: BrandColors.text }]}>
            {monthYearText}
          </Text>
          {weekOffset !== 0 && (
            <TouchableOpacity
              style={styles.todayButton}
              onPress={() => onWeekOffsetChange(0)}
            >
              <Text style={[styles.todayButtonText, { color: BrandColors.accent }]}>Today</Text>
            </TouchableOpacity>
          )}
        </View>
        
        <TouchableOpacity
          style={styles.weekNavButton}
          onPress={() => onWeekOffsetChange((prev: number) => prev + 1)}
        >
          <Text style={[styles.weekNavButtonText, { color: BrandColors.accent }]}>→</Text>
        </TouchableOpacity>
      </View>
      
      <GestureDetector gesture={swipeGesture}>
        <View style={styles.weekPicker}>
          <View style={styles.weekDaysContainer}>
            {weekDays.map((date, index) => {
              const isSelected = selectedDate.toDateString() === date.toDateString();
              const isToday = date.toDateString() === today.toDateString();
              
              return (
                <TouchableOpacity
                  key={`day-${date.toISOString()}`}
                  style={[
                    styles.dayButton,
                    { 
                      backgroundColor: isSelected ? BrandColors.accent : BrandColors.gray800,
                      borderColor: BrandColors.textSecondary,
                      flex: 1, // Make each day take equal space
                      minWidth: 0, // Allow flex to work properly
                    }
                  ]}
                  onPress={() => onDateSelect(date)}
                >
                  <Text style={[
                    styles.dayText,
                    { color: isSelected ? '#000' : BrandColors.text }
                  ]}>
                    {date.toLocaleDateString('en-US', { weekday: 'short' })}
                  </Text>
                  <Text style={[
                    styles.dayNumber,
                    { color: isSelected ? '#000' : (isToday ? BrandColors.accent : BrandColors.text) }
                  ]}>
                    {date.getDate()}
                  </Text>
                  {isToday && (
                    <View style={[styles.todayIndicator, { backgroundColor: BrandColors.accent }]} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </GestureDetector>
    </View>
  );
};

const styles = StyleSheet.create({
  weekPickerContainer: {
    marginBottom: 16,
  },
  weekHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  weekNavButton: {
    padding: 8,
  },
  weekNavButtonText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  weekHeaderCenter: {
    flex: 1,
    alignItems: 'center',
  },
  monthYearText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  todayButton: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  todayButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  weekPicker: {
    paddingHorizontal: 8,
  },
  weekDaysContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 4,
  },
  dayButton: {
    height: 70,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    position: 'relative',
  },
  dayText: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 4,
  },
  dayNumber: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  todayIndicator: {
    position: 'absolute',
    bottom: 4,
    width: 4,
    height: 4,
    borderRadius: 2,
  },
});

