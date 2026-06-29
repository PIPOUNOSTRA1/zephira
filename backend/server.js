const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const axios = require('axios');
const db = require('./db');
const capi = require('./capi');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Enable trust proxy so we can extract the correct client IP for CAPI behind Easypanel/Nginx
app.set('trust proxy', true);

// Middlewares
app.use(cors());
app.use(express.json());

// Set up uploads directory statically
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}
app.use('/uploads', express.static(uploadsDir));

// Multer Storage Configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

// Rate Limiting to prevent automated bot spam on checkouts
const orderLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 order submissions per window
  message: { success: false, error: 'Too many order attempts. Please try again in 15 minutes.' }
});

// Middleware to authenticate admin dashboard routes
function authenticateAdmin(req, res, next) {
  const authHeader = req.headers.authorization;
  const adminToken = process.env.ADMIN_TOKEN;
  
  console.log('--- ADMIN AUTHENTICATION CHECK ---');
  console.log('Incoming Authorization Header:', authHeader);
  console.log('Expected ADMIN_TOKEN:', adminToken);
  
  if (!adminToken) {
    console.error('ERROR: ADMIN_TOKEN is missing in process.env!');
    return res.status(500).json({ success: false, error: 'Admin configuration token is missing on server.' });
  }
  
  if (!authHeader) {
    console.warn('WARN: Authorization header is missing completely.');
    return res.status(401).json({ success: false, error: 'Unauthorized dashboard access.' });
  }

  if (!authHeader.startsWith('Bearer ')) {
    console.warn('WARN: Authorization header does not start with "Bearer ".');
    return res.status(401).json({ success: false, error: 'Unauthorized dashboard access.' });
  }

  const token = authHeader.split(' ')[1];
  if (token !== adminToken) {
    console.warn(`WARN: Token mismatch! Received "${token}", expected "${adminToken}".`);
    return res.status(401).json({ success: false, error: 'Unauthorized dashboard access.' });
  }
  
  console.log('Admin Authenticated Successfully.');
  next();
}

/**
 * Health Check Endpoint
 */
app.get('/api/health', (req, res) => {
  res.json({ status: 'healthy', time: new Date() });
});

/**
 * Verify Admin Token Endpoint
 */
app.get('/api/admin/verify', authenticateAdmin, (req, res) => {
  res.json({ success: true, message: 'Authenticated' });
});

/**
 * Create Order Endpoint (Public Checkout)
 */
app.post('/api/orders', orderLimiter, async (req, res) => {
  const {
    customer_name,
    phone,
    alt_phone,
    city,
    region,
    address,
    product_name,
    quantity,
    total_price,
    tiktok_event_id,
    snap_event_id,
    utm_source,
    utm_medium,
    utm_campaign,
    notes,
    product_id
  } = req.body;

  // Basic Input Validation
  if (!customer_name || !phone || !city || !address || !product_name || !total_price) {
    return res.status(400).json({ success: false, error: 'Missing required order details.' });
  }

  // Enforce/Normalize phone number format for Algeria
  const normalizedPhone = capi.formatAlgerianPhone(phone);
  if (!normalizedPhone || normalizedPhone.length < 10) {
    return res.status(400).json({ success: false, error: 'Invalid phone format. Please enter a valid Algerian phone number.' });
  }

  try {
    // Generate sequential order ID (e.g., ZAPH-1001, ZAPH-1002...)
    const countRes = await db.query('SELECT COUNT(*) FROM orders');
    const orderCount = parseInt(countRes.rows[0].count);
    const orderId = `ZAPH-${1000 + orderCount + 1}`;

    const queryText = `
      INSERT INTO orders (
        order_id, customer_name, phone, alt_phone, city, region, address, 
        product_name, quantity, total_price, status, payment_method, 
        tiktok_event_id, snap_event_id, utm_source, utm_medium, utm_campaign, notes, product_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
      RETURNING *
    `;

    const values = [
      orderId,
      customer_name,
      normalizedPhone,
      alt_phone ? capi.formatAlgerianPhone(alt_phone) : null,
      city,
      region || '',
      address,
      product_name,
      quantity || 1,
      total_price,
      'pending', // All orders start as "pending confirmation" for COD
      'COD',
      tiktok_event_id,
      snap_event_id,
      utm_source,
      utm_medium,
      utm_campaign,
      notes,
      product_id ? parseInt(product_id) : null
    ];

    const result = await db.query(queryText, values);
    const savedOrder = result.rows[0];

    // Get client details for conversions matching
    const clientIp = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const clientUa = req.headers['user-agent'];

    // 1. Dispatch Snapchat and TikTok Conversions API (CAPI) events in background
    capi.trackPurchase(savedOrder, clientIp, clientUa);

    // 2. Dispatch to Google Sheets Webhook in background
    if (process.env.GOOGLE_SHEET_WEBHOOK_URL) {
      axios.post(process.env.GOOGLE_SHEET_WEBHOOK_URL, {
        action: 'create',
        order: savedOrder
      }).catch(err => {
        console.error('Google Sheets Sync Fail:', err.message);
      });
    }

    res.status(201).json({
      success: true,
      message: 'Order placed successfully. Awaiting confirmation.',
      order_id: orderId
    });

  } catch (error) {
    console.error('Order creation error:', error);
    res.status(500).json({ success: false, error: 'Internal server error while placing order.' });
  }
});

/**
 * Get Orders (Admin Dashboard - Authenticated)
 */
app.get('/api/admin/orders', authenticateAdmin, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const offset = parseInt(req.query.offset) || 0;
    const status = req.query.status;

    let queryText = 'SELECT * FROM orders';
    const values = [];

    if (status) {
      queryText += ' WHERE status = $1';
      values.push(status);
    }

    queryText += ' ORDER BY created_at DESC LIMIT $' + (values.length + 1) + ' OFFSET $' + (values.length + 2);
    values.push(limit, offset);

    const result = await db.query(queryText, values);
    res.json({ success: true, orders: result.rows });
  } catch (error) {
    console.error('Fetch orders error:', error);
    res.status(500).json({ success: false, error: 'Database query failed.' });
  }
});

/**
 * Update Order Status (Admin Dashboard - Authenticated)
 */
app.patch('/api/admin/orders/:id', authenticateAdmin, async (req, res) => {
  const orderId = req.params.id;
  const { status } = req.body;

  const validStatuses = ['pending', 'confirmed', 'cancelled', 'shipped', 'delivered', 'rto'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ success: false, error: 'Invalid order status.' });
  }

  try {
    const queryText = `
      UPDATE orders
      SET status = $1, updated_at = CURRENT_TIMESTAMP
      WHERE order_id = $2
      RETURNING *
    `;
    const result = await db.query(queryText, [status, orderId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Order not found.' });
    }

    const updatedOrder = result.rows[0];

    // Sync state update to Google Sheet in background
    if (process.env.GOOGLE_SHEET_WEBHOOK_URL) {
      axios.post(process.env.GOOGLE_SHEET_WEBHOOK_URL, {
        action: 'update',
        order_id: orderId,
        status: status
      }).catch(err => {
        console.error('Google Sheets Sync Update Fail:', err.message);
      });
    }

    res.json({ success: true, order: updatedOrder });
  } catch (error) {
    console.error('Update order error:', error);
    res.status(500).json({ success: false, error: 'Database update failed.' });
  }
});

/**
 * Analytics Dashboard Stats (Admin Dashboard - Authenticated)
 */
app.get('/api/admin/stats', authenticateAdmin, async (req, res) => {
  try {
    const statsQuery = `
      SELECT 
        COUNT(*) as total_orders,
        COALESCE(SUM(total_price), 0) as total_revenue,
        COALESCE(AVG(total_price), 0) as aov,
        COUNT(CASE WHEN status IN ('confirmed', 'shipped', 'delivered') THEN 1 END) as confirmed_orders,
        COUNT(CASE WHEN status = 'delivered' THEN 1 END) as delivered_orders,
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_orders,
        COUNT(CASE WHEN status = 'rto' THEN 1 END) as rto_orders,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_orders
      FROM orders
    `;
    
    const cityQuery = `
      SELECT city, COUNT(*) as count, SUM(total_price) as revenue 
      FROM orders 
      GROUP BY city 
      ORDER BY count DESC 
      LIMIT 5
    `;

    const [statsResult, cityResult] = await Promise.all([
      db.query(statsQuery),
      db.query(cityQuery)
    ]);

    const stats = statsResult.rows[0];
    const topCities = cityResult.rows;

    const total = parseInt(stats.total_orders);
    const confirmed = parseInt(stats.confirmed_orders);
    const delivered = parseInt(stats.delivered_orders);
    const rto = parseInt(stats.rto_orders);
    const cancelled = parseInt(stats.cancelled_orders);

    // Calculate KSA operational metrics
    const confirmationRate = total > 0 ? ((confirmed / total) * 100).toFixed(1) : 0;
    const closedOutOrders = delivered + rto;
    const deliveryRate = closedOutOrders > 0 ? ((delivered / closedOutOrders) * 100).toFixed(1) : 0;
    const rtoRate = closedOutOrders > 0 ? ((rto / closedOutOrders) * 100).toFixed(1) : 0;

    res.json({
      success: true,
      summary: {
        total_orders: total,
        total_revenue: parseFloat(stats.total_revenue).toFixed(2),
        aov: parseFloat(stats.aov).toFixed(2),
        pending: parseInt(stats.pending_orders),
        confirmed: confirmed,
        delivered: delivered,
        cancelled: cancelled,
        rto: rto,
        confirmation_rate_pct: parseFloat(confirmationRate),
        delivery_rate_pct: parseFloat(deliveryRate),
        rto_rate_pct: parseFloat(rtoRate)
      },
      top_cities: topCities
    });

  } catch (error) {
    console.error('Stats query error:', error);
    res.status(500).json({ success: false, error: 'Database analytics failed.' });
  }
});

/**
 * File Upload Endpoint (Admin Dashboard - Authenticated)
 */
app.post('/api/admin/upload', authenticateAdmin, upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ success: false, error: 'No file uploaded.' });
  }
  const fileUrl = `/uploads/${req.file.filename}`;
  res.json({ success: true, fileUrl });
});

/**
 * Public Collections APIs
 */
app.get('/api/collections', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM collections ORDER BY id ASC');
    res.json({ success: true, collections: result.rows });
  } catch (error) {
    console.error('Fetch collections error:', error);
    res.status(500).json({ success: false, error: 'Database query failed.' });
  }
});

app.get('/api/collections/:slug', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM collections WHERE slug = $1', [req.params.slug]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Collection not found.' });
    }
    res.json({ success: true, collection: result.rows[0] });
  } catch (error) {
    console.error('Fetch collection error:', error);
    res.status(500).json({ success: false, error: 'Database query failed.' });
  }
});

/**
 * Admin Collections Management APIs (Authenticated)
 */
app.post('/api/admin/collections', authenticateAdmin, async (req, res) => {
  const { slug, name_ar, name_en, description_ar, description_en, image_url } = req.body;
  if (!slug || !name_ar || !name_en) {
    return res.status(400).json({ success: false, error: 'Missing required collection fields.' });
  }
  try {
    const queryText = `
      INSERT INTO collections (slug, name_ar, name_en, description_ar, description_en, image_url)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    const result = await db.query(queryText, [slug, name_ar, name_en, description_ar || '', description_en || '', image_url || '']);
    res.status(201).json({ success: true, collection: result.rows[0] });
  } catch (error) {
    console.error('Add collection error:', error);
    res.status(500).json({ success: false, error: 'Database insert failed (slug might already exist).' });
  }
});

app.put('/api/admin/collections/:id', authenticateAdmin, async (req, res) => {
  const collectionId = req.params.id;
  const { slug, name_ar, name_en, description_ar, description_en, image_url } = req.body;
  if (!slug || !name_ar || !name_en) {
    return res.status(400).json({ success: false, error: 'Missing required collection fields.' });
  }
  try {
    const queryText = `
      UPDATE collections
      SET slug = $1, name_ar = $2, name_en = $3, description_ar = $4, description_en = $5, image_url = $6, updated_at = CURRENT_TIMESTAMP
      WHERE id = $7
      RETURNING *
    `;
    const result = await db.query(queryText, [slug, name_ar, name_en, description_ar || '', description_en || '', image_url || '', collectionId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Collection not found.' });
    }
    res.json({ success: true, collection: result.rows[0] });
  } catch (error) {
    console.error('Update collection error:', error);
    res.status(500).json({ success: false, error: 'Database update failed.' });
  }
});

app.delete('/api/admin/collections/:id', authenticateAdmin, async (req, res) => {
  const collectionId = req.params.id;
  try {
    const result = await db.query('DELETE FROM collections WHERE id = $1 RETURNING *', [collectionId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Collection not found.' });
    }
    res.json({ success: true, message: 'Collection deleted successfully.' });
  } catch (error) {
    console.error('Delete collection error:', error);
    res.status(500).json({ success: false, error: 'Database delete failed.' });
  }
});

/**
 * Public Products APIs
 */
app.get('/api/products', async (req, res) => {
  try {
    const { collection_id, slug, is_featured } = req.query;
    let queryText = 'SELECT p.*, c.name_ar as collection_name_ar, c.name_en as collection_name_en FROM products p LEFT JOIN collections c ON p.collection_id = c.id';
    const values = [];
    const conditions = [];

    if (collection_id) {
      conditions.push('p.collection_id = $' + (values.length + 1));
      values.push(parseInt(collection_id));
    }
    if (slug) {
      conditions.push('p.slug = $' + (values.length + 1));
      values.push(slug);
    }
    if (is_featured === 'true') {
      conditions.push('p.is_featured = TRUE');
    }

    if (conditions.length > 0) {
      queryText += ' WHERE ' + conditions.join(' AND ');
    }

    queryText += ' ORDER BY p.id DESC';

    const result = await db.query(queryText, values);
    res.json({ success: true, products: result.rows });
  } catch (error) {
    console.error('Fetch products error:', error);
    res.status(500).json({ success: false, error: 'Database query failed.' });
  }
});

app.get('/api/products/:slug', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT p.*, c.name_ar as collection_name_ar, c.name_en as collection_name_en FROM products p LEFT JOIN collections c ON p.collection_id = c.id WHERE p.slug = $1',
      [req.params.slug]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Product not found.' });
    }
    res.json({ success: true, product: result.rows[0] });
  } catch (error) {
    console.error('Fetch product error:', error);
    res.status(500).json({ success: false, error: 'Database query failed.' });
  }
});

/**
 * Admin Products Management APIs (Authenticated)
 */
app.post('/api/admin/products', authenticateAdmin, async (req, res) => {
  const {
    slug, name_ar, name_en, description_ar, description_en,
    price, old_price, image_url, images, collection_id,
    video_url, sizes, colors, in_stock, is_featured,
    fabric_ar, fabric_en, design_story_ar, design_story_en, embroidery_ar, embroidery_en
  } = req.body;

  if (!slug || !name_ar || !name_en || price === undefined || !image_url) {
    return res.status(400).json({ success: false, error: 'Missing required product fields.' });
  }

  try {
    const queryText = `
      INSERT INTO products (
        slug, name_ar, name_en, description_ar, description_en, 
        price, old_price, image_url, images, collection_id, 
        video_url, sizes, colors, in_stock, is_featured,
        fabric_ar, fabric_en, design_story_ar, design_story_en, embroidery_ar, embroidery_en
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
      RETURNING *
    `;

    const values = [
      slug,
      name_ar,
      name_en,
      description_ar || '',
      description_en || '',
      parseFloat(price),
      old_price ? parseFloat(old_price) : null,
      image_url,
      images || [image_url],
      collection_id ? parseInt(collection_id) : null,
      video_url || null,
      sizes || ['S', 'M', 'L', 'XL', 'XXL'],
      colors || [],
      in_stock !== undefined ? in_stock : true,
      is_featured !== undefined ? is_featured : false,
      fabric_ar || '',
      fabric_en || '',
      design_story_ar || '',
      design_story_en || '',
      embroidery_ar || '',
      embroidery_en || ''
    ];

    const result = await db.query(queryText, values);
    res.status(201).json({ success: true, product: result.rows[0] });
  } catch (error) {
    console.error('Add product error:', error);
    res.status(500).json({ success: false, error: 'Database insert failed (slug might already exist).' });
  }
});

app.put('/api/admin/products/:id', authenticateAdmin, async (req, res) => {
  const productId = req.params.id;
  const {
    slug, name_ar, name_en, description_ar, description_en,
    price, old_price, image_url, images, collection_id,
    video_url, sizes, colors, in_stock, is_featured,
    fabric_ar, fabric_en, design_story_ar, design_story_en, embroidery_ar, embroidery_en
  } = req.body;

  if (!slug || !name_ar || !name_en || price === undefined || !image_url) {
    return res.status(400).json({ success: false, error: 'Missing required product fields.' });
  }

  try {
    const queryText = `
      UPDATE products
      SET slug = $1, name_ar = $2, name_en = $3, description_ar = $4, description_en = $5, 
          price = $6, old_price = $7, image_url = $8, images = $9, collection_id = $10, 
          video_url = $11, sizes = $12, colors = $13, in_stock = $14, is_featured = $15,
          fabric_ar = $16, fabric_en = $17, design_story_ar = $18, design_story_en = $19,
          embroidery_ar = $20, embroidery_en = $21, updated_at = CURRENT_TIMESTAMP
      WHERE id = $22
      RETURNING *
    `;

    const values = [
      slug,
      name_ar,
      name_en,
      description_ar || '',
      description_en || '',
      parseFloat(price),
      old_price ? parseFloat(old_price) : null,
      image_url,
      images || [image_url],
      collection_id ? parseInt(collection_id) : null,
      video_url || null,
      sizes || ['S', 'M', 'L', 'XL', 'XXL'],
      colors || [],
      in_stock !== undefined ? in_stock : true,
      is_featured !== undefined ? is_featured : false,
      fabric_ar || '',
      fabric_en || '',
      design_story_ar || '',
      design_story_en || '',
      embroidery_ar || '',
      embroidery_en || '',
      parseInt(productId)
    ];

    const result = await db.query(queryText, values);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Product not found.' });
    }
    res.json({ success: true, product: result.rows[0] });
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ success: false, error: 'Database update failed.' });
  }
});

app.delete('/api/admin/products/:id', authenticateAdmin, async (req, res) => {
  const productId = req.params.id;
  try {
    const result = await db.query('DELETE FROM products WHERE id = $1 RETURNING *', [productId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: 'Product not found.' });
    }
    res.json({ success: true, message: 'Product deleted successfully.' });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ success: false, error: 'Database delete failed.' });
  }
});

// Run Migrations and Start Listening
db.runMigrations().then(() => {
  app.listen(PORT, () => {
    console.log(`ZAPHERA COFTAN API listening on http://localhost:${PORT}`);
    console.log(`Loaded ADMIN_TOKEN: "${process.env.ADMIN_TOKEN}"`);
  });
}).catch(err => {
  console.error("Failed to run migrations on startup. Server shutting down.", err);
  process.exit(1);
});
