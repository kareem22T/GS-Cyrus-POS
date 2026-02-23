import { Document, DocumentItem } from "../../components/receipt-preview-modal";

function parseApiDate(dateString: string): Date {
  const normalized = dateString
    ?.replace(/(\.\d{3})\d+/, "$1")
    ?.replace(/(?<![Z]|[+-]\d{2}:?\d{2})$/, "Z");
  return new Date(normalized);
}

export function generateHTMLReceipt(document: Document): string {
  const items: DocumentItem[] =
    (document?.items as DocumentItem[] | undefined) ??
    (document as any)?.lines ??
    (document as any)?.receiptItems ??
    [];

  let subtotal = 0;
  let totalVAT = 0;
  let totalDiscount = 0;

  items.forEach((item: DocumentItem) => {
    const itemSubtotal = item.unitPrice * item.quantity;
    subtotal += itemSubtotal;
    totalVAT += item.vat || 0;
    totalDiscount += item.discountAmount || 0;
  });

  totalDiscount += document?.extraDiscount || 0;
  const totalAmount = subtotal + totalVAT - totalDiscount;

  const _receiptDate =
    document.receiptDate ??
    (document as any)?.createdAt ??
    new Date().toISOString();
  const receiptNumber =
    document.receiptNumber ??
    (document as any)?.orderNumber ??
    `REC-${parseApiDate(_receiptDate).getTime().toString().slice(-8)}`;

  const dateObj = parseApiDate(_receiptDate);
  const dateStr = dateObj.toLocaleDateString("ar-EG", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const timeStr = dateObj.toLocaleTimeString("ar-EG", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const itemsHTML = items
    .map(
      (item) => `
    <div class="item">
      <div class="item-name">${item.productName || `منتج #${item.productId}`}</div>
      <div class="item-details">
        <span class="item-total">${(item.unitPrice * item.quantity).toFixed(2)}</span>
        <span>@ ${item.unitPrice.toFixed(2)}</span>
        <span>الكمية: ${item.quantity}</span>
      </div>
    </div>
  `,
    )
    .join("");

  return `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=384, initial-scale=1.0">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      width: 384px;
      font-family: 'Courier New', 'Arial', 'Tahoma', sans-serif;
      background: white;
      padding: 16px 16px 24px 16px;
      color: #000;
      direction: rtl;
    }
    
    .receipt {
      width: 100%;
    }
    
    .header {
      text-align: center;
      margin-bottom: 16px;
    }
    
    .store-name {
      font-size: 28px;
      font-weight: bold;
      margin-bottom: 6px;
      letter-spacing: 1px;
    }
    
    .store-info {
      font-size: 16px;
      line-height: 1.5;
      color: #333;
    }
    
    .divider {
      border-top: 1px dashed #000;
      margin: 10px 0;
    }
    
    .divider-solid {
      border-top: 1px solid #000;
      margin: 10px 0;
    }
    
    .receipt-title {
      text-align: center;
      font-size: 24px;
      font-weight: bold;
      margin: 10px 0;
    }
    
    .receipt-info {
      text-align: center;
      font-size: 16px;
      line-height: 1.6;
      margin-bottom: 8px;
    }
    
    .items {
      margin: 14px 0;
    }
    
    .item {
      margin-bottom: 10px;
      padding-bottom: 8px;
      border-bottom: 1px dotted #ccc;
    }
    
    .item:last-child {
      border-bottom: none;
    }
    
    .item-name {
      font-size: 18px;
      font-weight: bold;
      margin-bottom: 5px;
    }
    
    .item-details {
      font-size: 16px;
      display: flex;
      justify-content: space-between;
      color: #333;
    }
    
    .item-total {
      font-weight: bold;
      color: #000;
    }
    
    .summary {
      margin: 14px 0;
    }
    
    .summary-row {
      display: flex;
      justify-content: space-between;
      font-size: 18px;
      margin-bottom: 6px;
      padding: 0 4px;
    }
    
    .summary-label {
      color: #333;
    }
    
    .summary-value {
      font-weight: bold;
    }
    
    .total {
      margin: 14px 0;
      padding: 12px 10px;
      background: #f5f5f5;
      border: 2px solid #000;
    }
    
    .total-row {
      display: flex;
      justify-content: space-between;
      font-size: 22px;
      font-weight: bold;
    }
    
    .footer {
      text-align: center;
      margin-top: 16px;
    }
    
    .thank-you {
      font-size: 22px;
      font-weight: bold;
      margin-bottom: 12px;
    }
    
    .barcode {
      width: 220px;
      height: 65px;
      margin: 14px auto;
      background: #fff;
      border: 2px solid #000;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 13px;
      font-family: 'Courier New', monospace;
      letter-spacing: 2px;
      direction: ltr;
    }
    
    .footer-text {
      font-size: 13px;
      color: #666;
      line-height: 1.5;
    }
  </style>
</head>
<body>
  <div class="receipt">
    <!-- Header -->
    <div class="header">
      <div class="store-name">إيصال نقدي</div>
      <div class="store-info">
        العنوان: 123أ لوريم إيبسوم، دولور<br>
        هاتف: 123-456-7890<br>
        www.cyrustech.com
      </div>
    </div>
    
    <div class="receipt-info">
      التاريخ: ${dateStr}<br>
      الوقت: ${timeStr}
    </div>
    
    <div class="divider"></div>
    
    <!-- Items -->
    <div class="items">
      ${itemsHTML}
    </div>
    
    <div class="divider"></div>
    
    <!-- Summary -->
    <div class="summary">
      <div class="summary-row">
        <span class="summary-label">المجموع الفرعي</span>
        <span class="summary-value">${subtotal.toFixed(2)}</span>
      </div>
      ${
        totalVAT > 0
          ? `
      <div class="summary-row">
        <span class="summary-label">ضريبة المبيعات</span>
        <span class="summary-value">${totalVAT.toFixed(2)}</span>
      </div>
      `
          : ""
      }
      ${
        totalDiscount > 0
          ? `
      <div class="summary-row">
        <span class="summary-label">الخصم</span>
        <span class="summary-value">-${totalDiscount.toFixed(2)}</span>
      </div>
      `
          : ""
      }
    </div>
    
    <div class="divider-solid"></div>
    
    <!-- Total -->
    <div class="total">
      <div class="total-row">
        <span>الإجمالي</span>
        <span>${totalAmount.toFixed(2)}</span>
      </div>
    </div>
    
    <div class="divider-solid"></div>
    
    <!-- Footer -->
    <div class="footer">
      <div class="thank-you">شكراً لك</div>
      
      <!-- Barcode -->
      <div class="barcode">
        ${receiptNumber}
      </div>
      
      <div class="footer-text">
        يرجى الاحتفاظ بهذا الإيصال<br>
        لسجلاتك
      </div>
    </div>
  </div>
</body>
</html>
  `;
}
