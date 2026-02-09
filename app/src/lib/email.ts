import { Resend } from 'resend';

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

// Use onboarding@resend.dev during development, switch to verified domain for production
const FROM_EMAIL = 'Le Boeuf Shoppe <onboarding@resend.dev>';

interface OrderConfirmationData {
  to: string;
  customerName: string;
  orderNumber: string;
  estimatedTotal: number;
  items: { productName: string; quantity: number; unit: string; pricePerUnit: number }[];
}

export async function sendOrderConfirmation(data: OrderConfirmationData) {
  if (!resend) return;

  try {
    const itemRows = data.items
      .map(
        (item) =>
          `<tr>
            <td style="padding:8px;border-bottom:1px solid #eee">${item.productName}</td>
            <td style="padding:8px;border-bottom:1px solid #eee;text-align:right">${item.quantity} ${item.unit}</td>
            <td style="padding:8px;border-bottom:1px solid #eee;text-align:right">$${item.pricePerUnit.toFixed(2)}/${item.unit}</td>
          </tr>`
      )
      .join('');

    await resend.emails.send({
      from: FROM_EMAIL,
      to: data.to,
      subject: `Order Confirmed - ${data.orderNumber}`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
          <h2 style="color:#18181b">Order Received</h2>
          <p>Hi ${data.customerName},</p>
          <p>We've received your order <strong>${data.orderNumber}</strong>.</p>
          <table style="width:100%;border-collapse:collapse;margin:16px 0">
            <thead>
              <tr style="background:#f5f5f5">
                <th style="padding:8px;text-align:left;font-size:12px;text-transform:uppercase">Product</th>
                <th style="padding:8px;text-align:right;font-size:12px;text-transform:uppercase">Qty</th>
                <th style="padding:8px;text-align:right;font-size:12px;text-transform:uppercase">Price</th>
              </tr>
            </thead>
            <tbody>${itemRows}</tbody>
          </table>
          <p style="font-size:18px;font-weight:bold">Estimated Total: $${data.estimatedTotal.toFixed(2)}</p>
          <p style="color:#666;font-size:13px">Catch-weight items will be finalized at fulfillment.</p>
          <hr style="border:none;border-top:1px solid #eee;margin:24px 0" />
          <p style="color:#999;font-size:12px">Le Boeuf Shoppe &mdash; Never Frozen. Always Fresh. Always Wagyu.</p>
        </div>
      `,
    });
  } catch (error) {
    console.error('Failed to send order confirmation email:', error);
  }
}

interface NewOrderAlertData {
  to: string;
  customerName: string;
  businessName: string;
  orderNumber: string;
  estimatedTotal: number;
  items: { productName: string; quantity: number; unit: string; pricePerUnit: number }[];
}

export async function sendNewOrderAlert(data: NewOrderAlertData) {
  if (!resend) return;

  try {
    const itemRows = data.items
      .map(
        (item) =>
          `<tr>
            <td style="padding:8px;border-bottom:1px solid #eee">${item.productName}</td>
            <td style="padding:8px;border-bottom:1px solid #eee;text-align:right">${item.quantity} ${item.unit}</td>
            <td style="padding:8px;border-bottom:1px solid #eee;text-align:right">$${item.pricePerUnit.toFixed(2)}/${item.unit}</td>
          </tr>`
      )
      .join('');

    await resend.emails.send({
      from: FROM_EMAIL,
      to: data.to,
      subject: `New Order: ${data.orderNumber} from ${data.businessName}`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
          <h2 style="color:#18181b">New Order Received</h2>
          <p><strong>${data.businessName}</strong> (${data.customerName}) just placed an order.</p>
          <p>Order: <strong>${data.orderNumber}</strong></p>
          <table style="width:100%;border-collapse:collapse;margin:16px 0">
            <thead>
              <tr style="background:#f5f5f5">
                <th style="padding:8px;text-align:left;font-size:12px;text-transform:uppercase">Product</th>
                <th style="padding:8px;text-align:right;font-size:12px;text-transform:uppercase">Qty</th>
                <th style="padding:8px;text-align:right;font-size:12px;text-transform:uppercase">Price</th>
              </tr>
            </thead>
            <tbody>${itemRows}</tbody>
          </table>
          <p style="font-size:18px;font-weight:bold">Estimated Total: $${data.estimatedTotal.toFixed(2)}</p>
          <hr style="border:none;border-top:1px solid #eee;margin:24px 0" />
          <p style="color:#999;font-size:12px">Le Boeuf Shoppe &mdash; Never Frozen. Always Fresh. Always Wagyu.</p>
        </div>
      `,
    });
  } catch (error) {
    console.error('Failed to send new order alert email:', error);
  }
}

interface StatusUpdateData {
  to: string;
  customerName: string;
  orderNumber: string;
  newStatus: string;
}

export async function sendOrderStatusUpdate(data: StatusUpdateData) {
  if (!resend) return;

  try {
    const statusMessages: Record<string, string> = {
      confirmed: 'Your order has been confirmed and is being prepared.',
      out_for_delivery: 'Your order is out for delivery! Expect it soon.',
      delivered: 'Your order has been delivered. Thank you for your business!',
    };

    const message = statusMessages[data.newStatus];
    if (!message) return;

    const statusLabel = data.newStatus.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

    await resend.emails.send({
      from: FROM_EMAIL,
      to: data.to,
      subject: `Order ${data.orderNumber} - ${statusLabel}`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
          <h2 style="color:#18181b">Order Update</h2>
          <p>Hi ${data.customerName},</p>
          <p>${message}</p>
          <p>Order: <strong>${data.orderNumber}</strong></p>
          <hr style="border:none;border-top:1px solid #eee;margin:24px 0" />
          <p style="color:#999;font-size:12px">Le Boeuf Shoppe &mdash; Never Frozen. Always Fresh. Always Wagyu.</p>
        </div>
      `,
    });
  } catch (error) {
    console.error('Failed to send status update email:', error);
  }
}
