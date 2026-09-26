import React, { useState } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { ReportReason, ReportType } from '../../types';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { Flag, CheckCircle2 } from 'lucide-react';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  reportedType: ReportType;
  reportedId: string;
  targetTitle?: string;
}

const REASONS: { label: string; value: ReportReason }[] = [
  { label: 'Inappropriate or harmful content', value: 'inappropriate_content' },
  { label: 'Spam, bot or repetitive advertising', value: 'spam' },
  { label: 'Offensive or abusive language', value: 'offensive' },
  { label: 'Misleading or fake food information', value: 'fake_information' },
  { label: 'Suspected fraud or scam', value: 'fraud_scam' },
  { label: 'Copyright or intellectual property issue', value: 'copyright' },
  { label: 'Other violation', value: 'other' },
];

export const ReportModal: React.FC<ReportModalProps> = ({
  isOpen,
  onClose,
  reportedType,
  reportedId,
  targetTitle = 'this content',
}) => {
  const { user } = useAuth();
  const { submitReport } = useData();

  const [reason, setReason] = useState<ReportReason>('inappropriate_content');
  const [details, setDetails] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitReport({
      reporter_id: user?.id || 'anon',
      reporter_name: user?.name || 'Anonymous User',
      reported_type: reportedType,
      reported_id: reportedId,
      reason,
      details: details.trim(),
    });
    setIsSubmitted(true);
    setTimeout(() => {
      setIsSubmitted(false);
      setDetails('');
      onClose();
    }, 1600);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Report ${reportedType.charAt(0).toUpperCase() + reportedType.slice(1)}`}
      subtitle={`Help keep CraveDrop safe and high-quality for everyone.`}
    >
      {isSubmitted ? (
        <div style={{ textAlign: 'center', padding: '30px 10px' }}>
          <CheckCircle2 size={48} color="var(--accent-green)" style={{ margin: '0 auto 14px' }} />
          <h4 style={{ fontSize: '17px', fontWeight: 700, marginBottom: '6px' }}>Report Received</h4>
          <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)' }}>
            Thank you. Our moderation team will review this shortly.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '8px', color: 'var(--text-primary)' }}>
              Reason for reporting
            </label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {REASONS.map((r) => (
                <label
                  key={r.value}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '10px 12px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: reason === r.value ? 'var(--bg-butter)' : 'var(--bg-subtle)',
                    border: `1px solid ${reason === r.value ? 'var(--bg-butter-border)' : 'var(--border-light)'}`,
                    cursor: 'pointer',
                    fontSize: '13.5px',
                    fontWeight: reason === r.value ? 600 : 400,
                  }}
                >
                  <input
                    type="radio"
                    name="report_reason"
                    value={r.value}
                    checked={reason === r.value}
                    onChange={() => setReason(r.value)}
                    style={{ accentColor: 'var(--accent-coral)' }}
                  />
                  <span>{r.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, marginBottom: '6px', color: 'var(--text-primary)' }}>
              Additional Details (Optional)
            </label>
            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Provide any context that helps our moderators understand the issue..."
              rows={3}
              className="input-control"
              style={{ resize: 'none' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
            <Button type="button" variant="secondary" onClick={onClose} fullWidth>
              Cancel
            </Button>
            <Button type="submit" variant="primary" fullWidth>
              <Flag size={15} />
              Submit Report
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
};
