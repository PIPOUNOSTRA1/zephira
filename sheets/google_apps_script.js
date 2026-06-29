/**
 * Google Apps Script for ZAPHERA COFTAN Order Integration
 * Deploy this script as a "Web App" in Google Apps Script editor.
 * Set "Execute as: Me" and "Who has access: Anyone".
 * Use the deployed Web App URL in your backend .env file.
 */

function doPost(e) {
  try {
    const postData = JSON.parse(e.postData.contents);
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
    
    // If the spreadsheet is empty, set up the headers first
    if (sheet.getLastRow() === 0) {
      setupHeaders(sheet);
    }
    
    const action = postData.action || 'create';
    
    if (action === 'create') {
      const order = postData.order;
      const rowData = [
        order.order_id,
        new Date(order.created_at || Date.now()).toLocaleString('en-US', { timeZone: 'Asia/Riyadh' }),
        order.customer_name,
        order.phone,
        order.alt_phone || '',
        order.city,
        order.region || '',
        order.address,
        order.product_name,
        order.quantity,
        order.total_price,
        order.status || 'pending',
        order.payment_method || 'COD',
        order.tiktok_event_id || '',
        order.snap_event_id || '',
        order.utm_source || '',
        order.utm_medium || '',
        order.utm_campaign || '',
        order.notes || ''
      ];
      
      sheet.appendRow(rowData);
      return ContentService.createTextOutput(JSON.stringify({ success: true, message: 'Order added successfully' }))
                           .setMimeType(ContentService.MimeType.JSON);
    } 
    
    else if (action === 'update') {
      const orderId = postData.order_id;
      const status = postData.status;
      const data = sheet.getDataRange().getValues();
      let found = false;
      
      for (let i = 1; i < data.length; i++) {
        if (data[i][0] == orderId) { // Order ID is in Column A (Index 0)
          sheet.getRange(i + 1, 12).setValue(status); // Status is in Column L (Index 11, which is 12th column)
          found = true;
          break;
        }
      }
      
      if (found) {
        return ContentService.createTextOutput(JSON.stringify({ success: true, message: 'Order status updated' }))
                             .setMimeType(ContentService.MimeType.JSON);
      } else {
        return ContentService.createTextOutput(JSON.stringify({ success: false, message: 'Order not found' }))
                             .setMimeType(ContentService.MimeType.JSON);
      }
    }
    
    return ContentService.createTextOutput(JSON.stringify({ success: false, message: 'Invalid action' }))
                         .setMimeType(ContentService.MimeType.JSON);
                         
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: error.toString() }))
                         .setMimeType(ContentService.MimeType.JSON);
  }
}

function setupHeaders(sheet) {
  const headers = [
    "Order ID",
    "Timestamp (KSA)",
    "Customer Name",
    "Phone Number",
    "Alt Phone Number",
    "City",
    "Region",
    "Delivery Address",
    "Product Name",
    "Quantity",
    "Total Price (SAR)",
    "Status",
    "Payment Method",
    "TikTok Event ID",
    "Snap Event ID",
    "UTM Source",
    "UTM Medium",
    "UTM Campaign",
    "Notes"
  ];
  sheet.appendRow(headers);
  // Format header row to look professional
  const range = sheet.getRange(1, 1, 1, headers.length);
  range.setFontWeight("bold");
  range.setBackground("#1a1a2e");
  range.setFontColor("#ffffff");
  sheet.setFrozenRows(1);
}
