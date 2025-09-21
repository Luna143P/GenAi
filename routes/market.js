const express = require('express');
const router = express.Router();
const language = require('@google-cloud/language');
const { verifyToken } = require('../middleware/auth');

const languageClient = new language.LanguageServiceClient();

// Helper function for market analysis
async function analyzeMarketData(text) {
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

// Market Analysis endpoint
router.post('/analyze', verifyToken, async (req, res) => {
  try {
    const { market, industry, trends } = req.body;
    
    // Analyze all components
    const marketAnalysis = await analyzeMarketData(market);
    const industryAnalysis = await analyzeMarketData(industry);
    const trendsAnalysis = await analyzeMarketData(trends);

    // Generate structured market analysis
    const analysis = {
      marketOverview: {
        sentiment: marketAnalysis.sentiment.score,
        keyFactors: extractKeyFactors(marketAnalysis),
        marketSize: extractMarketSize(marketAnalysis)
      },
      industryAnalysis: {
        trends: extractTrends(industryAnalysis),
        challenges: extractChallenges(industryAnalysis),
        opportunities: extractOpportunities(industryAnalysis)
      },
      growthPotential: {
        trends: analyzeTrends(trendsAnalysis),
        forecast: generateForecast(trendsAnalysis)
      },
      recommendations: generateMarketRecommendations(marketAnalysis, industryAnalysis)
    };

    res.json({ analysis });
  } catch (error) {
    console.error('Market Analysis Error:', error);
    res.status(500).json({ error: 'Failed to analyze market' });
  }
});

// Competitor Analysis endpoint
router.post('/competitors', verifyToken, async (req, res) => {
  try {
    const { competitors, strengths, weaknesses } = req.body;
    
    // Analyze competitor data
    const competitorAnalysis = await analyzeMarketData(competitors);
    const strengthsAnalysis = await analyzeMarketData(strengths);
    const weaknessesAnalysis = await analyzeMarketData(weaknesses);

    // Generate structured competitor analysis
    const analysis = {
      competitorOverview: extractCompetitors(competitorAnalysis),
      competitiveAdvantages: analyzeStrengths(strengthsAnalysis),
      marketGaps: analyzeWeaknesses(weaknessesAnalysis),
      recommendations: generateCompetitorRecommendations(competitorAnalysis)
    };

    res.json({ analysis });
  } catch (error) {
    console.error('Competitor Analysis Error:', error);
    res.status(500).json({ error: 'Failed to analyze competitors' });
  }
});

// Strategy Recommendations endpoint
router.post('/strategy', verifyToken, async (req, res) => {
  try {
    const { goals, resources, constraints } = req.body;
    
    // Analyze strategy components
    const goalsAnalysis = await analyzeMarketData(goals);
    const resourcesAnalysis = await analyzeMarketData(resources);
    const constraintsAnalysis = await analyzeMarketData(constraints);

    // Generate structured strategy recommendations
    const strategy = {
      marketEntry: generateEntryStrategy(goalsAnalysis),
      resourceAllocation: analyzeResources(resourcesAnalysis),
      riskMitigation: analyzeConstraints(constraintsAnalysis),
      actionPlan: generateActionPlan(goalsAnalysis, resourcesAnalysis)
    };

    res.json({ strategy });
  } catch (error) {
    console.error('Strategy Error:', error);
    res.status(500).json({ error: 'Failed to generate strategy' });
  }
});

// Helper functions
function extractKeyFactors(analysis) {
  return analysis.entities
    .filter(e => e.salience > 0.3)
    .map(e => ({
      factor: e.name,
      importance: e.salience,
      sentiment: e.sentiment.score
    }));
}

function extractMarketSize(analysis) {
  const numbers = analysis.entities.filter(e => e.type === 'NUMBER');
  return numbers.map(n => ({
    value: n.name,
    context: n.metadata.description || 'market size'
  }));
}

function extractTrends(analysis) {
  return analysis.entities
    .filter(e => e.salience > 0.2 && e.sentiment.score !== 0)
    .map(e => ({
      trend: e.name,
      impact: e.sentiment.score,
      relevance: e.salience
    }));
}

function extractChallenges(analysis) {
  return analysis.entities
    .filter(e => e.sentiment.score < 0)
    .map(e => ({
      challenge: e.name,
      severity: Math.abs(e.sentiment.score),
      relevance: e.salience
    }));
}

function extractOpportunities(analysis) {
  return analysis.entities
    .filter(e => e.sentiment.score > 0 && e.salience > 0.2)
    .map(e => ({
      opportunity: e.name,
      potential: e.sentiment.score,
      relevance: e.salience
    }));
}

function analyzeTrends(analysis) {
  return analysis.entities
    .filter(e => e.salience > 0.2)
    .map(e => ({
      trend: e.name,
      growth: e.sentiment.score > 0 ? 'Growing' : 'Declining',
      confidence: e.salience
    }));
}

function generateForecast(analysis) {
  const trends = analysis.entities.filter(e => e.salience > 0.3);
  const sentiment = analysis.sentiment.score;

  return {
    outlook: sentiment > 0 ? 'Positive' : 'Challenging',
    confidence: Math.abs(sentiment),
    keyDrivers: trends.map(t => t.name)
  };
}

function generateMarketRecommendations(marketAnalysis, industryAnalysis) {
  const recommendations = [];

  // Market-based recommendations
  if (marketAnalysis.sentiment.score > 0.3) {
    recommendations.push('Consider aggressive market entry strategies');
  } else if (marketAnalysis.sentiment.score < 0) {
    recommendations.push('Focus on niche market segments initially');
  }

  // Industry-based recommendations
  const challenges = extractChallenges(industryAnalysis);
  if (challenges.length > 0) {
    recommendations.push('Develop mitigation strategies for identified challenges');
  }

  return recommendations;
}

function extractCompetitors(analysis) {
  return analysis.entities
    .filter(e => e.type === 'ORGANIZATION')
    .map(e => ({
      name: e.name,
      marketPresence: e.salience,
      sentiment: e.sentiment.score
    }));
}

function analyzeStrengths(analysis) {
  return analysis.entities
    .filter(e => e.sentiment.score > 0)
    .map(e => ({
      strength: e.name,
      impact: e.sentiment.score,
      relevance: e.salience
    }));
}

function analyzeWeaknesses(analysis) {
  return analysis.entities
    .filter(e => e.sentiment.score < 0)
    .map(e => ({
      weakness: e.name,
      impact: Math.abs(e.sentiment.score),
      relevance: e.salience
    }));
}

function generateCompetitorRecommendations(analysis) {
  const recommendations = [];

  // Competitor presence-based recommendations
  const competitors = extractCompetitors(analysis);
  if (competitors.length > 3) {
    recommendations.push('Market is highly competitive - focus on differentiation');
  } else if (competitors.length < 2) {
    recommendations.push('Consider first-mover advantages in this market');
  }

  // Sentiment-based recommendations
  if (analysis.sentiment.score < -0.2) {
    recommendations.push('Develop strong competitive advantages before market entry');
  }

  return recommendations;
}

function generateEntryStrategy(analysis) {
  const keyGoals = analysis.entities
    .filter(e => e.salience > 0.3)
    .map(e => e.name);

  return {
    approach: analysis.sentiment.score > 0 ? 'Aggressive' : 'Conservative',
    keyObjectives: keyGoals,
    timeline: analysis.entities.length > 5 ? 'Long-term' : 'Short-term'
  };
}

function analyzeResources(analysis) {
  return analysis.entities
    .filter(e => e.salience > 0.2)
    .map(e => ({
      resource: e.name,
      availability: e.sentiment.score > 0 ? 'Available' : 'Limited',
      priority: e.salience
    }));
}

function analyzeConstraints(analysis) {
  return analysis.entities
    .filter(e => e.sentiment.score < 0)
    .map(e => ({
      constraint: e.name,
      severity: Math.abs(e.sentiment.score),
      mitigation: generateMitigation(e)
    }));
}

function generateMitigation(constraint) {
  return `Develop contingency plans for ${constraint.name}`;
}

function generateActionPlan(goalsAnalysis, resourcesAnalysis) {
  const actions = [];

  // Goal-based actions
  const goals = goalsAnalysis.entities.filter(e => e.salience > 0.3);
  goals.forEach(goal => {
    actions.push({
      objective: goal.name,
      priority: goal.salience,
      timeline: goal.sentiment.score > 0 ? 'Short-term' : 'Long-term'
    });
  });

  // Resource-based actions
  const resources = resourcesAnalysis.entities.filter(e => e.salience > 0.2);
  resources.forEach(resource => {
    actions.push({
      action: `Allocate ${resource.name}`,
      priority: resource.salience,
      status: resource.sentiment.score > 0 ? 'Ready' : 'Needs preparation'
    });
  });

  return actions;
}

module.exports = router;