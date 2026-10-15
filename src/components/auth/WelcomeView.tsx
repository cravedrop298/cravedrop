import React, { useState } from 'react';
import { BRAND } from '../../config/brand';
import { Mail, AlertCircle } from 'lucide-react';
import { AuthScreenView } from '../../types';

interface WelcomeViewProps {
  onNavigate: (view: AuthScreenView) => void;
  onGoogleSignIn: () => Promise<void>;
  onAppleSignIn: () => Promise<void>;
}

export const WelcomeView: React.FC<WelcomeViewProps> = ({
  onNavigate,
  onGoogleSignIn,
  onAppleSignIn,
}) => {
  const [loadingProvider, setLoadingProvider] = useState<'google' | 'apple' | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleGoogle = async () => {
    try {
      setErrorMessage(null);
      setLoadingProvider('google');
      await onGoogleSignIn();
    } catch (err: any) {
      setErrorMessage(err?.message || 'Google authentication could not be completed. Please try again.');
    } finally {
      setLoadingProvider(null);
    }
  };

  const handleApple = async () => {
    try {
      setErrorMessage(null);
      setLoadingProvider('apple');
      await onAppleSignIn();
    } catch (err: any) {
      setErrorMessage(err?.message || 'Apple authentication could not be completed. Please try again.');
    } finally {
      setLoadingProvider(null);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100%',
        padding: '36px 24px 28px',
        backgroundColor: '#FAF7F2',
        justifyContent: 'space-between',
        userSelect: 'none',
      }}
    >
      {/* Top / Brand Hero Area */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', paddingTop: '24px' }}>
        {/* Flame Logo Emblem */}
        <div
          style={{
            width: '68px',
            height: '68px',
            borderRadius: '22px',
            background: 'linear-gradient(135deg, #FF5A5F 0%, #E24B36 100%)',
            boxShadow: '0 8px 20px rgba(226, 75, 54, 0.28)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '16px',
            overflow: 'hidden',
          }}
        >
          <img
            src={BRAND.logo.imageUrl}
            alt={BRAND.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        </div>

        {/* Title */}
        <div style={{ display: 'flex', alignItems: 'baseline', marginBottom: '8px', gap: '6px' }}>
          <span style={{ fontSize: '30px', fontWeight: 900, color: '#1E242B', letterSpacing: '-0.5px' }}>
            {BRAND.logo.primaryText}
          </span>
          <span style={{ fontSize: '30px', fontWeight: 900, color: '#E24B36', letterSpacing: '-0.5px' }}>
            {BRAND.logo.accentText}
          </span>
        </div>

        {/* Slogan */}
        <div style={{ maxWidth: '260px' }}>
          <p style={{ fontSize: '16px', fontWeight: 700, color: '#1E242B', lineHeight: 1.35, marginBottom: '6px' }}>
            Discover food.
          </p>
          <p style={{ fontSize: '14.5px', fontWeight: 500, color: '#64748B', lineHeight: 1.4 }}>
            Watch it. Crave it. Order it.
          </p>
        </div>
      </div>

      {/* Error alert if any */}
      {errorMessage && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 14px',
            backgroundColor: '#FEF2F2',
            border: '1px solid #FCA5A5',
            borderRadius: '12px',
            fontSize: '12.5px',
            color: '#B91C1C',
            margin: '16px 0',
          }}
        >
          <AlertCircle size={15} style={{ flexShrink: 0 }} />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Auth Action Buttons Area */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
        {/* Continue with Google */}
        <button
          onClick={handleGoogle}
          disabled={loadingProvider !== null}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            width: '100%',
            height: '50px',
            backgroundColor: '#FFFFFF',
            border: '1px solid #E5DFC9',
            borderRadius: '14px',
            color: '#1E242B',
            fontSize: '14.5px',
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: '0 2px 5px rgba(60, 40, 20, 0.05)',
            transition: 'background-color 0.15s ease, transform 0.1s ease',
          }}
        >
          {loadingProvider === 'google' ? (
            <span style={{ fontSize: '13px', color: '#64748B' }}>Connecting to Google...</span>
          ) : (
            <>
              {/* Official Google 'G' Icon */}
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Continue with Google</span>
            </>
          )}
        </button>

        {/* Continue with Apple */}
        <button
          onClick={handleApple}
          disabled={loadingProvider !== null}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            width: '100%',
            height: '50px',
            backgroundColor: '#1E242B',
            border: 'none',
            borderRadius: '14px',
            color: '#FFFFFF',
            fontSize: '14.5px',
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: '0 3px 8px rgba(30, 36, 43, 0.18)',
            transition: 'opacity 0.15s ease, transform 0.1s ease',
          }}
        >
          {loadingProvider === 'apple' ? (
            <span style={{ fontSize: '13px', color: '#CBD5E1' }}>Connecting to Apple...</span>
          ) : (
            <>
              {/* Apple Monochrome SVG */}
              <svg width="17" height="17" viewBox="0 0 170 170" fill="currentColor">
                <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.7-3.04-7.69-7.85-11.96-14.42-7.51-11.41-13.43-24.36-17.75-38.83-4.33-14.47-6.5-27.4-6.5-38.79 0-14.89 3.73-27.13 11.19-36.71 7.46-9.58 16.94-14.47 28.45-14.67 4.9 0 10.42 1.34 16.57 4.02 6.15 2.68 10.01 4.05 11.58 4.12 1.25 0 5.37-1.48 12.37-4.43 7-2.95 12.87-4.22 17.61-3.81 13.59.88 24.34 5.92 32.26 15.11-11.83 7.18-17.63 17.1-17.4 29.76.24 10.01 4.13 18.39 11.66 25.13 7.54 6.74 16.57 10.51 27.08 11.31-2.28 7.08-5.18 14.59-8.7 22.53zM119.22 33.15c0-7.84 2.8-15.19 8.4-22.05 5.6-6.86 12.56-10.83 20.89-11.9.11 1.09.16 2.07.16 2.94 0 7.73-2.95 15.2-8.86 22.42-5.9 7.22-13.06 11.23-21.46 12.03-.43-1.19-.65-2.33-.65-3.44z" />
              </svg>
              <span>Continue with Apple</span>
            </>
          )}
        </button>

        {/* Minimal Divider "OR" */}
        <div style={{ display: 'flex', alignItems: 'center', margin: '4px 0' }}>
          <div style={{ flex: 1, height: '1px', backgroundColor: '#E5DFC9' }} />
          <span style={{ padding: '0 12px', fontSize: '11px', fontWeight: 700, color: '#8E99A8', letterSpacing: '0.8px' }}>
            OR
          </span>
          <div style={{ flex: 1, height: '1px', backgroundColor: '#E5DFC9' }} />
        </div>

        {/* Continue with Email */}
        <button
          onClick={() => onNavigate('signin')}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            width: '100%',
            height: '50px',
            backgroundColor: '#E24B36',
            border: 'none',
            borderRadius: '14px',
            color: '#FFFFFF',
            fontSize: '14.5px',
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(226, 75, 54, 0.28)',
            transition: 'background-color 0.15s ease',
          }}
        >
          <Mail size={18} />
          <span>Continue with Email</span>
        </button>
      </div>

      {/* Bottom Switcher */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '8px',
          paddingTop: '20px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '13px' }}>
          <span style={{ color: '#64748B' }}>Already have an account?</span>
          <button
            onClick={() => onNavigate('signin')}
            style={{
              background: 'none',
              border: 'none',
              color: '#E24B36',
              fontWeight: 800,
              cursor: 'pointer',
              padding: 0,
              fontSize: '13px',
            }}
          >
            Sign In
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '13px' }}>
          <span style={{ color: '#64748B' }}>New here?</span>
          <button
            onClick={() => onNavigate('signup')}
            style={{
              background: 'none',
              border: 'none',
              color: '#1E242B',
              fontWeight: 800,
              cursor: 'pointer',
              padding: 0,
              fontSize: '13px',
              textDecoration: 'underline',
              textUnderlineOffset: '2px',
            }}
          >
            Create Account
          </button>
        </div>
      </div>
    </div>
  );
};
