const mongoose = require('mongoose');
const { User, UserData } = require('../models');

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

  try {
    // Test database connection
    const connectionState = mongoose.connection.readyState;
    const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
    
    // Count documents
    const userCount = await User.countDocuments();
    const userDataCount = await UserData.countDocuments();
    
    // Add sample data if requested
    if (req.query.addSample === 'true') {
      try {
        const sampleUser = new User({
          username: 'testuser_' + Date.now(),
          email: 'test@example.com',
          password: 'testpass123'
        });
        
        const savedUser = await sampleUser.save();
        
        const sampleData = new UserData({
          userId: savedUser._id,
          tasks: ['Exercise', 'Read Book', 'Drink Water'],
          checkedTasks: new Map([
            ['0-1', true],
            ['1-1', false],
            ['2-1', true]
          ]),
          month: 12,
          year: 2024
        });
        
        await sampleData.save();
        
        res.json({
          success: true,
          message: 'Database test successful with sample data added!',
          connection: states[connectionState],
          userCount: userCount + 1,
          userDataCount: userDataCount + 1,
          sampleUser: savedUser.username,
          timestamp: new Date().toISOString()
        });
      } catch (sampleError) {
        res.json({
          success: true,
          message: 'Database connected but sample data failed',
          connection: states[connectionState],
          userCount,
          userDataCount,
          sampleError: sampleError.message,
          timestamp: new Date().toISOString()
        });
      }
    } else {
      res.json({
        success: true,
        message: 'Database connection test successful!',
        connection: states[connectionState],
        userCount,
        userDataCount,
        timestamp: new Date().toISOString(),
        note: 'Add ?addSample=true to create sample data'
      });
    }
    
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Database connection failed',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
}