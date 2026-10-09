const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
  // Create a reusable transporter object using the default SMTP transport
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.mailtrap.io',
    port: process.env.SMTP_PORT || 2525,
    auth: {
      user: process.env.SMTP_USER || 'user',
      pass: process.env.SMTP_PASS || 'pass',
    },
  });

  const message = {
    from: `${process.env.FROM_NAME || 'CRM Support'} <${process.env.FROM_EMAIL || 'noreply@crm.com'}>`,
    to: options.email,
    subject: options.subject,
    text: options.message,
    html: options.html || undefined,
  };

  const info = await transporter.sendMail(message);

  console.log('Message sent: %s', info.messageId);
};

module.exports = sendEmail;
