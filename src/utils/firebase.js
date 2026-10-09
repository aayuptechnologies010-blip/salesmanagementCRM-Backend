const admin = require('firebase-admin');

const initFirebase = () => {
  try {
    if (admin.apps.length > 0) return;

    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
      console.log('Firebase Admin Initialized via JSON string.');
    } else {
      // Fallback to default which uses GOOGLE_APPLICATION_CREDENTIALS env var
      // If it fails because credentials are missing, we just log a warning instead of crashing
      try {
        admin.initializeApp();
        console.log('Firebase Admin Initialized via default application credentials.');
      } catch (innerErr) {
        console.warn('Firebase Admin skipped: No credentials provided in .env');
      }
    }
  } catch (err) {
    console.error('Firebase Admin Initialization Error:', err.message);
  }
};

const sendPushNotification = async (token, title, body, data = {}) => {
  try {
    if (!token || admin.apps.length === 0) return;
    
    // Ensure all data values are strings (FCM requirement)
    const stringifiedData = {};
    for (const [key, value] of Object.entries(data)) {
      stringifiedData[key] = String(value);
    }

    const message = {
      notification: {
        title,
        body
      },
      data: stringifiedData,
      token
    };
    
    const response = await admin.messaging().send(message);
    console.log('Successfully sent push notification:', response);
    return response;
  } catch (error) {
    console.error('Error sending push notification:', error.message);
  }
};

module.exports = {
  initFirebase,
  sendPushNotification
};
