const Redis = require('ioredis');
const client = new Redis(process.env.REDIS_URL); // auto-connect

client.on('error', (err) => console.error('Redis Client Error:', err));

async function cacheUser(userId, userData) {
  await client.setex(`user:${userId}`, 3600, JSON.stringify(userData));
}

async function getCachedUser(userId) {
  const data = await client.get(`user:${userId}`);
  return data ? JSON.parse(data) : null;
}

async function publishMessage(channel, message) {
  await client.publish(channel, JSON.stringify(message));
}

let _subscriber = null;

async function subscribeToChannel(channel, callback) {
  if (!_subscriber) {
    _subscriber = client.duplicate();
    _subscriber.on('error', (err) => console.error('Redis Subscriber Error:', err));
    await _subscriber.connect().catch((err) => {
      if (!/already connecting|connected/i.test(err.message)) throw err;
    });
  }

  await _subscriber.subscribe(channel, (message) => {
    callback(message);
  });
}

module.exports = {
  client,
  cacheUser,
  getCachedUser,
  publishMessage,
  subscribeToChannel,
};
