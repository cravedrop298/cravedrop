# CraveDrop | Mobile-First Social Food Discovery & Ordering Platform

> **Discover hot food drops in your city and order directly from the feed.**

CraveDrop is a mobile-first social food discovery platform where artisanal restaurants and chefs drop limited-time specials ("Food Drops") through short-form video and high-resolution photography, and foodies order directly from the content with Cash on Delivery (COD).

---

## 🌟 Key Product Features

### 1. Short-Form Food Feed with Real-Time Video
- Autoplay muted short-form food videos with one-tap sound toggle and play/pause.
- Rich food cards displaying kitchen avatar, verified badge, food dish, price tag, live countdown timer, and prominent **ORDER DROP** CTA.
- Floating social engagement: Likes, threaded comments, saves, and native sharing.
- Weighted V1 feed ranking algorithm factoring recency, engagement, user follows, and expiry urgency.

### 2. Time-Limited Food Post Expiry System (Core Feature)
- Every drop has a server-authoritative expiration timestamp (`expires_at`).
- Drop durations: **1 hour**, **3 hours**, **6 hours**, **12 hours**, **24 hours**, or **custom date + time**.
- Live countdown badge states:
  - `Available today` (> 6 hours remaining)
  - `Ends in 5h 32m` (< 6 hours remaining)
  - `Ends in 42m` (< 1 hour remaining)
  - `Ends in 08m` (Pulsing critical alert, < 10 mins remaining)
  - `Expired` (Orders strictly disabled, Order Now button disabled)
- **Zero-trust server validation**: Checkout strictly rejects expired drops even if frontend clock is tampered with.

### 3. Direct Ordering & Cart
- Tap **ORDER DROP** directly from the feed card to open the dish order modal.
- Customizable order notes and item quantity selector.
- **Single-restaurant cart model**: Prevents multi-kitchen delivery conflicts with friendly switch confirmation.
- Transparent price breakdown: Subtotal, delivery fee, special discount, and total.

### 4. Cash on Delivery (COD) Checkout & Order Tracking
- Simple and frictionless checkout: Name, phone number, delivery address, and delivery notes.
- Step-by-step live status tracking timeline:
  $$\text{Received} \longrightarrow \text{Accepted} \longrightarrow \text{Cooking} \longrightarrow \text{Ready} \longrightarrow \text{Out for Delivery} \longrightarrow \text{Delivered}$$
- Past orders history and post-delivery meal review system (star rating & comments).

### 5. Restaurant Partner Dashboard
- **Live Order Management**: Separate queues for New Orders (Accept / Reject), Active Orders (advance cooking & delivery status), Completed, and Cancelled.
- **Publish New Drop**: Upload food video/image, select menu dish, set availability window, and write promo caption.
- **Menu Management**: Add dishes, set prices, and toggle in-stock availability.
- **Kitchen Analytics**: Today's views, orders, revenue, followers count, and conversion rate per drop.

### 6. Admin Panel & Moderation
- Review pending moderation reports (spam, offensive, misleading food info).
- Take down violating posts and comments.
- Review and approve new restaurant partner applications.
- Platform GMV and drop engagement analytics.

### 7. Dual Language Support (English & Urdu)
- Instant toggle between English and Urdu (اردو).
- Automatic bidirectional layout switching (`ltr` and `rtl`) with authentic Urdu typography.

---

## 🎨 Visual Identity & Brand Direction

- **Light Theme Only**: No dark themes, neon colors, cyberpunk styling, or blue-heavy palettes.
- **Color Palette**:
  - Background: Warm cream (`#FAF7F2`)
  - Cards & Modals: Crisp white (`#FFFFFF`)
  - Primary CTA Accent: Warm coral-red (`#E24B36`)
  - Secondary Accent / Highlights: Warm amber (`#F59E0B`) and butter yellow (`#FEF7E4`)
  - Typography: Dark charcoal (`#1E242B`) with soft neutral gray secondary text (`#64748B`)
- **Typography**: `Plus Jakarta Sans` for modern warmth and `Noto Nastaliq Urdu` for Urdu text.

---

## 🚀 Quick Start & Local Development

### 1. Prerequisites
- Node.js v18+ (tested on Node v24)
- npm v9+

### 2. Installation
```bash
# Navigate to project directory
cd e:/Application

# Install dependencies
npm install

# Start local development server
npm run dev
```
Open **http://127.0.0.1:5173/** in your browser.

### 3. Production Build
```bash
npm run build
```

---

## 🧪 Testing Guide: Exploring All 3 User Roles

The top demo toolbar provides an interactive role switcher to test every persona instantly without logging out:

1. **Customer Role (`Hamza Khan`)**:
   - Scroll through the video feed, toggle audio, like and comment on drops.
   - Click **ORDER DROP** on any active post (e.g. *Truffle Burrata Hot Honey Pizza*).
   - Adjust quantity, add special instructions, add to bag, and complete Cash on Delivery checkout.
   - Click **Orders** tab in the bottom bar to watch the live order progress timeline.
   - Click **Profile** tab to view your saved drops (showing active vs expired statuses).

2. **Kitchen Partner Role (`Chef Marco / FireCrust`)**:
   - Click **Kitchen** in the top demo switcher.
   - View incoming orders in real time. Click **Accept Order**, then advance the status to *Cooking* and *Ready*.
   - Click the highlighted center **+ Drop** button to publish a new limited-time food drop with 1h/3h/6h/custom expiry.
   - Click **Analytics** tab to view conversion rates, drop views, and revenue.

3. **Admin Role (`Platform Moderator`)**:
   - Click **Admin** in the top demo switcher.
   - Review pending user reports in the moderation queue and take down content.
   - Approve new restaurant partner accounts.

4. **Expiry Verification**:
   - Look at the *Sizzle & Smoke* drop (expires in ~8 minutes with a pulsing urgency badge).
   - Look at the *Tokyo Bowl* drop (already expired: displays "Drop Expired" and ordering is strictly disabled).

---

## 📁 Repository Structure

```
e:/Application/
├── supabase/
│   └── migrations/
│       └── 20260926_initial_schema.sql  # Full PostgreSQL schema with 23 tables, RLS, triggers & cron
├── docs/
│   ├── ARCHITECTURE.md                  # System architecture, data flow & security
│   ├── DATABASE.md                      # Schema relationships, indexes & RLS policies
│   └── CLOUDFLARE_R2.md                 # Cloudflare R2 bucket setup & retention cleanup
├── src/
│   ├── config/
│   │   ├── brand.ts                     # Centralized branding, colors, naming, logo
│   │   └── env.ts                       # Environment variable helpers
│   ├── i18n/
│   │   ├── en.ts                        # English translations
│   │   ├── ur.ts                        # Urdu translations
│   │   └── index.tsx                    # Translation context & hook
│   ├── types/
│   │   └── index.ts                     # TypeScript data interfaces
│   ├── services/
│   │   ├── expiryService.ts             # Expiry calculation, live countdown formatting, validation
│   │   ├── orderService.ts              # Server-side pricing & expiry security validation
│   │   ├── feedAlgorithm.ts             # Weighted feed ranking algorithm
│   │   └── storageService.ts            # Cloudflare R2 / S3 upload & thumbnail extraction
│   ├── context/
│   │   ├── AuthContext.tsx              # User authentication & instant role switcher
│   │   ├── CartContext.tsx              # Single-restaurant cart state & validation
│   │   └── DataContext.tsx              # Master persistent store, real-time intervals & moderation
│   ├── components/
│   │   ├── common/                      # Button, Modal, BottomSheet, ExpiryCountdown, ReportModal
│   │   ├── navigation/                  # TopBar, BottomNav, SimulatorControls
│   │   ├── feed/                        # FeedView, FoodPostCard, CommentsBottomSheet, ShareModal
│   │   ├── product/                     # ProductOrderModal
│   │   ├── cart/                        # CartDrawer, CheckoutModal
│   │   ├── orders/                      # OrdersView
│   │   ├── explore/                     # ExploreView with multi-entity search
│   │   ├── restaurant/                  # RestaurantProfileView (Posts, Menu, Reviews, About)
│   │   ├── vendor/                      # VendorDashboard, CreateDropModal
│   │   ├── admin/                       # AdminDashboard
│   │   └── profile/                     # CustomerProfileView
│   ├── data/
│   │   └── seedData.ts                  # Realistic restaurants, products, drops, orders
│   ├── App.tsx                          # Root application component
│   └── index.css                        # Warm light design system tokens & utilities
├── package.json
└── vite.config.ts
```
