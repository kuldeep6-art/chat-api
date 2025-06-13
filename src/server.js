const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const fastify = require('fastify')({ logger: true });
const mongoose = require('mongoose');
const cloudinary = require('cloudinary').v2;
const { verifyToken } = require('./utils/jwt');
const { subscribeToChannel, publishMessage, client } = require('./utils/redis');

// MongoDB Connection
mongoose.connect(process.env.DB_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// Cloudinary Configuration
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Register Plugins
fastify.register(require('fastify-cors'), { origin: '*' });
fastify.register(require('fastify-multipart')); // ⛔ deprecated fastify-multipart
fastify.register(require('@fastify/websocket'));
fastify.register(require('fastify-rate-limit'), {
  redis: client,
  max: 100,
  timeWindow: '1 minute',
});

// Register Error Handler
fastify.register(require('./utils/errorHandler'));

// Register Auth Middleware
fastify.decorate('auth', require('./middlewares/authMiddleware'));

// Register Routes
fastify.register(require('./routes/Authroutes'), { prefix: '/api' });
fastify.register(require('./routes/Userroutes'), { prefix: '/api' });
fastify.register(require('./routes/chat'), { prefix: '/api' });
fastify.register(require('./routes/messages'), { prefix: '/api' });

// WebSocket Handler with Redis Pub/Sub
const clients = new Map();

fastify.get('/ws', { websocket: true }, (connection, req) => {
  let userId = null;
  const token = req.query.token;

  if (!token) {
    connection.socket.close(4001, 'No token provided');
    return;
  }

  try {
    const decoded = verifyToken(token);
    userId = decoded.userId;
    clients.set(userId, { socket: connection.socket, chatIds: new Set() });
  } catch (err) {
    connection.socket.close(4001, 'Invalid token');
    return;
  }

  connection.socket.on('message', async (message) => {
    try {
      const data = JSON.parse(message);
      if (data.type === 'join' && data.chatId) {
        const chat = await require('./models/Chat').findById(data.chatId);
        if (chat?.participants.includes(userId)) {
          clients.get(userId).chatIds.add(data.chatId);
          connection.socket.send(JSON.stringify({ type: 'ack', message: `Joined chat ${data.chatId}` }));
        } else {
          connection.socket.send(JSON.stringify({ error: 'Invalid chat' }));
        }
      } else if (data.type === 'typing' && data.chatId && typeof data.isTyping === 'boolean') {
        const chat = await require('./models/Chat').findById(data.chatId);
        if (chat?.participants.includes(userId)) {
          const user = await require('./models/User').findById(userId).select('username').lean();
          fastify.broadcastMessage({
            chatId: data.chatId,
            userId,
            username: user?.username,
            isTyping: data.isTyping,
          }, 'typing');
        }
      }
    } catch (err) {
      connection.socket.send(JSON.stringify({ error: 'Invalid message' }));
    }
  });

  connection.socket.on('close', () => {
    clients.delete(userId);
  });
});

// Subscribe to Redis messages
(async () => {
  await subscribeToChannel('chat-messages', (message) => {
    const data = JSON.parse(message);
    clients.forEach((client, userId) => {
      if (
        client.chatIds.has(data.message.chatId.toString()) &&
        client.socket.readyState === 1
      ) {
        client.socket.send(JSON.stringify({ type: data.type, message: data.message }));
      }
    });
  });
})();

// Broadcast decorator
fastify.decorate('broadcastMessage', async (message, type = 'message') => {
  await publishMessage('chat-messages', { type, message });
});

// Test Route
fastify.get('/', async (request, reply) => {
  return { message: 'Chat API is running!' };
});

// Start Server
const start = async () => {
  try {
    await fastify.listen({ port: process.env.PORT || 3000, host: '0.0.0.0' });
    console.log(`🚀 Server running at http://localhost:${process.env.PORT || 3000}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};
start();
