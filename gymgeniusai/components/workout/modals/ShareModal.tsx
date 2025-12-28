import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, Share, Alert, ScrollView } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { BrandColors, ComponentStyles } from '@/constants/theme';
import { teamService } from '@/services/teamService';
import { userService } from '@/services/firestoreService';
import { DatePickerModal } from '@/components/shared/DatePickerModal';

interface ShareModalProps {
  visible: boolean;
  communities: any[];
  selectedCommunity: any | null;
  selectedPlayers: string[];
  firebaseTeamData: any;
  communityTeamNames: Record<string, string>;
  firebasePlayerNames: Record<string, string>;
  completedWorkout: any;
  onClose: () => void;
  onCommunitySelect: (community: any) => void;
  onPlayerToggle: (playerId: string) => void;
  onShare: (workout: any, community: any, players: string[], assignedDate?: Date) => void;
  onSetSelectedCommunity: (community: any) => void;
  onSetFirebaseTeamData: (data: any) => void;
  onSetFirebasePlayerNames: (names: Record<string, string>) => void;
  onSetSelectedPlayers: (players: string[] | ((prev: string[]) => string[])) => void;
  initialAssignedDate?: Date;
  isCoach?: boolean;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  visible,
  communities,
  selectedCommunity,
  selectedPlayers,
  firebaseTeamData,
  communityTeamNames,
  firebasePlayerNames,
  completedWorkout,
  onClose,
  onCommunitySelect,
  onPlayerToggle,
  onShare,
  onSetSelectedCommunity,
  onSetFirebaseTeamData,
  onSetFirebasePlayerNames,
  onSetSelectedPlayers,
  initialAssignedDate,
  isCoach = false,
}) => {
  // Debug logging
  React.useEffect(() => {
    if (visible) {
      console.log('📤 ShareModal is now visible');
      console.log('📤 Communities:', communities?.length || 0, communities);
      console.log('📤 Completed workout:', completedWorkout ? 'Yes' : 'No', completedWorkout);
      console.log('📤 Is coach:', isCoach);
      console.log('📤 Selected community:', selectedCommunity);
      console.log('📤 Selected players:', selectedPlayers);
    }
  }, [visible, communities, completedWorkout, isCoach, selectedCommunity, selectedPlayers]);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [assignedDate, setAssignedDate] = useState<Date>(initialAssignedDate || new Date());
  const [loadingPlayerNames, setLoadingPlayerNames] = useState(false);
  const [showQRCode, setShowQRCode] = useState(false);
  
  // Update assigned date when initialAssignedDate changes
  React.useEffect(() => {
    if (initialAssignedDate) {
      setAssignedDate(initialAssignedDate);
    }
  }, [initialAssignedDate]);
  const handleCommunityPress = async (community: any) => {
    console.log('🔍 Community selected:', community);
    console.log('🔍 Community type:', community.type);
    console.log('🔍 Community inviteCode:', community.inviteCode);
    
    // If it's a sports team, try to fetch Firebase data
    if (community.type === 'sports' && community.inviteCode) {
      try {
        console.log('🔍 Fetching team by invite code:', community.inviteCode);
        const team = await teamService.getTeamByInviteCode(community.inviteCode);
        console.log('🔍 Team found:', team);
        console.log('🔍 Team name:', team?.name);
        console.log('🔍 Team members:', team?.members);
        console.log('🔍 Team members length:', team?.members?.length);
        
        if (team) {
          console.log('✅ Using Firebase team data');
          // Use Firebase team data
          const updatedCommunity = {
            ...community,
            name: team.name, // Use Firebase team name
            membersCount: team.members?.filter((m: any) => m.role === 'player').length || 0, // Use Firebase player count
            firebaseTeam: team // Store Firebase team data
          };
          console.log('🔍 Updated community:', updatedCommunity);
          onSetSelectedCommunity(updatedCommunity);
          onSetFirebaseTeamData(team);
          
          // Fetch player names from Firebase
          if (team.members) {
            setLoadingPlayerNames(true);
            const playerNames: Record<string, string> = {};
            const playerMembers = team.members.filter((m: any) => m.role === 'player');
            
            // Fetch all player names in parallel for better performance
            await Promise.all(
              playerMembers.map(async (member: any) => {
                if (member.userId) {
                try {
                  console.log('🔍 Fetching name for player:', member.userId);
                  const userDoc = await userService.getUser(member.userId);
                  console.log('🔍 User doc for player:', userDoc);
                    // Use firstName from Firebase, fallback to displayName first word, then member.name, then 'Player'
                    const playerName = userDoc?.firstName || 
                                      (userDoc?.displayName && userDoc.displayName.split(' ')[0]) ||
                                      member.name || 
                                      'Player';
                    playerNames[member.userId] = playerName;
                    console.log('✅ Player name fetched:', member.userId, '->', playerName);
                } catch (error) {
                  console.error('❌ Error fetching player name:', member.userId, error);
                    // Fallback to member.name if available, otherwise 'Player'
                  playerNames[member.userId] = member.name || 'Player';
                }
              }
              })
            );
            
            onSetFirebasePlayerNames(playerNames);
            setLoadingPlayerNames(false);
            console.log('✅ All player names fetched:', playerNames);
          }
        } else {
          console.log('❌ No team found, using local community data');
          // Fallback to local community data
          onSetSelectedCommunity(community);
        }
      } catch (error) {
        console.error('❌ Error fetching team by invite code:', error);
        // Fallback to local community data
        onSetSelectedCommunity(community);
      }
    } else {
      console.log('❌ Not a sports team or no invite code, using local data');
      // Not a sports team, use local data
      onSetSelectedCommunity(community);
    }
    
    onSetSelectedPlayers([]);
    onCommunitySelect(community);
  };

  const handleDateSelect = (date: Date) => {
    setAssignedDate(date);
    setShowDatePicker(false);
  };

  const handleSharePress = () => {
    if (selectedCommunity && selectedPlayers.length > 0) {
      onShare(completedWorkout, selectedCommunity, selectedPlayers, assignedDate);
      onClose();
    }
  };

  const handleSendBarcode = async () => {
    if (!completedWorkout) {
      Alert.alert('Error', 'No workout data available to share.');
      return;
    }

    try {
      // Create workout share data as JSON string for QR code
      const workoutShareData = {
        type: 'workout',
        workoutId: completedWorkout.id || `workout_${Date.now()}`,
        workoutName: completedWorkout.title || completedWorkout.name || 'Workout',
        exercises: completedWorkout.exercises || [],
        date: assignedDate.toISOString().split('T')[0],
        assignedDate: assignedDate.toISOString(),
        communityId: selectedCommunity?.id,
        communityName: selectedCommunity?.name,
      };

      const qrDataString = JSON.stringify(workoutShareData);
      
      // Generate share message with workout details
      const shareMessage = `🏋️ Workout: ${workoutShareData.workoutName}\n📅 Date: ${workoutShareData.date}\n\n🔑 Workout ID: ${workoutShareData.workoutId}\n\n📊 Workout Data:\n${qrDataString}\n\nScan the QR code in the app to import this workout!`;

      // Automatically share the barcode data
      try {
        await Share.share({
          title: `Share ${workoutShareData.workoutName}`,
          message: shareMessage,
        });
        console.log('✅ Barcode data shared successfully');
      } catch (shareError: any) {
        // User cancelled sharing, but we'll still show the QR code
        if (shareError.message !== 'User did not share') {
          console.error('❌ Error sharing barcode:', shareError);
        }
      }

      // Also show QR code modal so user can scan it
      setShowQRCode(true);
    } catch (error) {
      console.error('❌ Error generating barcode:', error);
      Alert.alert('Error', 'Failed to generate QR code. Please try again.');
    }
  };

  const handleShareQRCode = async () => {
    if (!completedWorkout) {
      return;
    }

    try {
      const workoutShareData = {
        type: 'workout',
        workoutId: completedWorkout.id || `workout_${Date.now()}`,
        workoutName: completedWorkout.title || completedWorkout.name || 'Workout',
        exercises: completedWorkout.exercises || [],
        date: assignedDate.toISOString().split('T')[0],
        assignedDate: assignedDate.toISOString(),
        communityId: selectedCommunity?.id,
        communityName: selectedCommunity?.name,
      };

      const qrDataString = JSON.stringify(workoutShareData);
      const shareMessage = `Workout: ${workoutShareData.workoutName}\nDate: ${workoutShareData.date}\n\nWorkout ID: ${workoutShareData.workoutId}\n\nShare this workout data: ${qrDataString}`;

      await Share.share({
        title: `Share ${workoutShareData.workoutName}`,
        message: shareMessage,
      });
    } catch (error: any) {
      if (error.message !== 'User did not share') {
        console.error('❌ Error sharing QR code:', error);
        Alert.alert('Error', 'Unable to share workout. Please try again.');
      }
    }
  };

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
              {isCoach ? 'Assign Workout' : 'Share Workout'}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={[styles.closeButton, { color: BrandColors.accent }]}>✕</Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView 
            style={styles.modalBody}
            contentContainerStyle={styles.modalBodyContent}
            showsVerticalScrollIndicator={true}
            nestedScrollEnabled={true}
            bounces={false}
          >
            {/* STEP 1: Select Team/Community - Always visible */}
            <Text style={[styles.sectionTitle, { color: BrandColors.text }]}>
              {isCoach ? 'Select Team' : 'Select Community'}
            </Text>
            
            {/* Debug: Show communities count */}
            {console.log('📤 ShareModal rendering - communities:', communities?.length, 'isCoach:', isCoach)}
            
            {/* Show communities with Firebase team data fetched on selection */}
            {communities && Array.isArray(communities) && communities.length > 0 ? (
              communities.map((community) => (
              <TouchableOpacity
                key={community.id}
                style={[
                  ComponentStyles.button.secondary,
                  styles.communityCard,
                  { 
                    backgroundColor: selectedCommunity?.id === community.id ? BrandColors.accent : BrandColors.background,
                    borderColor: selectedCommunity?.id === community.id ? BrandColors.accent : BrandColors.textSecondary + '20',
                    shadowColor: selectedCommunity?.id === community.id ? BrandColors.accent : 'transparent',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: selectedCommunity?.id === community.id ? 0.3 : 0,
                    shadowRadius: selectedCommunity?.id === community.id ? 8 : 0,
                    elevation: selectedCommunity?.id === community.id ? 4 : 0,
                  }
                ]}
                onPress={() => handleCommunityPress(community)}
              >
                <View style={styles.communityInfo}>
                  <Text style={[styles.communityName, { color: BrandColors.text }]}>
                    {(() => {
                      // Use fetched team name if available, otherwise fallback to community name
                      const teamName = communityTeamNames[community.inviteCode || ''] || community.name;
                      return teamName;
                    })()}
                  </Text>
                  <Text style={[styles.communityType, { color: BrandColors.textSecondary }]}>
                    {community.type?.charAt(0).toUpperCase() + community.type?.slice(1)} • {firebaseTeamData && community.inviteCode === firebaseTeamData.inviteCode ? firebaseTeamData.members?.filter((m: any) => m.role === 'player').length : (selectedCommunity?.id === community.id ? selectedCommunity.membersCount : community.membersCount)} members
                  </Text>
                </View>
                {selectedCommunity?.id === community.id && (
                  <Text style={[styles.selectedIndicator, { color: BrandColors.accent }]}>✓</Text>
                )}
              </TouchableOpacity>
              ))
            ) : (
              <View style={styles.emptyStateContainer}>
                <Text style={[styles.emptyStateText, { color: BrandColors.textSecondary, textAlign: 'center', marginTop: 20 }]}>
                  {communities && Array.isArray(communities) ? 'No teams available' : 'Loading teams...'}
                </Text>
                {isCoach && (
                  <Text style={[styles.emptyStateSubtext, { color: BrandColors.textSecondary, textAlign: 'center', marginTop: 8 }]}>
                    Make sure you're part of a team to assign workouts
                  </Text>
                )}
              </View>
            )}
            
            {/* STEP 2: Assignment Date - Always visible for coaches */}
            {isCoach && (
              <>
                <Text style={[styles.sectionTitle, { color: BrandColors.text, marginTop: 20 }]}>
                  Assignment Date
                </Text>
                <TouchableOpacity
                  style={[
                    styles.dateButton,
                    { 
                      backgroundColor: BrandColors.background,
                      borderColor: BrandColors.accent,
                    }
                  ]}
                  onPress={() => setShowDatePicker(true)}
                >
                  <Text style={[styles.dateButtonText, { color: BrandColors.text }]}>
                    📅 {formatSelectedDate()}
                  </Text>
                  <Text style={[styles.dateButtonSubtext, { color: BrandColors.textSecondary }]}>
                    Tap to change date
                  </Text>
                </TouchableOpacity>
              </>
            )}
            
            {/* STEP 3: Select Players - Only visible after team is selected */}
            {selectedCommunity && (
              <>
                <Text style={[styles.sectionTitle, { color: BrandColors.text, marginTop: 20 }]}>
                  Select Players
                </Text>
                
                {loadingPlayerNames ? (
                  <View style={styles.emptyStateContainer}>
                    <Text style={[styles.emptyStateText, { color: BrandColors.textSecondary }]}>
                      Loading player names...
                    </Text>
                  </View>
                ) : (() => {
                  // Deduplicate members by userId to prevent duplicate keys
                  const uniqueMembers = new Map<string, any>();
                  (selectedCommunity?.firebaseTeam?.members || []).forEach((member: any) => {
                    if (member.role === 'player' && member.userId) {
                      if (!uniqueMembers.has(member.userId)) {
                        uniqueMembers.set(member.userId, member);
                      }
                    }
                  });
                  return Array.from(uniqueMembers.values());
                })().length > 0 ? (
                  (() => {
                    // Deduplicate members by userId
                    const uniqueMembers = new Map<string, any>();
                    (selectedCommunity?.firebaseTeam?.members || []).forEach((member: any) => {
                      if (member.role === 'player' && member.userId) {
                        if (!uniqueMembers.has(member.userId)) {
                          uniqueMembers.set(member.userId, member);
                        }
                      }
                    });
                    return Array.from(uniqueMembers.values());
                  })().map((member: any, index: number) => {
                    // Prioritize Firebase-loaded names
                    const playerName = firebasePlayerNames[member.userId] || member.name || 'Player';
                    const memberKey = member.userId || `${playerName}-${index}`;
                    return (
                      <TouchableOpacity
                        key={memberKey}
                        style={[
                          ComponentStyles.button.secondary,
                          styles.playerCard,
                          { 
                            backgroundColor: selectedPlayers.includes(member.userId) ? BrandColors.accent : BrandColors.background,
                            borderColor: selectedPlayers.includes(member.userId) ? BrandColors.accent : BrandColors.textSecondary + '20',
                            shadowColor: selectedPlayers.includes(member.userId) ? BrandColors.accent : 'transparent',
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: selectedPlayers.includes(member.userId) ? 0.3 : 0,
                            shadowRadius: selectedPlayers.includes(member.userId) ? 8 : 0,
                            elevation: selectedPlayers.includes(member.userId) ? 4 : 0,
                          }
                        ]}
                        onPress={() => onPlayerToggle(member.userId)}
                      >
                        <View style={styles.playerInfo}>
                          <Text style={[styles.playerName, { color: BrandColors.text }]}>
                            {playerName}
                          </Text>
                          <Text style={[styles.playerRole, { color: BrandColors.textSecondary }]}>
                            {member.role}
                          </Text>
                        </View>
                        {selectedPlayers.includes(member.userId) && (
                          <Text style={[styles.selectedIndicator, { color: BrandColors.accent }]}>✓</Text>
                        )}
                      </TouchableOpacity>
                    );
                  })
                ) : (
                  <View style={styles.emptyStateContainer}>
                    <Text style={[styles.emptyStateText, { color: BrandColors.textSecondary }]}>
                      No players available
                    </Text>
                    <Text style={[styles.emptyStateSubtext, { color: BrandColors.textSecondary }]}>
                      Players from your team will appear here once they join
                    </Text>
                  </View>
                )}
              </>
            )}
            
            {/* QR Code / Barcode Share Section - Available when workout exists */}
            {completedWorkout && (
              <>
                <Text style={[styles.sectionTitle, { color: BrandColors.text, marginTop: 20 }]}>
                  Share via QR Code
                </Text>
                <TouchableOpacity
                  style={[
                    styles.qrButton,
                    { 
                      backgroundColor: BrandColors.accent,
                      borderColor: BrandColors.accent,
                    }
                  ]}
                  onPress={handleSendBarcode}
                >
                  <Text style={[styles.qrButtonText, { color: BrandColors.background }]}>
                    📷 Generate & Send QR Code
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </ScrollView>
          
          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={[
                styles.onboardingButton,
                { 
                  backgroundColor: BrandColors.background,
                  borderWidth: 2,
                  borderColor: BrandColors.textSecondary + '40',
                  flex: 1
                }
              ]}
              onPress={onClose}
            >
              <Text style={[ComponentStyles.button.secondaryText, { color: BrandColors.textSecondary }]}>
                Cancel
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.onboardingButton,
                { 
                  backgroundColor: selectedCommunity && selectedPlayers.length > 0 ? BrandColors.accent : BrandColors.textSecondary + '20',
                  opacity: selectedCommunity && selectedPlayers.length > 0 ? 1 : 0.5,
                  flex: 1,
                  shadowColor: selectedCommunity && selectedPlayers.length > 0 ? BrandColors.accent : 'transparent',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: selectedCommunity && selectedPlayers.length > 0 ? 0.15 : 0,
                  shadowRadius: selectedCommunity && selectedPlayers.length > 0 ? 4 : 0,
                  elevation: selectedCommunity && selectedPlayers.length > 0 ? 2 : 0,
                }
              ]}
              onPress={handleSharePress}
              disabled={!selectedCommunity || selectedPlayers.length === 0}
            >
              <Text style={[ComponentStyles.button.primaryText, { color: BrandColors.background }]}>
                {(() => {
                  if (selectedPlayers.length === 0) {
                    return `${isCoach ? 'Assign' : 'Send'} to Players`;
                  }
                  
                  // Get player names from firebasePlayerNames or team members
                  const selectedPlayerNames = selectedPlayers.map((playerId) => {
                    // First try to get from firebasePlayerNames
                    if (firebasePlayerNames[playerId]) {
                      return firebasePlayerNames[playerId];
                    }
                    // Fallback to team member name
                    const member = selectedCommunity?.firebaseTeam?.members?.find((m: any) => m.userId === playerId);
                    return member?.name || 'Player';
                  });
                  
                  if (selectedPlayers.length === 1) {
                    return `${isCoach ? 'Assign' : 'Send'} to ${selectedPlayerNames[0]}`;
                  } else if (selectedPlayers.length <= 3) {
                    // Show all names if 3 or fewer
                    return `${isCoach ? 'Assign' : 'Send'} to ${selectedPlayerNames.join(', ')}`;
                  } else {
                    // Show first 2 names and count for more than 3
                    return `${isCoach ? 'Assign' : 'Send'} to ${selectedPlayerNames.slice(0, 2).join(', ')} and ${selectedPlayers.length - 2} more`;
                  }
                })()}
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

      {/* QR Code Modal */}
      <Modal
        visible={showQRCode}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowQRCode(false)}
      >
        <View style={styles.qrModalOverlay}>
          <View style={[styles.qrModalContent, { backgroundColor: BrandColors.surface }]}>
            <View style={styles.qrModalHeader}>
              <Text style={[styles.qrModalTitle, { color: BrandColors.text }]}>
                Workout QR Code
              </Text>
              <TouchableOpacity onPress={() => setShowQRCode(false)}>
                <Text style={[styles.closeButton, { color: BrandColors.accent }]}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <View style={styles.qrCodeContainer}>
              {completedWorkout && (
                <>
                  <QRCode
                    value={JSON.stringify({
                      type: 'workout',
                      workoutId: completedWorkout.id || `workout_${Date.now()}`,
                      workoutName: completedWorkout.title || completedWorkout.name || 'Workout',
                      exercises: completedWorkout.exercises || [],
                      date: assignedDate.toISOString().split('T')[0],
                      assignedDate: assignedDate.toISOString(),
                      communityId: selectedCommunity?.id,
                      communityName: selectedCommunity?.name,
                    })}
                    size={250}
                    color={BrandColors.text}
                    backgroundColor={BrandColors.background}
                  />
                  <Text style={[styles.qrCodeLabel, { color: BrandColors.textSecondary, marginTop: 20 }]}>
                    Scan to share workout
                  </Text>
                  <Text style={[styles.qrCodeSubtext, { color: BrandColors.textSecondary }]}>
                    {completedWorkout.title || completedWorkout.name || 'Workout'}
                  </Text>
                </>
              )}
            </View>

            <View style={styles.qrModalFooter}>
              <TouchableOpacity
                style={[
                  styles.qrShareButton,
                  { backgroundColor: BrandColors.accent }
                ]}
                onPress={handleShareQRCode}
              >
                <Text style={[styles.qrShareButtonText, { color: BrandColors.background }]}>
                  Share QR Code
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    maxHeight: '90%',
    paddingTop: 20,
    flexDirection: 'column',
    height: '90%',
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
    flex: 1,
    minHeight: 200,
  },
  modalBodyContent: {
    padding: 20,
    paddingBottom: 10,
    flexGrow: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  communityCard: {
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  communityInfo: {
    flex: 1,
  },
  communityName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  communityType: {
    fontSize: 14,
  },
  selectedIndicator: {
    fontSize: 20,
    fontWeight: 'bold',
    marginLeft: 12,
  },
  playerCard: {
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  playerInfo: {
    flex: 1,
  },
  playerName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  playerRole: {
    fontSize: 14,
  },
  emptyStateContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyStateSubtext: {
    fontSize: 14,
    textAlign: 'center',
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  onboardingButton: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateButton: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
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
  qrButton: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
    alignItems: 'center',
  },
  qrButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  qrModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  qrModalContent: {
    width: '90%',
    maxWidth: 400,
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
  },
  qrModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: 20,
  },
  qrModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  qrCodeContainer: {
    alignItems: 'center',
    padding: 20,
    backgroundColor: BrandColors.background,
    borderRadius: 12,
    marginBottom: 20,
  },
  qrCodeLabel: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  qrCodeSubtext: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
  qrModalFooter: {
    width: '100%',
  },
  qrShareButton: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrShareButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
