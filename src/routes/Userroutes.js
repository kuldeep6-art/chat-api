const User = require('../models/users');
const cloudinary = require('cloudinary').v2;

module.exports = async (fastify) => {
  // Get User Profile
  fastify.get('/users/:id', { preHandler: fastify.auth }, async (request, reply) => {
    const user = await User.findById(request.params.id).select('-password');
    if (!user) {
      reply.code(404).send({ error: 'User not found' });
      return;
    }
    reply.send(user);
  });

  // Update User Profile
  fastify.put('/users/:id', { preHandler: fastify.auth }, async (request, reply) => {
    if (request.user.userId !== request.params.id) {
      reply.code(403).send({ error: 'Unauthorized' });
      return;
    }

    const { username, email } = request.body;
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
      const updateData = { username, email };
      if (profilePicture) updateData.profilePicture = profilePicture;
      const user = await User.findByIdAndUpdate(request.params.id, updateData, {
        new: true,
        select: '-password',
      });
      reply.send(user);
    } catch (err) {
      reply.code(400).send({ error: err.message });
    }
  });
};