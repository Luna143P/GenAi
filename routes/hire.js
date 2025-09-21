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

// Analyze resume for job matching
router.post('/analyze-resume', verifyToken, upload.single('resume'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No resume file provided' });
    }

    const { jobDescription } = req.body;
    const resumeText = req.file.buffer.toString();

    const prompt = `Analyze resume for job match:\n\nResume: ${resumeText}\nJob Description: ${jobDescription}\n\nProvide:\n1. Match percentage\n2. Matching skills\n3. Missing requirements\n4. Candidate strengths\n5. Areas for improvement`;

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
    await admin.firestore().collection('resume_analyses')
      .doc(req.user.uid)
      .collection('matches')
      .add({
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        analysis,
        jobDescription
      });

    res.json({ analysis });
  } catch (error) {
    console.error('Resume Analysis Error:', error);
    res.status(500).json({ error: 'Failed to analyze resume' });
  }
});

// Generate interview questions
router.post('/generate-questions', verifyToken, async (req, res) => {
  try {
    const { jobRole, skills, experienceLevel } = req.body;

    const prompt = `Generate interview questions for:\n\nRole: ${jobRole}\nRequired Skills: ${skills}\nExperience Level: ${experienceLevel}\n\nProvide:\n1. Technical questions\n2. Behavioral questions\n3. Role-specific scenarios\n4. Culture fit questions\n5. Expected answers or evaluation criteria`;

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
    const questions = response.predictions[0];

    // Store questions
    await admin.firestore().collection('interview_questions')
      .doc(req.user.uid)
      .collection('sets')
      .add({
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        questions,
        input: { jobRole, skills, experienceLevel }
      });

    res.json({ questions });
  } catch (error) {
    console.error('Question Generation Error:', error);
    res.status(500).json({ error: 'Failed to generate questions' });
  }
});

// Generate cover letter
router.post('/generate-cover-letter', verifyToken, async (req, res) => {
  try {
    const { jobDescription, candidateExperience, companyInfo } = req.body;

    const prompt = `Generate personalized cover letter:\n\nJob Description: ${jobDescription}\nCandidate Experience: ${candidateExperience}\nCompany Info: ${companyInfo}\n\nCreate a professional cover letter that:\n1. Matches job requirements\n2. Highlights relevant experience\n3. Shows company knowledge\n4. Demonstrates enthusiasm\n5. Includes call to action`;

    const request = {
      instances: [{ prompt }],
      parameters: {
        temperature: 0.4,
        maxOutputTokens: 1024,
        topP: 0.8,
        topK: 40
      }
    };

    const [response] = await predictionClient.predict(request);
    const coverLetter = response.predictions[0];

    // Store cover letter
    await admin.firestore().collection('cover_letters')
      .doc(req.user.uid)
      .collection('letters')
      .add({
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        coverLetter,
        input: { jobDescription, candidateExperience, companyInfo }
      });

    res.json({ coverLetter });
  } catch (error) {
    console.error('Cover Letter Generation Error:', error);
    res.status(500).json({ error: 'Failed to generate cover letter' });
  }
});

// Optimize LinkedIn profile
router.post('/optimize-linkedin', verifyToken, async (req, res) => {
  try {
    const { currentProfile, targetRole, skills } = req.body;

    const prompt = `Optimize LinkedIn profile for ${targetRole}:\n\nCurrent Profile: ${currentProfile}\nSkills: ${skills}\n\nProvide:\n1. Optimized headline\n2. Enhanced summary\n3. Experience descriptions\n4. Skills section optimization\n5. Keywords for visibility`;

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
    const optimization = response.predictions[0];

    // Store optimization
    await admin.firestore().collection('linkedin_optimizations')
      .doc(req.user.uid)
      .collection('profiles')
      .add({
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        optimization,
        input: { currentProfile, targetRole, skills }
      });

    res.json({ optimization });
  } catch (error) {
    console.error('LinkedIn Optimization Error:', error);
    res.status(500).json({ error: 'Failed to optimize LinkedIn profile' });
  }
});

module.exports = router;