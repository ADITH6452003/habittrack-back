const mongoose = require('mongoose');
const { UserData } = require('../models');

// Connect to MongoDB
if (!mongoose.connections[0].readyState) {
  mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
}

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const { userId, month, year } = req.query;
    const userData = await UserData.findOne({ 
      userId, 
      month: parseInt(month), 
      year: parseInt(year) 
    });
    
    if (userData) {
      res.json({ success: true, data: userData });
    } else {
      res.json({ success: true, data: { tasks: [], checkedTasks: {} } });
    }
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
}