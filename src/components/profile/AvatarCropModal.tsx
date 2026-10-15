import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, ZoomIn, ZoomOut, Check } from 'lucide-react';

interface AvatarCropModalProps {
  file: File;
  onSave: (blob: Blob) => void;
  onCancel: () => void;
}

const CANVAS_SIZE = 300;   // output resolution in px
const PREVIEW_SIZE = 256;  // visual circle diameter in px

export const AvatarCropModal: React.FC<AvatarCropModalProps> = ({ file, onSave, onCancel }) => {
  const [imgSrc, setImgSrc] = useState<string>('');
  const [imgNaturalW, setImgNaturalW] = useState(1);
  const [imgNaturalH, setImgNaturalH] = useState(1);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [scale, setScale] = useState(1);
  const [isSaving, setIsSaving] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const lastPointer = useRef<{ x: number; y: number } | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  // Keep a ref so drag callbacks always see the latest offset/scale
  const stateRef = useRef({ offsetX: 0, offsetY: 0, scale: 1, imgNaturalW: 1, imgNaturalH: 1 });
  stateRef.current = { offsetX, offsetY, scale, imgNaturalW, imgNaturalH };

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setImgSrc(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  // base scale = image fills the circle
  const computeMinScale = useCallback((nw: number, nh: number) => {
    const minDim = Math.min(nw, nh);
    return minDim > 0 ? PREVIEW_SIZE / minDim : 1;
  }, []);

  const handleImgLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    imgRef.current = img;
    const nw = img.naturalWidth;
    const nh = img.naturalHeight;
    setImgNaturalW(nw);
    setImgNaturalH(nh);
    const base = computeMinScale(nw, nh);
    setScale(base);
    setOffsetX(0);
    setOffsetY(0);
  };

  const dispW = imgNaturalW * scale;
  const dispH = imgNaturalH * scale;

  const clampOffset = useCallback(
    (ox: number, oy: number, s: number, nw: number, nh: number) => {
      const w = nw * s;
      const h = nh * s;
      const r = PREVIEW_SIZE / 2;
      const maxX = Math.max(0, w / 2 - r);
      const maxY = Math.max(0, h / 2 - r);
      return {
        x: Math.max(-maxX, Math.min(maxX, ox)),
        y: Math.max(-maxY, Math.min(maxY, oy)),
      };
    },
    []
  );

  const onPointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    lastPointer.current = { x: e.clientX, y: e.clientY };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!lastPointer.current) return;
    const dx = e.clientX - lastPointer.current.x;
    const dy = e.clientY - lastPointer.current.y;
    lastPointer.current = { x: e.clientX, y: e.clientY };
    const { offsetX: ox, offsetY: oy, scale: s, imgNaturalW: nw, imgNaturalH: nh } = stateRef.current;
    const clamped = clampOffset(ox + dx, oy + dy, s, nw, nh);
    setOffsetX(clamped.x);
    setOffsetY(clamped.y);
  };

  const onPointerUp = () => {
    setIsDragging(false);
    lastPointer.current = null;
  };

  const minScale = computeMinScale(imgNaturalW, imgNaturalH);
  const maxScale = minScale * 4;

  const handleZoom = useCallback((newScale: number) => {
    const { offsetX: ox, offsetY: oy, imgNaturalW: nw, imgNaturalH: nh } = stateRef.current;
    const clamped = Math.max(minScale, Math.min(maxScale, newScale));
    const { x, y } = clampOffset(ox, oy, clamped, nw, nh);
    setScale(clamped);
    setOffsetX(x);
    setOffsetY(y);
  }, [minScale, maxScale, clampOffset]);

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    handleZoom(stateRef.current.scale - e.deltaY * 0.001 * minScale);
  };

  const handleSave = () => {
    if (!imgRef.current || !imgSrc) return;
    setIsSaving(true);

    const canvas = document.createElement('canvas');
    canvas.width = CANVAS_SIZE;
    canvas.height = CANVAS_SIZE;
    const ctx = canvas.getContext('2d')!;

    // Clip to circle
    ctx.beginPath();
    ctx.arc(CANVAS_SIZE / 2, CANVAS_SIZE / 2, CANVAS_SIZE / 2, 0, Math.PI * 2);
    ctx.clip();

    // Map visual → source pixels
    // Image display centre is at (dispW/2 - offsetX, dispH/2 - offsetY) in natural px
    const srcCX = (dispW / 2 - offsetX) / scale;
    const srcCY = (dispH / 2 - offsetY) / scale;
    const srcRadius = (PREVIEW_SIZE / 2) / scale;

    ctx.drawImage(
      imgRef.current,
      srcCX - srcRadius, srcCY - srcRadius,
      srcRadius * 2, srcRadius * 2,
      0, 0,
      CANVAS_SIZE, CANVAS_SIZE
    );

    canvas.toBlob(
      (blob) => {
        setIsSaving(false);
        if (blob) onSave(blob);
      },
      'image/jpeg',
      0.93
    );
  };

  const sliderVal = Math.round(((scale - minScale) / Math.max(maxScale - minScale, 0.001)) * 1000);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.8)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        backdropFilter: 'blur(6px)',
      }}
    >
      <div
        style={{
          backgroundColor: '#1C1C1E',
          borderRadius: '24px',
          width: '100%',
          maxWidth: '340px',
          overflow: 'hidden',
          boxShadow: '0 32px 80px rgba(0,0,0,0.7)',
        }}
      >
        {/* ── Header ── */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 18px 14px',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
        }}>
          <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 800, color: '#FFF' }}>
            Crop Profile Photo
          </h3>
          <button onClick={onCancel} style={{
            width: '30px', height: '30px', borderRadius: '50%',
            background: 'rgba(255,255,255,0.1)', border: 'none',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: '#FFF',
          }}>
            <X size={15} />
          </button>
        </div>

        {/* ── Crop viewport ── */}
        <div
          style={{
            position: 'relative',
            width: '100%',
            height: `${PREVIEW_SIZE + 60}px`,
            backgroundColor: '#000',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            userSelect: 'none',
          }}
          onWheel={onWheel}
        >
          {/* Draggable image */}
          {imgSrc && (
            <div
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerLeave={onPointerUp}
              style={{
                position: 'absolute',
                cursor: isDragging ? 'grabbing' : 'grab',
                touchAction: 'none',
                width: `${dispW}px`,
                height: `${dispH}px`,
                transform: `translate(${offsetX}px, ${offsetY}px)`,
              }}
            >
              <img
                src={imgSrc}
                onLoad={handleImgLoad}
                draggable={false}
                style={{
                  width: '100%',
                  height: '100%',
                  display: 'block',
                  pointerEvents: 'none',
                }}
              />
            </div>
          )}

          {/* Dark radial mask — dims everything outside circle */}
          <div style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            background: `radial-gradient(
              circle ${PREVIEW_SIZE / 2}px at 50% 50%,
              transparent ${PREVIEW_SIZE / 2 - 1}px,
              rgba(0,0,0,0.75) ${PREVIEW_SIZE / 2}px
            )`,
          }} />

          {/* Circle guide ring */}
          <div style={{
            position: 'absolute',
            width: `${PREVIEW_SIZE}px`,
            height: `${PREVIEW_SIZE}px`,
            borderRadius: '50%',
            border: '2px solid rgba(255,255,255,0.5)',
            pointerEvents: 'none',
            boxShadow: '0 0 0 1px rgba(0,0,0,0.4)',
          }} />

          {/* Crosshair guides inside circle */}
          <div style={{
            position: 'absolute',
            width: `${PREVIEW_SIZE}px`,
            height: '1px',
            background: 'rgba(255,255,255,0.12)',
            pointerEvents: 'none',
          }} />
          <div style={{
            position: 'absolute',
            height: `${PREVIEW_SIZE}px`,
            width: '1px',
            background: 'rgba(255,255,255,0.12)',
            pointerEvents: 'none',
          }} />

          {/* Hint text */}
          <p style={{
            position: 'absolute',
            bottom: '8px',
            left: 0, right: 0,
            textAlign: 'center',
            fontSize: '10.5px',
            color: 'rgba(255,255,255,0.38)',
            pointerEvents: 'none',
            margin: 0,
          }}>
            Drag to reposition · Scroll or pinch to zoom
          </p>
        </div>

        {/* ── Zoom slider ── */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          padding: '14px 18px 4px',
        }}>
          <button
            onClick={() => handleZoom(stateRef.current.scale - minScale * 0.2)}
            style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.55)', cursor: 'pointer', padding: '4px', display: 'flex' }}
          >
            <ZoomOut size={17} />
          </button>
          <input
            type="range"
            min={0}
            max={1000}
            value={sliderVal}
            onChange={(e) => {
              const t = Number(e.target.value) / 1000;
              handleZoom(minScale + t * (maxScale - minScale));
            }}
            style={{ flex: 1, accentColor: '#E2614A', cursor: 'pointer' }}
          />
          <button
            onClick={() => handleZoom(stateRef.current.scale + minScale * 0.2)}
            style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.55)', cursor: 'pointer', padding: '4px', display: 'flex' }}
          >
            <ZoomIn size={17} />
          </button>
        </div>

        {/* ── Action buttons ── */}
        <div style={{ display: 'flex', gap: '10px', padding: '12px 18px 18px' }}>
          <button
            onClick={onCancel}
            style={{
              flex: 1, height: '44px', borderRadius: '12px',
              border: '1px solid rgba(255,255,255,0.13)',
              background: 'rgba(255,255,255,0.06)',
              color: 'rgba(255,255,255,0.7)',
              fontSize: '14px', fontWeight: 700, cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || !imgSrc}
            style={{
              flex: 2, height: '44px', borderRadius: '12px',
              border: 'none',
              background: isSaving
                ? 'rgba(226,97,74,0.45)'
                : 'linear-gradient(135deg, #E2614A 0%, #F4956A 100%)',
              color: '#FFF',
              fontSize: '14px', fontWeight: 800,
              cursor: isSaving ? 'wait' : 'pointer',
              display: 'flex', alignItems: 'center',
              justifyContent: 'center', gap: '8px',
              boxShadow: isSaving ? 'none' : '0 4px 14px rgba(226,97,74,0.4)',
            }}
          >
            {isSaving ? (
              <>
                <div style={{
                  width: '14px', height: '14px',
                  border: '2px solid rgba(255,255,255,0.3)',
                  borderTopColor: '#FFF', borderRadius: '50%',
                  animation: 'spin 0.7s linear infinite',
                }} />
                Saving…
              </>
            ) : (
              <>
                <Check size={16} />
                Save Photo
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
