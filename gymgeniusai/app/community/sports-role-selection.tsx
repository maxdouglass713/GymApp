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

export default function SportsRoleSelectionScreen() {
  
  const roleOptions = [
    {
      id: 'coach',
      title: 'Coach',
      description: 'Create and manage a sports team',
      icon: 'person.badge.plus',
      color: '#8b5cf6',
      features: [
        'Create team and invite players',
        'Assign workouts and meal plans',
        'Track team progress',
        'Manage team communication'
      ]
    },
    {
      id: 'player',
      title: 'Player',
      description: 'Join a sports team',
      icon: 'person.2',
      color: '#06b6d4',
      features: [
        'Join team with coach code',
        'Receive assigned workouts',
        'Share progress with team',
        'Participate in team challenges'
      ]
    },
  ];
  
  const handleSelectRole = (role: string) => {
    if (role === 'coach') {
      router.push('/community/create-team');
    } else if (role === 'player') {
      router.push('/community/join-team');
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
          Sports Team Role
        </Text>
      </View>
      
      <View style={styles.content}>
        <Text style={[styles.subtitle, { color: BrandColors.textSecondary }]}>
          Choose your role in the sports team
        </Text>
        
        <View style={styles.roleList}>
          {roleOptions.map((role) => (
            <TouchableOpacity
              key={role.id}
              style={[styles.roleCard, { backgroundColor: BrandColors.background, borderColor: BrandColors.textSecondary + '20' }]}
              onPress={() => handleSelectRole(role.id)}
            >
              <View style={styles.roleHeader}>
                <View style={[styles.iconContainer, { backgroundColor: role.color + '20' }]}>
                  <IconSymbol name={role.icon as any} size={32} color={role.color} />
                </View>
                
                <View style={styles.roleInfo}>
                  <Text style={[styles.roleTitle, { color: BrandColors.text }]}>
                    {role.title}
                  </Text>
                  <Text style={[styles.roleDescription, { color: BrandColors.textSecondary }]}>
                    {role.description}
                  </Text>
                </View>
                
                <IconSymbol name="chevron.right" size={16} color={BrandColors.textSecondary} />
              </View>
              
              <View style={styles.featuresList}>
                {role.features.map((feature, index) => (
                  <View key={index} style={styles.featureItem}>
                    <IconSymbol name="checkmark.circle.fill" size={16} color={role.color} />
                    <Text style={[styles.featureText, { color: BrandColors.textSecondary }]}>
                      {feature}
                    </Text>
                  </View>
                ))}
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
  roleList: {
    gap: 20,
  },
  roleCard: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
  },
  roleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  roleInfo: {
    flex: 1,
  },
  roleTitle: {
    fontSize: 18,
    fontWeight: '600',
    fontFamily: 'ui-rounded',
    marginBottom: 4,
  },
  roleDescription: {
    fontSize: 14,
    fontFamily: 'ui-rounded',
    lineHeight: 20,
  },
  featuresList: {
    gap: 8,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  featureText: {
    fontSize: 14,
    fontFamily: 'ui-rounded',
    marginLeft: 8,
    flex: 1,
  },
});
