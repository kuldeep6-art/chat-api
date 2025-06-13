const User = require('../models/users');
const { generateToken } = require('../utils/jwt');
const cloudinary = require('cloudinary').v2;

module.exports = async (fastify) => {
  const registerSchema = {
    body: {
      type: 'object',
      required: ['username', 'email', 'password'],
      properties: {
        username: { type: 'string', minLength: 3, maxLength: 50 },
        email: { type: 'string', format: 'email' },
        password: { type: 'string', minLength: 6 },
      },
    },
  };

  const loginSchema = {
    body: {
      type: 'object',
      required: ['email', 'password'],
      properties: {
        email: { type: 'string', format: 'email' },
        password: { type: 'string', minLength: 6 },
      },
    },
  };

  // Register
  fastify.post('/auth/register', { schema: registerSchema }, async (request, reply) => {
    const { username, email, password } = request.body;
    let profilePicture = '';

    // Handle profile picture upload
    if (request.isMultipart()) {
      const file = await request.file();
      if (file) {
        const result = await new Promise((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            { folder: 'chat-app/profiles' },
            (error, result) => {
              if (error) reject(error);
              else resolve(result);
            }
          );
          file.file.pipe(uploadStream);
        });
        profilePicture = result.secure_url;
      }
    }

    try {
      const user = new User({ username, email, password, profilePicture });
      await user.save();
      const token = generateToken(user._id);
      reply.code(201).send({ token, user: { id: user._id, username, email, profilePicture } });
    } catch (err) {
      reply.code(400).send({ error: err.message });
    }
  });

  // Login
  fastify.post('/auth/login', { schema: loginSchema }, async (request, reply) => {
    const { email, password } = request.body;
    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password))) {
      reply.code(401).send({ error: 'Invalid credentials' });
      return;
    }
    const token = generateToken(user._id);
    reply.send({ token, user: { id: user._id, username: user.username, email, profilePicture: user.profilePicture } });
  });
};