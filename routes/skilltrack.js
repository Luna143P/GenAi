const express = require('express');
const router = express.Router();
const multer = require('multer');
const { verifyToken } = require('../middleware/authMiddleware');
const admin = require('firebase-admin');
const { PredictionServiceClient } = require('@google-cloud/aiplatform');

// Initialize multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
});

// Initialize Vertex AI client
const predictionClient = new PredictionServiceClient({
  credentials: require('../serviceAccountKey.json')
});

// Analyze resume
router.post('/analyze-resume', verifyToken, upload.single('resume'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No resume file provided' });
    }

    const resumeText = req.file.buffer.toString();
    const prompt = `Analyze resume and extract skills:\n\nResume Content: ${resumeText}\n\nProvide:\n1. Technical skills\n2. Soft skills\n3. Experience level\n4. Industry expertise`;

    const request = {
      instances: [{ prompt }],
      parameters: {
        temperature: 0.1,
        maxOutputTokens: 1024,
        topP: 0.8,
        topK: 40
      }
    };

    const [response] = await predictionClient.predict(request);
    const analysis = response.predictions[0];

    // Store analysis
    await admin.firestore().collection('skill_profiles')
      .doc(req.user.uid)
      .set({
        lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
        skills: analysis,
        resumeAnalysis: true
      }, { merge: true });

    res.json({ analysis });
  } catch (error) {
    console.error('Resume Analysis Error:', error);
    res.status(500).json({ error: 'Failed to analyze resume' });
  }
});

// Track skill progress
router.post('/track-progress', verifyToken, async (req, res) => {
  try {
    const { skills, projectsCompleted, certifications } = req.body;

    const prompt = `Analyze skill progress:\n\nSkills: ${skills}\nProjects: ${projectsCompleted}\nCertifications: ${certifications}\n\nProvide:\n1. Skill growth assessment\n2. Proficiency levels\n3. Areas of improvement\n4. Next steps recommendations`;

    const request = {
      instances: [{ prompt }],
      parameters: {
        temperature: 0.2,
        maxOutputTokens: 1024,
        topP: 0.8,
        topK: 40
      }
    };

    const [response] = await predictionClient.predict(request);
    const progress = response.predictions[0];

    // Store progress
    await admin.firestore().collection('skill_progress')
      .doc(req.user.uid)
      .collection('updates')
      .add({
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        progress,
        input: { skills, projectsCompleted, certifications }
      });

    res.json({ progress });
  } catch (error) {
    console.error('Progress Tracking Error:', error);
    res.status(500).json({ error: 'Failed to track progress' });
  }
});

// Get skill recommendations
router.post('/get-recommendations', verifyToken, async (req, res) => {
  try {
    const { currentSkills, careerGoals, timeframe } = req.body;

    const prompt = `Recommend skill development path:\n\nCurrent Skills: ${currentSkills}\nCareer Goals: ${careerGoals}\nTimeframe: ${timeframe}\n\nProvide:\n1. Priority skills to develop\n2. Learning resources\n3. Project suggestions\n4. Certification recommendations`;

    const request = {
      instances: [{ prompt }],
      parameters: {
        temperature: 0.3,
        maxOutputTokens: 1024,
        topP: 0.8,
        topK: 40
      }
    };

    const [response] = await predictionClient.predict(request);
    const recommendations = response.predictions[0];

    // Store recommendations
    await admin.firestore().collection('skill_recommendations')
      .doc(req.user.uid)
      .collection('paths')
      .add({
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        recommendations,
        input: { currentSkills, careerGoals, timeframe }
      });

    res.json({ recommendations });
  } catch (error) {
    console.error('Recommendation Error:', error);
    res.status(500).json({ error: 'Failed to get recommendations' });
  }
});

module.exports = router;