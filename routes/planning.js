const express = require('express');
const router = express.Router();
const language = require('@google-cloud/language');
const { verifyToken } = require('../middleware/auth');

const languageClient = new language.LanguageServiceClient();

// Helper function for comprehensive text analysis
async function analyzeBusinessIdea(text) {
  const document = {
    content: text,
    type: 'PLAIN_TEXT',
  };

  // Get sentiment analysis
  const [sentimentResult] = await languageClient.analyzeSentiment({document});
  
  // Get entity analysis
  const [entityResult] = await languageClient.analyzeEntities({document});
  
  // Get syntax analysis
  const [syntaxResult] = await languageClient.analyzeSyntax({document});

  // Get content classification
  const [classificationResult] = await languageClient.classifyText({document});

  return {
    sentiment: sentimentResult.documentSentiment,
    entities: entityResult.entities,
    syntax: syntaxResult,
    categories: classificationResult.categories || []
  };
}

// Idea Check endpoint
router.post('/idea-check', verifyToken, async (req, res) => {
  try {
    const { idea } = req.body;
    const analysis = await analyzeBusinessIdea(idea);

    // Process the analysis results
    const response = {
      feasibility: {
        score: analysis.sentiment.score * 100,
        explanation: `The idea sentiment analysis shows ${analysis.sentiment.score > 0 ? 'positive' : 'negative'} indicators`
      },
      marketPotential: {
        categories: analysis.categories.map(c => ({
          name: c.name,
          confidence: c.confidence
        })),
        keyEntities: analysis.entities
          .filter(e => e.salience > 0.1)
          .map(e => ({
            name: e.name,
            type: e.type,
            salience: e.salience
          }))
      },
      recommendations: generateRecommendations(analysis)
    };

    res.json(response);
  } catch (error) {
    console.error('Idea Check Error:', error);
    res.status(500).json({ error: 'Failed to analyze idea' });
  }
});

// SWOT Analysis endpoint
router.post('/swot', verifyToken, async (req, res) => {
  try {
    const { idea, market, competition } = req.body;
    
    // Analyze all components
    const ideaAnalysis = await analyzeBusinessIdea(idea);
    const marketAnalysis = await analyzeBusinessIdea(market);
    const competitionAnalysis = await analyzeBusinessIdea(competition);

    // Generate SWOT based on analyses
    const swot = {
      strengths: extractStrengths(ideaAnalysis, marketAnalysis),
      weaknesses: extractWeaknesses(ideaAnalysis, competitionAnalysis),
      opportunities: extractOpportunities(marketAnalysis),
      threats: extractThreats(competitionAnalysis, marketAnalysis)
    };

    res.json({ swot });
  } catch (error) {
    console.error('SWOT Error:', error);
    res.status(500).json({ error: 'Failed to generate SWOT analysis' });
  }
});

// Helper functions for analysis
function generateRecommendations(analysis) {
  const recommendations = [];

  // Sentiment-based recommendations
  if (analysis.sentiment.score < 0) {
    recommendations.push('Consider refining the value proposition to address potential concerns');
  }

  // Entity-based recommendations
  const marketEntities = analysis.entities.filter(e => e.type === 'LOCATION' || e.type === 'ORGANIZATION');
  if (marketEntities.length > 0) {
    recommendations.push(`Focus on key markets/organizations: ${marketEntities.map(e => e.name).join(', ')}`);
  }

  // Category-based recommendations
  if (analysis.categories.length > 0) {
    recommendations.push(`Consider expanding into related categories: ${analysis.categories.map(c => c.name).join(', ')}`);
  }

  return recommendations;
}

function extractStrengths(ideaAnalysis, marketAnalysis) {
  const strengths = [];

  // Add strengths based on positive sentiment
  if (ideaAnalysis.sentiment.score > 0.3) {
    strengths.push('Strong positive market perception potential');
  }

  // Add strengths based on market entities
  const keyMarketEntities = marketAnalysis.entities
    .filter(e => e.salience > 0.3)
    .map(e => e.name);
  if (keyMarketEntities.length > 0) {
    strengths.push(`Strong presence in key markets: ${keyMarketEntities.join(', ')}`);
  }

  return strengths;
}

function extractWeaknesses(ideaAnalysis, competitionAnalysis) {
  const weaknesses = [];

  // Add weaknesses based on negative sentiment
  if (ideaAnalysis.sentiment.score < 0) {
    weaknesses.push('Potential negative market perception');
  }

  // Add weaknesses based on competition analysis
  const competitorStrengths = competitionAnalysis.entities
    .filter(e => e.salience > 0.3 && e.sentiment.score > 0)
    .map(e => e.name);
  if (competitorStrengths.length > 0) {
    weaknesses.push(`Strong competition in: ${competitorStrengths.join(', ')}`);
  }

  return weaknesses;
}

function extractOpportunities(marketAnalysis) {
  const opportunities = [];

  // Add opportunities based on positive market sentiment
  if (marketAnalysis.sentiment.score > 0) {
    opportunities.push('Favorable market conditions');
  }

  // Add opportunities based on market categories
  marketAnalysis.categories.forEach(category => {
    if (category.confidence > 0.7) {
      opportunities.push(`High potential in ${category.name}`);
    }
  });

  return opportunities;
}

function extractThreats(competitionAnalysis, marketAnalysis) {
  const threats = [];

  // Add threats based on negative market sentiment
  if (marketAnalysis.sentiment.score < -0.2) {
    threats.push('Challenging market conditions');
  }

  // Add threats based on strong competitors
  const strongCompetitors = competitionAnalysis.entities
    .filter(e => e.salience > 0.3 && e.sentiment.score > 0.5)
    .map(e => e.name);
  if (strongCompetitors.length > 0) {
    threats.push(`Strong competition from: ${strongCompetitors.join(', ')}`);
  }

  return threats;
}

module.exports = router;