const express = require('express');
const router = express.Router();
const language = require('@google-cloud/language');
const { verifyToken } = require('../middleware/auth');

const languageClient = new language.LanguageServiceClient();

// Helper function for funding analysis
async function analyzeFundingData(text) {
  const document = {
    content: text,
    type: 'PLAIN_TEXT',
  };

  // Get comprehensive analysis
  const [sentimentResult] = await languageClient.analyzeSentiment({document});
  const [entityResult] = await languageClient.analyzeEntities({document});
  const [syntaxResult] = await languageClient.analyzeSyntax({document});
  const [classificationResult] = await languageClient.classifyText({document});

  return {
    sentiment: sentimentResult.documentSentiment,
    entities: entityResult.entities,
    syntax: syntaxResult,
    categories: classificationResult.categories || []
  };
}

// Funding Guidance endpoint
router.post('/guidance', verifyToken, async (req, res) => {
  try {
    const { stage, needs, metrics } = req.body;
    
    // Analyze funding components
    const stageAnalysis = await analyzeFundingData(stage);
    const needsAnalysis = await analyzeFundingData(needs);
    const metricsAnalysis = await analyzeFundingData(metrics);

    // Generate structured funding guidance
    const guidance = {
      fundingStrategy: {
        recommendedStage: determineStage(stageAnalysis),
        fundingNeeds: analyzeFundingNeeds(needsAnalysis),
        keyMetrics: extractMetrics(metricsAnalysis)
      },
      recommendations: generateFundingRecommendations(stageAnalysis, needsAnalysis),
      timeline: generateTimeline(stageAnalysis, needsAnalysis)
    };

    res.json({ guidance });
  } catch (error) {
    console.error('Funding Guidance Error:', error);
    res.status(500).json({ error: 'Failed to generate funding guidance' });
  }
});

// Investor Matching endpoint
router.post('/investor-match', verifyToken, async (req, res) => {
  try {
    const { pitch, requirements, preferences } = req.body;
    
    // Analyze investor matching components
    const pitchAnalysis = await analyzeFundingData(pitch);
    const requirementsAnalysis = await analyzeFundingData(requirements);
    const preferencesAnalysis = await analyzeFundingData(preferences);

    // Generate investor matching recommendations
    const matches = {
      investorProfile: generateInvestorProfile(requirementsAnalysis),
      matchScore: calculateMatchScore(pitchAnalysis, requirementsAnalysis),
      recommendations: generateMatchRecommendations(pitchAnalysis, preferencesAnalysis)
    };

    res.json({ matches });
  } catch (error) {
    console.error('Investor Matching Error:', error);
    res.status(500).json({ error: 'Failed to generate investor matches' });
  }
});

// Funding Readiness endpoint
router.post('/readiness', verifyToken, async (req, res) => {
  try {
    const { business, financials, team } = req.body;
    
    // Analyze readiness components
    const businessAnalysis = await analyzeFundingData(business);
    const financialsAnalysis = await analyzeFundingData(financials);
    const teamAnalysis = await analyzeFundingData(team);

    // Generate readiness assessment
    const assessment = {
      overallScore: calculateReadinessScore(businessAnalysis, financialsAnalysis, teamAnalysis),
      businessReadiness: assessBusinessReadiness(businessAnalysis),
      financialReadiness: assessFinancialReadiness(financialsAnalysis),
      teamReadiness: assessTeamReadiness(teamAnalysis),
      improvements: generateReadinessImprovements(businessAnalysis, financialsAnalysis, teamAnalysis)
    };

    res.json({ assessment });
  } catch (error) {
    console.error('Readiness Assessment Error:', error);
    res.status(500).json({ error: 'Failed to assess funding readiness' });
  }
});

// Helper functions
function determineStage(analysis) {
  const stageIndicators = analysis.entities
    .filter(e => e.salience > 0.3)
    .map(e => e.name);

  // Determine stage based on indicators
  if (stageIndicators.some(i => i.toLowerCase().includes('seed'))) {
    return 'Seed';
  } else if (stageIndicators.some(i => i.toLowerCase().includes('series a'))) {
    return 'Series A';
  } else {
    return 'Early Stage';
  }
}

function analyzeFundingNeeds(analysis) {
  const numbers = analysis.entities.filter(e => e.type === 'NUMBER');
  return {
    amount: numbers.length > 0 ? numbers[0].name : 'Not specified',
    purposes: analysis.entities
      .filter(e => e.salience > 0.2)
      .map(e => e.name)
  };
}

function extractMetrics(analysis) {
  return analysis.entities
    .filter(e => e.salience > 0.2)
    .map(e => ({
      metric: e.name,
      importance: e.salience,
      sentiment: e.sentiment.score
    }));
}

function generateFundingRecommendations(stageAnalysis, needsAnalysis) {
  const recommendations = [];

  // Stage-based recommendations
  if (stageAnalysis.sentiment.score < 0) {
    recommendations.push('Consider bootstrapping or angel investment first');
  } else if (stageAnalysis.sentiment.score > 0.3) {
    recommendations.push('Ready for institutional investment');
  }

  // Needs-based recommendations
  const fundingNeeds = analyzeFundingNeeds(needsAnalysis);
  if (fundingNeeds.purposes.length < 3) {
    recommendations.push('Develop more detailed funding allocation plan');
  }

  return recommendations;
}

function generateTimeline(stageAnalysis, needsAnalysis) {
  const timeline = [];

  // Generate timeline based on stage and needs
  const stage = determineStage(stageAnalysis);
  const needs = analyzeFundingNeeds(needsAnalysis);

  timeline.push({
    phase: 'Preparation',
    duration: '1-2 months',
    activities: ['Document preparation', 'Financial modeling', 'Pitch deck creation']
  });

  timeline.push({
    phase: 'Outreach',
    duration: '2-3 months',
    activities: ['Investor identification', 'Initial meetings', 'Pitch refinement']
  });

  timeline.push({
    phase: 'Due Diligence',
    duration: '1-2 months',
    activities: ['Financial review', 'Legal documentation', 'Negotiations']
  });

  return timeline;
}

function generateInvestorProfile(analysis) {
  return {
    stage: determineStage(analysis),
    preferences: analysis.entities
      .filter(e => e.salience > 0.2)
      .map(e => ({
        criteria: e.name,
        importance: e.salience
      })),
    industries: analysis.categories.map(c => c.name)
  };
}

function calculateMatchScore(pitchAnalysis, requirementsAnalysis) {
  let score = 0;

  // Calculate match based on sentiment alignment
  score += (pitchAnalysis.sentiment.score + 1) * 50;

  // Add points for matching entities
  const pitchEntities = new Set(pitchAnalysis.entities.map(e => e.name.toLowerCase()));
  const reqEntities = requirementsAnalysis.entities.map(e => e.name.toLowerCase());
  reqEntities.forEach(e => {
    if (pitchEntities.has(e)) score += 10;
  });

  return Math.min(100, score);
}

function generateMatchRecommendations(pitchAnalysis, preferencesAnalysis) {
  const recommendations = [];

  // Sentiment-based recommendations
  if (pitchAnalysis.sentiment.score < 0.2) {
    recommendations.push('Strengthen value proposition in pitch');
  }

  // Preference alignment recommendations
  const preferences = preferencesAnalysis.entities
    .filter(e => e.salience > 0.3)
    .map(e => e.name);
  if (preferences.length > 0) {
    recommendations.push(`Focus on key preferences: ${preferences.join(', ')}`);
  }

  return recommendations;
}

function calculateReadinessScore(businessAnalysis, financialsAnalysis, teamAnalysis) {
  let score = 0;

  // Business readiness (40%)
  score += (businessAnalysis.sentiment.score + 1) * 20;

  // Financial readiness (40%)
  score += (financialsAnalysis.sentiment.score + 1) * 20;

  // Team readiness (20%)
  score += (teamAnalysis.sentiment.score + 1) * 10;

  return Math.min(100, score);
}

function assessBusinessReadiness(analysis) {
  return {
    score: (analysis.sentiment.score + 1) * 50,
    strengths: analysis.entities
      .filter(e => e.sentiment.score > 0)
      .map(e => e.name),
    weaknesses: analysis.entities
      .filter(e => e.sentiment.score < 0)
      .map(e => e.name)
  };
}

function assessFinancialReadiness(analysis) {
  return {
    score: (analysis.sentiment.score + 1) * 50,
    metrics: analysis.entities
      .filter(e => e.type === 'NUMBER')
      .map(e => ({
        metric: e.name,
        context: e.metadata.description || 'financial metric'
      })),
    concerns: analysis.entities
      .filter(e => e.sentiment.score < -0.2)
      .map(e => e.name)
  };
}

function assessTeamReadiness(analysis) {
  return {
    score: (analysis.sentiment.score + 1) * 50,
    strengths: analysis.entities
      .filter(e => e.type === 'PERSON' && e.sentiment.score > 0)
      .map(e => e.name),
    gaps: analysis.entities
      .filter(e => e.sentiment.score < 0)
      .map(e => e.name)
  };
}

function generateReadinessImprovements(businessAnalysis, financialsAnalysis, teamAnalysis) {
  const improvements = [];

  // Business improvements
  if (businessAnalysis.sentiment.score < 0.2) {
    improvements.push('Strengthen business model and market validation');
  }

  // Financial improvements
  const financialMetrics = financialsAnalysis.entities.filter(e => e.type === 'NUMBER');
  if (financialMetrics.length < 3) {
    improvements.push('Develop more comprehensive financial projections');
  }

  // Team improvements
  const teamMembers = teamAnalysis.entities.filter(e => e.type === 'PERSON');
  if (teamMembers.length < 2) {
    improvements.push('Consider expanding core team or advisory board');
  }

  return improvements;
}

module.exports = router;