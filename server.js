require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const { User, UserData } = require('./models');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:5173',
    'https://habittrack-front-ot1ch3crd-adiths-projects-6dd5238c.vercel.app',
    /\.vercel\.app$/
  ],
  credentials: true
}));
app.use(bodyParser.json());

mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

mongoose.connection.on('connected', () => {
  console.log('Connected to MongoDB Atlas');
});

mongoose.connection.on('error', (err) => {
  console.error('MongoDB connection error:', err.message);
  console.log('Please check your MongoDB Atlas IP whitelist and connection string');
});

mongoose.connection.on('disconnected', () => {
  console.log('Disconnected from MongoDB');
});

// Register user
app.post('/api/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const user = new User({ username, email, password });
    await user.save();
    res.json({ success: true, userId: user._id, username: user.username });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Login user
app.post('/api/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username, password });
    if (user) {
      res.json({ success: true, userId: user._id, username: user.username });
    } else {
      res.status(401).json({ success: false, error: 'Invalid credentials' });
    }
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Save user data
app.post('/api/savedata', async (req, res) => {
  try {
    const { userId, tasks, checkedTasks, month, year } = req.body;
    await UserData.findOneAndUpdate(
      { userId, month, year },
      { tasks, checkedTasks, updatedAt: new Date() },
      { upsert: true }
    );
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Delete task from all months
app.post('/api/deletetask', async (req, res) => {
  try {
    const { userId, taskName } = req.body;
    
    // Find all user data documents
    const userDataDocs = await UserData.find({ userId });
    
    // Update each document to remove the task
    for (const doc of userDataDocs) {
      const taskIndex = doc.tasks.indexOf(taskName);
      if (taskIndex !== -1) {
        // Remove task from array
        doc.tasks.splice(taskIndex, 1);
        
        // Remove and update checkbox data
        const newCheckedTasks = new Map();
        doc.checkedTasks.forEach((value, key) => {
          const [oldTaskIndex, dayIndex] = key.split('-');
          const oldIndex = parseInt(oldTaskIndex);
          if (oldIndex < taskIndex) {
            newCheckedTasks.set(key, value);
          } else if (oldIndex > taskIndex) {
            newCheckedTasks.set(`${oldIndex - 1}-${dayIndex}`, value);
          }
        });
        
        doc.checkedTasks = newCheckedTasks;
        doc.updatedAt = new Date();
        await doc.save();
      }
    }
    
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Get user data
app.get('/api/getdata/:userId/:month/:year', async (req, res) => {
  try {
    const { userId, month, year } = req.params;
    const userData = await UserData.findOne({ userId, month: parseInt(month), year: parseInt(year) });
    if (userData) {
      res.json({ success: true, data: userData });
    } else {
      res.json({ success: true, data: { tasks: [], checkedTasks: {} } });
    }
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});