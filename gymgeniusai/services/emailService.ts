import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/config/firebase';

/**
 * Email Service - Uses Firebase Extension "Trigger Email from Firestore"
 * Sends emails by adding documents to the 'mail' collection
 */

export interface EmailMessage {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

export const emailService = {
  /**
   * Send a welcome email to new users
   */
  async sendWelcomeEmail(userEmail: string, userName: string): Promise<void> {
    try {
      console.log('📧 Sending welcome email to:', userEmail);
      console.log('📧 User name:', userName);
      console.log('📧 Firestore db:', db ? 'Connected' : 'Not connected');
      
      const mailData = {
        to: userEmail,
        message: {
          subject: 'Welcome to Kinetic Flow AI! 🎉',
          html: `
            <!DOCTYPE html>
            <html>
            <head>
              <style>
                body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #0a0f1f; }
                .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
                .header { text-align: center; margin-bottom: 40px; }
                .logo { font-size: 32px; font-weight: bold; color: #00D4FF; }
                .content { background: linear-gradient(135deg, #1a1f35 0%, #0d1220 100%); border-radius: 16px; padding: 40px; border: 1px solid #2a3050; }
                h1 { color: #ffffff; font-size: 28px; margin-bottom: 16px; }
                p { color: #a0aec0; font-size: 16px; line-height: 1.6; margin-bottom: 16px; }
                .highlight { color: #00D4FF; font-weight: 600; }
                .cta-button { display: inline-block; background: linear-gradient(135deg, #00D4FF 0%, #0099cc 100%); color: #ffffff; padding: 16px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 24px; }
                .features { margin: 32px 0; }
                .feature { display: flex; align-items: center; margin-bottom: 16px; }
                .feature-icon { color: #00D4FF; margin-right: 12px; font-size: 20px; }
                .feature-text { color: #ffffff; }
                .footer { text-align: center; margin-top: 40px; color: #666; font-size: 14px; }
              </style>
            </head>
            <body>
              <div class="container">
                <div class="header">
                  <div class="logo">⚡ KINETIC FLOW AI</div>
                </div>
                <div class="content">
                  <h1>Welcome, ${userName}! 👋</h1>
                  <p>Thanks for joining <span class="highlight">Kinetic Flow AI</span> — your AI-powered fitness companion!</p>
                  <p>You're now part of a community dedicated to smarter workouts, better nutrition, and achieving real results.</p>
                  
                  <div class="features">
                    <div class="feature">
                      <span class="feature-icon">💪</span>
                      <span class="feature-text">AI-powered workout plans tailored to your goals</span>
                    </div>
                    <div class="feature">
                      <span class="feature-icon">🥗</span>
                      <span class="feature-text">Smart nutrition tracking and meal planning</span>
                    </div>
                    <div class="feature">
                      <span class="feature-icon">📊</span>
                      <span class="feature-text">Track your progress and celebrate your wins</span>
                    </div>
                    <div class="feature">
                      <span class="feature-icon">⚡</span>
                      <span class="feature-text">Earn Volts and unlock premium features</span>
                    </div>
                  </div>
                  
                  <p>Ready to crush your fitness goals? Open the app and let's get started!</p>
                  <p style="color: #00D4FF; font-weight: 600;">Brains + Gains. 🧠💪</p>
                </div>
                <div class="footer">
                  <p>© ${new Date().getFullYear()} Kinetic Flow AI. All rights reserved.</p>
                  <p>Questions? Contact us at support@supportkineticflowai.com</p>
                </div>
              </div>
            </body>
            </html>
          `,
          text: `Welcome to Kinetic Flow AI, ${userName}!\n\nThanks for joining — your AI-powered fitness companion!\n\nYou're now part of a community dedicated to smarter workouts, better nutrition, and achieving real results.\n\nReady to crush your fitness goals? Open the app and let's get started!\n\nBrains + Gains. 🧠💪\n\n© ${new Date().getFullYear()} Kinetic Flow AI`,
        },
        createdAt: serverTimestamp(),
      };
      
      console.log('📧 Mail data prepared:', JSON.stringify(mailData, null, 2));
      
      const docRef = await addDoc(collection(db, 'mail'), mailData);
      console.log('✅ Welcome email queued successfully with ID:', docRef.id);
    } catch (error: any) {
      console.error('❌ Failed to send welcome email:', error);
      console.error('❌ Error code:', error?.code);
      console.error('❌ Error message:', error?.message);
      console.error('❌ Full error:', JSON.stringify(error, null, 2));
      // Don't throw - welcome email failure shouldn't break signup
    }
  },

  /**
   * Send a custom email
   */
  async sendEmail(message: EmailMessage): Promise<void> {
    try {
      console.log('📧 Sending email to:', message.to);
      
      await addDoc(collection(db, 'mail'), {
        to: message.to,
        message: {
          subject: message.subject,
          html: message.html,
          text: message.text,
        },
        createdAt: serverTimestamp(),
      });
      
      console.log('✅ Email queued successfully');
    } catch (error) {
      console.error('❌ Failed to send email:', error);
      throw error;
    }
  },

  /**
   * Send password reset confirmation email (optional - Firebase sends its own)
   */
  async sendPasswordResetConfirmation(userEmail: string): Promise<void> {
    try {
      await addDoc(collection(db, 'mail'), {
        to: userEmail,
        message: {
          subject: 'Password Reset Requested - Kinetic Flow AI',
          html: `
            <div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
              <h1 style="color: #00D4FF;">Password Reset Requested</h1>
              <p>We received a request to reset your password for your Kinetic Flow AI account.</p>
              <p>If you didn't request this, you can safely ignore this email.</p>
              <p>If you did request a password reset, check your inbox for another email from Firebase with the reset link.</p>
              <p style="color: #666; margin-top: 40px;">© ${new Date().getFullYear()} Kinetic Flow AI</p>
            </div>
          `,
          text: `Password Reset Requested\n\nWe received a request to reset your password for your Kinetic Flow AI account.\n\nIf you didn't request this, you can safely ignore this email.\n\nIf you did request a password reset, check your inbox for another email from Firebase with the reset link.`,
        },
        createdAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('❌ Failed to send password reset confirmation:', error);
      // Don't throw - this is optional
    }
  },
};

