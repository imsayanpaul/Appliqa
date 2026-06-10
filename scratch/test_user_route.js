require('dotenv').config({ path: '../.env' });
const { supabase } = require('../server/lib/supabase');

const userId = 'de7349b5-5e90-45bf-a8ac-675f9a09b8ad';

async function testRoute() {
  try {
    console.log('Fetching profile for userId:', userId);
    let { data: user, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Supabase error:', error);
      return;
    }

    console.log('Retrieved user from database successfully.');

    // Simulate formatting
    const formattedUser = {
      _id: user.id,
      name: user.name,
      email: user.email,
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
      resumeData: {
        fileName: user.resume_file_name || '',
        skills: user.resume_skills || [],
        experience: user.resume_experience || [],
        education: user.resume_education || [],
        summary: user.resume_summary || '',
        rawText: user.resume_raw_text || '',
        uploadedAt: user.resume_uploaded_at
      }
    };

    console.log('Formatted User successfully:', JSON.stringify(formattedUser, null, 2));
  } catch (err) {
    console.error('Thrown error during simulation:', err);
  }
}

testRoute();
