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

export default function SignUpScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [loading, setLoading] = useState(false);
  const { signUp, error } = useAuth();

  const handleSignUp = async () => {
    if (!email.trim() || !password.trim() || !confirmPassword.trim() || !firstName.trim()) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters long');
      return;
    }

    try {
      setLoading(true);
      console.log('🔄 Creating account for:', email);
      
      await signUp(email.trim(), password, firstName.trim());
      
      // Navigate to institution check for new users
      console.log('✅ Sign up successful, navigating to institution check');
      Alert.alert('Success!', 'Account created successfully! Let\'s customize your experience...');
      router.replace('/institution-check');
    } catch (error: any) {
      console.error('❌ Sign up error:', error);
      console.error('❌ Error details:', {
        message: error.message,
        code: error.code,
        type: typeof error
      });
      
      let errorMessage = error.message || 'An unexpected error occurred';
      if (error.code) {
        errorMessage += ` (Code: ${error.code})`;
      }
      
      // Special handling for email already in use
      if (error.code === 'auth/email-already-in-use') {
        Alert.alert(
          'Account Exists', 
          'This email is already registered. Would you like to sign in instead?',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Sign In', onPress: () => router.back() }
          ]
        );
      } else {
        Alert.alert('Sign Up Failed', errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = () => {
    router.back();
  };


  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.header}>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Join KINETIC FLOW AI and start your fitness journey</Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>First Name</Text>
            <TextInput
              style={[ComponentStyles.input, styles.input]}
              value={firstName}
              onChangeText={setFirstName}
              placeholder="Enter your first name"
              placeholderTextColor={BrandColors.textSecondary}
              autoCapitalize="words"
              autoCorrect={false}
            />
          </View>

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
              placeholder="Create a password (min 6 characters)"
              placeholderTextColor={BrandColors.textSecondary}
              secureTextEntry
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Confirm Password</Text>
            <TextInput
              style={[ComponentStyles.input, styles.input]}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Confirm your password"
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
            style={[ComponentStyles.button.primary, styles.signUpButton]}
            onPress={handleSignUp}
            disabled={loading}
          >
            <Text style={ComponentStyles.button.primaryText}>
              {loading ? 'Creating Account...' : 'Create Account'}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account? </Text>
          <TouchableOpacity onPress={handleSignIn}>
            <Text style={styles.signInLink}>Sign In</Text>
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
  signUpButton: {
    marginBottom: 16,
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
  signInLink: {
    color: BrandColors.accent,
    fontSize: 16,
    fontWeight: '600',
  },
});
