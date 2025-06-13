const Chat = require('../models/chats');
const Message = require('../models/messages');
const cloudinary = require('cloudinary').v2;
const { sendPushNotification } = require('../utils/push');

module.exports = async (fastify) => {
  const sendMessageSchema = {
    body: {
      type: 'object',
      required: ['chatId'],
      properties: {
        chatId: { type: 'string' },
        content: { type: 'string', maxLength: 1000 },
      },
    },
  };

  const getMessagesSchema = {
    params: {
      type: 'object',
      required: ['chatId'],
      properties: {
        chatId: { type: 'string' },
      },
    },
    querystring: {
      type: 'object',
      properties: {
        page: { type: 'integer', minimum: 1, default: 1 },
        limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
      },
    },
  };

  // Send Message
  fastify.post('/messages', { schema: sendMessageSchema, preHandler: fastify.auth }, async (request, reply) => {
    const { chatId, content } = request.body;
    let mediaUrl = '';

    // Handle media upload
    if (request.isMultipart()) {
      const file = await request.file();
      if (file) {
        const result = await new Promise((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            { folder: 'chat-app/messages' },
            (error, result) => {
              if (error) reject(error);
              else resolve(result);
            }
          );
          file.file.pipe(uploadStream);
        });
        mediaUrl = result.secure_url;
      }
    }

    try {
      const chat = await Chat.findById(chatId).lean();
      if (!chat || !chat.participants.includes(request.user.userId)) {
        reply.code(403).send({ error: 'Unauthorized or invalid chat' });
        return;
      }

      const message = new Message({
        chatId,
        senderId: request.user.userId,
        content,
        mediaUrl,
      });
      await message.save();

      const populatedMessage = await Message.findById(message._id)
        .populate('senderId', 'username profilePicture')
        .lean();

      // Broadcast message
      fastify.broadcastMessage(populatedMessage, 'message');

      // Send FCM notifications to participants (except sender)
      const sender = await require('../models/User').findById(request.user.userId).select('username').lean();
      for (const participantId of chat.participants) {
        if (participantId.toString() !== request.user.userId) {
          await sendPushNotification(participantId, {
            title: `${sender.username} sent a message`,
            body: content || 'New media message',
            chatId: chatId.toString(),
          });
        }
      }

      reply.code(201).send(populatedMessage);
    } catch (err) {
      reply.code(400).send({ error: err.message });
    }
  });

  // Get Messages for a Chat (with pagination)
  fastify.get('/messages/:chatId', { schema: getMessagesSchema, preHandler: fastify.auth }, async (request, reply) => {
    const { page = 1, limit = 20 } = request.query;
    try {
      const chat = await Chat.findById(request.params.chatId).lean();
      if (!chat || !chat.participants.includes(request.user.userId)) {
        reply.code(403).send({ error: 'Unauthorized or invalid chat' });
        return;
      }

      const messages = await Message.find({ chatId: request.params.chatId })
        .populate('senderId', 'username profilePicture')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean();
      reply.send(messages.reverse());
    } catch (err) {
      reply.code(400).send({ error: err.message });
    }
  });
};