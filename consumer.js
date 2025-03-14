const { SQSClient, ReceiveMessageCommand, DeleteMessageCommand } = require('@aws-sdk/client-sqs');
require('dotenv').config();
const User = require('./models/User');
const Messages = require('./models/Messages');
const connectedUsers = require('./connectedUsers');

const sqsClient = new SQSClient({ region: process.env.AWS_REGION });
const QUEUE_URL = process.env.SQS_QUEUE_URL;
const { getIO } = require('./socket');

const processMessage = async (messageBody) => {
  // Your business logic here
  const io = getIO();
  try {
    
  const sender = await User.findOne({cognito_id: messageBody.sender});

  const message =new Messages({
    text: messageBody.text,
    sender: sender.cognito_id,
    receiver: messageBody.receiver.cognito_id,
    senderName: sender.given_name + ' ' + sender.family_name,
    receiverName: messageBody.receiver.name,
    timestamp: messageBody.timestamp
    });
    await message.save();

    const receiverSocketId = connectedUsers.get(message.receiver);
    if (receiverSocketId) {
        getIO().to(receiverSocketId).emit('message', message);
        console.log('Processing:', messageBody);
        } 
         
    }
    catch (error) {
    console.error('Error processing message:', error);
    }
};

const pollOnce = async () => {
  try {
    const data = await sqsClient.send(new ReceiveMessageCommand({
      QueueUrl: QUEUE_URL,
      WaitTimeSeconds: 10,
      MaxNumberOfMessages: 10,
    }));

    if (data.Messages) {
      for (const message of data.Messages) {
        console.log('Received message:', message.Body);

        await processMessage(JSON.parse(message.Body));

        await sqsClient.send(new DeleteMessageCommand({
          QueueUrl: QUEUE_URL,
          ReceiptHandle: message.ReceiptHandle,
        }));

        console.log(`Deleted message: ${message.MessageId}`);
      }
    }
  } catch (error) {
    console.error('Error polling SQS:', error);
  }
}

// Export a continuous polling function
module.exports = function startPolling() {
  (async function pollQueue() {
    while (true) {
      await pollOnce();
    }
  })();
};
