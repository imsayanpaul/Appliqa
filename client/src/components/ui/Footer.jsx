import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiGithub, FiTwitter, FiLinkedin, FiMail } from 'react-icons/fi';

function Footer() {
  const navigate = useNavigate();

  const handleNav = (path) => {
    navigate(path);
    const mainEl = document.querySelector('main');
    if (mainEl) {
      mainEl.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const columns = [
    {
      title: 'Product',
      links: [
        { name: 'ATS Resume Scanner', onClick: () => handleNav('/profile') },
        { name: 'AI Resume Creator', onClick: () => handleNav('/resume-creator') },
        { name: 'AI Career Advisor', onClick: () => handleNav('/advisor') },
        { name: 'Smart Role Matcher', onClick: () => handleNav('/') },
      ],
    },
    {
      title: 'Features',
      links: [
        { name: 'Keyword Gap Engine', onClick: () => handleNav('/resume-creator') },
        { name: 'Recruiter Outreach DMs', onClick: () => handleNav('/resume-creator') },
        { name: 'Career Path Visualizer', onClick: () => handleNav('/career') },
        { name: 'Application Tracker', onClick: () => handleNav('/saved') },
      ],
    },
    {
      title: 'Company',
      links: [
        { name: 'GitHub Repository', onClick: () => window.open('https://github.com/imsayanpaul/Appliqa', '_blank') },
        { name: 'About Appliqa', onClick: () => handleNav('/') },
        { name: 'Privacy Policy', onClick: () => {} },
        { name: 'Terms of Service', onClick: () => {} },
      ],
    },
  ];

  return (
    <footer className="w-full bg-[#F45B25] text-[#171717] pt-16 pb-8 px-6 sm:px-10 md:px-16 overflow-hidden relative select-none">
      <div className="max-w-7xl mx-auto">
        {/* Top Section: Tagline & Links */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 pb-10">
          {/* Tagline */}
          <div className="lg:col-span-5 flex flex-col justify-between">
            <div>
              <motion.h2 
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
                className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-[#171717] leading-tight mb-4"
              >
                Outsmart the Algorithm.<br />
                Land Dream Roles.<br />
                All in One Place.
              </motion.h2>
              <p className="text-[#171717]/85 text-sm sm:text-base max-w-md leading-relaxed font-medium">
                Appliqa equips ambitious job seekers with deep AI career intelligence — scanning ATS keywords, auto-generating tailored cover letters, and unlocking high-paying opportunities.
              </p>
            </div>

            <div className="mt-6 text-xs sm:text-sm font-semibold text-[#171717]/70">
              © {new Date().getFullYear()} Appliqa Inc. All rights reserved
            </div>
          </div>

          {/* Links Columns */}
          <div className="lg:col-span-7 grid grid-cols-2 sm:grid-cols-3 gap-8 sm:gap-6">
            {columns.map((col, idx) => (
              <div key={idx} className="flex flex-col gap-3.5">
                <span className="text-xs sm:text-sm uppercase tracking-wider font-bold text-[#171717]">
                  {col.title}
                </span>
                <div className="flex flex-col gap-2.5">
                  {col.links.map((link, lIdx) => (
                    <motion.span
                      key={lIdx}
                      onClick={link.onClick}
                      whileHover={{ x: 4 }}
                      className="text-[#171717]/80 hover:text-[#171717] hover:font-bold text-[14px] sm:text-[15px] text-left transition-all duration-200 cursor-pointer w-fit inline-block border-0 bg-transparent p-0 m-0 outline-none shadow-none"
                      style={{ background: 'transparent', border: 'none', boxShadow: 'none' }}
                    >
                      {link.name}
                    </motion.span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Big Brand Watermark: Appliqa */}
        <div className="relative w-full pt-8 pb-4 flex justify-center items-center overflow-hidden">
          <div className="text-center w-full select-none pointer-events-none">
            <span className="text-[64px] sm:text-[104px] md:text-[144px] lg:text-[180px] font-black text-[#171717] tracking-tighter leading-none block uppercase">
              APPLIQA
            </span>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-[#171717]/20 pt-6 flex flex-col md:flex-row justify-between items-center gap-4 text-xs sm:text-sm font-medium text-[#171717]/70">
          <div className="flex items-center gap-2">
            <span>Powered by Next-Gen AI Matching & ATS Scoring Engine</span>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2 justify-center">
            <span onClick={() => handleNav('/')} className="hover:text-[#171717] transition-colors cursor-pointer">About Appliqa</span>
            <span onClick={() => {}} className="hover:text-[#171717] transition-colors cursor-pointer">Privacy Policy</span>
            <span onClick={() => {}} className="hover:text-[#171717] transition-colors cursor-pointer">Terms of Service</span>
            <span onClick={() => {}} className="hover:text-[#171717] transition-colors cursor-pointer">Security</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
