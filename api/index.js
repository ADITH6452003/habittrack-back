export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { url, method } = req;
  
  try {
    // Simple routing
    if (url.includes('/api/testlogin') && method === 'POST') {
      const { username, password } = req.body;
      
      if (username === 'test' && password === 'test') {
        res.json({ 
          success: true, 
          userId: '507f1f77bcf86cd799439011', 
          username: 'test' 
        });
      } else {
        res.status(401).json({ success: false, error: 'Invalid credentials. Use test/test' });
      }
    }
    else if (url.includes('/api/ping')) {
      res.json({ 
        success: true, 
        message: 'Backend is working!', 
        timestamp: new Date().toISOString(),
        method: req.method,
        url: req.url
      });
    }
    else {
      res.status(404).json({ success: false, error: 'Endpoint not found' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: 'Server error: ' + error.message });
  }
}