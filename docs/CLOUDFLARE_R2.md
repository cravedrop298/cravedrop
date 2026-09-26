# Cloudflare R2 Object Storage Integration Guide

CraveDrop leverages **Cloudflare R2** for cost-effective, egress-free global delivery of short-form food videos, high-resolution product imagery, and generated thumbnails.

---

## 1. Storage Architecture

```
Client App (React) 
   │
   ├── 1. Client-Side Validation (MIME type, max size)
   ├── 2. Canvas Thumbnail Extraction
   ├── 3. Pre-signed Upload URL Request ───► Supabase Edge Function / Backend
   │                                              │
   │                                              ▼
   ├── 4. Direct Upload (PUT) ─────────────► Cloudflare R2 Bucket
   │
   └── 5. Metadata & URL Persistence ──────► PostgreSQL Database
```

---

## 2. Environment Configuration

Add the following environment variables to your deployment environment or `.env` file:

```env
# Cloudflare R2 Configuration
VITE_R2_ENDPOINT=https://<ACCOUNT_ID>.r2.cloudflarestorage.com
VITE_R2_BUCKET_NAME=cravedrop-media
VITE_R2_PUBLIC_URL=https://media.cravedrop.food
R2_ACCESS_KEY_ID=<YOUR_R2_ACCESS_KEY>
R2_SECRET_ACCESS_KEY=<YOUR_R2_SECRET_KEY>
```

---

## 3. Media Upload Specifications

| Media Type | Allowed Formats | Max File Size | Generated Derivative |
|---|---|---|---|
| **Food Videos** | `video/mp4`, `video/webm`, `video/quicktime` | **50 MB** | 720p JPEG Poster Thumbnail |
| **Food Photos** | `image/jpeg`, `image/png`, `image/webp` | **8 MB** | WebP Compressed Asset |

### Client-Side Canvas Thumbnail Generation
Before uploading a video, the client extracts a representative frame using HTML5 Canvas (`generateVideoThumbnail()` in `src/services/storageService.ts`). This allows instant preview rendering in the feed without waiting for the video binary to download.

---

## 4. Media Expiry & Retention Cleanup Policy

When a food drop expires:
1. `posts.is_expired` is set to `true`.
2. The drop is removed from active feed queries and ordering is disabled.
3. Database metadata (likes, orders generated, views, revenue) is **permanently retained** for kitchen business analytics.
4. An automated Cloudflare R2 lifecycle rule or scheduled backend cleanup task purges the raw video binary from the bucket after the configured retention period (e.g. 14 days), optimizing storage overhead without losing order accounting records.
