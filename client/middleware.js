const MARKDOWN_CONTENT = `# Appliqa — AI-Powered Job Finder & Career Optimization

> Appliqa (https://www.appliqa.xyz) is a full-stack career platform engineered to bypass ATS filters, score resumes against live job descriptions, calculate skills gaps, and optimize the end-to-end job application pipeline.

## Core Capabilities
- **Job Discovery & Search**: Real-time verified job listings across 50k+ active roles with customizable filters (remote, country, location, employment type).
- **AI Smart Search**: Natural-language query translation for complex job criteria (e.g., "Remote React engineer paying over $140k").
- **ATS Resume Intelligence**: Automatic PDF resume analysis extracting skills, technical stack, experience, and education with instant keyword match scoring (0-100%).
- **Skills Gap Analysis**: Algorithmic comparison between candidate credentials and target job requirements to highlight missing keywords and recommend actionable learning steps.
- **AI Career Advisor**: Conversational AI mentor providing contextual career guidance, mock interview preparation, and compensation negotiation strategies.
- **Visual Resume Creator & Optimizer**: Automated generation of ATS-optimized resumes, tailored cover letters, and personalized recruiter outreach messages.
- **Career Roadmap Planner**: Visualized promotion ladders, milestone timelines, and salary progression benchmarks based on professional background.

## Public Endpoints & Routes
- Homepage: https://www.appliqa.xyz/
- Job Search: https://www.appliqa.xyz/search
- Direct Role Query: https://www.appliqa.xyz/search?query=React+Developer
- Agent Skills: https://www.appliqa.xyz/.well-known/agent-skills/index.json
- API Catalog (RFC 9727): https://www.appliqa.xyz/.well-known/api-catalog
- OpenAPI Specification: https://www.appliqa.xyz/openapi.json
- MCP Server Card: https://www.appliqa.xyz/.well-known/mcp/server-card.json
- OAuth Discovery: https://www.appliqa.xyz/.well-known/oauth-authorization-server
- Micropayments (x402): https://www.appliqa.xyz/x402
- Sitemap: https://www.appliqa.xyz/sitemap.xml
`;

export default function middleware(req) {
  const accept = req.headers?.get?.('accept') || '';
  if (accept.includes('text/markdown') || accept.includes('text/x-markdown')) {
    return new Response(MARKDOWN_CONTENT, {
      status: 200,
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'Vary': 'Accept',
        'Cache-Control': 'public, max-age=3600',
        'RateLimit': 'limit=100, remaining=47, reset=42',
        'RateLimit-Limit': '100',
        'RateLimit-Remaining': '47',
        'RateLimit-Reset': '42',
        'RateLimit-Policy': '100;w=60',
        'Link': '</llms.txt>; rel="describedby"; type="text/markdown", </openapi.json>; rel="service-desc"; type="application/json", </.well-known/api-catalog>; rel="api-catalog"; type="application/linkset+json", </.well-known/agent-skills/index.json>; rel="agent-skills"; type="application/json", </.well-known/mcp/server-card.json>; rel="mcp-server"; type="application/json", </.well-known/oauth-authorization-server>; rel="oauth-authorization-server"; type="application/json", </x402>; rel="payment"; type="application/json", </sitemap.xml>; rel="sitemap"; type="application/xml"'
      }
    });
  }
}
