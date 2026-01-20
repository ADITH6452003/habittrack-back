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

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

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
}