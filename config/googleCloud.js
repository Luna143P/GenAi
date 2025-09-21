const { GoogleAuth } = require('google-auth-library');

const auth = new GoogleAuth({
  scopes: [
    'https://www.googleapis.com/auth/cloud-platform',
    'https://www.googleapis.com/auth/dialogflow',
    'https://www.googleapis.com/auth/firebase.database'
  ]
});

module.exports = {
  projectId: gen-ai-exchng-472814,
  location: process.env.GOOGLE_CLOUD_LOCATION || 'us-central1',
  auth,
  vertexConfig: {
    modelName: 'text-bison@001',
    temperature: 0.7,
    maxOutputTokens: 1024,
    topP: 0.8,
    topK: 40
  },
  workflowConfig: {
    parent: `projects/${process.env.GOOGLE_CLOUD_PROJECT}/locations/${process.env.GOOGLE_CLOUD_LOCATION || 'us-central1'}`
  },
  storageConfig: {
    bucketName: process.env.GOOGLE_CLOUD_STORAGE_BUCKET
  }
};