// pixels.js - High Performance Deferred Browser Tracking Wrapper

const TIKTOK_PIXEL_ID = import.meta.env.VITE_TIKTOK_PIXEL_ID;
const SNAP_PIXEL_ID = import.meta.env.VITE_SNAP_PIXEL_ID;

let pixelInitialized = false;

// Generate a unique deduplication event ID
export function generateEventId(prefix = 'evt') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

// Normalize Algerian mobile format for frontend validation
export function formatPhone(phone) {
  if (!phone) return '';
  let clean = phone.replace(/[^\d+]/g, '');
  if (clean.startsWith('00213')) {
    clean = '+213' + clean.slice(5);
  } else if (clean.startsWith('213')) {
    clean = '+' + clean;
  } else if (clean.startsWith('05') || clean.startsWith('06') || clean.startsWith('07') || clean.startsWith('02')) {
    clean = '+213' + clean.slice(1);
  } else if ((clean.startsWith('5') || clean.startsWith('6') || clean.startsWith('7')) && clean.length === 9) {
    clean = '+213' + clean;
  }
  if (clean.match(/^213/)) {
    clean = '+' + clean;
  }
  return clean;
}

/**
 * Injects TikTok and Snapchat SDK scripts dynamically
 */
function initPixelScripts() {
  if (pixelInitialized) return;
  pixelInitialized = true;
  console.log('Pixels: Initializing SDK loading...');

  // --- Snapchat Pixel Initializer ---
  if (SNAP_PIXEL_ID && SNAP_PIXEL_ID !== 'your_snapchat_pixel_id_here') {
    (function(win, doc, sdk_url){
      if(win.snaptr) return;
      var tr=function(){tr.handleRequest?tr.handleRequest.apply(tr,arguments):tr.queue.push(arguments)};
      tr.queue=[]; win.snaptr=tr;
      var s=doc.createElement('script'); s.async=true; s.src=sdk_url;
      var first=doc.getElementsByTagName('script')[0];
      first.parentNode.insertBefore(s,first);
    })(window, document, 'https://sc-static.net/sce/gnd/pixel.js');
    
    window.snaptr('init', SNAP_PIXEL_ID);
    window.snaptr('track', 'PAGE_VIEW');
    console.log('Snapchat Pixel: Loaded and Initialized.');
  }

  // --- TikTok Pixel Initializer ---
  if (TIKTOK_PIXEL_ID && TIKTOK_PIXEL_ID !== 'your_tiktok_pixel_id_here') {
    (function (w, d, t) {
      w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie","holdConsent","revokeConsent","grantConsent"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e};ttq.load=function(e,n){var r="https://analytics.tiktok.com/i18n/pixel/events.js",o=n&&n.partner;ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=r,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};n=document.createElement("script");n.type="text/javascript",n.async=!0,n.src=r+"?sdkid="+e+"&lib="+t;e=document.getElementsByTagName("script")[0];e.parentNode.insertBefore(n,e)};
    })(window, document, 'ttq');
    
    window.ttq.load(TIKTOK_PIXEL_ID);
    window.ttq.page();
    console.log('TikTok Pixel: Loaded and Initialized.');
  }
}

/**
 * Defer pixel loading for PageSpeed optimization
 * Runs after 1.5 seconds or immediately when the user scrolls, clicks, or touches.
 */
export function setupDeferredPixels() {
  const triggerEvents = ['scroll', 'click', 'touchstart', 'mousemove'];
  
  const loadTimeout = setTimeout(initPixelScripts, 1500);

  function triggerLoad() {
    clearTimeout(loadTimeout);
    initPixelScripts();
    // Clean up event listeners so they only run once
    triggerEvents.forEach(evt => window.removeEventListener(evt, triggerLoad));
  }

  triggerEvents.forEach(evt => window.addEventListener(evt, triggerLoad, { passive: true }));
}

/**
 * PageView Action
 */
export function trackPageView() {
  if (!pixelInitialized) return;
  if (window.snaptr) window.snaptr('track', 'PAGE_VIEW');
  if (window.ttq) window.ttq.page();
}

/**
 * AddToCart Action
 */
export function trackAddToCart(productId, price, name) {
  initPixelScripts(); // Force load if action happens before timeout
  const eventId = generateEventId('cart');
  
  if (window.snaptr) {
    window.snaptr('track', 'ADD_CART', {
      item_ids: [productId],
      price: parseFloat(price),
      currency: 'DZD',
      event_id: eventId
    });
  }
  
  if (window.ttq) {
    window.ttq.track('AddToCart', {
      contents: [{ content_id: productId, content_name: name, price: parseFloat(price) }],
      value: parseFloat(price),
      currency: 'DZD'
    }, { event_id: eventId });
  }
  
  console.log('Pixels Tracked: AddToCart', { eventId, productId, price });
}

/**
 * InitiateCheckout Action
 */
export function trackInitiateCheckout(productId, price, name) {
  initPixelScripts();
  const eventId = generateEventId('checkout');
  
  if (window.snaptr) {
    window.snaptr('track', 'START_CHECKOUT', {
      item_ids: [productId],
      price: parseFloat(price),
      currency: 'DZD',
      event_id: eventId
    });
  }
  
  if (window.ttq) {
    window.ttq.track('InitiateCheckout', {
      contents: [{ content_id: productId, content_name: name, price: parseFloat(price) }],
      value: parseFloat(price),
      currency: 'DZD'
    }, { event_id: eventId });
  }
  
  console.log('Pixels Tracked: InitiateCheckout', { eventId, productId, price });
}

/**
 * CompletePayment (Purchase) Action
 * Triggers browser pixels and returns event_ids to be sent to backend CAPI for 1:1 matching deduplication.
 */
export function trackPurchase(productId, totalPrice, name, phone) {
  initPixelScripts();
  const tiktokEventId = generateEventId('tt_pur');
  const snapEventId = generateEventId('snap_pur');
  const formattedPhone = formatPhone(phone);

  // Send Browser Snapchat Purchase Event
  if (window.snaptr) {
    window.snaptr('track', 'PURCHASE', {
      item_ids: [productId],
      price: parseFloat(totalPrice),
      currency: 'DZD',
      event_id: snapEventId
    });
  }

  // Send Browser TikTok CompletePayment Event
  if (window.ttq) {
    window.ttq.track('CompletePayment', {
      contents: [{ content_id: productId, content_name: name, price: parseFloat(totalPrice) }],
      value: parseFloat(totalPrice),
      currency: 'DZD',
      phone_number: formattedPhone
    }, { event_id: tiktokEventId });
  }

  console.log('Pixels Tracked: CompletePayment (Browser)', { tiktokEventId, snapEventId, totalPrice });
  
  // Return the event IDs so the frontend can send them to the backend API
  return { tiktokEventId, snapEventId };
}
