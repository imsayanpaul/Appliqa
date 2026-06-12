# ⚡ Appliqa — AI-Powered Job Finder

A full-stack job finder application with AI-powered resume scanning, smart job matching, and application tracking.

![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react)
![Express](https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)
![Gemini](https://img.shields.io/badge/Gemini_AI-8E75B2?style=for-the-badge&logo=google)

## Features

- 🔍 **Job Search** — Real-time jobs from LinkedIn, Indeed, Glassdoor via JSearch API
- 🤖 **AI Smart Search** — Describe your ideal job in natural language
- 📄 **Resume Scanner** — Upload PDF resume → AI extracts skills, experience, education
- ⚡ **AI Match Score** — Get relevance % for each job based on your resume
- 📌 **Save & Track** — Bookmark jobs and track application status (Saved → Applied → Interview → Offer)
- 🧠 **AI Interview Prep** — Generate custom interview questions, model answers, and prep tips tailored to specific job listings
- 💬 **AI Career Advisor** — Chat with an interactive AI mentor for personalized career guidance, mock interviews, and resume critique based on your profile
- ✍️ **AI Resume Builder** — Build or optimize your resume with AI-generated professional summaries, custom cover letters, and tailored recruiter DMs
- 🗺️ **Career Path Planner** — Visualize career trajectory, timeline, and salary progression based on your background
- 🎯 **Skills Gap Analysis** — Automatically compare your skills against desired roles to discover exactly what you need to learn next
- 👤 **User Profile** — Save preferences for personalized search results and roadmap generation

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React (Vite) |
| Backend | Express.js |
| Database | Supabase (PostgreSQL) |
| Job API | JSearch (RapidAPI) |
| AI | Google Gemini 2.0 Flash |
| PDF Parsing | PDF.js |

## Quick Start

### 1. Get Free API Keys (no credit card needed)

| Service | Free Tier | Get Key |
|---------|----------|---------|
| JSearch | 200 req/month | [RapidAPI](https://rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch) |
| Gemini | 15 req/min | [AI Studio](https://aistudio.google.com/apikey) |
| Supabase | Free Tier Project | [Supabase](https://supabase.com) |

### 2. Configure Environment

```bash
# Edit .env file in the root directory
RAPIDAPI_KEY=your_rapidapi_key
GEMINI_API_KEY=your_gemini_key
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_KEY=your_supabase_service_role_key
```

### 3. Install & Run

```bash
# Install all dependencies (both client and server)
npm run install:all
```

#### Start both frontend and backend concurrently:
```bash
npm run dev
```

#### Start servers individually:
* **Frontend Client (Vite)**:
  ```bash
  npm run client
  ```
* **Backend Server (Express)**:
  ```bash
  npm run server
  ```

## Project Structure

```
Appliqa/
├── client/                 # React frontend (Vite)
│   └── src/
│       ├── components/     # JobCard, JobDetail, ResumeUpload
│       ├── pages/          # Home, SearchResults, SavedJobs, Profile
│       └── services/       # API client
├── server/                 # Express backend
│   ├── models/             # User, SavedJob, SearchHistory
│   └── routes/             # jobs, ai, user
├── .env                    # API keys (not committed)
└── package.json            # Root scripts
```

## License

[MIT](LICENSE)
