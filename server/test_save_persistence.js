require('dotenv').config({ path: '../.env' });
const { supabase } = require('./lib/supabase');

const USER_ID = 'de7349b5-5e90-45bf-a8ac-675f9a09b8ad';
const JOB_ID = 'test-job-999';

async function runTest() {
  console.log('--- STARTING DATABASE PERSISTENCE VERIFICATION ---');

  try {
    // 1. Clean up existing
    await supabase.from('saved_jobs').delete().eq('user_id', USER_ID).eq('job_id', JOB_ID);

    // 2. Insert with cover letter and recruiter DM
    console.log('\n[Test 1] Saving a job with initial cover letter and LinkedIn DM...');
    const { data: inserted, error: insErr } = await supabase.from('saved_jobs').insert({
      user_id: USER_ID,
      job_id: JOB_ID,
      title: 'Senior Engineer',
      company: 'Test Corp',
      cover_letter: 'Hello, this is my test cover letter.',
      recruiter_dm: 'Hi recruiter, I am interested in this role.'
    }).select().single();

    if (insErr) throw insErr;
    console.log('Successfully saved job!');
    console.log(`Saved Job Cover Letter: "${inserted.cover_letter}"`);
    console.log(`Saved Job Recruiter DM: "${inserted.recruiter_dm}"`);

    if (inserted.cover_letter !== 'Hello, this is my test cover letter.' ||
        inserted.recruiter_dm !== 'Hi recruiter, I am interested in this role.') {
      throw new Error('Insert assertion failed: values do not match!');
    }

    // 3. Update cover letter
    console.log('\n[Test 2] Updating cover letter...');
    const { data: updatedCL, error: clErr } = await supabase.from('saved_jobs')
      .update({ cover_letter: 'Updated Cover Letter Text' })
      .eq('id', inserted.id)
      .select().single();

    if (clErr) throw clErr;
    console.log(`Updated Cover Letter: "${updatedCL.cover_letter}"`);
    if (updatedCL.cover_letter !== 'Updated Cover Letter Text') {
      throw new Error('Update cover letter assertion failed!');
    }

    // 4. Update recruiter DM
    console.log('\n[Test 3] Updating recruiter DM...');
    const { data: updatedDM, error: dmErr } = await supabase.from('saved_jobs')
      .update({ recruiter_dm: 'Updated Recruiter DM Text' })
      .eq('id', inserted.id)
      .select().single();

    if (dmErr) throw dmErr;
    console.log(`Updated Recruiter DM: "${updatedDM.recruiter_dm}"`);
    if (updatedDM.recruiter_dm !== 'Updated Recruiter DM Text') {
      throw new Error('Update recruiter DM assertion failed!');
    }

    // 5. Clean up
    console.log('\n[Test 4] Cleaning up test record...');
    await supabase.from('saved_jobs').delete().eq('id', inserted.id);
    console.log('Cleaned up successfully!');

    console.log('\n--- DATABASE PERSISTENCE VERIFICATION PASSED ---');
  } catch (err) {
    console.error('Test failed with error:', err);
  }
}

runTest();
