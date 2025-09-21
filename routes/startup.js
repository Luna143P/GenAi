const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/authMiddleware');
const admin = require('firebase-admin');
const { PredictionServiceClient } = require('@google-cloud/aiplatform');
const { Storage } = require('@google-cloud/storage');

// Initialize clients
const predictionClient = new PredictionServiceClient({
  credentials: require('../serviceAccountKey.json')
});

const storage = new Storage({
  credentials: require('../serviceAccountKey.json')
});



// Analyze startup idea
router.post('/analyze-idea', verifyToken, async (req, res) => {
  try {
    const { idea, industry, targetMarket } = req.body;

    const prompt = `Analyze startup idea:\n\nIdea: ${idea}\nIndustry: ${industry}\nTarget Market: ${targetMarket}\n\nProvide:\n1. Feasibility analysis\n2. Market fit assessment\n3. Key challenges\n4. Initial recommendations`;

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
    await admin.firestore().collection('startup_analyses')
      .doc(req.user.uid)
      .collection('ideas')
      .add({
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        analysis,
        input: { idea, industry, targetMarket }
      });

    res.json({ analysis });
  } catch (error) {
    console.error('Idea Analysis Error:', error);
    res.status(500).json({ error: 'Failed to analyze startup idea' });
  }
});

// Generate business plan
router.post('/generate-plan', verifyToken, async (req, res) => {
  try {
    const { idea, analysis, marketSize, competition } = req.body;

    const prompt = `Generate detailed business plan for:\n\nIdea: ${idea}\nAnalysis: ${analysis}\nMarket Size: ${marketSize}\nCompetition: ${competition}\n\nInclude:\n1. Executive Summary\n2. Market Analysis\n3. Business Model\n4. Financial Projections\n5. Marketing Strategy\n6. Risk Analysis`;

    const request = {
      instances: [{ prompt }],
      parameters: {
        temperature: 0.3,
        maxOutputTokens: 2048,
        topP: 0.8,
        topK: 40
      }
    };

    const [response] = await predictionClient.predict(request);
    const plan = response.predictions[0];

    // Store plan
    await admin.firestore().collection('business_plans')
      .doc(req.user.uid)
      .collection('plans')
      .add({
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        plan,
        input: { idea, analysis, marketSize, competition }
      });

    res.json({ plan });
  } catch (error) {
    console.error('Plan Generation Error:', error);
    res.status(500).json({ error: 'Failed to generate business plan' });
  }
});

// Generate pitch deck
router.post('/generate-pitch', verifyToken, async (req, res) => {
  try {
    const { idea, plan, marketData } = req.body;

    // Generate pitch content using Gemini
    const prompt = `Create pitch deck content for:\n\nIdea: ${idea}\nPlan: ${plan}\nMarket Data: ${marketData}\n\nInclude:\n1. Problem Statement\n2. Solution\n3. Market Opportunity\n4. Business Model\n5. Traction\n6. Team\n7. Financial Projections\n8. Ask`;

    const request = {
      instances: [{ prompt }],
      parameters: {
        temperature: 0.3,
        maxOutputTokens: 2048,
        topP: 0.8,
        topK: 40
      }
    };

    const [response] = await predictionClient.predict(request);
    const pitchContent = response.predictions[0];

    // Store pitch deck content
    const deckRef = await admin.firestore().collection('pitch_decks')
      .doc(req.user.uid)
      .collection('decks')
      .add({
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        content: pitchContent,
        input: { idea, plan, marketData },
        format: 'markdown'
      });

    res.json({
      deckId: deckRef.id,
      content: pitchContent
    });
  } catch (error) {
    console.error('Pitch Deck Generation Error:', error);
    res.status(500).json({ error: 'Failed to generate pitch deck' });
  }
});

module.exports = router;