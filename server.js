const express = require('express');
const path = require('path');
const language = require('@google-cloud/language');
const admin = require('firebase-admin');
const {Storage} = require('@google-cloud/storage');
const {CloudTasksClient} = require('@google-cloud/tasks');
const {PubSub} = require('@google-cloud/pubsub');
const {WorkflowsClient} = require('@google-cloud/workflows');
const {PredictionServiceClient} = require('@google-cloud/aiplatform');
const multer = require('multer');
const jwt = require('jsonwebtoken');

// Initialize service account
const serviceAccount = require('./serviceAccountKey.json');

// Initialize Firebase Admin with explicit project ID
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'gen-ai-exchng-472814',
  databaseURL: "https://gen-ai-exchng-472814.firebaseio.com"
});

// Initialize Firestore
const db = admin.firestore();

// Initialize Google Cloud clients
const languageClient = new language.LanguageServiceClient({credentials: serviceAccount});
const predictionClient = new PredictionServiceClient({credentials: serviceAccount});
const storageClient = new Storage({credentials: serviceAccount});
const tasksClient = new CloudTasksClient({credentials: serviceAccount});
const pubSubClient = new PubSub({credentials: serviceAccount});
const workflowsClient = new WorkflowsClient({credentials: serviceAccount});

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/planning', require('./routes/planning'));
app.use('/api/pitch', require('./routes/pitch'));
app.use('/api/market', require('./routes/market'));
app.use('/api/funding', require('./routes/funding'));

// New service routes
app.use('/api/counselor', require('./routes/counselor'));
app.use('/api/startup', require('./routes/startup'));
app.use('/api/skilltrack', require('./routes/skilltrack'));
app.use('/api/hire', require('./routes/hire'));

// Cloud Storage routes
app.use('/api/storage', require('./routes/storage'));

// Async processing routes
app.use('/api/tasks', require('./routes/tasks'));

// Serve Firebase configuration
app.get('/config/firebase', (req, res) => {
  const firebaseConfig = require('./config/firebase');
  res.json(firebaseConfig);
});

// Serve static files
// Serve static files from public
app.use(express.static(path.join(__dirname


)));

// Landing page route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'landing.html'));
});

// Helper function for text analysis
async function analyzeText(text) {
  const document = {
    content: text,
    type: 'PLAIN_TEXT',
  };

  const [result] = await languageClient.analyzeSentiment({document});
  const sentiment = result.documentSentiment;
  
  const [syntaxResult] = await languageClient.analyzeSyntax({document});
  
  const [entityResult] = await languageClient.analyzeEntities({document});
  
  return {
    sentiment,
    syntax: syntaxResult,
    entities: entityResult.entities
  };
}

// Example endpoint using Google Cloud Natural Language
app.post('/api/analyze', async (req, res) => {
  try {
    const { text } = req.body;
    const analysis = await analyzeText(text);
    res.json(analysis);
  } catch (error) {
    console.error('Analysis Error:', error);
    res.status(500).json({ error: 'Failed to analyze text' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});