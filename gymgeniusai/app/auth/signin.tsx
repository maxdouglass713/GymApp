import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useAuth } from '@/components/AuthProvider';
import { BrandColors, ComponentStyles } from '@/constants/theme';
import { router } from 'expo-router';

export default function SignInScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn, error, markOnboardingComplete } = useAuth();

  const handleSignIn = async () => {
    console.log('🔴 SIGN IN BUTTON PRESSED!');
    console.log('📧 Email:', email);
    console.log('🔒 Password length:', password.length);
    
    if (!email.trim()) {
      console.log('❌ No email entered');
      return;
    }
    
    if (!password.trim()) {
      console.log('❌ No password entered');
      return;
    }

    try {
      setLoading(true);
      console.log('🔄 Attempting sign in...');
      
      await signIn(email.trim(), password);
      console.log('✅ Sign in successful');
      // Navigate straight to home after successful sign in
      router.replace('/(tabs)');
      
      // For Bruce Wayne - skip onboarding and go straight to app
      if (email.trim() === 'brucewayne101011@gmail.com') {
        console.log('🦇 Bruce Wayne detected - skipping onboarding');
        try {
          await markOnboardingComplete();
          console.log('✅ Bruce Wayne onboarding marked complete');
        } catch (error) {
          console.log('⚠️ Could not mark onboarding complete:', error);
        }
        
        // Force navigation to home page
        setTimeout(() => {
          console.log('🚀 Bruce Wayne force navigating to home page...');
          router.replace('/(tabs)');
        }, 500);
      }
      
    } catch (error: any) {
      console.error('❌ Sign in failed:', error);
      console.log('❌ Error message:', error.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };




  const handleSignUp = () => {
    router.push('/auth/signup');
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email address first');
      return;
    }
    
    // For development - just guide user to create account
    Alert.alert(
      'Account Issue', 
      'Having trouble signing in? Let\'s create a fresh account for you.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Create New Account', onPress: () => router.push('/auth/signup') }
      ]
    );
  };

  

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.header}>
          <Text style={styles.title}>Welcome Back</Text>
          <Text style={styles.subtitle}>Sign in to continue your fitness journey</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={[ComponentStyles.input, styles.input]}
              value={email}
              onChangeText={setEmail}
              placeholder="Enter your email"
              placeholderTextColor={BrandColors.textSecondary}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={[ComponentStyles.input, styles.input]}
              value={password}
              onChangeText={setPassword}
              placeholder="Enter your password"
              placeholderTextColor={BrandColors.textSecondary}
              secureTextEntry
              autoCapitalize="none"
            />
          </View>

          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.workingButton, loading && styles.disabledButton]}
            onPress={() => {
              console.log('🔴 SIGN IN BUTTON PRESSED!');
              console.log('🔴 Current email:', email);
              console.log('🔴 Current password length:', password.length);
              handleSignIn();
            }}
            disabled={loading}
            activeOpacity={0.7}
          >
            <Text style={styles.workingButtonText}>
              {loading ? 'Signing In...' : 'Sign In'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.forgotPasswordButton}
            onPress={handleForgotPassword}
          >
            <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
          </TouchableOpacity>

          
         </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Don't have an account? </Text>
          <TouchableOpacity onPress={handleSignUp}>
            <Text style={styles.signUpLink}>Sign Up</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BrandColors.background,
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 48,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: BrandColors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: BrandColors.textSecondary,
    textAlign: 'center',
  },
  form: {
    marginBottom: 32,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: BrandColors.text,
    marginBottom: 8,
  },
  input: {
    fontSize: 16,
  },
  errorContainer: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: BrandColors.error + '20',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: BrandColors.error,
  },
  errorText: {
    color: BrandColors.error,
    fontSize: 14,
    textAlign: 'center',
  },
  signInButton: {
    marginBottom: 16,
  },
  forgotPasswordButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  forgotPasswordText: {
    color: BrandColors.accent,
    fontSize: 16,
    fontWeight: '600',
  },
  resetPasswordButton: {
    marginTop: 16,
  },
  testButton: {
    marginTop: 16,
  },
  bypassButton: {
    marginTop: 16,
    backgroundColor: '#22c55e',
  },
  createAccountButton: {
    marginTop: 16,
  },
  deleteAccountButton: {
    marginTop: 16,
    backgroundColor: '#ef4444',
  },
  simpleTestButton: {
    backgroundColor: '#22c55e',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  simpleTestText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  workingButton: {
    backgroundColor: BrandColors.accent,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  workingButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    backgroundColor: '#666666',
    opacity: 0.6,
  },
  directNavButton: {
    backgroundColor: '#3b82f6',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  directNavText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    color: BrandColors.textSecondary,
    fontSize: 16,
  },
  signUpLink: {
    color: BrandColors.accent,
    fontSize: 16,
    fontWeight: '600',
  },
});
