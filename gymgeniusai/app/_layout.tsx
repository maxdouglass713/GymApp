import React from 'react';
import { View, Text } from 'react-native';
import { Stack } from 'expo-router';
import { AuthProvider } from '@/components/AuthProvider';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { logErrorToFirebase } from '@/utils/errorLogger';

// Simple error boundary for React Native
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    // Don't set hasError - we want to continue rendering even if there's an error
    // This prevents white screens and allows the app to recover
    return { hasError: false };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('❌ React Error Boundary caught error:', error);
    console.error('❌ Error Info:', errorInfo);
    
    // Log to Firebase if available
    try {
      logErrorToFirebase(error, {
        component: 'RootLayout.ErrorBoundary',
        metadata: {
          componentStack: errorInfo.componentStack,
        },
      }).catch((logErr) => {
        console.error('❌ Failed to log error to Firebase:', logErr);
      });
    } catch (logErr) {
      // Error logger not available, just log to console
      console.error('❌ Error logger not available');
    }
  }

  render() {
    // Always try to render children - don't block the app even if there's an error
    // The error has already been logged, so let the app continue
    return this.props.children;
  }
}

export default function RootLayout() {
  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <AuthProvider>
            <Stack screenOptions={{ headerShown: false }} />
          </AuthProvider>
        </GestureHandlerRootView>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}