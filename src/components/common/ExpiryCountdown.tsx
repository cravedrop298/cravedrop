// Live Expiry Countdown Badge Component
import React, { useState, useEffect } from 'react';
import { getExpiryDisplayInfo, ExpiryDisplayInfo } from '../../services/expiryService';
import { Clock, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface ExpiryCountdownProps {
  expiresAt: string;
  className?: string;
  compact?: boolean;
}

export const ExpiryCountdown: React.FC<ExpiryCountdownProps> = ({
  expiresAt,
  className = '',
  compact = false,
}) => {
  const [info, setInfo] = useState<ExpiryDisplayInfo>(() => getExpiryDisplayInfo(expiresAt));

  useEffect(() => {
    // Update every second for smooth ticking countdown
    const timer = setInterval(() => {
      setInfo(getExpiryDisplayInfo(expiresAt));
    }, 1000);

    return () => clearInterval(timer);
  }, [expiresAt]);

  if (info.isExpired) {
    return (
      <span className={`badge-expiry expired ${className}`}>
        <AlertTriangle size={12} />
        <span>Expired</span>
      </span>
    );
  }

  const isCritical = info.urgencyLevel === 'critical';
  const isUrgent = info.urgencyLevel === 'urgent';

  return (
    <span
      className={`badge-expiry ${isCritical ? 'urgent animate-urgency' : isUrgent ? 'urgent' : ''} ${className}`}
      title={`Available until ${new Date(expiresAt).toLocaleTimeString()}`}
    >
      <Clock size={12} className={isCritical ? 'text-red-600' : ''} />
      <span>{compact ? info.formattedCountdown : info.statusText}</span>
    </span>
  );
};
