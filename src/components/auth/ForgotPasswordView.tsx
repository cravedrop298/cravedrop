import React, { useState } from 'react';
import { BRAND } from '../../config/brand';
import { ArrowLeft, Mail, AlertCircle, CheckCircle2 } from 'lucide-react';
import { AuthScreenView } from '../../types';

interface ForgotPasswordViewProps {
  onNavigate: (view: AuthScreenView) => void;
  onSendResetEmail: (email: string) => Promise<void>;
}

export const ForgotPasswordView: React.FC<ForgotPasswordViewProps> = ({
  onNavigate,
  onSendResetEmail,
}) => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const trimmed = email.trim();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    try {
      setIsLoading(true);
      await onSendResetEmail(trimmed);
      setIsSuccess(true);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Could not send recovery link. Please try again.');
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
        padding: '24px 20px',
        backgroundColor: '#FAF7F2',
        userSelect: 'none',
      }}
    >
      {/* Top back bar */}
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '24px' }}>
        <button
          onClick={() => onNavigate('signin')}
          aria-label="Back to sign in"
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
      </div>

      {isSuccess ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginTop: '30px' }}>
          <div
            style={{
              width: '72px',
              height: '72px',
              borderRadius: '24px',
              backgroundColor: '#F0FDF4',
              border: '2px solid #86EFAC',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '16px',
            }}
          >
            <CheckCircle2 size={36} color="#15803D" />
          </div>

          <h2 style={{ fontSize: '22px', fontWeight: 900, color: '#1E242B', marginBottom: '8px' }}>
            Check your email
          </h2>

          <p style={{ fontSize: '14px', color: '#64748B', lineHeight: 1.5, marginBottom: '24px', maxWidth: '280px' }}>
            We've sent a password reset link to <strong>{email}</strong>. Check your inbox and follow the instructions to create a new password.
          </p>

          <button
            onClick={() => onNavigate('signin')}
            style={{
              width: '100%',
              height: '48px',
              backgroundColor: '#E24B36',
              color: '#FFFFFF',
              borderRadius: '14px',
              fontSize: '14px',
              fontWeight: 800,
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Return to Sign In
          </button>
        </div>
      ) : (
        <>
          <div style={{ marginBottom: '24px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 900, color: '#1E242B', marginBottom: '6px' }}>
              Reset Password
            </h2>
            <p style={{ fontSize: '13.5px', color: '#64748B', lineHeight: 1.45 }}>
              Enter the email associated with your CraveDrop account and we'll send you a password recovery link.
            </p>
          </div>

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
              }}
            >
              <AlertCircle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label
                htmlFor="forgot-email"
                style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#1E242B', marginBottom: '6px' }}
              >
                Email Address
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  id="forgot-email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-control"
                  style={{ paddingLeft: '40px', height: '46px', fontSize: '14px' }}
                />
                <Mail
                  size={16}
                  color="#8E99A8"
                  style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              style={{
                height: '48px',
                backgroundColor: '#E24B36',
                color: '#FFFFFF',
                borderRadius: '14px',
                fontSize: '14px',
                fontWeight: 800,
                border: 'none',
                cursor: isLoading ? 'default' : 'pointer',
                boxShadow: '0 4px 14px rgba(226, 75, 54, 0.28)',
                marginTop: '6px',
              }}
            >
              {isLoading ? 'Sending Link...' : 'SEND RESET LINK'}
            </button>
          </form>

          <div style={{ marginTop: 'auto', textAlign: 'center', paddingTop: '24px' }}>
            <button
              onClick={() => onNavigate('signin')}
              style={{
                background: 'none',
                border: 'none',
                color: '#64748B',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              Remember your password? <span style={{ color: '#E24B36' }}>Sign In</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
};
