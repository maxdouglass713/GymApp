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
  Modal,
} from 'react-native';
import { useAuth } from '@/components/AuthProvider';
import { BrandColors, ComponentStyles } from '@/constants/theme';
import { router } from 'expo-router';
import { authService } from '@/services/authService';

export default function SignInScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
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

  const handleForgotPassword = () => {
    // Pre-fill with email from sign in form if available
    setResetEmail(email.trim());
    setShowForgotPassword(true);
  };

  const handleSendResetEmail = async () => {
    if (!resetEmail.trim()) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(resetEmail.trim())) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    try {
      setResetLoading(true);
      await authService.resetPassword(resetEmail.trim());
      
      setShowForgotPassword(false);
      setResetEmail('');
      
      Alert.alert(
        'Check Your Email! 📧',
        `We've sent a password reset link to ${resetEmail.trim()}. Check your inbox and follow the instructions to reset your password.`,
        [{ text: 'OK' }]
      );
    } catch (error: any) {
      console.error('❌ Password reset error:', error);
      
      // Handle specific errors
      if (error.message.includes('No account found')) {
        Alert.alert(
          'Email Not Found',
          'No account exists with this email address. Would you like to create one?',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Sign Up', onPress: () => {
              setShowForgotPassword(false);
              router.push('/auth/signup');
            }}
          ]
        );
      } else {
        Alert.alert('Error', error.message || 'Failed to send reset email. Please try again.');
      }
    } finally {
      setResetLoading(false);
    }
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

          {/* Forgot Password button */}
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

      {/* Forgot Password Modal */}
      <Modal
        visible={showForgotPassword}
        transparent
        animationType="fade"
        onRequestClose={() => setShowForgotPassword(false)}
      >
        <KeyboardAvoidingView 
          style={styles.modalOverlay}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <TouchableOpacity 
            style={styles.modalDismissArea} 
            activeOpacity={1} 
            onPress={() => setShowForgotPassword(false)}
          />
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Reset Password</Text>
            <Text style={styles.modalSubtitle}>
              Enter your email address and we'll send you a link to reset your password.
            </Text>
            
            <TextInput
              style={styles.modalInput}
              value={resetEmail}
              onChangeText={setResetEmail}
              placeholder="Enter your email"
              placeholderTextColor={BrandColors.textSecondary}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoFocus
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => {
                  setShowForgotPassword(false);
                  setResetEmail('');
                }}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalSendButton, resetLoading && styles.disabledButton]}
                onPress={handleSendResetEmail}
                disabled={resetLoading}
              >
                <Text style={styles.modalSendText}>
                  {resetLoading ? 'Sending...' : 'Send Reset Link'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
          <TouchableOpacity 
            style={styles.modalDismissArea} 
            activeOpacity={1} 
            onPress={() => setShowForgotPassword(false)}
          />
        </KeyboardAvoidingView>
      </Modal>
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
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  modalDismissArea: {
    flex: 1,
    width: '100%',
  },
  modalContent: {
    backgroundColor: BrandColors.cardBackground || '#1a1f35',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: BrandColors.border || '#2a3050',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: BrandColors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 14,
    color: BrandColors.textSecondary,
    marginBottom: 24,
    textAlign: 'center',
    lineHeight: 20,
  },
  modalInput: {
    backgroundColor: BrandColors.background,
    borderRadius: 8,
    padding: 16,
    fontSize: 16,
    color: BrandColors.text,
    borderWidth: 1,
    borderColor: BrandColors.border || '#2a3050',
    marginBottom: 24,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: BrandColors.accent,
    alignItems: 'center',
  },
  modalCancelText: {
    color: BrandColors.accent,
    fontSize: 16,
    fontWeight: '600',
  },
  modalSendButton: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    backgroundColor: BrandColors.accent,
    alignItems: 'center',
  },
  modalSendText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
