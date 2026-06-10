import axios from 'axios';
import { supabase } from './supabase';

const API_BASE = 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' }
});

// Add interceptor to automatically attach Supabase JWT token to every request
api.interceptors.request.use(async (config) => {
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.access_token) {
    config.headers.Authorization = `Bearer ${session.access_token}`;
  }
  return config;
});

// Jobs
export const searchJobs = (params) => api.get('/jobs/search', { params });
export const getSuggestedRoles = () => api.get('/jobs/suggested-roles');
export const saveJob = (job) => api.post('/jobs/save', { job }); // Backend uses token to know user
export const getSavedJobs = () => api.get('/jobs/saved'); // Backend uses token
export const updateJobStatus = (id, status) => api.patch(`/jobs/saved/${id}/status`, { status });
export const deleteSavedJob = (id) => api.delete(`/jobs/saved/${id}`);
export const saveCoverLetter = (id, coverLetter) => api.patch(`/jobs/saved/${id}/cover-letter`, { coverLetter });
export const saveRecruiterDM = (id, recruiterDM) => api.patch(`/jobs/saved/${id}/recruiter-dm`, { recruiterDM });
export const saveInterviewPrep = (id, interviewPrep) => api.patch(`/jobs/saved/${id}/interview-prep`, { interviewPrep });

// AI
export const analyzeResume = (resumeText) => api.post('/ai/analyze-resume', { resumeText });
export const smartSearch = (naturalQuery, resumeData) => api.post('/ai/smart-search', { naturalQuery, resumeData });
export const getMatchScore = (data) => api.post('/ai/match-score', data);
export const generateCoverLetter = (data) => api.post('/ai/cover-letter', data);
export const generateRecruiterDM = (data) => api.post('/ai/recruiter-dm', data);
export const generateInterviewPrep = (data) => api.post('/ai/interview-prep', data);
export const getATSScore = (data) => api.post('/ai/ats-score', data);
export const getCareerPath = (data) => api.post('/ai/career-path', data);

// User
export const createOrUpdateUser = (data) => api.post('/user/profile', data);
export const getUserProfile = () => api.get('/user/profile'); // Backend uses token
export const getSearchHistory = () => api.get('/user/history'); // Backend uses token
export const deleteSearchHistory = (query) => api.delete('/user/history', { params: { query } });

export default api;
