const mongoose = require('mongoose');

const runSchema = new mongoose.Schema({
  runId: { type: String, required: true, unique: true },
  actorId: { type: String, required: true },
  actorName: { type: String, required: true },
  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User',
    required: true // Runs are ALWAYS user-specific
  },
  status: { type: String, enum: ['running', 'succeeded', 'failed'], default: 'running' },
  input: { type: Object },
  output: { type: Array, default: [] },
  resultCount: { type: Number, default: 0 },
  usage: { type: Number, default: 0 },
  duration: { type: String },
  startedAt: { type: Date, default: Date.now },
  finishedAt: { type: Date },
  error: { type: String }
});

// Index for efficient user-specific queries
runSchema.index({ userId: 1, startedAt: -1 });
runSchema.index({ runId: 1 });

module.exports = mongoose.model('Run', runSchema);