require('dotenv').config();
const express    = require('express');
const mongoose   = require('mongoose');
const cors       = require('cors');
const bodyParser = require('body-parser');
const cron       = require('node-cron');
const { User, UserData, Contract } = require('./models');

const app  = express();
const PORT = process.env.PORT || 5000;

const allowedOrigins = [
  'https://habittrack-front.vercel.app',
  'http://localhost:5173',
  'http://localhost:3000',
];

app.use(cors({
  origin: (origin, cb) => (!origin || allowedOrigins.includes(origin) ? cb(null, true) : cb(new Error('Not allowed by CORS: ' + origin))),
  credentials: true,
}));
app.use(bodyParser.json());

mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
mongoose.connection.on('connected', () => console.log('Connected to MongoDB Atlas'));
mongoose.connection.on('error',     (err) => console.error('MongoDB error:', err.message));

// ── Helpers ──────────────────────────────────────────────────────────────────

// Map category → avatar stat key
const CATEGORY_STAT = { fitness: 'stamina', learning: 'intellect', routine: 'discipline', other: 'discipline' };

// Recalculate streak + award tokens + update avatar stats after a save
async function updateStreakAndStats(userId, tasks, taskCategories, checkedTasks, month, year) {
  const user = await User.findById(userId);
  if (!user) return;

  const today     = new Date();
  const todayStr  = today.toISOString().split('T')[0];
  const todayDay  = today.getDate() - 1; // 0-indexed day in month

  // Only update streak when saving current month
  if (today.getMonth() + 1 !== month || today.getFullYear() !== year) return;

  // Count how many habits completed today
  const totalTasks     = tasks.length;
  const completedToday = totalTasks > 0
    ? tasks.filter((_, ti) => checkedTasks[`${ti}-${todayDay}`]).length
    : 0;
  const allDoneToday = totalTasks > 0 && completedToday === totalTasks;

  // Update streak
  if (allDoneToday) {
    if (user.lastStreakDate !== todayStr) {
      user.currentStreak  += 1;
      user.lastStreakDate   = todayStr;

      // Award 1 token every 10-day milestone
      if (user.currentStreak % 10 === 0) {
        user.streakTokens += 1;
      }
    }
  }

  // Update avatar stats: +1 per completed habit today based on category
  tasks.forEach((_, ti) => {
    if (checkedTasks[`${ti}-${todayDay}`]) {
      const cat  = (taskCategories && taskCategories[ti]) || 'other';
      const stat = CATEGORY_STAT[cat] || 'discipline';
      user.avatarStats[stat] = Math.min(100, (user.avatarStats[stat] || 0) + 1);
    }
  });

  user.markModified('avatarStats');
  await user.save();
}

// ── Routes ────────────────────────────────────────────────────────────────────

app.get('/api/test', (req, res) =>
  res.json({ message: 'Backend is working!', timestamp: new Date().toISOString() })
);

// Register
app.post('/api/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const user = new User({ username, email, password });
    await user.save();
    res.json({ success: true, userId: user._id, username: user.username });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Login
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username, password });
    if (user) {
      res.json({
        success: true,
        userId:  user._id,
        username: user.username,
        streakTokens:  user.streakTokens,
        currentStreak: user.currentStreak,
        avatarStats:   user.avatarStats,
        points:        user.points,
      });
    } else {
      res.status(401).json({ success: false, error: 'Invalid credentials' });
    }
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Get user stats (streak tokens, avatar, points)
app.get('/api/user-stats/:userId', async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).select('-password');
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });
    res.json({
      success: true,
      streakTokens:  user.streakTokens,
      currentStreak: user.currentStreak,
      avatarStats:   user.avatarStats,
      points:        user.points,
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Use a streak save token to protect a missed day
app.post('/api/use-token', async (req, res) => {
  try {
    const { userId } = req.body;
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });
    if (user.streakTokens < 1) return res.status(400).json({ success: false, error: 'No tokens available' });

    user.streakTokens  -= 1;
    // Preserve streak by updating lastStreakDate to today
    user.lastStreakDate = new Date().toISOString().split('T')[0];
    await user.save();
    res.json({ success: true, streakTokens: user.streakTokens, currentStreak: user.currentStreak });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Save user data + trigger streak/avatar update
app.post('/api/savedata', async (req, res) => {
  try {
    const { userId, tasks, taskCategories, checkedTasks, month, year } = req.body;
    await UserData.findOneAndUpdate(
      { userId, month, year },
      { tasks, taskCategories: taskCategories || [], checkedTasks, updatedAt: new Date() },
      { upsert: true }
    );
    // Fire-and-forget streak + avatar update
    updateStreakAndStats(userId, tasks, taskCategories || [], checkedTasks, month, year).catch(console.error);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Delete task from all months
app.post('/api/deletetask', async (req, res) => {
  try {
    const { userId, taskName } = req.body;
    const docs = await UserData.find({ userId });
    for (const doc of docs) {
      const idx = doc.tasks.indexOf(taskName);
      if (idx === -1) continue;
      doc.tasks.splice(idx, 1);
      if (doc.taskCategories) doc.taskCategories.splice(idx, 1);
      const newChecked = new Map();
      doc.checkedTasks.forEach((val, key) => {
        const [ti, di] = key.split('-').map(Number);
        if (ti < idx)       newChecked.set(key, val);
        else if (ti > idx)  newChecked.set(`${ti - 1}-${di}`, val);
      });
      doc.checkedTasks = newChecked;
      doc.updatedAt    = new Date();
      await doc.save();
    }
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Get user data
app.get('/api/getdata/:userId/:month/:year', async (req, res) => {
  try {
    const { userId, month, year } = req.params;
    const data = await UserData.findOne({ userId, month: parseInt(month), year: parseInt(year) });
    if (data) {
      res.json({ success: true, data });
    } else {
      res.json({ success: true, data: { tasks: [], taskCategories: [], checkedTasks: {} } });
    }
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// ── Contracts (Social Vault) ──────────────────────────────────────────────────

// Create contract
app.post('/api/contracts', async (req, res) => {
  try {
    const { userId, friendUsername, habitName, deadline, stakePoints } = req.body;
    const creator = await User.findById(userId);
    if (!creator) return res.status(404).json({ success: false, error: 'User not found' });
    if (creator.points < stakePoints) return res.status(400).json({ success: false, error: 'Insufficient points' });

    const friend = await User.findOne({ username: friendUsername });
    if (!friend) return res.status(404).json({ success: false, error: 'Friend not found' });

    // Reserve points
    creator.points -= stakePoints;
    await creator.save();

    const contract = new Contract({ creatorId: userId, friendUsername, habitName, deadline, stakePoints });
    await contract.save();
    res.json({ success: true, contract, remainingPoints: creator.points });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Get contracts for a user (created by or involving them)
app.get('/api/contracts/:userId', async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ success: false, error: 'User not found' });
    const contracts = await Contract.find({
      $or: [{ creatorId: req.params.userId }, { friendUsername: user.username }]
    }).sort({ createdAt: -1 });
    res.json({ success: true, contracts });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Mark contract as completed
app.post('/api/contracts/:contractId/complete', async (req, res) => {
  try {
    const { userId } = req.body;
    const contract = await Contract.findById(req.params.contractId);
    if (!contract) return res.status(404).json({ success: false, error: 'Contract not found' });
    if (contract.creatorId.toString() !== userId) return res.status(403).json({ success: false, error: 'Unauthorized' });

    contract.status = 'completed';
    await contract.save();

    // Refund points to creator
    await User.findByIdAndUpdate(userId, { $inc: { points: contract.stakePoints } });
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// ── Cron: check expired contracts daily at midnight ───────────────────────────
cron.schedule('0 0 * * *', async () => {
  try {
    const expired = await Contract.find({ status: 'active', deadline: { $lt: new Date() } });
    for (const c of expired) {
      c.status = 'failed';
      await c.save();
      // Transfer staked points to friend as penalty
      const friend = await User.findOne({ username: c.friendUsername });
      if (friend) {
        friend.points += c.stakePoints;
        await friend.save();
      }
    }
    if (expired.length) console.log(`Processed ${expired.length} expired contracts`);
  } catch (err) {
    console.error('Cron contract check failed:', err.message);
  }
});

// ── Self-ping to keep Render alive ────────────────────────────────────────────
const RENDER_URL = process.env.RENDER_URL;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  if (RENDER_URL) {
    setInterval(() => {
      fetch(`${RENDER_URL}/api/test`)
        .then(() => console.log('Self-ping sent'))
        .catch((err) => console.error('Self-ping failed:', err.message));
    }, 14 * 60 * 1000);
  }
});
