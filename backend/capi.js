const axios = require('axios');
const crypto = require('crypto');
require('dotenv').config();

/**
 * Normalizes Algerian phone number to E.164 standard (+213xxxxxxxx).
 * TikTok and Snapchat require this specific format for accurate matching.
 */
function formatAlgerianPhone(phone) {
  if (!phone) return null;
  // Remove all non-numeric characters, preserving the leading '+' if present
  let clean = phone.replace(/[^\d+]/g, '');
  
  // Handle various formats
  if (clean.startsWith('00213')) {
    clean = '+213' + clean.slice(5);
  } else if (clean.startsWith('213')) {
    clean = '+' + clean;
  } else if (clean.startsWith('05') || clean.startsWith('06') || clean.startsWith('07') || clean.startsWith('02')) {
    clean = '+213' + clean.slice(1);
  } else if ((clean.startsWith('5') || clean.startsWith('6') || clean.startsWith('7')) && clean.length === 9) {
    clean = '+213' + clean;
  }
  
  // Ensure it has the leading '+' sign
  if (clean.match(/^213/)) {
    clean = '+' + clean;
  }
  
  return clean;
}

/**
 * Creates SHA256 hash in hex format (lowercase)
 */
function sha256(text) {
  if (!text) return null;
  return crypto.createHash('sha256').update(text.trim().toLowerCase()).digest('hex');
}

/**
 * Dispatches Snapchat Conversion Event (CAPI v3)
 */
async function sendSnapchatEvent(order, clientIp, clientUa) {
  const snapPixelId = process.env.SNAP_PIXEL_ID;
  const snapToken = process.env.SNAP_ACCESS_TOKEN;
  
  if (!snapPixelId || !snapToken) {
    console.log('Snapchat CAPI: Credentials missing. Skipping.');
    return;
  }

  const formattedPhone = formatAlgerianPhone(order.phone);
  const hashedPhone = sha256(formattedPhone);
  
  // Format data according to Snapchat's CAPI v3 documentation
  const payload = {
    data: [
      {
        event_name: 'PURCHASE',
        event_time: Math.floor(Date.now() / 1000), // Epoch timestamp in seconds
        event_id: order.snap_event_id || order.order_id,
        event_source_url: 'https://zaphiracoftan.shop/',
        action_source: 'WEB',
        user_data: {
          client_ip_address: clientIp,
          client_user_agent: clientUa,
          ph: hashedPhone
        },
        custom_data: {
          currency: 'DZD',
          value: parseFloat(order.total_price),
          transaction_id: order.order_id
        }
      }
    ]
  };

  try {
    const response = await axios.post(
      `https://tr.snapchat.com/v3/${snapPixelId}/events?access_token=${snapToken}`,
      payload,
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    console.log(`Snapchat CAPI v3: Event sent successfully. Status: ${response.status}`, response.data);
  } catch (error) {
    console.error('Snapchat CAPI v3 Error:', error.response ? error.response.data : error.message);
  }
}

/**
 * Dispatches TikTok Conversion Event (CAPI v1.3)
 */
async function sendTikTokEvent(order, clientIp, clientUa) {
  const ttPixelId = process.env.TIKTOK_PIXEL_ID;
  const ttToken = process.env.TIKTOK_ACCESS_TOKEN;
  
  if (!ttPixelId || !ttToken) {
    console.log('TikTok CAPI: Credentials missing. Skipping.');
    return;
  }

  const formattedPhone = formatAlgerianPhone(order.phone);
  const hashedPhone = sha256(formattedPhone);

  // TikTok API v1.3 requires events wrapped inside a 'data' array
  const payload = {
    pixel_code: ttPixelId,
    event_source: 'web',
    data: [
      {
        event: 'CompletePayment',
        event_id: order.tiktok_event_id || order.order_id,
        event_time: Math.floor(Date.now() / 1000), // Epoch timestamp in seconds
        user: {
          phone_number: hashedPhone,
          ip: clientIp,
          user_agent: clientUa
        },
        properties: {
          contents: [
            {
              content_type: 'product',
              content_name: order.product_name,
              quantity: parseInt(order.quantity),
              price: parseFloat(order.total_price) / parseInt(order.quantity)
            }
          ],
          currency: 'DZD',
          value: parseFloat(order.total_price)
        },
        context: {
          page: {
            url: 'https://zaphiracoftan.shop/'
          }
        }
      }
    ]
  };

  try {
    const response = await axios.post(
      'https://business-api.tiktok.com/open_api/v1.3/event/track/',
      payload,
      {
        headers: {
          'Access-Token': ttToken,
          'Content-Type': 'application/json'
        }
      }
    );
    console.log(`TikTok CAPI v1.3: Event sent successfully. Status: ${response.status}`, response.data);
  } catch (error) {
    console.error('TikTok CAPI v1.3 Error:', error.response ? error.response.data : error.message);
  }
}

/**
 * Main dispatcher to send order events to both platforms in parallel
 */
function trackPurchase(order, clientIp, clientUa) {
  console.log(`Tracking Conversions for Order: ${order.order_id}`);
  
  // Execute calls in background so client response is not delayed
  Promise.allSettled([
    sendSnapchatEvent(order, clientIp, clientUa),
    sendTikTokEvent(order, clientIp, clientUa)
  ]).then((results) => {
    results.forEach((res, index) => {
      const platform = index === 0 ? 'Snapchat' : 'TikTok';
      if (res.status === 'rejected') {
        console.error(`${platform} CAPI event promise rejected:`, res.reason);
      }
    });
  });
}

module.exports = {
  formatAlgerianPhone,
  formatKsaPhone: formatAlgerianPhone, // Aliased for legacy references if any
  sha256,
  trackPurchase
};
