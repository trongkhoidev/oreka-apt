import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  let { max = 12 } = req.query;
  max = Math.min(Number(max) || 12, 20); // Giới hạn tối đa 20
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
  } catch (error: any) {
    res.status(500).json({ error: error?.message || 'Proxy error' });
  }
} 