import React, { useState } from 'react';
import { BRAND } from '../../config/brand';
import { ArrowLeft, Eye, EyeOff, AlertCircle, Lock, Mail, User, Phone, CheckCircle2 } from 'lucide-react';
import { AuthScreenView } from '../../types';

interface SignUpViewProps {
  onNavigate: (view: AuthScreenView) => void;
  onSignUpWithEmail: (data: {
    fullName: string;
    email: string;
    password: string;
    username?: string;
    phone?: string;
  }) => Promise<void>;
}

export const SignUpView: React.FC<SignUpViewProps> = ({
  onNavigate,
  onSignUpWithEmail,
}) => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [username, setUsername] = useState('');
  const [phone, setPhone] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Validation rules
    const trimmedName = fullName.trim();
    const trimmedEmail = email.trim();

    if (!trimmedName) {
      setErrorMessage('Please enter your full name.');
      return;
    }

    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    if (!password || password.length < 8) {
      setErrorMessage('Password must contain at least 8 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    try {
      setIsLoading(true);
      await onSignUpWithEmail({
        fullName: trimmedName,
        email: trimmedEmail,
        password,
        username: username.trim() || undefined,
        phone: phone.trim() || undefined,
      });
    } catch (err: any) {
      const msg = err?.message || 'Account registration could not be completed.';
      if (
        msg.toLowerCase().includes('already registered') ||
        msg.toLowerCase().includes('user already exists') ||
        msg.toLowerCase().includes('unique constraint')
      ) {
        setErrorMessage('This email is already registered. Try signing in instead.');
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
        padding: '20px 20px 28px',
        backgroundColor: '#FAF7F2',
        userSelect: 'none',
      }}
    >
      {/* Top Bar with Back Button */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
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
      <div style={{ marginBottom: '18px' }}>
        <h2 style={{ fontSize: '24px', fontWeight: 900, color: '#1E242B', letterSpacing: '-0.5px', marginBottom: '4px' }}>
          Create an account
        </h2>
        <p style={{ fontSize: '13px', color: '#64748B' }}>
          Join thousands discovering artisanal kitchens & live food drops.
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

      {/* Signup Form */}
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {/* Full Name */}
        <div>
          <label
            htmlFor="signup-name"
            style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#1E242B', marginBottom: '5px' }}
          >
            Full Name <span style={{ color: '#E24B36' }}>*</span>
          </label>
          <div style={{ position: 'relative' }}>
            <input
              id="signup-name"
              type="text"
              placeholder="e.g. Alex Morgan"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="input-control"
              style={{ paddingLeft: '38px', height: '44px', fontSize: '13.5px' }}
            />
            <User
              size={15}
              color="#8E99A8"
              style={{ position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)' }}
            />
          </div>
        </div>

        {/* Email Address */}
        <div>
          <label
            htmlFor="signup-email"
            style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#1E242B', marginBottom: '5px' }}
          >
            Email Address <span style={{ color: '#E24B36' }}>*</span>
          </label>
          <div style={{ position: 'relative' }}>
            <input
              id="signup-email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-control"
              style={{ paddingLeft: '38px', height: '44px', fontSize: '13.5px' }}
            />
            <Mail
              size={15}
              color="#8E99A8"
              style={{ position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)' }}
            />
          </div>
        </div>

        {/* Password */}
        <div>
          <label
            htmlFor="signup-password"
            style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#1E242B', marginBottom: '5px' }}
          >
            Password <span style={{ color: '#E24B36' }}>*</span>
            <span style={{ fontSize: '11px', fontWeight: 500, color: '#8E99A8', marginLeft: '6px' }}>
              (min 8 characters)
            </span>
          </label>
          <div style={{ position: 'relative' }}>
            <input
              id="signup-password"
              type={showPassword ? 'text' : 'password'}
              placeholder="At least 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-control"
              style={{ paddingLeft: '38px', paddingRight: '38px', height: '44px', fontSize: '13.5px' }}
            />
            <Lock
              size={15}
              color="#8E99A8"
              style={{ position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)' }}
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
              {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </div>

        {/* Confirm Password */}
        <div>
          <label
            htmlFor="signup-confirm-password"
            style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#1E242B', marginBottom: '5px' }}
          >
            Confirm Password <span style={{ color: '#E24B36' }}>*</span>
          </label>
          <div style={{ position: 'relative' }}>
            <input
              id="signup-confirm-password"
              type={showConfirmPassword ? 'text' : 'password'}
              placeholder="Re-enter password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="input-control"
              style={{ paddingLeft: '38px', paddingRight: '38px', height: '44px', fontSize: '13.5px' }}
            />
            <Lock
              size={15}
              color="#8E99A8"
              style={{ position: 'absolute', left: '13px', top: '50%', transform: 'translateY(-50%)' }}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
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
              {showConfirmPassword ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </div>

        {/* Optional Row: Username & Phone */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <div style={{ flex: 1 }}>
            <label
              htmlFor="signup-username"
              style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, color: '#64748B', marginBottom: '4px' }}
            >
              Username (optional)
            </label>
            <input
              id="signup-username"
              type="text"
              placeholder="e.g. alex_foodie"
              value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
              className="input-control"
              style={{ height: '40px', fontSize: '13px' }}
            />
          </div>

          <div style={{ flex: 1 }}>
            <label
              htmlFor="signup-phone"
              style={{ display: 'block', fontSize: '11.5px', fontWeight: 600, color: '#64748B', marginBottom: '4px' }}
            >
              Phone (optional)
            </label>
            <div style={{ position: 'relative' }}>
              <input
                id="signup-phone"
                type="tel"
                placeholder="+1 555-..."
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="input-control"
                style={{ paddingLeft: '32px', height: '40px', fontSize: '13px' }}
              />
              <Phone
                size={13}
                color="#8E99A8"
                style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }}
              />
            </div>
          </div>
        </div>

        {/* Submit Button */}
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
            marginTop: '10px',
            transition: 'background-color 0.15s ease',
          }}
        >
          {isLoading ? 'Creating Account...' : 'CREATE ACCOUNT'}
        </button>
      </form>

      {/* Switch to Sign In */}
      <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '13px' }}>
        <span style={{ color: '#64748B' }}>Already have an account? </span>
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
    </div>
  );
};
