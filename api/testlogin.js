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
    const { username, password } = req.body;
    
    // Hardcoded test login - no database needed
    if (username === 'test' && password === 'test') {
      res.json({ 
        success: true, 
        userId: '507f1f77bcf86cd799439011', 
        username: 'test' 
      });
    } else {
      res.status(401).json({ success: false, error: 'Invalid credentials. Use test/test' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: 'Server error: ' + error.message });
  }
}