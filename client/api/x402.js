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

  // x402-mesh Manifest Link
  res.setHeader('Link', '</.well-known/x402-mesh.json>; rel="x402-mesh"; type="application/json"');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  return res.status(402).json({
    status: 402,
    error: 'Payment Required',
    message: 'This endpoint requires an HTTP-native micropayment or token assertion to access premium agentic operations.',
    x402: {
      version: '1.0',
      schemes: ['usdc-base', 'lightning', 'stripe_agentic', 'credit'],
      price: '0.01',
      currency: 'USD',
      payment_url: 'https://www.appliqa.xyz/pricing',
      supported_methods: [
        'usdc-base',
        'lightning',
        'webmonetization',
        'token_exchange'
      ],
      capabilities: [
        'bulk_job_matching',
        'deep_ats_audit',
        'custom_interview_simulation'
      ]
    },
    x402_mesh: {
      protocol: 'x402-mesh/0.1',
      vendor_id: 'appliqa',
      categories: ['job-search', 'career-intelligence', 'resume-analysis', 'recruitment'],
      registry_url: 'https://www.startuphub.ai/api/x402-mesh/registry',
      manifest_url: 'https://www.appliqa.xyz/.well-known/x402-mesh.json',
      peer_pricelist: [
        {
          vendor_id: 'appliqa',
          service: 'job-search-and-ats-audit',
          price: '0.01',
          currency: 'USD',
          unit: 'request'
        }
      ]
    }
  });
}
