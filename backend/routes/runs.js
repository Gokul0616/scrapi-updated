const express = require('express');
const router = express.Router();
const Run = require('../models/Run');
const Actor = require('../models/Actor');
const { v4: uuidv4 } = require('uuid');
const { getScraperFunction } = require('../actors/registry');
const authMiddleware = require('../middleware/auth');

// Get all runs (protected - user-specific)
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { status, actorId, limit = 20, page = 1 } = req.query;
    let query = { userId: req.userId }; // Only user's runs
    
    if (status) query.status = status;
    if (actorId) query.actorId = actorId;
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const runs = await Run.find(query)
      .sort({ startedAt: -1 })
      .limit(parseInt(limit))
      .skip(skip);
      
    const total = await Run.countDocuments(query);
    
    res.json({
      runs,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get run by ID (protected - user-specific)
router.get('/:runId', authMiddleware, async (req, res) => {
  try {
    const run = await Run.findOne({ 
      runId: req.params.runId,
      userId: req.userId // Only user's runs
    });
    if (!run) return res.status(404).json({ error: 'Run not found' });
    res.json(run);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create and execute a run (protected)
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { actorId, input } = req.body;
    
    // Find actor
    const actor = await Actor.findOne({ actorId });
    if (!actor) return res.status(404).json({ error: 'Actor not found' });
    
    // Check if user has access to this actor
    if (!actor.isPublic && actor.userId && actor.userId.toString() !== req.userId) {
      return res.status(403).json({ error: 'Access denied to this actor' });
    }
    
    // Create run with userId
    const run = new Run({
      runId: uuidv4(),
      actorId,
      actorName: actor.name,
      userId: req.userId, // Set user ownership
      input,
      status: 'running'
    });
    
    await run.save();
    
    // Execute scraper asynchronously (fire and forget)
    executeScraper(run._id, actorId, input).catch(err => {
      console.error('Scraper error:', err);
    });
    
    res.status(201).json(run);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Execute scraper function
async function executeScraper(runDbId, actorId, input) {
  const startTime = Date.now();
  
  try {
    const run = await Run.findById(runDbId);
    if (!run) return;
    
    // Get scraper function from registry
    const scraperFunc = getScraperFunction(actorId);
    if (!scraperFunc) {
      throw new Error(`No scraper implementation found for actor: ${actorId}`);
    }
    
    // Execute scraper
    const results = await scraperFunc(input);
    
    // Update run with results
    const duration = Math.round((Date.now() - startTime) / 1000);
    run.status = 'succeeded';
    run.output = results;
    
    // Calculate actual result count - check if results have a nested 'results' array
    let actualResultCount = results.length;
    if (results.length > 0 && results[0].results && Array.isArray(results[0].results)) {
      // If output has results array, count items in those arrays
      actualResultCount = results.reduce((total, item) => {
        return total + (item.results ? item.results.length : 0);
      }, 0);
    }
    run.resultCount = actualResultCount;
    
    run.duration = `${duration}s`;
    run.finishedAt = new Date();
    run.usage = parseFloat((Math.random() * 0.5).toFixed(2));
    
    await run.save();
    
    // Update actor stats
    await Actor.updateOne(
      { actorId },
      { $inc: { 'stats.runs': 1 } }
    );
    
  } catch (error) {
    console.error('Scraper execution error:', error);
    const run = await Run.findById(runDbId);
    if (run) {
      run.status = 'failed';
      run.error = error.message;
      run.finishedAt = new Date();
      const duration = Math.round((Date.now() - startTime) / 1000);
      run.duration = `${duration}s`;
      await run.save();
    }
  }
}

module.exports = router;