const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8001;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
mongoose.connect(process.env.MONGO_URL + '/' + process.env.DB_NAME, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(async () => {
  console.log('✅ MongoDB connected successfully');
  
  // Auto-sync actors from registry
  const syncActors = require('./actors/syncActors');
  await syncActors();
})
.catch(err => console.error('❌ MongoDB connection error:', err));

// Import routes
const actorRoutes = require('./routes/actors');
const runRoutes = require('./routes/runs');
const scraperRoutes = require('./routes/scrapers');
const authRoutes = require('./routes/auth');
const scrapedDataRoutes = require('./routes/scrapedData');

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/actors', actorRoutes);
app.use('/api/runs', runRoutes);
app.use('/api/scrapers', scraperRoutes);
app.use('/api/scraped-data', scrapedDataRoutes);

// Health check
app.get('/api/', (req, res) => {
  res.json({ message: 'Scrapi Backend API Running' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: err.message });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Scrapi backend running on http://0.0.0.0:${PORT}`);
});