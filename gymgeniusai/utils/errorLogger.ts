import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/config/firebase';

export interface ErrorLog {
  error: string;
  stack?: string;
  component?: string;
  userId?: string;
  deviceInfo?: {
    platform?: string;
    osVersion?: string;
  };
  timestamp?: any;
  metadata?: Record<string, any>;
}

/**
 * Log errors to Firebase Firestore for debugging
 * This helps us see crashes in real-time without waiting for TestFlight crash reports
 */
export async function logErrorToFirebase(error: Error | string, context?: {
  component?: string;
  userId?: string;
  metadata?: Record<string, any>;
}): Promise<void> {
  try {
    const errorLog: ErrorLog = {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      component: context?.component,
      timestamp: serverTimestamp(),
      metadata: context?.metadata || {},
    };

    // Only include userId if it's defined (Firebase doesn't allow undefined values)
    if (context?.userId) {
      errorLog.userId = context.userId;
    }

    // Add device info if available (basic for now)
    if (typeof navigator !== 'undefined') {
      errorLog.deviceInfo = {
        platform: 'web',
      };
    }

    // Write to Firestore
    await addDoc(collection(db, 'errorLogs'), errorLog);
    
    console.log('📝 Error logged to Firebase:', errorLog.error);
  } catch (logError) {
    // If logging fails, at least log to console
    console.error('❌ Failed to log error to Firebase:', logError);
    console.error('❌ Original error:', error);
  }
}

/**
 * Wrap a function with error logging
 */
export function withErrorLogging<T extends (...args: any[]) => any>(
  fn: T,
  componentName: string,
  userId?: string
): T {
  return ((...args: any[]) => {
    try {
      const result = fn(...args);
      
      // Handle async functions
      if (result instanceof Promise) {
        return result.catch((error) => {
          logErrorToFirebase(error, {
            component: componentName,
            userId,
            metadata: { args: JSON.stringify(args) },
          });
          throw error;
        });
      }
      
      return result;
    } catch (error) {
      logErrorToFirebase(error as Error, {
        component: componentName,
        userId,
        metadata: { args: JSON.stringify(args) },
      });
      throw error;
    }
  }) as T;
}

