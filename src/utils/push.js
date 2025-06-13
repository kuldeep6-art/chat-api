const User = require('../models/users');
const { sendFCMNotification } = require('./firebase');

module.exports = async (fastify) => {
  const subscribeSchema = {
    body: {
      type: 'object',
      required: ['fcmToken'],
      properties: {
        fcmToken: { type: 'string', minLength: 1 },
      },
    },
  };

  fastify.post('/push/subscribe', { schema: subscribeSchema, preHandler: fastify.auth }, async (request, reply) => {
    const { fcmToken } = request.body;
    try {
      await User.findByIdAndUpdate(
        request.user.userId,
        { $addToSet: { fcmTokens: fcmToken } },
        { new: true }
      );
      reply.code(201).send({ message: 'FCM token saved' });
    } catch (err) {
      reply.code(400).send({ error: err.message });
    }
  });
};

// Send push notification to Android devices
module.exports.sendPushNotification = async (userId, payload) => {
  const user = await User.findById(userId).lean();
  if (!user || !user.fcmTokens.length) return;

  for (const token of user.fcmTokens) {
    await sendFCMNotification(token, payload);
  }
};