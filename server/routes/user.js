const express = require('express');
const router = express.Router();
const { supabase } = require('../lib/supabase');
const requireAuth = require('../middleware/auth');

// Create or update user profile
router.post('/profile', requireAuth, async (req, res) => {
  try {
    const { 
      name, 
      preferences, 
      resumeData, 
      builderData,
      dob,
      phone,
      educationStatus,
      collegeCourse,
      expectedGraduationYear,
      jobSearchUrgency,
      openToInternationalRemote,
      preferredCurrency,
      portfolioGithub,
      portfolioBehance,
      portfolioLinkedin,
      portfolioWebsite,
      currentSalary,
      targetSalary,
      willingToRelocate,
      targetCities,
      skillsToLearn,
      openToBootcamps,
      preferredTools,
      preferredTechStack,
      certifications,
      skillsProficiency,
      resumesOptimizedCount,
      coverLettersGeneratedCount,
      recruiterDmsSentCount
    } = req.body;
    const userId = req.user.id;

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (dob !== undefined) updateData.dob = dob;
    if (phone !== undefined) updateData.phone = phone;
    if (educationStatus !== undefined) updateData.education_status = educationStatus;
    if (collegeCourse !== undefined) updateData.college_course = collegeCourse;
    if (expectedGraduationYear !== undefined) updateData.expected_graduation_year = expectedGraduationYear ? parseInt(expectedGraduationYear, 10) : null;
    if (jobSearchUrgency !== undefined) updateData.job_search_urgency = jobSearchUrgency;
    if (openToInternationalRemote !== undefined) updateData.open_to_international_remote = !!openToInternationalRemote;
    if (preferredCurrency !== undefined) updateData.preferred_currency = preferredCurrency;
    if (portfolioGithub !== undefined) updateData.portfolio_github = portfolioGithub;
    if (portfolioBehance !== undefined) updateData.portfolio_behance = portfolioBehance;
    if (portfolioLinkedin !== undefined) updateData.portfolio_linkedin = portfolioLinkedin;
    if (portfolioWebsite !== undefined) updateData.portfolio_website = portfolioWebsite;
    
    // New fields
    if (currentSalary !== undefined) updateData.current_salary = currentSalary !== '' && currentSalary !== null ? parseInt(currentSalary, 10) : null;
    if (targetSalary !== undefined) updateData.target_salary = targetSalary !== '' && targetSalary !== null ? parseInt(targetSalary, 10) : null;
    if (willingToRelocate !== undefined) updateData.willing_to_relocate = willingToRelocate !== '' && willingToRelocate !== null ? !!willingToRelocate : null;
    if (targetCities !== undefined) updateData.target_cities = targetCities;
    if (skillsToLearn !== undefined) updateData.skills_to_learn = skillsToLearn;
    if (openToBootcamps !== undefined) updateData.open_to_bootcamps = openToBootcamps !== '' && openToBootcamps !== null ? !!openToBootcamps : null;
    if (preferredTools !== undefined) updateData.preferred_tools = preferredTools;
    if (preferredTechStack !== undefined) updateData.preferred_tech_stack = preferredTechStack;
    if (certifications !== undefined) updateData.certifications = certifications;
    if (skillsProficiency !== undefined) updateData.skills_proficiency = skillsProficiency;
    if (resumesOptimizedCount !== undefined) updateData.resumes_optimized_count = resumesOptimizedCount !== '' && resumesOptimizedCount !== null ? parseInt(resumesOptimizedCount, 10) : 0;
    if (coverLettersGeneratedCount !== undefined) updateData.cover_letters_generated_count = coverLettersGeneratedCount !== '' && coverLettersGeneratedCount !== null ? parseInt(coverLettersGeneratedCount, 10) : 0;
    if (recruiterDmsSentCount !== undefined) updateData.recruiter_dms_sent_count = recruiterDmsSentCount !== '' && recruiterDmsSentCount !== null ? parseInt(recruiterDmsSentCount, 10) : 0;

    if (preferences) {
      if (preferences.desiredRole !== undefined) updateData.desired_role = preferences.desiredRole;
      if (preferences.country !== undefined) updateData.country = preferences.country;
      if (preferences.location !== undefined) updateData.location = preferences.location;
      if (preferences.experienceLevel !== undefined) updateData.experience_level = preferences.experienceLevel;
      if (preferences.salaryMin !== undefined) updateData.salary_min = preferences.salaryMin;
      if (preferences.salaryMax !== undefined) updateData.salary_max = preferences.salaryMax;
      if (preferences.jobType !== undefined) updateData.job_type = preferences.jobType;
      if (preferences.remote !== undefined) updateData.remote = preferences.remote;
      if (preferences.skills) updateData.skills = preferences.skills;
    }

    if (resumeData) {
      updateData.resume_file_name = resumeData.fileName || '';
      updateData.resume_file_size = resumeData.fileSize || '';
      updateData.resume_skills = resumeData.skills || [];
      updateData.resume_experience = resumeData.experience || [];
      updateData.resume_education = resumeData.education || [];
      updateData.resume_summary = resumeData.summary || '';
      updateData.resume_raw_text = resumeData.rawText || '';
      updateData.resume_suggested_roles = resumeData.suggestedRoles || [];
      updateData.resume_experience_level = resumeData.experienceLevel || '';
      updateData.resume_uploaded_at = new Date();
      updateData.resume_expertise = resumeData.expertise || [];
      updateData.resume_certifications = resumeData.certifications || [];
      updateData.resume_languages = resumeData.languages || [];
    }

    if (builderData !== undefined) {
      updateData.builder_data = builderData;
    }

    const { data: user, error } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;

    // Transform to the same nested shape that GET /profile returns
    const formattedUser = {
      _id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone || '',
      dob: user.dob || '',
      educationStatus: user.education_status || '',
      collegeCourse: user.college_course || '',
      expectedGraduationYear: user.expected_graduation_year || '',
      jobSearchUrgency: user.job_search_urgency || '',
      openToInternationalRemote: !!user.open_to_international_remote,
      preferredCurrency: user.preferred_currency || '',
      portfolioGithub: user.portfolio_github || '',
      portfolioBehance: user.portfolio_behance || '',
      portfolioLinkedin: user.portfolio_linkedin || '',
      portfolioWebsite: user.portfolio_website || '',
      currentSalary: user.current_salary !== null && user.current_salary !== undefined ? user.current_salary : '',
      targetSalary: user.target_salary !== null && user.target_salary !== undefined ? user.target_salary : '',
      willingToRelocate: user.willing_to_relocate !== null && user.willing_to_relocate !== undefined ? !!user.willing_to_relocate : false,
      targetCities: user.target_cities || '',
      skillsToLearn: user.skills_to_learn || '',
      openToBootcamps: user.open_to_bootcamps !== null && user.open_to_bootcamps !== undefined ? !!user.open_to_bootcamps : false,
      preferredTools: user.preferred_tools || '',
      preferredTechStack: user.preferred_tech_stack || '',
      certifications: user.certifications || '',
      skillsProficiency: user.skills_proficiency || '',
      resumesOptimizedCount: user.resumes_optimized_count || 0,
      coverLettersGeneratedCount: user.cover_letters_generated_count || 0,
      recruiterDmsSentCount: user.recruiter_dms_sent_count || 0,
      preferences: {
        desiredRole: user.desired_role || '',
        country: user.country || '',
        location: user.location || '',
        experienceLevel: user.experience_level || '',
        salaryMin: user.salary_min || 0,
        salaryMax: user.salary_max || 0,
        jobType: user.job_type || '',
        remote: user.remote || false,
        skills: user.skills || []
      },
      builderData: user.builder_data || null,
      resumeData: {
        fileName: user.resume_file_name || '',
        fileSize: user.resume_file_size || '',
        skills: user.resume_skills || [],
        experience: user.resume_experience || [],
        education: user.resume_education || [],
        summary: user.resume_summary || '',
        suggestedRoles: user.resume_suggested_roles || [],
        experienceLevel: user.resume_experience_level || '',
        rawText: user.resume_raw_text || '',
        uploadedAt: user.resume_uploaded_at,
        expertise: user.resume_expertise || [],
        certifications: user.resume_certifications || [],
        languages: user.resume_languages || []
      }
    };

    res.json({ success: true, user: formattedUser });
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Increment a profile stat counter
router.post('/increment-stat', requireAuth, async (req, res) => {
  try {
    const { stat } = req.body;
    const validStats = ['resumes_optimized_count', 'cover_letters_generated_count', 'recruiter_dms_sent_count'];

    if (!stat || !validStats.includes(stat)) {
      return res.status(400).json({ error: 'Invalid stat. Must be one of: ' + validStats.join(', ') });
    }

    const userId = req.user.id;

    // Read current value
    const { data: profile, error: readError } = await supabase
      .from('profiles')
      .select(stat)
      .eq('id', userId)
      .single();

    if (readError) throw readError;

    const currentValue = profile[stat] || 0;

    // Increment and update
    const { data: updated, error: updateError } = await supabase
      .from('profiles')
      .update({ [stat]: currentValue + 1 })
      .eq('id', userId)
      .select(stat)
      .single();

    if (updateError) throw updateError;

    res.json({ success: true, stat, newValue: updated[stat] });
  } catch (error) {
    console.error('Increment stat error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get user profile using JWT session token
router.get('/profile', requireAuth, async (req, res) => {
  try {
    let { data: user, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', req.user.id)
      .single();

    // If profile doesn't exist yet (new signup, trigger may not have run), create one
    if (error?.code === 'PGRST116' || !user) {
      const userMetadata = req.user.user_metadata || {};
      const { data: newUser, error: insertError } = await supabase
        .from('profiles')
        .upsert({ 
          id: req.user.id, 
          email: req.user.email,
          dob: userMetadata.dob || null
        })
        .select()
        .single();
      if (insertError) throw insertError;
      user = newUser;
    } else if (error) {
      throw error;
    }

    // Extract default name from email if user name is not set
    if (!user.name && (user.email || req.user.email)) {
      const email = user.email || req.user.email;
      const emailPart = email.split('@')[0];
      if (emailPart) {
        const parsedName = emailPart
          .split(/[._-]/)
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' ');
        
        if (parsedName) {
          const { data: updatedUser, error: updateError } = await supabase
            .from('profiles')
            .update({ name: parsedName })
            .eq('id', user.id)
            .select()
            .single();
          
          if (!updateError && updatedUser) {
            user = updatedUser;
          }
        }
      }
    }

    // Transform database shape back to nested JSON for frontend
    const formattedUser = {
      _id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone || '',
      dob: user.dob || '',
      educationStatus: user.education_status || '',
      collegeCourse: user.college_course || '',
      expectedGraduationYear: user.expected_graduation_year || '',
      jobSearchUrgency: user.job_search_urgency || '',
      openToInternationalRemote: !!user.open_to_international_remote,
      preferredCurrency: user.preferred_currency || '',
      portfolioGithub: user.portfolio_github || '',
      portfolioBehance: user.portfolio_behance || '',
      portfolioLinkedin: user.portfolio_linkedin || '',
      portfolioWebsite: user.portfolio_website || '',
      currentSalary: user.current_salary !== null && user.current_salary !== undefined ? user.current_salary : '',
      targetSalary: user.target_salary !== null && user.target_salary !== undefined ? user.target_salary : '',
      willingToRelocate: user.willing_to_relocate !== null && user.willing_to_relocate !== undefined ? !!user.willing_to_relocate : false,
      targetCities: user.target_cities || '',
      skillsToLearn: user.skills_to_learn || '',
      openToBootcamps: user.open_to_bootcamps !== null && user.open_to_bootcamps !== undefined ? !!user.open_to_bootcamps : false,
      preferredTools: user.preferred_tools || '',
      preferredTechStack: user.preferred_tech_stack || '',
      certifications: user.certifications || '',
      skillsProficiency: user.skills_proficiency || '',
      resumesOptimizedCount: user.resumes_optimized_count || 0,
      coverLettersGeneratedCount: user.cover_letters_generated_count || 0,
      recruiterDmsSentCount: user.recruiter_dms_sent_count || 0,
      preferences: {
        desiredRole: user.desired_role || '',
        country: user.country || '',
        location: user.location || '',
        experienceLevel: user.experience_level || '',
        salaryMin: user.salary_min || 0,
        salaryMax: user.salary_max || 0,
        jobType: user.job_type || '',
        remote: user.remote || false,
        skills: user.skills || []
      },
      builderData: user.builder_data || null,
      resumeData: {
        fileName: user.resume_file_name || '',
        fileSize: user.resume_file_size || '',
        skills: user.resume_skills || [],
        experience: user.resume_experience || [],
        education: user.resume_education || [],
        summary: user.resume_summary || '',
        suggestedRoles: user.resume_suggested_roles || [],
        experienceLevel: user.resume_experience_level || '',
        rawText: user.resume_raw_text || '',
        uploadedAt: user.resume_uploaded_at,
        expertise: user.resume_expertise || [],
        certifications: user.resume_certifications || [],
        languages: user.resume_languages || []
      }
    };

    res.json({ success: true, user: formattedUser });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get search history for active user
router.get('/history', requireAuth, async (req, res) => {
  try {
    const { data: history, error } = await supabase
      .from('search_history')
      .select('*')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) throw error;

    const formattedHistory = history.map(h => ({
      _id: h.id,
      query: h.query,
      filters: {
        location: h.filter_location,
        employmentType: h.filter_employment_type,
        datePosted: h.filter_date_posted,
        remote: h.filter_remote,
        experienceLevel: h.filter_experience_level
      },
      resultsCount: h.results_count,
      createdAt: h.created_at
    }));

    res.json({ success: true, history: formattedHistory });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete search history entries for active user by query
router.delete('/history', requireAuth, async (req, res) => {
  try {
    const query = req.query.query || req.body.query;
    if (!query) {
      return res.status(400).json({ error: 'Query parameter is required' });
    }
    const { error } = await supabase
      .from('search_history')
      .delete()
      .eq('query', query)
      .eq('user_id', req.user.id);

    if (error) throw error;
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
