const { SQSClient, SendMessageCommand } = require('@aws-sdk/client-sqs');
require('dotenv').config();
const { ObjectId } = require("mongodb");
const sqsClient = new SQSClient({ region: process.env.AWS_REGION });

async function sendMessage(message, groupId = 'default') {
  const params = {
    QueueUrl: process.env.SQS_QUEUE_URL,
    MessageGroupId: groupId,   // Required for FIFO queues
    MessageDeduplicationId: new ObjectId().toString(), // Recommended
    MessageBody: JSON.stringify(message),
  };

  try {
    const data = await sqsClient.send(new SendMessageCommand(params));
    console.log('✅ SQS message sent:', data.MessageId);
    return data;
  } catch (error) {
    console.error('❌ Error sending SQS message:', error);
    throw error;
  }
}

module.exports = { sendMessage };
