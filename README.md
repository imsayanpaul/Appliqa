<p align="center">
  <a href="https://www.appliqa.xyz">
    <img src="client/public/logotext.svg" alt="Appliqa Logo" width="240" />
  </a>
</p>

<h3 align="center">⚡ AI-Powered Job Finder & Career Optimization</h3>

<p align="center">
  A full-stack career assistant featuring AI resume scanning, smart job matching, and application tracking.
</p>

<p align="center">
  <a href="https://www.appliqa.xyz">Live Website</a> • 
  <a href="#quick-start">Quick Start</a> • 
  <a href="#features">Features</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react" alt="React" />
  <img src="https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express" alt="Express" />
  <img src="https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white" alt="Supabase" />
  <img src="https://img.shields.io/badge/Gemini_AI-8E75B2?style=for-the-badge&logo=google" alt="Gemini" />
</p>

<!-- ===== VISUAL PREVIEW ===== -->
<div align="center">
  <br />
  <a href="https://www.appliqa.xyz">
    <!-- Replace the src URL below with your own desktop screenshot/gif (just drag and drop it into GitHub editor) -->
    <img src="https://github.com/user-attachments/assets/c58ad6fc-d40b-4813-90d5-39d1b54b0870" alt="Appliqa Desktop Showcase" width="850" style="border-radius: 12px; border: 1px solid rgba(255, 255, 255, 0.08); box-shadow: 0 20px 40px rgba(0, 0, 0, 0.6);" />
  </a>
  <br /><br />

  <!-- Responsive Comparison Layout (Optional: Uncomment and replace src links with your assets) -->
  <!--
  <table>
    <tr>
      <td align="center"><b>🖥️ Desktop View</b></td>
      <td align="center"><b>📱 Mobile View</b></td>
    </tr>
    <tr>
      <td><img src="https://github.com/user-attachments/assets/YOUR_DESKTOP_ASSET_ID" width="580" style="border-radius: 8px; border: 1px solid rgba(255, 255, 255, 0.08);" /></td>
      <td><img src="https://github.com/user-attachments/assets/YOUR_MOBILE_ASSET_ID" width="220" style="border-radius: 14px; border: 1px solid rgba(255, 255, 255, 0.08);" /></td>
    </tr>
  </table>
  -->
</div>

<br />

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

This repository contains the client-side code for **Appliqa**. The frontend client communicates directly with the hosted production API, so you do not need to run a local backend server to explore or execute the application.

### 1. Configure Supabase Environment
Create a `.env` file in the `client/` directory with the following variables:

```bash
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 2. Install & Run
```bash
# Navigate to the client directory
cd client

# Install dependencies
npm install

# Start the local development server (Vite)
npm run dev
```
*(Runs on `http://localhost:5173`)*

## Project Structure

```
Appliqa/
├── client/                 # React frontend (Vite)
│   └── src/
│       ├── components/     # JobCard, JobDetail, ResumeUpload
│       ├── pages/          # Home, SearchResults, SavedJobs, Profile
│       └── services/       # API client
└── package.json            # Root scripts
```

## License

[Proprietary / All Rights Reserved](LICENSE)
