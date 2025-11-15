import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { authService } from '@/services/authService';

export default function FirebaseTest() {
  const [email, setEmail] = useState('test@example.com');
  const [password, setPassword] = useState('password123');
  const [loading, setLoading] = useState(false);

  const testSignUp = async () => {
    try {
      setLoading(true);
      console.log('🧪 Testing sign up with:', email);
      
      const result = await authService.signUp(email, password, 'Test User');
      console.log('✅ Sign up successful:', result);
      
      Alert.alert('Success', 'Sign up worked! Check console for details.');
    } catch (error: any) {
      console.error('❌ Sign up failed:', error);
      Alert.alert('Error', `Sign up failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const testSignIn = async () => {
    try {
      setLoading(true);
      console.log('🧪 Testing sign in with:', email);
      
      const result = await authService.signIn(email, password);
      console.log('✅ Sign in successful:', result);
      
      Alert.alert('Success', 'Sign in worked! Check console for details.');
    } catch (error: any) {
      console.error('❌ Sign in failed:', error);
      Alert.alert('Error', `Sign in failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Firebase Test</Text>
      
      <TextInput
        style={styles.input}
        value={email}
        onChangeText={setEmail}
        placeholder="Email"
        keyboardType="email-address"
        autoCapitalize="none"
      />
      
      <TextInput
        style={styles.input}
        value={password}
        onChangeText={setPassword}
        placeholder="Password"
        secureTextEntry
        autoCapitalize="none"
      />
      
      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={testSignUp}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? 'Testing...' : 'Test Sign Up'}
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={testSignIn}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? 'Testing...' : 'Test Sign In'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#000',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 30,
  },
  input: {
    backgroundColor: '#333',
    borderRadius: 8,
    padding: 15,
    fontSize: 16,
    color: '#fff',
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#555',
  },
  button: {
    backgroundColor: '#ff0000',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    marginBottom: 10,
  },
  buttonDisabled: {
    backgroundColor: '#666',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});