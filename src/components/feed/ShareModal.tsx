import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { FoodPost } from '../../types';
import { Copy, Check, Share2, Send, MessageCircle } from 'lucide-react';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  post: FoodPost | null;
}

export const ShareModal: React.FC<ShareModalProps> = ({ isOpen, onClose, post }) => {
  const [copied, setCopied] = useState(false);

  if (!post) return null;

  const shareUrl = `${window.location.origin}/?drop=${post.id}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${post.product_name} - CraveDrop`,
          text: `Check out this limited-time food drop from ${post.restaurant_name}!`,
          url: shareUrl,
        });
      } catch {
        // User cancelled or unsupported
      }
    } else {
      handleCopy();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Share Food Drop"
      subtitle={`Share "${post.product_name}" with friends before it expires!`}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Post Preview Miniature */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '10px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--bg-subtle)',
            border: '1px solid var(--border-light)',
          }}
        >
          <img
            src={post.thumbnail_url}
            alt={post.product_name}
            style={{ width: '60px', height: '60px', borderRadius: 'var(--radius-sm)', objectFit: 'cover' }}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <h4 style={{ fontSize: '14px', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {post.product_name}
            </h4>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{post.restaurant_name}</p>
            <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--accent-coral)' }}>
              ${post.product_price.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Shareable Link Box */}
        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
            Unique Drop Link
          </label>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              backgroundColor: 'var(--bg-subtle)',
              border: '1px solid var(--border-light)',
              borderRadius: 'var(--radius-md)',
              padding: '6px 8px 6px 12px',
            }}
          >
            <input
              type="text"
              readOnly
              value={shareUrl}
              style={{
                flex: 1,
                border: 'none',
                background: 'transparent',
                fontSize: '12px',
                color: 'var(--text-primary)',
              }}
            />
            <Button size="sm" variant={copied ? 'secondary' : 'primary'} onClick={handleCopy}>
              {copied ? <Check size={14} color="var(--accent-green)" /> : <Copy size={14} />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </Button>
          </div>
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: '10px' }}>
          <Button variant="primary" fullWidth onClick={handleNativeShare}>
            <Share2 size={16} />
            <span>Share via Apps</span>
          </Button>
          <Button
            variant="secondary"
            fullWidth
            onClick={() => {
              const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(`Check out this hot food drop on CraveDrop: ${post.product_name} from ${post.restaurant_name} ${shareUrl}`)}`;
              window.open(whatsappUrl, '_blank');
            }}
          >
            <MessageCircle size={16} color="#15803D" />
            <span>WhatsApp</span>
          </Button>
        </div>
      </div>
    </Modal>
  );
};
