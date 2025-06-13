module.exports = async function (fastify) {
  fastify.setErrorHandler((error, request, reply) => {
    fastify.log.error(error);
    const statusCode = error.statusCode || 500;
    reply.code(statusCode).send({
      error: error.message || 'Internal Server Error',
    });
  });
};
