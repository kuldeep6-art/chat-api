const Chat = require('../models/chats');
const User = require('../models/users');

module.exports = async (fastify) => {
  const createChatSchema = {
    body: {
      type: 'object',
      required: ['participantIds'],
      properties: {
        participantIds: {
          type: 'array',
          items: { type: 'string' },
          minItems: 1,
        },
        isGroup: { type: 'boolean' },
        groupName: { type: 'string', maxLength: 100 },
      },
      if: { properties: { isGroup: { const: true } } },
      then: { required: ['groupName'] },
    },
  };

  const updateChatSchema = {
    params: {
      type: 'object',
      required: ['chatId'],
      properties: {
        chatId: { type: 'string' },
      },
    },
    body: {
      type: 'object',
      properties: {
        groupName: { type: 'string', maxLength: 100 },
        participantIds: {
          type: 'array',
          items: { type: 'string' },
          minItems: 2,
        },
      },
    },
  };

  const getChatsSchema = {
    params: {
      type: 'object',
      required: ['userId'],
      properties: {
        userId: { type: 'string' },
      },
    },
  };

  // Create Chat
  fastify.post('/chats', { schema: createChatSchema, preHandler: fastify.auth }, async (request, reply) => {
    const { participantIds, isGroup, groupName } = request.body;
    if (!participantIds.includes(request.user.userId)) {
      participantIds.push(request.user.userId);
    }

    try {
      const users = await User.find({ _id: { $in: participantIds } });
      if (users.length !== participantIds.length) {
        reply.code(400).send({ error: 'Invalid participants' });
        return;
      }

      const chat = new Chat({ participants: participantIds, isGroup, groupName });
      await chat.save();
      reply.code(201).send(chat);
    } catch (err) {
      reply.code(400).send({ error: err.message });
    }
  });

  // Update Group Chat
  fastify.put('/chats/:chatId', { schema: updateChatSchema, preHandler: fastify.auth }, async (request, reply) => {
    const { chatId } = request.params;
    const { groupName, participantIds } = request.body;

    try {
      const chat = await Chat.findById(chatId);
      if (!chat || !chat.participants.includes(request.user.userId)) {
        reply.code(403).send({ error: 'Unauthorized or invalid chat' });
        return;
      }
      if (!chat.isGroup) {
        reply.code(400).send({ error: 'Not a group chat' });
        return;
      }

      if (participantIds) {
        const users = await User.find({ _id: { $in: participantIds } });
        if (users.length !== participantIds.length) {
          reply.code(400).send({ error: 'Invalid participants' });
          return;
        }
        chat.participants = participantIds;
      }
      if (groupName) chat.groupName = groupName;

      await chat.save();
      reply.send(chat);
    } catch (err) {
      reply.code(400).send({ error: err.message });
    }
  });

  // Get User Chats
  fastify.get('/chats/:userId', { schema: getChatsSchema, preHandler: fastify.auth }, async (request, reply) => {
    if (request.user.userId !== request.params.userId) {
      reply.code(403).send({ error: 'Unauthorized' });
      return;
    }

    try {
      const chats = await Chat.find({ participants: request.params.userId })
        .populate('participants', 'username profilePicture')
        .lean();
      reply.send(chats);
    } catch (err) {
      reply.code(400).send({ error: err.message });
    }
  });
};