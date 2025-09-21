const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/authMiddleware');
const { CloudTasksClient } = require('@google-cloud/tasks');
const { PubSub } = require('@google-cloud/pubsub');

// Initialize clients
const tasksClient = new CloudTasksClient({
  credentials: require('../serviceAccountKey.json')
});

const pubsub = new PubSub({
  credentials: require('../serviceAccountKey.json')
});

// Cloud Tasks configuration
const project = 'gen-ai-exchng';
const queue = 'genai-tasks';
const location = 'us-central1';

// Pub/Sub topics
const TOPICS = {
  MARKET_ANALYSIS: 'market-analysis',
  IMAGE_GENERATION: 'image-generation',
  COMPETITOR_ANALYSIS: 'competitor-analysis'
};

// Create Cloud Task
async function createTask(queuePath, payload, scheduledTime = null) {
  const task = {
    httpRequest: {
      httpMethod: 'POST',
      url: `${process.env.CLOUD_FUNCTIONS_BASE_URL}/processTask`,
      headers: {
        'Content-Type': 'application/json',
      },
      body: Buffer.from(JSON.stringify(payload)).toString('base64'),
    },
  };

  if (scheduledTime) {
    task.scheduleTime = {
      seconds: scheduledTime / 1000
    };
  }

  const request = {
    parent: queuePath,
    task,
  };

  const [response] = await tasksClient.createTask(request);
  return response.name;
}

// Schedule market analysis task
router.post('/schedule-market-analysis', verifyToken, async (req, res) => {
  try {
    const { industry, competitors, metrics } = req.body;
    const queuePath = tasksClient.queuePath(project, location, queue);

    const payload = {
      type: 'market_analysis',
      data: {
        userId: req.user.uid,
        industry,
        competitors,
        metrics
      }
    };

    const taskName = await createTask(queuePath, payload);

    // Store task reference
    await admin.firestore().collection('tasks')
      .doc(req.user.uid)
      .collection('market_analysis')
      .add({
        taskName,
        status: 'scheduled',
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        payload
      });

    res.json({ taskName });
  } catch (error) {
    console.error('Task Scheduling Error:', error);
    res.status(500).json({ error: 'Failed to schedule market analysis' });
  }
});

// Schedule image generation task
router.post('/schedule-image-generation', verifyToken, async (req, res) => {
  try {
    const { prompt, style, dimensions } = req.body;
    const queuePath = tasksClient.queuePath(project, location, queue);

    const payload = {
      type: 'image_generation',
      data: {
        userId: req.user.uid,
        prompt,
        style,
        dimensions
      }
    };

    const taskName = await createTask(queuePath, payload);

    // Store task reference
    await admin.firestore().collection('tasks')
      .doc(req.user.uid)
      .collection('image_generation')
      .add({
        taskName,
        status: 'scheduled',
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        payload
      });

    res.json({ taskName });
  } catch (error) {
    console.error('Task Scheduling Error:', error);
    res.status(500).json({ error: 'Failed to schedule image generation' });
  }
});

// Publish message to Pub/Sub topic
router.post('/publish-analysis', verifyToken, async (req, res) => {
  try {
    const { type, data } = req.body;
    const topicName = TOPICS[type.toUpperCase()];

    if (!topicName) {
      return res.status(400).json({ error: 'Invalid analysis type' });
    }

    const topic = pubsub.topic(topicName);
    const messageData = {
      userId: req.user.uid,
      ...data,
      timestamp: Date.now()
    };

    const messageId = await topic.publish(Buffer.from(JSON.stringify(messageData)));

    // Store message reference
    await admin.firestore().collection('pubsub_messages')
      .doc(req.user.uid)
      .collection(type)
      .add({
        messageId,
        status: 'published',
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        data: messageData
      });

    res.json({ messageId });
  } catch (error) {
    console.error('Message Publishing Error:', error);
    res.status(500).json({ error: 'Failed to publish message' });
  }
});

// Get task status
router.get('/task-status/:taskId', verifyToken, async (req, res) => {
  try {
    const { taskId } = req.params;
    const { type } = req.query;

    const taskDoc = await admin.firestore().collection('tasks')
      .doc(req.user.uid)
      .collection(type)
      .doc(taskId)
      .get();

    if (!taskDoc.exists) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json(taskDoc.data());
  } catch (error) {
    console.error('Task Status Error:', error);
    res.status(500).json({ error: 'Failed to get task status' });
  }
});

module.exports = router;