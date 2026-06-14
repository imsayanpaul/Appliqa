import axios from 'axios';
import { supabase } from './supabase';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' }
});

// Cache the token in memory to avoid calling getSession() asynchronously on every request
let cachedToken = null;

// Initialize cached token on load
supabase.auth.getSession().then(({ data: { session } }) => {
  cachedToken = session?.access_token || null;
}).catch(() => {});

// Memory caches to allow instant tab transitions and prevent UI layout jumps
let savedJobsCache = null;
let suggestedRolesCache = null;
let searchHistoryCache = null;

// Listen for auth state changes to keep cached token updated
supabase.auth.onAuthStateChange((event, session) => {
  cachedToken = session?.access_token || null;
  // Clear caches on logout to prevent data leak between different user logins
  if (event === 'SIGNED_OUT') {
    savedJobsCache = null;
    suggestedRolesCache = null;
    searchHistoryCache = null;
  }
});

// Add interceptor to automatically attach Supabase JWT token to every request
api.interceptors.request.use(async (config) => {
  // If the cached token isn't initialized yet, fetch it (only blocks the first request)
  if (!cachedToken) {
    const { data: { session } } = await supabase.auth.getSession();
    cachedToken = session?.access_token || null;
  }

  if (cachedToken) {
    config.headers.Authorization = `Bearer ${cachedToken}`;
  }
  return config;
});

// Jobs
export const searchJobs = (params) => {
  // Invalidate search history cache so it pulls the latest history when returning Home
  searchHistoryCache = null;
  return api.get('/jobs/search', { params });
};

export const getSuggestedRoles = async () => {
  if (suggestedRolesCache) {
    // Return cached data immediately, fetch fresh copy in the background
    api.get('/jobs/suggested-roles')
      .then(res => {
        suggestedRolesCache = res;
      })
      .catch(() => {});
    return suggestedRolesCache;
  }

  const res = await api.get('/jobs/suggested-roles');
  suggestedRolesCache = res;
  return res;
};

export const getSavedJobs = async () => {
  if (savedJobsCache) {
    // Return cached data immediately, fetch fresh copy in the background
    api.get('/jobs/saved')
      .then(res => {
        savedJobsCache = res;
      })
      .catch(() => {});
    return savedJobsCache;
  }

  const res = await api.get('/jobs/saved');
  savedJobsCache = res;
  return res;
};

export const saveJob = async (job) => {
  const res = await api.post('/jobs/save', { job });
  savedJobsCache = null; // Invalidate cache so it pulls the new job
  return res;
};

export const updateJobStatus = async (id, status) => {
  const res = await api.patch(`/jobs/saved/${id}/status`, { status });
  // Update cache in-place
  if (savedJobsCache && savedJobsCache.data?.jobs) {
    savedJobsCache.data.jobs = savedJobsCache.data.jobs.map(j =>
      j._id === id ? { ...j, status } : j
    );
  }
  return res;
};

export const deleteSavedJob = async (id) => {
  const res = await api.delete(`/jobs/saved/${id}`);
  // Update cache in-place
  if (savedJobsCache && savedJobsCache.data?.jobs) {
    savedJobsCache.data.jobs = savedJobsCache.data.jobs.filter(j => j._id !== id);
  }
  return res;
};

export const saveCoverLetter = async (id, coverLetter) => {
  const res = await api.patch(`/jobs/saved/${id}/cover-letter`, { coverLetter });
  // Update cache in-place
  if (savedJobsCache && savedJobsCache.data?.jobs) {
    savedJobsCache.data.jobs = savedJobsCache.data.jobs.map(j =>
      j._id === id ? { ...j, coverLetter } : j
    );
  }
  return res;
};

export const saveRecruiterDM = async (id, recruiterDM) => {
  const res = await api.patch(`/jobs/saved/${id}/recruiter-dm`, { recruiterDM });
  // Update cache in-place
  if (savedJobsCache && savedJobsCache.data?.jobs) {
    savedJobsCache.data.jobs = savedJobsCache.data.jobs.map(j =>
      j._id === id ? { ...j, recruiterDM } : j
    );
  }
  return res;
};

export const saveInterviewPrep = async (id, interviewPrep) => {
  const res = await api.patch(`/jobs/saved/${id}/interview-prep`, { interviewPrep });
  // Update cache in-place
  if (savedJobsCache && savedJobsCache.data?.jobs) {
    savedJobsCache.data.jobs = savedJobsCache.data.jobs.map(j =>
      j._id === id ? { ...j, interviewPrep } : j
    );
  }
  return res;
};

// AI
export const analyzeResume = (resumeText) => api.post('/ai/analyze-resume', { resumeText });
export const smartSearch = (naturalQuery, resumeData) => api.post('/ai/smart-search', { naturalQuery, resumeData });
export const getMatchScore = (data) => api.post('/ai/match-score', data);
export const generateCoverLetter = (data) => api.post('/ai/cover-letter', data);
export const generateRecruiterDM = (data) => api.post('/ai/recruiter-dm', data);
export const generateInterviewPrep = (data) => api.post('/ai/interview-prep', data);
export const getATSScore = (data) => api.post('/ai/ats-score', data);
export const getCareerPath = (data) => api.post('/ai/career-path', data);
export const getAdvisorChat = (data) => api.post('/ai/career-advisor', data);
export const enhanceResumeBullet = (data) => api.post('/ai/enhance-bullet', data);
export const suggestResumeSkills = (data) => api.post('/ai/suggest-skills', data);
export const tailorResume = (data) => api.post('/ai/tailor-resume', data);
export const getAchievementFinderChat = (data) => api.post('/ai/achievement-finder', data);


// User
export const createOrUpdateUser = (data) => api.post('/user/profile', data);
export const getUserProfile = () => api.get('/user/profile'); // Backend uses token
export const incrementStat = (stat) => api.post('/user/increment-stat', { stat });
export const getSearchHistory = async () => {
  if (searchHistoryCache) {
    // Return cached data immediately, fetch fresh copy in the background
    api.get('/user/history')
      .then(res => {
        searchHistoryCache = res;
      })
      .catch(() => {});
    return searchHistoryCache;
  }

  const res = await api.get('/user/history');
  searchHistoryCache = res;
  return res;
};

export const deleteSearchHistory = async (query) => {
  const res = await api.delete('/user/history', { params: { query } });
  // Update cache in-place
  if (searchHistoryCache && searchHistoryCache.data?.history) {
    searchHistoryCache.data.history = searchHistoryCache.data.history.filter(h => h.query !== query);
  }
  return res;
};

export default api;
