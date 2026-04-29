const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username:   { type: String, required: true, unique: true },
  email:      { type: String, required: true },
  password:   { type: String, required: true },
  createdAt:  { type: Date, default: Date.now },

  // Elastic streak tokens (1 earned per 10-day streak milestone)
  streakTokens:   { type: Number, default: 0 },
  currentStreak:  { type: Number, default: 0 },
  lastStreakDate: { type: String, default: '' }, // 'YYYY-MM-DD'

  // Avatar stats driven by habit categories
  avatarStats: {
    stamina:    { type: Number, default: 0 },
    intellect:  { type: Number, default: 0 },
    discipline: { type: Number, default: 0 },
  },

  // Points balance for vault/social contracts
  points: { type: Number, default: 100 },
});

const userDataSchema = new mongoose.Schema({
  userId:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  tasks:        [{ type: String }],
  // category per task index, e.g. ['fitness','learning','routine']
  taskCategories: [{ type: String, enum: ['fitness', 'learning', 'routine', 'other'], default: 'other' }],
  checkedTasks: { type: Map, of: Boolean },
  month:        { type: Number, required: true },
  year:         { type: Number, required: true },
  updatedAt:    { type: Date, default: Date.now },
});

// Social vault contracts
const contractSchema = new mongoose.Schema({
  creatorId:       { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  friendUsername:  { type: String, required: true },
  habitName:       { type: String, required: true },
  deadline:        { type: Date, required: true },
  stakePoints:     { type: Number, required: true },
  status:          { type: String, enum: ['active', 'completed', 'failed'], default: 'active' },
  createdAt:       { type: Date, default: Date.now },
});

const User     = mongoose.model('User', userSchema);
const UserData = mongoose.model('UserData', userDataSchema);
const Contract = mongoose.model('Contract', contractSchema);

module.exports = { User, UserData, Contract };
