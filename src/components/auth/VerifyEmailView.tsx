import React, { useState } from 'react';
import { BRAND } from '../../config/brand';
import { Mail, RefreshCw, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';
import { AuthScreenView } from '../../types';

interface VerifyEmailViewProps {
  email: string;
  onNavigate: (view: AuthScreenView) => void;
  onResendEmail: (email: string) => Promise<void>;
  onCheckVerification: () => Promise<boolean>;
}

export const VerifyEmailView: React.FC<VerifyEmailViewProps> = ({
  email,
  onNavigate,
  onResendEmail,
  onCheckVerification,
}) => {
  const [resendCooldown, setResendCooldown] = useState(0);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const handleResend = async () => {
    if (resendCooldown > 0 || isResending) return;
    try {
      setIsResending(true);
      setStatusMessage(null);
      await onResendEmail(email);
      setStatusMessage('Verification email resent! Please check your spam folder too.');
      setResendCooldown(45);
      const interval = setInterval(() => {
        setResendCooldown((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err: any) {
      setStatusMessage(err?.message || 'Could not resend email at this time.');
    } finally {
      setIsResending(false);
    }
  };

  const handleCheck = async () => {
    try {
      setIsChecking(true);
      setStatusMessage(null);
      const verified = await onCheckVerification();
      if (!verified) {
        setStatusMessage('Your email is not verified yet. Please click the link in your email.');
      }
    } catch (err: any) {
      setStatusMessage(err?.message || 'Could not check status right now.');
    } finally {
      setIsChecking(false);
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
        alignItems: 'center',
        justifyContent: 'space-between',
        userSelect: 'none',
      }}
    >
      {/* Top back bar */}
      <div style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'flex-start' }}>
        <button
          onClick={() => onNavigate('signup')}
          aria-label="Back to sign up"
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

      {/* Main Illustration & Text */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', maxWidth: '300px' }}>
        {/* Envelope Graphic Badge */}
        <div
          style={{
            width: '80px',
            height: '80px',
            borderRadius: '26px',
            background: 'linear-gradient(135deg, #FEF7E4 0%, #FDEEEB 100%)',
            border: '2px solid #FCE7B0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '20px',
            boxShadow: '0 8px 20px rgba(60, 40, 20, 0.06)',
          }}
        >
          <Mail size={36} color="#E24B36" />
        </div>

        <h2 style={{ fontSize: '24px', fontWeight: 900, color: '#1E242B', marginBottom: '8px' }}>
          Check your email
        </h2>

        <p style={{ fontSize: '14px', color: '#64748B', lineHeight: 1.5, marginBottom: '14px' }}>
          We’ve sent a verification link to:
        </p>

        <div
          style={{
            backgroundColor: '#FFFFFF',
            padding: '8px 14px',
            borderRadius: '12px',
            border: '1px solid #E5DFC9',
            fontSize: '13.5px',
            fontWeight: 700,
            color: '#1E242B',
            marginBottom: '16px',
            wordBreak: 'break-all',
          }}
        >
          {email || 'your email'}
        </div>

        <p style={{ fontSize: '12.5px', color: '#8E99A8', lineHeight: 1.4 }}>
          Tap the link in your email to verify your CraveDrop account and start ordering.
        </p>

        {statusMessage && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '10px 14px',
              backgroundColor: statusMessage.includes('resent') ? '#F0FDF4' : '#FEF2F2',
              border: `1px solid ${statusMessage.includes('resent') ? '#86EFAC' : '#FCA5A5'}`,
              borderRadius: '12px',
              fontSize: '12px',
              color: statusMessage.includes('resent') ? '#15803D' : '#B91C1C',
              marginTop: '16px',
            }}
          >
            {statusMessage.includes('resent') ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
            <span>{statusMessage}</span>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%', marginTop: '24px' }}>
        {/* Continue after verification */}
        <button
          onClick={handleCheck}
          disabled={isChecking}
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
            boxShadow: '0 4px 14px rgba(226, 75, 54, 0.28)',
          }}
        >
          {isChecking ? 'Checking status...' : 'I’ve verified my email'}
        </button>

        {/* Resend Email */}
        <button
          onClick={handleResend}
          disabled={resendCooldown > 0 || isResending}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            width: '100%',
            height: '46px',
            backgroundColor: '#FFFFFF',
            border: '1px solid #E5DFC9',
            borderRadius: '14px',
            fontSize: '13.5px',
            fontWeight: 700,
            color: resendCooldown > 0 ? '#8E99A8' : '#1E242B',
            cursor: resendCooldown > 0 ? 'default' : 'pointer',
          }}
        >
          <RefreshCw size={14} className={isResending ? 'spin' : ''} />
          <span>
            {resendCooldown > 0 ? `Resend Email in ${resendCooldown}s` : isResending ? 'Sending...' : 'Resend Email'}
          </span>
        </button>

        {/* Change Email */}
        <button
          onClick={() => onNavigate('signup')}
          style={{
            background: 'none',
            border: 'none',
            color: '#64748B',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            padding: '8px',
            textDecoration: 'underline',
          }}
        >
          Change Email
        </button>
      </div>
    </div>
  );
};
