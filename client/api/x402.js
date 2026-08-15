export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Payment, X-Payment-Token');
  res.setHeader('X-Payment-Required', 'true');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  // RFC 9331 RateLimit Header Fields
  res.setHeader('RateLimit', 'limit=100, remaining=47, reset=42');
  res.setHeader('RateLimit-Limit', '100');
  res.setHeader('RateLimit-Remaining', '47');
  res.setHeader('RateLimit-Reset', '42');
  res.setHeader('RateLimit-Policy', '100;w=60');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  return res.status(402).json({
    status: 402,
    error: 'Payment Required',
    message: 'This endpoint requires an HTTP-native micropayment or token assertion to access premium agentic operations.',
    x402: {
      version: '1.0',
      schemes: ['lightning', 'stripe_agentic', 'usdc', 'credit'],
      price: '0.01',
      currency: 'USD',
      payment_url: 'https://www.appliqa.xyz/profile',
      supported_methods: [
        'lightning',
        'webmonetization',
        'token_exchange'
      ],
      capabilities: [
        'bulk_job_matching',
        'deep_ats_audit',
        'custom_interview_simulation'
      ]
    }
  });
}
