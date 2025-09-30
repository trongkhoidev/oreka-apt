import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { addr } = req.query;
  
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const response = await fetch(`http://localhost:4000/profiles/${addr}`);
    
    if (!response.ok) {
      const text = await response.text().catch(() => '');
      let payload: unknown = undefined;
      try { payload = JSON.parse(text); } catch {}
      return res.status(response.status).json({ 
        error: (payload as { error?: string })?.error || text || 'API error',
        status: response.status
      });
    }
    
    const data = await response.json();
    res.status(200).json(data);
  } catch (error) {
    console.error('Profile API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
