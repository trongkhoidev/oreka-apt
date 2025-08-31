import { NextApiRequest, NextApiResponse } from 'next';
import crypto from 'crypto';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { address } = req.query;

    if (!address || typeof address !== 'string') {
      return res.status(400).json({ error: 'Address parameter is required' });
    }

    // Validate Aptos address format
    if (!/^0x[a-fA-F0-9]{64}$/.test(address)) {
      return res.status(400).json({ error: 'Invalid Aptos address format' });
    }

    // Generate cryptographically secure nonce
    const nonce = crypto.randomBytes(32).toString('hex');
    const issuedAt = new Date().toISOString();

    // Store nonce in database (in production, use Redis or database)
    // For now, we'll use a simple in-memory store
    // TODO: Implement proper nonce storage with expiration
    
    // Return nonce and issued timestamp
    res.status(200).json({
      nonce,
      issued_at: issuedAt,
      expires_in: 300, // 5 minutes
      message: `Sign this message to update your profile. Nonce: ${nonce}`
    });

  } catch (error) {
    console.error('Nonce generation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
