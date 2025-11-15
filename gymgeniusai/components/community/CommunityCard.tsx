import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { BrandColors, ComponentStyles } from '@/constants/theme';
import { getCommunityTypeIcon, getCommunityTypeColor } from '@/utils/community/communityHelpers';

interface CommunityCardProps {
  community: {
    id: string;
    name: string;
    type: string;
    membersCount: number;
  };
  firebaseTeamData?: {
    name: string;
    members?: any[];
  };
  onSwitchCommunity: () => void;
  onLeaveCommunity: () => void;
}

export const CommunityCard: React.FC<CommunityCardProps> = ({
  community,
  firebaseTeamData,
  onSwitchCommunity,
  onLeaveCommunity,
}) => {
  return (
    <View style={[ComponentStyles.card, styles.communityCard]}>
      <View style={styles.communityCardHeader}>
        <View style={styles.communityInfo}>
          <IconSymbol
            name={getCommunityTypeIcon(community.type)}
            size={24}
            color={getCommunityTypeColor(community.type)}
          />
          <View style={styles.communityDetails}>
            <Text style={[styles.communityCardName, { color: BrandColors.text }]}>
              {firebaseTeamData?.name || community.name}
            </Text>
            <Text style={[styles.communityCardType, { color: BrandColors.textSecondary }]}>
              {community.type ? community.type.charAt(0).toUpperCase() + community.type.slice(1) : 'Community'} • {firebaseTeamData?.members?.length || community.membersCount || community.memberNames?.length || 0} members
            </Text>
          </View>
        </View>
        
        <TouchableOpacity
          style={[styles.menuButton, { backgroundColor: BrandColors.gray800 }]}
          onPress={() => {
            Alert.alert(
              'Community Options',
              'What would you like to do?',
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Switch Community', onPress: onSwitchCommunity },
                { text: 'Leave Community', onPress: onLeaveCommunity, style: 'destructive' },
              ]
            );
          }}
        >
          <IconSymbol name="ellipsis" size={16} color={BrandColors.textSecondary} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  communityCard: {
    marginBottom: 16,
  },
  communityCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  communityInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  communityDetails: {
    marginLeft: 12,
    flex: 1,
  },
  communityCardName: {
    fontSize: 18,
    fontWeight: '600',
    fontFamily: 'ui-rounded',
    marginBottom: 4,
  },
  communityCardType: {
    fontSize: 14,
    fontFamily: 'ui-rounded',
  },
  menuButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

