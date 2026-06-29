# ZAPHERA COFTAN - DTC Store Documentation

This document describes the complete architecture, setup, and deployment process for the **ZAPHERA COFTAN** DTC e-commerce store. It is optimized for high conversions (12/10 CRO) in Saudi Arabia (KSA) with Cash on Delivery (COD) payment flow, deferred browser pixels, and Conversions API (CAPI) deduplication.

---

## 1. Project Architecture

The project consists of three main components:
1. **Frontend (Vite + Vanilla JS)**: A fast static storefront that implements high-converting design systems, product detail selectors, and the checkout form. 
2. **Backend (Node.js + Express + PostgreSQL)**: An API server that handles checkout submissions, stores orders and products, uploads images, and dispatches server-side CAPI events.
3. **Google Sheets Integration**: A Google Apps Script webhook syncing orders and statuses from the database in real-time.

---

## 2. Technical Stack

- **Core**: HTML5, Vanilla CSS3 (luxury black & liquid gold theme), Vanilla JS.
- **Frontend Compiler**: Vite.
- **Backend API**: Express.js, Multer (for image uploads), PG (PostgreSQL client), Axios (CAPI & Webhooks).
- **Database**: PostgreSQL (v15-alpine).
- **Deployment**: Dockerized with multi-stage builds, orchestrated via Docker Compose and configured for Easypanel deployment.

---

## 3. Database Schema

### `collections` Table
Stores product categories (e.g. Caftans, Karakou).
```sql
CREATE TABLE collections (
  id SERIAL PRIMARY KEY,
  slug VARCHAR(100) UNIQUE NOT NULL,
  name_ar VARCHAR(255) NOT NULL,
  name_en VARCHAR(255) NOT NULL,
  description_ar TEXT,
  description_en TEXT,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### `products` Table
Stores product items.
```sql
CREATE TABLE products (
  id SERIAL PRIMARY KEY,
  slug VARCHAR(100) UNIQUE NOT NULL,
  name_ar VARCHAR(255) NOT NULL,
  name_en VARCHAR(255) NOT NULL,
  description_ar TEXT,
  description_en TEXT,
  price DECIMAL(10, 2) NOT NULL,
  old_price DECIMAL(10, 2),
  image_url TEXT NOT NULL,
  images TEXT[] DEFAULT '{}',
  collection_id INTEGER REFERENCES collections(id) ON DELETE SET NULL,
  video_url TEXT,
  sizes TEXT[] DEFAULT '{"S", "M", "L", "XL", "XXL"}',
  colors TEXT[] DEFAULT '{}',
  in_stock BOOLEAN NOT NULL DEFAULT TRUE,
  is_featured BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### `orders` Table
Stores customer purchases.
```sql
CREATE TABLE orders (
  order_id VARCHAR(50) PRIMARY KEY,
  customer_name VARCHAR(255) NOT NULL,
  phone VARCHAR(50) NOT NULL,
  alt_phone VARCHAR(50),
  city VARCHAR(100) NOT NULL,
  region VARCHAR(100),
  address TEXT NOT NULL,
  product_name VARCHAR(255) NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  total_price DECIMAL(10, 2) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'shipped', 'delivered', 'rto')),
  payment_method VARCHAR(50) NOT NULL DEFAULT 'COD',
  tiktok_event_id VARCHAR(100),
  snap_event_id VARCHAR(100),
  utm_source VARCHAR(100),
  utm_medium VARCHAR(100),
  utm_campaign VARCHAR(100),
  notes TEXT,
  product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

---

## 4. Pixel Tracking & CAPI Deduplication Flow

To ensure 100% accurate conversion tracking for Snapchat and TikTok Ads, we implement 1:1 deduplication:
1. **Deferred Pixels**: To maximize PageSpeed and CRO, browser pixels (Snap & TikTok SDKs) are deferred by 1.5s or loaded immediately upon any user scroll/interaction.
2. **Event IDs Generation**: When the user clicks "Confirm Order", the browser generates two unique Event IDs (`tt_pur_xxx` and `snap_pur_xxx`) and fires the browser-side `Purchase` event.
3. **Server API Payload**: These unique Event IDs, along with client context (IP, User-Agent, and normalized phone number), are sent to the backend `POST /api/orders` API.
4. **Server CAPI Dispatch**: The backend immediately dispatches Snapchat CAPI and TikTok CAPI events using the **same** Event IDs, matching them perfectly.

---

## 5. Environment Variables & Deployment

### Backend `.env`
Set these variables inside your Easypanel deployment portal:
```env
PORT=5000
DATABASE_URL=postgres://ZAPHIRACOFTAN_database:securepassword123@database:5432/ZAPHIRACOFTAN?sslmode=disable
ADMIN_TOKEN=your_secure_dashboard_admin_token_here
GOOGLE_SHEET_WEBHOOK_URL=https://script.google.com/macros/s/XXXXX/exec
SNAP_PIXEL_ID=your_snap_pixel_id
SNAP_ACCESS_TOKEN=your_snap_capi_token
TIKTOK_PIXEL_ID=your_tiktok_pixel_id
TIKTOK_ACCESS_TOKEN=your_tiktok_capi_token
```

### Frontend `.env`
```env
VITE_API_URL=https://api.zapheracoftan.shop
VITE_TIKTOK_PIXEL_ID=your_tiktok_pixel_id
VITE_SNAP_PIXEL_ID=your_snap_pixel_id
VITE_ADMIN_TOKEN=your_secure_dashboard_admin_token_here
```

---

## 6. How to Run Locally

1. **Verify Ports**: 
   - Port `8080` might be occupied by other projects (e.g. `ANABEAUTY`). Use port `5173` for testing this project locally.
2. **Start Backend**:
   - Navigate to `/backend`
   - Run `npm install`
   - Copy `.env.example` to `.env` and fill the database connection details.
   - Run `npm run dev` (starts on `http://localhost:5000`)
3. **Start Frontend**:
   - Navigate to `/frontend`
   - Run `npm install`
   - Copy `.env.example` to `.env` (configured to `VITE_API_URL=http://localhost:5000`)
   - Run `npm run dev` (starts on `http://localhost:5173`)
4. **Access the Application**:
   - Storefront: [http://localhost:5173](http://localhost:5173)
   - Custom ZAPHERA Catalog Manager: [http://localhost:5173/zaphera.html](http://localhost:5173/zaphera.html)
   - Legacy Order Confirmation Dashboard: [http://localhost:5173/admin.html](http://localhost:5173/admin.html)
