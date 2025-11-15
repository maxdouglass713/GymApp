import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { BrandColors } from '@/constants/theme';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { router } from 'expo-router';
import { useUserStore } from '@/stores/userStore';

export default function SelectTypeScreen() {

  const { profile } = useUserStore();
  const isSportsUser =
    profile?.userType === 'institution' ||
    profile?.institutionRole === 'coach' ||
    profile?.institutionRole === 'player';
  
  const communityTypes = [
    {
      id: 'friends',
      title: 'Friends',
      description: 'Create a private community with friends',
      icon: 'person.2',
      color: '#22c55e',
    },
    ...(isSportsUser
      ? [
    {
      id: 'sports',
      title: 'Sports',
      description: 'Join or create a sports team',
            icon: 'football' as const,
      color: '#f59e0b',
    },
        ]
      : []),
  ] as const;
  
  const handleSelectType = (type: string) => {
    switch (type) {
      case 'friends':
        router.push('/community/join-friends-work' as any);
        break;
      case 'sports':
        router.push('/community/sports-role-selection');
        break;
    }
  };
  
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: BrandColors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity
          style={[styles.backButton, { backgroundColor: BrandColors.textSecondary + '20' }]}
          onPress={() => router.back()}
        >
          <IconSymbol name="chevron.left" size={20} color={BrandColors.text} />
        </TouchableOpacity>
        
        <Text style={[styles.title, { color: BrandColors.text }]}>
          Choose Community Type
        </Text>
      </View>
      
      <View style={styles.content}>
        <Text style={[styles.subtitle, { color: BrandColors.textSecondary }]}>
          Select the type of community you'd like to join or create
        </Text>
        
        <View style={styles.typeList}>
          {communityTypes.map((type) => (
            <TouchableOpacity
              key={type.id}
              style={[styles.typeCard, { backgroundColor: BrandColors.background, borderColor: BrandColors.textSecondary + '20' }]}
              onPress={() => handleSelectType(type.id)}
            >
              <View style={styles.typeHeader}>
                <View style={[styles.iconContainer, { backgroundColor: type.color + '20' }]}>
                  <IconSymbol name={type.icon as any} size={32} color={type.color} />
                </View>
                
                <View style={styles.typeInfo}>
                  <Text style={[styles.typeTitle, { color: BrandColors.text }]}>
                    {type.title}
                  </Text>
                  <Text style={[styles.typeDescription, { color: BrandColors.textSecondary }]}>
                    {type.description}
                  </Text>
                </View>
                
                <IconSymbol name="chevron.right" size={16} color={BrandColors.textSecondary} />
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    fontFamily: 'ui-rounded',
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'ui-rounded',
    lineHeight: 24,
    marginBottom: 32,
  },
  typeList: {
    gap: 16,
  },
  typeCard: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
  },
  typeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  typeInfo: {
    flex: 1,
  },
  typeTitle: {
    fontSize: 18,
    fontWeight: '600',
    fontFamily: 'ui-rounded',
    marginBottom: 4,
  },
  typeDescription: {
    fontSize: 14,
    fontFamily: 'ui-rounded',
    lineHeight: 20,
  },
});
