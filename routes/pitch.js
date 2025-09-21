const express = require('express');
const router = express.Router();
const language = require('@google-cloud/language');
const { verifyToken } = require('../middleware/auth');

const languageClient = new language.LanguageServiceClient();

// Helper function for pitch analysis
async function analyzePitch(text) {
  const document = {
    content: text,
    type: 'PLAIN_TEXT',
  };

  // Get comprehensive analysis
  const [sentimentResult] = await languageClient.analyzeSentiment({document});
  const [entityResult] = await languageClient.analyzeEntities({document});
  const [syntaxResult] = await languageClient.analyzeSyntax({document});

  return {
    sentiment: sentimentResult.documentSentiment,
    entities: entityResult.entities,
    syntax: syntaxResult
  };
}

// Generate pitch deck endpoint
router.post('/generate-deck', verifyToken, async (req, res) => {
  try {
    const { pitch, company, market } = req.body;
    
    // Analyze all components
    const pitchAnalysis = await analyzePitch(pitch);
    const companyAnalysis = await analyzePitch(company);
    const marketAnalysis = await analyzePitch(market);

    // Generate structured pitch deck content
    const deckContent = {
      overview: {
        keyPoints: extractKeyPoints(pitchAnalysis),
        sentiment: pitchAnalysis.sentiment.score
      },
      company: {
        strengths: extractStrengths(companyAnalysis),
        uniqueValue: extractUniqueValue(companyAnalysis)
      },
      market: {
        opportunities: extractOpportunities(marketAnalysis),
        targetSegments: extractTargetSegments(marketAnalysis)
      },
      recommendations: generatePitchRecommendations(pitchAnalysis)
    };

    res.json({ deckContent });
  } catch (error) {
    console.error('Pitch Deck Error:', error);
    res.status(500).json({ error: 'Failed to generate pitch deck' });
  }
});

// Mentor Q&A simulation endpoint
router.post('/mentor-qa', verifyToken, async (req, res) => {
  try {
    const { question, context } = req.body;
    
    // Analyze question and context
    const questionAnalysis = await analyzePitch(question);
    const contextAnalysis = await analyzePitch(context);

    // Generate structured response
    const response = {
      answer: generateMentorResponse(questionAnalysis, contextAnalysis),
      insights: extractInsights(contextAnalysis),
      suggestions: generateSuggestions(questionAnalysis)
    };

    res.json(response);
  } catch (error) {
    console.error('Mentor Q&A Error:', error);
    res.status(500).json({ error: 'Failed to generate mentor response' });
  }
});

// Pitch practice feedback endpoint
router.post('/practice-feedback', verifyToken, async (req, res) => {
  try {
    const { pitchScript } = req.body;
    const analysis = await analyzePitch(pitchScript);

    // Generate structured feedback
    const feedback = {
      clarity: analyzeClarity(analysis),
      impact: analyzeImpact(analysis),
      structure: analyzeStructure(analysis),
      improvements: generateImprovements(analysis)
    };

    res.json({ feedback });
  } catch (error) {
    console.error('Practice Feedback Error:', error);
    res.status(500).json({ error: 'Failed to generate practice feedback' });
  }
});

// Helper functions
function extractKeyPoints(analysis) {
  return analysis.entities
    .filter(e => e.salience > 0.3)
    .map(e => ({
      point: e.name,
      importance: e.salience,
      sentiment: e.sentiment.score
    }));
}

function extractStrengths(analysis) {
  return analysis.entities
    .filter(e => e.sentiment.score > 0 && e.salience > 0.2)
    .map(e => e.name);
}

function extractUniqueValue(analysis) {
  const highValueEntities = analysis.entities
    .filter(e => e.salience > 0.4)
    .map(e => e.name);

  return {
    keyFeatures: highValueEntities,
    overallSentiment: analysis.sentiment.score
  };
}

function extractOpportunities(analysis) {
  return analysis.entities
    .filter(e => e.type === 'LOCATION' || e.type === 'ORGANIZATION')
    .map(e => ({
      name: e.name,
      type: e.type,
      relevance: e.salience
    }));
}

function extractTargetSegments(analysis) {
  return analysis.entities
    .filter(e => e.type === 'PERSON' || e.type === 'ORGANIZATION')
    .map(e => ({
      segment: e.name,
      type: e.type,
      sentiment: e.sentiment.score
    }));
}

function generatePitchRecommendations(analysis) {
  const recommendations = [];

  // Sentiment-based recommendations
  if (analysis.sentiment.score < 0.2) {
    recommendations.push('Enhance positive aspects of the pitch');
  }

  // Entity-based recommendations
  const keyEntities = analysis.entities.filter(e => e.salience > 0.3);
  if (keyEntities.length < 3) {
    recommendations.push('Include more specific details about key features/benefits');
  }

  // Syntax-based recommendations
  const sentenceCount = analysis.syntax.sentences.length;
  if (sentenceCount > 15) {
    recommendations.push('Consider making the pitch more concise');
  }

  return recommendations;
}

function generateMentorResponse(questionAnalysis, contextAnalysis) {
  const response = [];

  // Add context-based insights
  const relevantContext = contextAnalysis.entities
    .filter(e => e.salience > 0.3)
    .map(e => e.name);

  if (relevantContext.length > 0) {
    response.push(`Based on ${relevantContext.join(', ')}, here's my perspective:`);
  }

  // Add sentiment-based guidance
  if (questionAnalysis.sentiment.score < 0) {
    response.push('Let me address your concerns constructively.');
  }

  return response.join(' ');
}

function extractInsights(analysis) {
  return analysis.entities
    .filter(e => e.salience > 0.2)
    .map(e => ({
      topic: e.name,
      relevance: e.salience,
      sentiment: e.sentiment.score
    }));
}

function generateSuggestions(analysis) {
  const suggestions = [];

  // Add clarity suggestions
  if (analysis.syntax.sentences.length > 2) {
    suggestions.push('Consider breaking down your question into smaller parts');
  }

  // Add focus suggestions
  const keyTopics = analysis.entities
    .filter(e => e.salience > 0.3)
    .map(e => e.name);
  if (keyTopics.length > 0) {
    suggestions.push(`Focus on key aspects: ${keyTopics.join(', ')}`);
  }

  return suggestions;
}

function analyzeClarity(analysis) {
  return {
    score: analysis.sentiment.magnitude * 100,
    keyTerms: analysis.entities
      .filter(e => e.salience > 0.2)
      .map(e => e.name)
  };
}

function analyzeImpact(analysis) {
  return {
    score: analysis.sentiment.score * 100,
    strongPoints: analysis.entities
      .filter(e => e.sentiment.score > 0.3)
      .map(e => e.name)
  };
}

function analyzeStructure(analysis) {
  const sentences = analysis.syntax.sentences;
  return {
    sentenceCount: sentences.length,
    averageLength: sentences.reduce((acc, s) => acc + s.text.content.length, 0) / sentences.length,
    flow: sentences.length > 10 ? 'Complex' : 'Concise'
  };
}

function generateImprovements(analysis) {
  const improvements = [];

  // Structure improvements
  if (analysis.syntax.sentences.length > 12) {
    improvements.push('Consider shortening the pitch for better impact');
  }

  // Clarity improvements
  if (analysis.sentiment.magnitude < 0.5) {
    improvements.push('Add more emotional appeal to engage audience');
  }

  // Content improvements
  const keyPoints = analysis.entities.filter(e => e.salience > 0.3);
  if (keyPoints.length < 3) {
    improvements.push('Include more specific examples and key benefits');
  }

  return improvements;
}

module.exports = router;