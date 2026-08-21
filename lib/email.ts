import nodemailer from "nodemailer";

interface CustomerDetails {
  name: string;
  email: string;
  phone: string;
  city: string;
  state: string;
}

export async function sendOrderNotification(
  orderNumber: string,
  totalAmount: number | string,
  customer: CustomerDetails,
) {
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_APP_PASSWORD;

  // Silently skip if email is not configured
  if (!user || !pass) {
    console.log("Email notification skipped: EMAIL_USER or EMAIL_APP_PASSWORD not set.");
    return;
  }

  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user,
        pass,
      },
    });

    const formattedAmount = Number(totalAmount).toLocaleString("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    });

    const mailOptions = {
      from: `"DARAJNI Store" <${user}>`,
      to: user, // Send to yourself
      subject: `🎉 New Order Received! (${orderNumber})`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eaeaea; border-radius: 8px;">
          <h2 style="color: #333; border-bottom: 2px solid #D9B56B; padding-bottom: 10px;">New Order Placed!</h2>
          
          <p style="font-size: 16px; color: #555;">Great news! A new order has been placed on the DARAJNI website.</p>
          
          <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
            <tr>
              <td style="padding: 10px; border: 1px solid #eee; background-color: #f9f9f9;"><strong>Order Number</strong></td>
              <td style="padding: 10px; border: 1px solid #eee;">${orderNumber}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #eee; background-color: #f9f9f9;"><strong>Total Amount</strong></td>
              <td style="padding: 10px; border: 1px solid #eee; color: #16a34a; font-weight: bold;">${formattedAmount}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #eee; background-color: #f9f9f9;"><strong>Customer Name</strong></td>
              <td style="padding: 10px; border: 1px solid #eee;">${customer.name}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #eee; background-color: #f9f9f9;"><strong>Customer Phone</strong></td>
              <td style="padding: 10px; border: 1px solid #eee;">${customer.phone}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #eee; background-color: #f9f9f9;"><strong>Location</strong></td>
              <td style="padding: 10px; border: 1px solid #eee;">${customer.city}, ${customer.state}</td>
            </tr>
          </table>

          <p style="margin-top: 30px; font-size: 14px; color: #888;">
            You can view the full order details in your <a href="https://www.darajni.in/admin" style="color: #D9B56B;">Admin Dashboard</a>.
          </p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`Order notification email sent for ${orderNumber}`);
  } catch (error) {
    console.error("Failed to send order notification email:", error);
  }
}
