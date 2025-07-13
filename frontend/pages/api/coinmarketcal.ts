import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  let { max = 12 } = req.query;
  max = Math.min(Number(max) || 12, 20); 
  const apiKey = '4ECzX3OEyT7uohNB9mKPH5c7yuFrfJ1BIDhdSRob';
  const url = `https://developers.coinmarketcal.com/v1/events?max=${max}`;

  try {
    const apiRes = await fetch(url, {
      headers: {
        'x-api-key': apiKey,
      },
    });
    const data = await apiRes.json();
    res.status(apiRes.status).json(data);
  } catch (error: unknown) {
    res.status(500).json({ error: error instanceof Error ? error.message : 'Proxy error' });
  }
} 