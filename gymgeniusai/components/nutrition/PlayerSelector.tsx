import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Pressable } from 'react-native';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { BrandColors } from '@/constants/theme';
import { teamService } from '@/services/teamService';
import { userService } from '@/services/firestoreService';

interface PlayerSelectorProps {
  profile: any;
  colors: typeof BrandColors;
  onPlayerSelect: (playerId: string, playerName: string, targets: { calories: number; protein: number; carbs: number; fat: number }) => void;
}

export const PlayerSelector: React.FC<PlayerSelectorProps> = ({
  profile,
  colors,
  onPlayerSelect,
}) => {
  const isCoach = profile?.userType === 'institution' && profile?.institutionRole !== 'player';
  if (!isCoach) return null;

  const [teamPlayers, setTeamPlayers] = useState<Array<{id: string, name: string}>>([]);
  const [showPlayerDropdown, setShowPlayerDropdown] = useState(false);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [selectedPlayerName, setSelectedPlayerName] = useState<string>('');
  const [selectedPlayerTargets, setSelectedPlayerTargets] = useState<{
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  } | null>(null);
  const [loadingPlayerTargets, setLoadingPlayerTargets] = useState(false);
  const [loadingPlayers, setLoadingPlayers] = useState(false);

  useEffect(() => {
    if (!profile?.teamId) return;

    const unsubscribe = teamService.subscribeToTeam(profile.teamId, async (team) => {
      if (team?.members) {
        const playerMemberIds = team.members
          .filter(m => m.role === 'player')
          .map(m => m.userId);

        if (playerMemberIds.length === 0) {
          setTeamPlayers([]);
          return;
        }

        setLoadingPlayers(true);
        try {
          // Load player names from Firebase
          const players = await Promise.all(
            playerMemberIds.map(async (playerId) => {
              try {
                const playerDoc = await userService.getUser(playerId);
                return {
                  id: playerId,
                  name: playerDoc?.firstName || team.members.find(m => m.userId === playerId)?.name || 'Player'
                };
              } catch (error) {
                console.error(`Error loading player name for ${playerId}:`, error);
                return {
                  id: playerId,
                  name: team.members.find(m => m.userId === playerId)?.name || 'Player'
                };
              }
            })
          );
        setTeamPlayers(players);
        } catch (error) {
          console.error('❌ Error loading team players:', error);
          // Fallback to team member names if Firebase fails
          const fallbackPlayers = team.members
            .filter(m => m.role === 'player')
            .map(m => ({ id: m.userId, name: m.name || 'Player' }));
          setTeamPlayers(fallbackPlayers);
        } finally {
          setLoadingPlayers(false);
        }
      }
    });

    return () => unsubscribe();
  }, [profile?.teamId]);

  const handlePlayerSelect = async (playerId: string, playerName: string) => {
    setSelectedPlayerId(playerId);
    setSelectedPlayerName(playerName);
    setShowPlayerDropdown(false);
    setLoadingPlayerTargets(true);

    try {
      const playerDoc = await userService.getUser(playerId);
      if (playerDoc?.customMacroTargets) {
        const targets = {
          calories: playerDoc.customMacroTargets.calories || 2000,
          protein: playerDoc.customMacroTargets.protein || 150,
          carbs: playerDoc.customMacroTargets.carbs || 200,
          fat: playerDoc.customMacroTargets.fat || 80,
        };
        setSelectedPlayerTargets(targets);
        onPlayerSelect(playerId, playerName, targets);
      } else {
        setSelectedPlayerTargets(null);
      }
    } catch (error) {
      console.error('Error loading player targets:', error);
      setSelectedPlayerTargets(null);
    } finally {
      setLoadingPlayerTargets(false);
    }
  };

  return (
    <>
      <View style={styles.playerSelectorContainer}>
        <Text style={[styles.playerSelectorLabel, { color: colors.text }]}>Select Player:</Text>
        <View style={styles.playerSelectorWrapper}>
          <TouchableOpacity
            style={[styles.playerSelectorButton, { backgroundColor: colors.surface, borderColor: colors.icon }]}
            onPress={() => setShowPlayerDropdown(!showPlayerDropdown)}
          >
            <Text style={[styles.playerSelectorButtonText, { color: selectedPlayerId ? colors.text : colors.icon }]}>
              {selectedPlayerId ? selectedPlayerName : 'Choose a player...'}
            </Text>
            <IconSymbol 
              name={showPlayerDropdown ? "chevron.up" : "chevron.down"} 
              size={16} 
              color={colors.icon} 
            />
          </TouchableOpacity>
          
          {showPlayerDropdown && (
            <View style={[styles.playerDropdownMenu, { backgroundColor: colors.background, borderColor: colors.icon }]}>
              <ScrollView style={styles.playerDropdownList} nestedScrollEnabled={true}>
                {loadingPlayers ? (
                  <View style={styles.loadingContainer}>
                    <Text style={[styles.loadingText, { color: colors.icon }]}>Loading players...</Text>
                  </View>
                ) : teamPlayers.length === 0 ? (
                  <View style={styles.loadingContainer}>
                    <Text style={[styles.loadingText, { color: colors.icon }]}>No players found</Text>
                  </View>
                ) : (
                  teamPlayers.map((player) => (
                  <TouchableOpacity
                    key={player.id}
                    style={[
                      styles.playerDropdownItem,
                      { 
                        backgroundColor: selectedPlayerId === player.id ? colors.tint + '20' : 'transparent',
                        borderBottomColor: colors.icon + '20'
                      }
                    ]}
                    onPress={() => handlePlayerSelect(player.id, player.name)}
                  >
                    <Text style={[
                      styles.playerDropdownItemText, 
                      { color: selectedPlayerId === player.id ? colors.tint : colors.text }
                    ]}>
                      {player.name}
                    </Text>
                    {selectedPlayerId === player.id && (
                      <IconSymbol name="checkmark" size={16} color={colors.tint} />
                    )}
                  </TouchableOpacity>
                  ))
                )}
              </ScrollView>
            </View>
          )}
        </View>
        
        {loadingPlayerTargets && (
          <Text style={[styles.loadingText, { color: colors.icon, marginTop: 8 }]}>Loading targets...</Text>
        )}
        
        {selectedPlayerTargets && selectedPlayerId && (
          <View style={styles.playerTargetsCard}>
            <Text style={[styles.playerTargetsTitle, { color: colors.tint }]}>
              🎯 {selectedPlayerName}'s Daily Targets
            </Text>
            <View style={styles.playerTargetsGrid}>
              <View style={styles.playerTargetItem}>
                <Text style={[styles.playerTargetLabel, { color: colors.icon }]}>Calories</Text>
                <Text style={[styles.playerTargetValue, { color: colors.text }]}>
                  {selectedPlayerTargets.calories} kcal
                </Text>
              </View>
              <View style={styles.playerTargetItem}>
                <Text style={[styles.playerTargetLabel, { color: colors.icon }]}>Protein</Text>
                <Text style={[styles.playerTargetValue, { color: colors.text }]}>
                  {selectedPlayerTargets.protein}g
                </Text>
              </View>
              <View style={styles.playerTargetItem}>
                <Text style={[styles.playerTargetLabel, { color: colors.icon }]}>Carbs</Text>
                <Text style={[styles.playerTargetValue, { color: colors.text }]}>
                  {selectedPlayerTargets.carbs}g
                </Text>
              </View>
              <View style={styles.playerTargetItem}>
                <Text style={[styles.playerTargetLabel, { color: colors.icon }]}>Fat</Text>
                <Text style={[styles.playerTargetValue, { color: colors.text }]}>
                  {selectedPlayerTargets.fat}g
                </Text>
              </View>
            </View>
          </View>
        )}
      </View>
      
      {showPlayerDropdown && (
        <Pressable
          style={styles.dropdownOverlay}
          onPress={() => setShowPlayerDropdown(false)}
        />
      )}
    </>
  );
};

const styles = StyleSheet.create({
  playerSelectorContainer: {
    marginBottom: 20,
    paddingHorizontal: 16,
  },
  playerSelectorLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  playerSelectorWrapper: {
    position: 'relative',
    zIndex: 10,
  },
  playerSelectorButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  playerSelectorButtonText: {
    fontSize: 16,
    flex: 1,
  },
  playerDropdownMenu: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: 4,
    borderRadius: 8,
    borderWidth: 1,
    maxHeight: 200,
    zIndex: 1000,
  },
  playerDropdownList: {
    maxHeight: 200,
  },
  playerDropdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
  },
  playerDropdownItemText: {
    fontSize: 16,
    flex: 1,
  },
  loadingText: {
    fontSize: 14,
  },
  loadingContainer: {
    padding: 16,
    alignItems: 'center',
  },
  playerTargetsCard: {
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    backgroundColor: BrandColors.gray800,
    borderWidth: 1,
    borderColor: BrandColors.textSecondary + '20',
  },
  playerTargetsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  playerTargetsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  playerTargetItem: {
    flex: 1,
    minWidth: '45%',
  },
  playerTargetLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  playerTargetValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  dropdownOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 5,
  },
});

