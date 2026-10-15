import React, { useEffect, useState } from 'react';
import { BRAND } from '../../config/brand';

interface SplashScreenProps {
  onComplete: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete }) => {
  const [stage, setStage] = useState<'enter' | 'animate' | 'settle' | 'exit'>('enter');

  useEffect(() => {
    // 1. Enter (0ms): Background warm glow initializes
    const t1 = setTimeout(() => {
      setStage('animate'); // Logo scales & flame pulses
    }, 250);

    // 2. Settle (900ms): Brand mark settles, text & slogan shine
    const t2 = setTimeout(() => {
      setStage('settle');
    }, 950);

    // 3. Exit (1600ms): Smooth fade out transition into auth/app
    const t3 = setTimeout(() => {
      setStage('exit');
    }, 1600);

    // 4. Complete (1850ms)
    const t4 = setTimeout(() => {
      onComplete();
    }, 1850);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [onComplete]);

  return (
    <div
      className={`splash-container ${stage === 'exit' ? 'splash-fade-out' : ''}`}
      style={{
        position: 'absolute',
        inset: 0,
        backgroundColor: '#FAF7F2',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        overflow: 'hidden',
        userSelect: 'none',
      }}
    >
      {/* Background Soft Yellow Radial Glow */}
      <div
        style={{
          position: 'absolute',
          width: '320px',
          height: '320px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(254, 243, 199, 0.85) 0%, rgba(250, 247, 242, 0) 70%)',
          transform: stage === 'enter' ? 'scale(0.6)' : 'scale(1.15)',
          opacity: stage === 'enter' ? 0.3 : 1,
          transition: 'transform 1.2s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.8s ease',
          pointerEvents: 'none',
        }}
      />

      {/* Main Logo Container */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '16px',
          transform:
            stage === 'enter'
              ? 'scale(0.75) translateY(12px)'
              : stage === 'animate'
              ? 'scale(1.04) translateY(-2px)'
              : 'scale(1) translateY(0)',
          opacity: stage === 'enter' ? 0 : 1,
          transition: 'all 0.65s cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
      >
        {/* Animated Brand Emblem */}
        <div
          style={{
            position: 'relative',
            width: '84px',
            height: '84px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {/* Subtle Outer Steam / Ripple Ring */}
          <div
            style={{
              position: 'absolute',
              inset: '-10px',
              borderRadius: '28px',
              border: '2px solid rgba(226, 75, 54, 0.18)',
              backgroundColor: 'rgba(254, 247, 228, 0.6)',
              transform: stage === 'animate' || stage === 'settle' ? 'scale(1)' : 'scale(0.8)',
              opacity: stage === 'settle' ? 0.7 : 0.3,
              transition: 'all 0.7s ease',
            }}
          />

          {/* Core Flame Emblem Badge */}
          <div
            style={{
              width: '74px',
              height: '74px',
              borderRadius: '24px',
              background: 'linear-gradient(135deg, #FF5A5F 0%, #E24B36 100%)',
              boxShadow: '0 10px 25px rgba(226, 75, 54, 0.28), 0 2px 6px rgba(0, 0, 0, 0.04)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              zIndex: 2,
              overflow: 'hidden',
            }}
          >
            <img
              src={BRAND.logo.imageUrl}
              alt={BRAND.name}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                transform: stage === 'animate' ? 'scale(1.05)' : 'scale(1)',
                transition: 'transform 0.45s cubic-bezier(0.34, 1.56, 0.64, 1)',
              }}
            />
          </div>
        </div>

        {/* Brand Name Typography */}
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            letterSpacing: '-0.8px',
            gap: '6px',
          }}
        >
          <span
            style={{
              fontSize: '32px',
              fontWeight: 900,
              color: '#1E242B',
              fontFamily: 'var(--font-sans)',
            }}
          >
            {BRAND.logo.primaryText}
          </span>
          <span
            style={{
              fontSize: '32px',
              fontWeight: 900,
              color: '#E24B36',
              fontFamily: 'var(--font-sans)',
            }}
          >
            {BRAND.logo.accentText}
          </span>
        </div>

        {/* Brand Slogan */}
        <p
          style={{
            fontSize: '13px',
            fontWeight: 600,
            color: '#64748B',
            letterSpacing: '0.4px',
            margin: 0,
            opacity: stage === 'settle' || stage === 'exit' ? 1 : 0,
            transform: stage === 'settle' || stage === 'exit' ? 'translateY(0)' : 'translateY(6px)',
            transition: 'opacity 0.4s ease, transform 0.4s ease',
          }}
        >
          Discover food. Watch it. Crave it.
        </p>
      </div>

      {/* Discreet bottom loading pulse pill */}
      <div
        style={{
          position: 'absolute',
          bottom: '36px',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          opacity: stage === 'settle' ? 0.8 : 0,
          transition: 'opacity 0.3s ease',
        }}
      >
        <span
          style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            backgroundColor: '#E24B36',
            display: 'inline-block',
            animation: 'pulseDot 0.8s ease-in-out infinite alternate',
          }}
        />
        <span
          style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            backgroundColor: '#F59E0B',
            display: 'inline-block',
            animation: 'pulseDot 0.8s ease-in-out 0.2s infinite alternate',
          }}
        />
        <span
          style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            backgroundColor: '#E24B36',
            display: 'inline-block',
            animation: 'pulseDot 0.8s ease-in-out 0.4s infinite alternate',
          }}
        />
      </div>
    </div>
  );
};
