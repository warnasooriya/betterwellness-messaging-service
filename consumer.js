const { SQSClient, ReceiveMessageCommand, DeleteMessageCommand } = require('@aws-sdk/client-sqs');
const User = require('./models/User');
const Messages = require('./models/Messages');
const { getIO } = require('./socket');

require('dotenv').config();

const sqsClient = new SQSClient({ region: process.env.AWS_REGION });
const QUEUE_URL = process.env.SQS_QUEUE_URL;

let isRunning = true;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const processMessage = async (messageBody) => {
  const io = getIO();

  try {
    const sender = await User.findOne({ cognito_id: messageBody.sender });

    const message = new Messages({
      text: messageBody.text,
      sender: sender.cognito_id,
      receiver: messageBody.receiver.cognito_id,
      senderName: sender.given_name + ' ' + sender.family_name,
      receiverName: messageBody.receiver.name,
      timestamp: messageBody.timestamp,
    });

    await message.save();

    // Broadcast to room (works across pods!)
    io.to(`user:${message.receiver}`).emit('message', message);
    console.log(`✅ Message sent to user ${message.receiver} via Socket.IO room`);
  } catch (error) {
    console.error('❌ Error processing message:', error);
  }
};

const pollOnce = async () => {
  try {
    const data = await sqsClient.send(
      new ReceiveMessageCommand({
        QueueUrl: QUEUE_URL,
        WaitTimeSeconds: 10,
        MaxNumberOfMessages: 10,
      })
    );

    if (data.Messages) {
      for (const message of data.Messages) {
        const body = JSON.parse(message.Body);
        console.log('📩 Message from SQS:', body);

        await processMessage(body);

        await sqsClient.send(
          new DeleteMessageCommand({
            QueueUrl: QUEUE_URL,
            ReceiptHandle: message.ReceiptHandle,
          })
        );

        console.log(`✅ Deleted message: ${message.MessageId || 'unknown'}`);
      }
    } else {
      // console.log('🕑 No messages received');
    }
  } catch (err) {
    console.error('❌ Error polling SQS:', err.message);
    await sleep(3000);
  }
};

module.exports = async function startPolling() {
  console.log('🚀 Starting SQS polling loop...');
  while (isRunning) {
    await pollOnce();
  }
};

process.on('SIGINT', () => {
  console.log('🛑 Gracefully shutting down SQS poller...');
  isRunning = false;
});
