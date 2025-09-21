const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/authMiddleware');
const { PredictionServiceClient } = require('@google-cloud/aiplatform');

// Initialize Vertex AI client
const predictionClient = new PredictionServiceClient({
  credentials: require('../serviceAccountKey.json')
});

// Career path analysis
router.post('/analyze-career', verifyToken, async (req, res) => {
  try {
    const { interests, currentSkills, education } = req.body;
    
    // Format prompt for Gemini
    const prompt = `Analyze career path based on:\n
Interests: ${interests}\nCurrent Skills: ${currentSkills}\nEducation: ${education}\n\nProvide:\n1. Recommended career paths\n2. Skill gap analysis\n3. Learning roadmap\n4. Suggested courses and certifications`;

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
    const analysis = response.predictions[0];

    // Store analysis in Firestore
    await admin.firestore().collection('career_analyses')
      .doc(req.user.uid)
      .collection('reports')
      .add({
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        analysis,
        input: { interests, currentSkills, education }
      });

    res.json({ analysis });
  } catch (error) {
    console.error('Career Analysis Error:', error);
    res.status(500).json({ error: 'Failed to analyze career path' });
  }
});

// Skill gap analysis
router.post('/analyze-skills', verifyToken, async (req, res) => {
  try {
    const { targetRole, currentSkills } = req.body;

    const prompt = `Analyze skill gaps for ${targetRole} role:\n\nCurrent Skills: ${currentSkills}\n\nProvide:\n1. Required skills for the role\n2. Missing critical skills\n3. Skill improvement suggestions\n4. Recommended learning resources`;

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
    const analysis = response.predictions[0];

    // Store analysis
    await admin.firestore().collection('skill_analyses')
      .doc(req.user.uid)
      .collection('reports')
      .add({
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        analysis,
        input: { targetRole, currentSkills }
      });

    res.json({ analysis });
  } catch (error) {
    console.error('Skill Analysis Error:', error);
    res.status(500).json({ error: 'Failed to analyze skills' });
  }
});

// Get learning recommendations
router.post('/get-recommendations', verifyToken, async (req, res) => {
  try {
    const { skillGaps, learningStyle, timeAvailable } = req.body;

    const prompt = `Recommend learning path for:\n\nSkill Gaps: ${skillGaps}\nLearning Style: ${learningStyle}\nTime Available: ${timeAvailable}\n\nProvide:\n1. Recommended courses\n2. Practice projects\n3. Certifications\n4. Learning timeline`;

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
    await admin.firestore().collection('learning_recommendations')
      .doc(req.user.uid)
      .collection('plans')
      .add({
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        recommendations,
        input: { skillGaps, learningStyle, timeAvailable }
      });

    res.json({ recommendations });
  } catch (error) {
    console.error('Recommendation Error:', error);
    res.status(500).json({ error: 'Failed to get recommendations' });
  }
});

module.exports = router;