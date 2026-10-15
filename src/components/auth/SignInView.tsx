import React, { useState } from 'react';
import { BRAND } from '../../config/brand';
import { ArrowLeft, Eye, EyeOff, AlertCircle, Lock, Mail } from 'lucide-react';
import { AuthScreenView } from '../../types';

interface SignInViewProps {
  onNavigate: (view: AuthScreenView) => void;
  onSignInWithEmail: (email: string, password: string) => Promise<void>;
  onGoogleSignIn: () => Promise<void>;
  onAppleSignIn: () => Promise<void>;
}

export const SignInView: React.FC<SignInViewProps> = ({
  onNavigate,
  onSignInWithEmail,
  onGoogleSignIn,
  onAppleSignIn,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setErrorMessage('Please enter your email address.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }
    if (!password) {
      setErrorMessage('Please enter your password.');
      return;
    }

    try {
      setIsLoading(true);
      await onSignInWithEmail(trimmedEmail, password);
    } catch (err: any) {
      const msg = err?.message || 'Invalid email or password. Please try again.';
      if (msg.toLowerCase().includes('invalid login credentials')) {
        setErrorMessage('Incorrect email or password. Please check your credentials.');
      } else if (msg.toLowerCase().includes('email not confirmed')) {
        setErrorMessage('Your email address is not yet verified. Please check your inbox.');
      } else {
        setErrorMessage(msg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100%',
        padding: '20px 20px 24px',
        backgroundColor: '#FAF7F2',
        userSelect: 'none',
      }}
    >
      {/* Top Bar with Back Button */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <button
          onClick={() => onNavigate('welcome')}
          aria-label="Back to welcome"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            backgroundColor: '#FFFFFF',
            border: '1px solid #E5DFC9',
            color: '#1E242B',
            cursor: 'pointer',
          }}
        >
          <ArrowLeft size={18} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <img src={BRAND.logo.imageUrl} alt={BRAND.name} style={{ width: '22px', height: '22px', borderRadius: '5px', objectFit: 'contain' }} />
          <span style={{ fontSize: '16px', fontWeight: 900, color: '#1E242B' }}>
            {BRAND.logo.primaryText}
          </span>
          <span style={{ fontSize: '16px', fontWeight: 900, color: '#E24B36' }}>
            {BRAND.logo.accentText}
          </span>
        </div>

        <div style={{ width: '40px' }} />
      </div>

      {/* Screen Title */}
      <div style={{ marginBottom: '22px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 900, color: '#1E242B', letterSpacing: '-0.5px', marginBottom: '4px' }}>
          Welcome back
        </h2>
        <p style={{ fontSize: '13.5px', color: '#64748B' }}>
          Sign in to access your saved drops, orders, and food feed.
        </p>
      </div>

      {/* Error alert */}
      {errorMessage && (
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '8px',
            padding: '12px 14px',
            backgroundColor: '#FEF2F2',
            border: '1px solid #FCA5A5',
            borderRadius: '12px',
            fontSize: '13px',
            color: '#B91C1C',
            marginBottom: '16px',
            lineHeight: 1.4,
          }}
        >
          <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Email / Password Form */}
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {/* Email Field */}
        <div>
          <label
            htmlFor="signin-email"
            style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#1E242B', marginBottom: '6px' }}
          >
            Email Address
          </label>
          <div style={{ position: 'relative' }}>
            <input
              id="signin-email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-control"
              style={{
                paddingLeft: '40px',
                height: '46px',
                fontSize: '14px',
              }}
            />
            <Mail
              size={16}
              color="#8E99A8"
              style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }}
            />
          </div>
        </div>

        {/* Password Field */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <label
              htmlFor="signin-password"
              style={{ fontSize: '12px', fontWeight: 700, color: '#1E242B' }}
            >
              Password
            </label>
            <button
              type="button"
              onClick={() => onNavigate('forgot_password')}
              style={{
                background: 'none',
                border: 'none',
                color: '#E24B36',
                fontSize: '12px',
                fontWeight: 700,
                cursor: 'pointer',
                padding: 0,
              }}
            >
              Forgot Password?
            </button>
          </div>
          <div style={{ position: 'relative' }}>
            <input
              id="signin-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-control"
              style={{
                paddingLeft: '40px',
                paddingRight: '40px',
                height: '46px',
                fontSize: '14px',
              }}
            />
            <Lock
              size={16}
              color="#8E99A8"
              style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              style={{
                position: 'absolute',
                right: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                color: '#8E99A8',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                padding: '4px',
              }}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        {/* SIGN IN Button */}
        <button
          type="submit"
          disabled={isLoading}
          style={{
            height: '48px',
            backgroundColor: '#E24B36',
            color: '#FFFFFF',
            borderRadius: '14px',
            fontSize: '14.5px',
            fontWeight: 800,
            border: 'none',
            cursor: isLoading ? 'default' : 'pointer',
            boxShadow: '0 4px 14px rgba(226, 75, 54, 0.28)',
            marginTop: '8px',
            transition: 'background-color 0.15s ease',
          }}
        >
          {isLoading ? 'Signing In...' : 'SIGN IN'}
        </button>
      </form>

      {/* Divider */}
      <div style={{ display: 'flex', alignItems: 'center', margin: '20px 0 16px' }}>
        <div style={{ flex: 1, height: '1px', backgroundColor: '#E5DFC9' }} />
        <span style={{ padding: '0 12px', fontSize: '11px', fontWeight: 700, color: '#8E99A8', letterSpacing: '0.8px' }}>
          OR CONTINUE WITH
        </span>
        <div style={{ flex: 1, height: '1px', backgroundColor: '#E5DFC9' }} />
      </div>

      {/* Social Logins */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '24px' }}>
        {/* Google */}
        <button
          onClick={onGoogleSignIn}
          type="button"
          style={{
            flex: 1,
            height: '46px',
            backgroundColor: '#FFFFFF',
            border: '1px solid #E5DFC9',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            fontSize: '13px',
            fontWeight: 700,
            color: '#1E242B',
            cursor: 'pointer',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24">
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
          <span>Google</span>
        </button>

        {/* Apple */}
        <button
          onClick={onAppleSignIn}
          type="button"
          style={{
            flex: 1,
            height: '46px',
            backgroundColor: '#1E242B',
            border: 'none',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            fontSize: '13px',
            fontWeight: 700,
            color: '#FFFFFF',
            cursor: 'pointer',
          }}
        >
          <svg width="15" height="15" viewBox="0 0 170 170" fill="currentColor">
            <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.7-3.04-7.69-7.85-11.96-14.42-7.51-11.41-13.43-24.36-17.75-38.83-4.33-14.47-6.5-27.4-6.5-38.79 0-14.89 3.73-27.13 11.19-36.71 7.46-9.58 16.94-14.47 28.45-14.67 4.9 0 10.42 1.34 16.57 4.02 6.15 2.68 10.01 4.05 11.58 4.12 1.25 0 5.37-1.48 12.37-4.43 7-2.95 12.87-4.22 17.61-3.81 13.59.88 24.34 5.92 32.26 15.11-11.83 7.18-17.63 17.1-17.4 29.76.24 10.01 4.13 18.39 11.66 25.13 7.54 6.74 16.57 10.51 27.08 11.31-2.28 7.08-5.18 14.59-8.7 22.53zM119.22 33.15c0-7.84 2.8-15.19 8.4-22.05 5.6-6.86 12.56-10.83 20.89-11.9.11 1.09.16 2.07.16 2.94 0 7.73-2.95 15.2-8.86 22.42-5.9 7.22-13.06 11.23-21.46 12.03-.43-1.19-.65-2.33-.65-3.44z" />
          </svg>
          <span>Apple</span>
        </button>
      </div>

      {/* Create Account Link */}
      <div style={{ marginTop: 'auto', textAlign: 'center', fontSize: '13px' }}>
        <span style={{ color: '#64748B' }}>Don't have an account? </span>
        <button
          onClick={() => onNavigate('signup')}
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
          Create Account
        </button>
      </div>
    </div>
  );
};
