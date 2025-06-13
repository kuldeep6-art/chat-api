const admin = require('firebase-admin');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const initializeFirebase = () => {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
  });
};

const sendFCMNotification = async (token, payload) => {
  try {
    await admin.messaging().send({
      token,
      notification: {
        title: payload.title,
        body: payload.body,
      },
      data: {
        chatId: payload.chatId,
      },
      android: {
        priority: 'high',
        notification: {
          sound: 'default',
          click_action: 'FLUTTER_NOTIFICATION_CLICK',
        },
      },
    });
    console.log('FCM notification sent to token:', token);
  } catch (err) {
    console.error('FCM notification error:', err);
  }
};

module.exports = { initializeFirebase, sendFCMNotification };