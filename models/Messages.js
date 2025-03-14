const mongoose = require("mongoose");

const MessageSchema = new mongoose.Schema(
  {
    text: {
      type: String
    },
    sender: {
      type: String,
      index: true
    },
    receiver: {
      type: String,
      index: true
    },
    senderName: {
      type: String,
    },
    receiverName: {
      type: String,
    },
    timestamp: {
      type: String
  }},
  { timestamps: true }
);

const Messages = mongoose.model("Messages", MessageSchema);

module.exports = Messages;
