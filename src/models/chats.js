const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema({
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  }],
  isGroup: {
    type: Boolean,
    default: false, // Support group chats
  },
  groupName: {
    type: String,
    default: '',
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Index for participant queries
chatSchema.index({ participants: 1 });

module.exports = mongoose.model('Chat', chatSchema);