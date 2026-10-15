import React, { useState, useEffect } from 'react';
import { AuthScreenView } from '../../types';
import { WelcomeView } from './WelcomeView';
import { SignInView } from './SignInView';
import { SignUpView } from './SignUpView';
import { ForgotPasswordView } from './ForgotPasswordView';

interface AuthScreenProps {
  initialView?: AuthScreenView;
  signupEmail?: string;
  onSignInWithEmail: (email: string, password: string) => Promise<void>;
  onSignUpWithEmail: (data: {
    fullName: string;
    email: string;
    password: string;
    username?: string;
    phone?: string;
  }) => Promise<void>;
  onGoogleSignIn: () => Promise<void>;
  onAppleSignIn: () => Promise<void>;
  onSendResetEmail: (email: string) => Promise<void>;
  onResendVerification?: (email: string) => Promise<void>;
  onCheckVerification?: () => Promise<boolean>;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({
  initialView = 'welcome',
  onSignInWithEmail,
  onSignUpWithEmail,
  onGoogleSignIn,
  onAppleSignIn,
  onSendResetEmail,
}) => {
  const [currentView, setCurrentView] = useState<AuthScreenView>(initialView);

  // Listen for hash-based reset password routing
  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes('type=recovery')) {
      setCurrentView('reset_password');
    }
  }, []);

  const handleSignUp = async (data: {
    fullName: string;
    email: string;
    password: string;
    username?: string;
    phone?: string;
  }) => {
    await onSignUpWithEmail(data);
  };

  return (
    <div
      id="auth-screen"
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden auto',
        backgroundColor: '#FAF7F2',
      }}
    >
      {currentView === 'welcome' && (
        <WelcomeView
          onNavigate={setCurrentView}
          onGoogleSignIn={onGoogleSignIn}
          onAppleSignIn={onAppleSignIn}
        />
      )}

      {currentView === 'signin' && (
        <SignInView
          onNavigate={setCurrentView}
          onSignInWithEmail={onSignInWithEmail}
          onGoogleSignIn={onGoogleSignIn}
          onAppleSignIn={onAppleSignIn}
        />
      )}

      {currentView === 'signup' && (
        <SignUpView
          onNavigate={setCurrentView}
          onSignUpWithEmail={handleSignUp}
        />
      )}

      {currentView === 'forgot_password' && (
        <ForgotPasswordView
          onNavigate={setCurrentView}
          onSendResetEmail={onSendResetEmail}
        />
      )}

      {/* reset_password view: Password reset happens via Supabase-hosted page */}
      {currentView === 'reset_password' && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            gap: '12px',
            padding: '24px',
            textAlign: 'center',
            backgroundColor: '#FAF7F2',
          }}
        >
          <span style={{ fontSize: '32px' }}>🔑</span>
          <h2 style={{ fontSize: '20px', fontWeight: 900, color: '#1E242B' }}>
            Reset your password
          </h2>
          <p style={{ fontSize: '13px', color: '#64748B', lineHeight: 1.5, maxWidth: '260px' }}>
            Please use the password reset form from the email you received. Your new password will be saved automatically.
          </p>
          <button
            onClick={() => setCurrentView('signin')}
            style={{
              padding: '12px 28px',
              backgroundColor: '#E24B36',
              color: '#FFFFFF',
              borderRadius: '12px',
              fontSize: '14px',
              fontWeight: 700,
              border: 'none',
              cursor: 'pointer',
              marginTop: '8px',
            }}
          >
            Return to Sign In
          </button>
        </div>
      )}
    </div>
  );
};
