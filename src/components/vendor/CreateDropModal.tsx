import React, { useState } from 'react';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { useTranslation } from '../../i18n';
import { ExpiryDurationOption, Product } from '../../types';
import { calculateExpiryTimestamp } from '../../services/expiryService';
import { uploadMediaToR2 } from '../../services/storageService';
import { UploadCloud, Clock, Sparkles, AlertCircle, CheckCircle2, Film, Image as ImageIcon } from 'lucide-react';

interface CreateDropModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CreateDropModal: React.FC<CreateDropModalProps> = ({ isOpen, onClose }) => {
  const { products, createFoodPost } = useData();
  const { user } = useAuth();
  const { t } = useTranslation();

  const restaurantProducts = products.filter(
    (p) => p.restaurant_id === (user?.restaurant_id || 'rest-1')
  );

  const [selectedProductId, setSelectedProductId] = useState(restaurantProducts[0]?.id || '');
  const [caption, setCaption] = useState('');
  const [expiryOption, setExpiryOption] = useState<ExpiryDurationOption>('3h');
  const [customExpiryDate, setCustomExpiryDate] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [mediaPreviewUrl, setMediaPreviewUrl] = useState('');
  const [thumbnailPreviewUrl, setThumbnailPreviewUrl] = useState('');
  const [mediaType, setMediaType] = useState<'video' | 'image'>('video');
  const [errorMessage, setErrorMessage] = useState('');
  const [successDropId, setSuccessDropId] = useState<string | null>(null);

  // File drop/selection handler
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      setErrorMessage('');
      const uploadRes = await uploadMediaToR2(file, user?.restaurant_id || 'rest-1');
      setMediaPreviewUrl(uploadRes.mediaUrl);
      setThumbnailPreviewUrl(uploadRes.thumbnailUrl);
      setMediaType(uploadRes.mediaType);
      setIsUploading(false);
    } catch (err: any) {
      setIsUploading(false);
      setErrorMessage(err.message || 'Media upload failed.');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId) {
      setErrorMessage('Please select a food menu item.');
      return;
    }

    if (!caption.trim()) {
      setErrorMessage('Please write a short caption or story for this drop.');
      return;
    }

    if (!mediaPreviewUrl) {
      // Use fallback appetizing sample video if tester didn't upload a file
      const defaultMedia =
        'https://assets.mixkit.co/videos/preview/mixkit-putting-cheese-on-a-pizza-42998-large.mp4';
      const defaultThumb =
        'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800';

      const expiresAt = calculateExpiryTimestamp(expiryOption, customExpiryDate);

      const created = createFoodPost({
        productId: selectedProductId,
        caption: caption.trim(),
        mediaUrl: defaultMedia,
        mediaType: 'video',
        thumbnailUrl: defaultThumb,
        expiresAt,
        tags: ['#ChefDrop', '#FreshHot', '#SpecialWindow'],
      });

      setSuccessDropId(created.id);
      return;
    }

    const expiresAt = calculateExpiryTimestamp(expiryOption, customExpiryDate);

    const created = createFoodPost({
      productId: selectedProductId,
      caption: caption.trim(),
      mediaUrl: mediaPreviewUrl,
      mediaType,
      thumbnailUrl: thumbnailPreviewUrl || mediaPreviewUrl,
      expiresAt,
      tags: ['#ChefDrop', '#FreshHot', '#SpecialWindow'],
    });

    setSuccessDropId(created.id);
  };

  const handleFinish = () => {
    setSuccessDropId(null);
    setCaption('');
    setMediaPreviewUrl('');
    setErrorMessage('');
    onClose();
  };

  const selectedProduct = restaurantProducts.find((p) => p.id === selectedProductId);

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleFinish}
      title={successDropId ? 'Food Drop Published!' : t('create_drop_title')}
      subtitle={
        successDropId
          ? 'Your drop is now live on the customer feed with a ticking timer.'
          : 'Upload short food video/photo and set your availability window'
      }
    >
      {successDropId ? (
        <div style={{ textAlign: 'center', padding: '24px 8px' }}>
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              backgroundColor: 'var(--accent-green-light)',
              color: 'var(--accent-green)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 14px',
            }}
          >
            <CheckCircle2 size={36} />
          </div>

          <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '6px' }}>
            Live in Customer Feeds!
          </h3>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '20px' }}>
            Orders are now open until your chosen expiry window expires.
          </p>

          <Button variant="primary" fullWidth size="lg" onClick={handleFinish}>
            View Live Feed
          </Button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {errorMessage && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 12px',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: '#FEF2F2',
                border: '1px solid #FECACA',
                color: '#DC2626',
                fontSize: '12.5px',
              }}
            >
              <AlertCircle size={15} />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* 1. Select Menu Item */}
          <div>
            <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>
              1. {t('select_product')}
            </label>
            <select
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              className="input-control"
              style={{ fontWeight: 600 }}
            >
              {restaurantProducts.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — ${p.price.toFixed(2)} ({p.category})
                </option>
              ))}
            </select>
          </div>

          {/* 2. Media Upload / Preview */}
          <div>
            <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>
              2. Food Video or Photo (MP4/WebM or JPG/PNG)
            </label>

            {mediaPreviewUrl ? (
              <div
                style={{
                  position: 'relative',
                  width: '100%',
                  height: '170px',
                  borderRadius: 'var(--radius-md)',
                  overflow: 'hidden',
                  backgroundColor: '#000',
                }}
              >
                {mediaType === 'video' ? (
                  <video
                    src={mediaPreviewUrl}
                    controls
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <img
                    src={mediaPreviewUrl}
                    alt="Preview"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                )}
                <button
                  type="button"
                  onClick={() => setMediaPreviewUrl('')}
                  style={{
                    position: 'absolute',
                    top: '8px',
                    right: '8px',
                    backgroundColor: 'rgba(0,0,0,0.6)',
                    color: 'white',
                    padding: '4px 8px',
                    borderRadius: '8px',
                    fontSize: '11px',
                    fontWeight: 700,
                  }}
                >
                  Change Media
                </button>
              </div>
            ) : (
              <label
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '24px 16px',
                  borderRadius: 'var(--radius-md)',
                  border: '2px dashed var(--border-medium)',
                  backgroundColor: 'var(--bg-subtle)',
                  cursor: 'pointer',
                  textAlign: 'center',
                }}
              >
                <input
                  type="file"
                  accept="video/mp4,video/webm,image/jpeg,image/png,image/webp"
                  onChange={handleFileChange}
                  style={{ display: 'none' }}
                />
                <UploadCloud size={32} color="var(--accent-coral)" />
                <div>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--accent-coral)' }}>
                    Tap to upload food video or image
                  </span>
                  <p style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    Videos up to 50MB, images up to 8MB (Cloudflare R2 Object Storage)
                  </p>
                </div>
                <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'var(--text-secondary)' }}>
                    <Film size={12} /> MP4 / WebM
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: 'var(--text-secondary)' }}>
                    <ImageIcon size={12} /> High-Res Photos
                  </span>
                </div>
              </label>
            )}
          </div>

          {/* 3. Expiry Window Selection (Core Feature!) */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
              <Clock size={15} color="var(--accent-coral)" />
              <label style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--text-primary)' }}>
                3. {t('expiry_window')} (Required)
              </label>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '6px' }}>
              {(['1h', '3h', '6h', '12h', '24h'] as ExpiryDurationOption[]).map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setExpiryOption(opt)}
                  style={{
                    padding: '8px 4px',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '12.5px',
                    fontWeight: 700,
                    backgroundColor: expiryOption === opt ? 'var(--accent-coral)' : 'var(--bg-subtle)',
                    color: expiryOption === opt ? '#FFFFFF' : 'var(--text-primary)',
                    border: `1px solid ${expiryOption === opt ? 'var(--accent-coral)' : 'var(--border-light)'}`,
                    transition: 'all 0.15s ease',
                  }}
                >
                  {opt}
                </button>
              ))}
            </div>

            {/* Custom Date + Time Option */}
            <div style={{ marginTop: '8px' }}>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  marginBottom: '4px',
                }}
              >
                <input
                  type="radio"
                  name="custom_expiry"
                  checked={expiryOption === 'custom'}
                  onChange={() => setExpiryOption('custom')}
                  style={{ accentColor: 'var(--accent-coral)' }}
                />
                <span>Or select custom date & time</span>
              </label>

              {expiryOption === 'custom' && (
                <input
                  type="datetime-local"
                  required
                  value={customExpiryDate}
                  onChange={(e) => setCustomExpiryDate(e.target.value)}
                  className="input-control"
                  style={{ fontSize: '13px' }}
                />
              )}
            </div>
          </div>

          {/* 4. Drop Caption & Promo Story */}
          <div>
            <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>
              4. {t('drop_caption')}
            </label>
            <textarea
              rows={3}
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="e.g. Sizzling out of our wood oven right now! 20 pies available until 8 PM..."
              className="input-control"
              style={{ resize: 'none', fontSize: '13px' }}
            />
          </div>

          {/* Submit Action */}
          <Button type="submit" variant="primary" fullWidth size="lg" disabled={isUploading}>
            <Sparkles size={17} />
            <span>{t('publish_drop')}</span>
          </Button>
        </form>
      )}
    </Modal>
  );
};
