const { verifyToken } = require('../utils/jwt');

module.exports = async (request, reply) => {
  const authHeader = request.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    reply.code(401).send({ error: 'No token provided' });
    return;
  }

  const token = authHeader.replace('Bearer ', '');
  try {
    const decoded = verifyToken(token);
    request.user = decoded;
  } catch (err) {
    reply.code(401).send({ error: err.message });
  }
};