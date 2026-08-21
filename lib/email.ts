import nodemailer from "nodemailer";
import { createSupabaseServiceClient } from "./supabase/service";

interface CustomerDetails {
  name: string;
  email: string;
  phone: string;
  city: string;
  state: string;
}

export async function sendOrderNotification(
  orderId: string,
  totalAmount: number | string,
  customer: CustomerDetails,
) {
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_APP_PASSWORD;

  if (!user || !pass) return;

  const order = await getOrderDetails(orderId);
  if (!order) return;

  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user, pass },
    });

    const formattedAmount = Number(totalAmount).toLocaleString("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    });
    
    const itemsHtml = Array.isArray(order.order_items) 
      ? order.order_items.map((item: any) => `
          <tr>
            <td style="padding: 10px; border: 1px solid #eee;">
              <strong>${item.product_name_at_time}</strong><br/>
              <span style="font-size: 12px; color: #666;">Size: ${item.selected_size}</span>
            </td>
            <td style="padding: 10px; border: 1px solid #eee; text-align: center;">${item.quantity}</td>
            <td style="padding: 10px; border: 1px solid #eee; text-align: right;">${formatCurrency(item.line_total)}</td>
          </tr>
        `).join("")
      : "";

    const mailOptions = {
      from: `"DARAJNI Store" <${user}>`,
      to: user, // Send to yourself
      subject: `🎉 New Order Received! (${order.order_number})`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 8px;">
          <h2 style="color: #333; border-bottom: 2px solid #D9B56B; padding-bottom: 10px;">New Order Placed!</h2>
          <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
            <tr><td style="padding: 10px; border: 1px solid #eee; background-color: #f9f9f9;"><strong>Order Number</strong></td><td style="padding: 10px; border: 1px solid #eee;">${order.order_number}</td></tr>
            <tr><td style="padding: 10px; border: 1px solid #eee; background-color: #f9f9f9;"><strong>Total Amount</strong></td><td style="padding: 10px; border: 1px solid #eee; color: #16a34a; font-weight: bold;">${formattedAmount}</td></tr>
            <tr><td style="padding: 10px; border: 1px solid #eee; background-color: #f9f9f9;"><strong>Customer Name</strong></td><td style="padding: 10px; border: 1px solid #eee;">${customer.name}</td></tr>
            <tr><td style="padding: 10px; border: 1px solid #eee; background-color: #f9f9f9;"><strong>Customer Phone</strong></td><td style="padding: 10px; border: 1px solid #eee;">${customer.phone}</td></tr>
            <tr><td style="padding: 10px; border: 1px solid #eee; background-color: #f9f9f9;"><strong>Location</strong></td><td style="padding: 10px; border: 1px solid #eee;">${customer.city}, ${customer.state}</td></tr>
          </table>
          
          <h3 style="color: #333; margin-top: 30px;">Order Items</h3>
          <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
            <thead>
              <tr style="background-color: #f9f9f9;">
                <th style="padding: 10px; border: 1px solid #eee; text-align: left;">Product</th>
                <th style="padding: 10px; border: 1px solid #eee; text-align: center;">Qty</th>
                <th style="padding: 10px; border: 1px solid #eee; text-align: right;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>

          <p style="margin-top: 30px; font-size: 14px; color: #888;">View full details in the <a href="https://www.darajni.in/admin" style="color: #D9B56B;">Admin Dashboard</a>.</p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error("Failed to send admin order notification:", error);
  }
}

async function getOrderDetails(orderId: string) {
  const supabase = createSupabaseServiceClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("orders")
    .select("*, order_items(id, product_name_at_time, selected_size, quantity, line_total)")
    .eq("id", orderId)
    .maybeSingle();

  if (error || !data) return null;
  return data;
}

const formatCurrency = (amount: number) =>
  Number(amount).toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  });

function getBaseTemplate(content: string) {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <!-- Import Cormorant Garamond font -->
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&display=swap" rel="stylesheet">
      </head>
      <body style="margin: 0; padding: 0; font-family: 'Cormorant Garamond', 'Times New Roman', serif; background-color: #fafafa; color: #111111;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fafafa; padding: 40px 0;">
          <tr>
            <td align="center">
              <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border: 1px solid #eaeaea; border-radius: 8px; overflow: hidden; max-width: 600px; width: 100%;">
                <!-- Header -->
                <tr>
                  <td align="center" style="padding: 30px 0; background-color: #111111;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700; letter-spacing: 4px;">DARAJNI</h1>
                    <p style="margin: 5px 0 0; color: #D9B56B; font-size: 10px; font-weight: bold; letter-spacing: 2px; text-transform: uppercase;">Designer House</p>
                  </td>
                </tr>
                
                <!-- Content -->
                <tr>
                  <td style="padding: 40px 30px;">
                    ${content}
                  </td>
                </tr>
                
                <!-- Footer -->
                <tr>
                  <td align="center" style="padding: 30px; background-color: #f9f9f9; border-top: 1px solid #eaeaea; font-size: 12px; color: #888888; line-height: 1.5;">
                    <p style="margin: 0 0 10px;">DARAJNI Designer House<br/>Bihar Sharif, Bihar</p>
                    <p style="margin: 0;">Need help? <a href="mailto:darajni.in@gmail.com" style="color: #D9B56B; text-decoration: none;">Contact us</a></p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
}

export async function sendCustomerOrderPlacedEmail(orderId: string) {
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_APP_PASSWORD;
  if (!user || !pass) return;

  const order = await getOrderDetails(orderId);
  if (!order || !order.email) return;

  const firstName = order.customer_name.split(" ")[0];
  
  const itemsHtml = Array.isArray(order.order_items) 
    ? order.order_items.map((item: any) => `
        <tr>
          <td style="padding: 15px 0; border-bottom: 1px solid #eaeaea;">
            <p style="margin: 0; font-weight: 600;">${item.product_name_at_time}</p>
            <p style="margin: 5px 0 0; font-size: 13px; color: #666;">Size: ${item.selected_size} &middot; Qty: ${item.quantity}</p>
          </td>
          <td align="right" style="padding: 15px 0; border-bottom: 1px solid #eaeaea; font-weight: 600;">
            ${formatCurrency(item.line_total)}
          </td>
        </tr>
      `).join("")
    : "";

  const content = `
    <h2 style="margin: 0 0 20px; font-size: 20px; font-weight: 600;">Dear ${firstName},</h2>
    <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #555555;">
      Thank you for choosing Darajni. Your beautifully crafted order has been successfully placed and is now being processed.
    </p>
    
    <div style="background-color: #fafafa; padding: 20px; border-radius: 6px; margin: 30px 0;">
      <p style="margin: 0 0 5px; font-size: 13px; color: #888; text-transform: uppercase; letter-spacing: 1px;">Order Number</p>
      <p style="margin: 0; font-size: 18px; font-weight: 600; color: #D9B56B;">${order.order_number}</p>
    </div>

    <h3 style="margin: 0 0 15px; font-size: 16px; font-weight: 600; border-bottom: 2px solid #111; padding-bottom: 10px; display: inline-block;">Order Summary</h3>
    
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 30px;">
      ${itemsHtml}
      <tr>
        <td style="padding: 15px 0 5px; color: #666;">Subtotal</td>
        <td align="right" style="padding: 15px 0 5px;">${formatCurrency(order.subtotal)}</td>
      </tr>
      <tr>
        <td style="padding: 5px 0; color: #666;">Shipping</td>
        <td align="right" style="padding: 5px 0;">${formatCurrency(order.shipping_fee)}</td>
      </tr>
      <tr>
        <td style="padding: 15px 0 0; font-weight: bold; font-size: 18px;">Total</td>
        <td align="right" style="padding: 15px 0 0; font-weight: bold; font-size: 18px; color: #D9B56B;">${formatCurrency(order.total)}</td>
      </tr>
    </table>

    <p style="margin: 0; font-size: 14px; line-height: 1.6; color: #555555;">
      We will notify you again once your order is dispatched. If you have any questions, feel free to reply to this email.
    </p>
  `;

  try {
    const transporter = nodemailer.createTransport({ service: "gmail", auth: { user, pass } });
    await transporter.sendMail({
      from: `"DARAJNI Store" <${user}>`,
      to: order.email,
      subject: `Darajni Order Confirmed: ${order.order_number}`,
      html: getBaseTemplate(content),
    });
    console.log(`Customer Order Placed email sent to ${order.email} for ${order.order_number}`);
  } catch (error) {
    console.error("Failed to send customer order email:", error);
  }
}

export async function sendCustomerStatusUpdateEmail(orderId: string, newStatus: string) {
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_APP_PASSWORD;
  if (!user || !pass) return;

  const order = await getOrderDetails(orderId);
  if (!order || !order.email) return;

  // Don't email on cancellation unless strictly requested, but standard is to email.
  const firstName = order.customer_name.split(" ")[0];
  const capitalizedStatus = newStatus.charAt(0).toUpperCase() + newStatus.slice(1);
  
  let statusMessage = `Your order status has been updated to: <strong>${capitalizedStatus}</strong>.`;
  if (newStatus === "confirmed") {
    statusMessage = "Great news! Your order has been confirmed and is currently being prepared.";
  } else if (newStatus === "packed") {
    statusMessage = "Your order has been carefully packed and is ready to be shipped.";
  } else if (newStatus === "shipped") {
    statusMessage = "Your order is on its way! It has been handed over to our delivery partners.";
  } else if (newStatus === "delivered") {
    statusMessage = "Your order has been delivered. We hope you love your Darajni pieces!";
  } else if (newStatus === "cancelled") {
    statusMessage = "Your order has been cancelled. If you have any questions, please contact us.";
  }

  const steps = [
    { key: "pending", label: "Order Placed" },
    { key: "confirmed", label: "Confirmed" },
    { key: "packed", label: "Packed" },
    { key: "shipped", label: "Shipped" },
    { key: "delivered", label: "Delivered" },
  ];

  const statusIndex: Record<string, number> = {
    pending: 0,
    confirmed: 1,
    packed: 2,
    shipped: 3,
    delivered: 4,
  };
  
  const activeIndex = statusIndex[newStatus] ?? 0;
  
  let timelineHtml = "";
  if (newStatus !== "cancelled") {
    timelineHtml = `<table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0; font-family: sans-serif; max-width: 300px; margin-left: auto; margin-right: auto;">`;
    steps.forEach((step, index) => {
      const isDone = index < activeIndex;
      const isCurrent = index === activeIndex;
      const isLast = index === steps.length - 1;

      const circleBg = isDone ? "#16a34a" : (isCurrent ? "#D9B56B" : "#eaeaea");
      const circleColor = (isDone || isCurrent) ? "#ffffff" : "#888888";
      const icon = isDone ? "✓" : (isCurrent ? "●" : "");
      const lineBg = isDone ? "#16a34a" : "#eaeaea";
      
      timelineHtml += `
        <tr>
          <td width="40" align="center" valign="top">
            <div style="width: 24px; height: 24px; background-color: ${circleBg}; border-radius: 50%; color: ${circleColor}; line-height: 24px; text-align: center; font-size: 14px; font-weight: bold;">${icon}</div>
            ${!isLast ? `<div style="width: 2px; height: 30px; background-color: ${lineBg}; margin: 4px 0;"></div>` : ""}
          </td>
          <td valign="top" style="padding-bottom: ${!isLast ? "20px" : "0"}; text-align: left;">
            <p style="margin: 3px 0 0; font-size: 16px; font-weight: bold; color: ${isDone || isCurrent ? "#111" : "#888"};">${step.label}</p>
            ${isCurrent ? `<p style="margin: 4px 0 0; font-size: 13px; color: #D9B56B; font-weight: 600;">Current Stage</p>` : ""}
          </td>
        </tr>
      `;
    });
    timelineHtml += `</table>`;
  }

  const content = `
    <h2 style="margin: 0 0 20px; font-size: 20px; font-weight: 600;">Hello ${firstName},</h2>
    
    <div style="background-color: #fafafa; padding: 20px; border-radius: 6px; margin: 0 0 30px; text-align: center; border: 1px solid #eaeaea;">
      <p style="margin: 0 0 5px; font-size: 13px; color: #888; text-transform: uppercase; letter-spacing: 1px; font-family: sans-serif;">Order Number</p>
      <p style="margin: 0; font-size: 18px; font-weight: 600;">${order.order_number}</p>
    </div>

    <p style="margin: 0 0 20px; font-size: 16px; line-height: 1.6; color: #555555; text-align: center;">
      ${statusMessage}
    </p>

    ${timelineHtml}

    <div style="text-align: center; margin-top: 30px;">
      <a href="https://www.darajni.in/track" style="background-color: #111111; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-size: 16px; font-weight: 600; display: inline-block;">Track Order Status</a>
    </div>
  `;

  try {
    const transporter = nodemailer.createTransport({ service: "gmail", auth: { user, pass } });
    await transporter.sendMail({
      from: `"DARAJNI Store" <${user}>`,
      to: order.email,
      subject: `Order Update: ${capitalizedStatus} (${order.order_number})`,
      html: getBaseTemplate(content),
    });
    console.log(`Customer Status email sent to ${order.email} for ${order.order_number}`);
  } catch (error) {
    console.error("Failed to send customer status email:", error);
  }
}
