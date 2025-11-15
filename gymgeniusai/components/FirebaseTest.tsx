import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useAuth } from './AuthProvider';
import { userService } from '../services/firestoreService';

export const FirebaseTest: React.FC = () => {
  const { user, signIn, signUp, signOut } = useAuth();
  const [testResult, setTestResult] = useState<string>('');

  const testFirestoreConnection = async () => {
    if (!user) {
      Alert.alert('Error', 'Please sign in first');
      return;
    }

    try {
      // Test reading user document
      const userDoc = await userService.getUser(user.uid);
      
      if (userDoc) {
        setTestResult(`✅ Firestore connected! User: ${userDoc.firstName}`);
      } else {
        setTestResult('⚠️ Firestore connected but no user document found');
      }
    } catch (error: any) {
      setTestResult(`❌ Firestore error: ${error.message}`);
    }
  };

  const testSignIn = async () => {
    try {
      await signIn('test@example.com', 'password123');
    } catch (error: any) {
      Alert.alert('Sign In Error', error.message);
    }
  };

  const testSignUp = async () => {
    try {
      await signUp('test@example.com', 'password123', 'Test User');
    } catch (error: any) {
      Alert.alert('Sign Up Error', error.message);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Firebase Connection Test</Text>
      
      <View style={styles.status}>
        <Text style={styles.statusText}>
          Status: {user ? `✅ Signed in as ${user.email}` : '❌ Not signed in'}
        </Text>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.button} onPress={testSignUp}>
          <Text style={styles.buttonText}>Test Sign Up</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.button} onPress={testSignIn}>
          <Text style={styles.buttonText}>Test Sign In</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.button} onPress={testFirestoreConnection}>
          <Text style={styles.buttonText}>Test Firestore</Text>
        </TouchableOpacity>
        
        {user && (
          <TouchableOpacity style={styles.button} onPress={signOut}>
            <Text style={styles.buttonText}>Sign Out</Text>
          </TouchableOpacity>
        )}
      </View>

      {testResult ? (
        <View style={styles.result}>
          <Text style={styles.resultText}>{testResult}</Text>
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#000',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 30,
  },
  status: {
    backgroundColor: '#1a1a1a',
    padding: 15,
    borderRadius: 8,
    marginBottom: 20,
  },
  statusText: {
    color: '#fff',
    fontSize: 16,
    textAlign: 'center',
  },
  buttonContainer: {
    gap: 15,
  },
  button: {
    backgroundColor: '#ff0000',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  result: {
    backgroundColor: '#1a1a1a',
    padding: 15,
    borderRadius: 8,
    marginTop: 20,
  },
  resultText: {
    color: '#fff',
    fontSize: 14,
    textAlign: 'center',
  },
});

