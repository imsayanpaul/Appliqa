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
        { name: 'AI Career Navigator', onClick: () => handleNav('/career') },
        { name: 'Smart Job Search', onClick: () => handleNav('/') },
        { name: 'Saved Opportunities', onClick: () => handleNav('/saved') },
      ],
    },
    {
      title: 'Resources',
      links: [
        { name: 'Documentation', onClick: () => {} },
        { name: 'API Reference', onClick: () => {} },
        { name: 'System Status', onClick: () => {} },
        { name: 'Changelog', onClick: () => {} },
      ],
    },
    {
      title: 'Company',
      links: [
        { name: 'About Us', onClick: () => {} },
        { name: 'Careers', onClick: () => {} },
        { name: 'Press Kit', onClick: () => {} },
        { name: 'Contact Us', onClick: () => {} },
      ],
    },
  ];

  const socialLinks = [
    { icon: <FiGithub size={18} />, href: 'https://github.com/imsayanpaul/Appliqa', label: 'GitHub Repository' },
    { icon: <FiTwitter size={18} />, href: 'https://twitter', label: 'Twitter Profile' },
    { icon: <FiLinkedin size={18} />, href: 'https://linkedin', label: 'LinkedIn Profile' },
    { icon: <FiMail size={18} />, href: 'mailto:contact@appliqa.ai', label: 'Send Email' },
  ];

  return (
    <footer className="w-full bg-black border-t border-zinc-900 pt-20 pb-12 px-6 sm:px-10 md:px-16 overflow-hidden relative select-none">
      {/* Subtle top ambient glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[1px] bg-gradient-to-r from-transparent via-orange-500/20 to-transparent" />
      
      <div className="max-w-7xl mx-auto">
        {/* Top Section: Tagline & Links */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 pb-16">
          {/* Tagline */}
          <div className="lg:col-span-5 flex flex-col justify-between">
            <div>
              <motion.h2 
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
                className="text-3xl sm:text-4xl font-bold tracking-tight text-white mb-4"
              >
                Experience liftoff
              </motion.h2>
              <p className="text-zinc-500 text-sm max-w-sm leading-relaxed">
                Appliqa is built to help ambitious professionals bypass standard application queues, perfect their resume alignment, and lock in career progression using bespoke AI agents.
              </p>
            </div>

            {/* Social Links */}
            <div className="flex gap-3 mt-8 lg:mt-0">
              {socialLinks.map((social, i) => (
                <motion.a
                  key={i}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={social.label}
                  whileHover={{ scale: 1.05, y: -2 }}
                  className="w-10 h-10 rounded-full border border-zinc-800/80 bg-zinc-950/40 flex items-center justify-center text-zinc-400 hover:text-orange-500 hover:border-orange-500/30 transition-all duration-200"
                >
                  {social.icon}
                </motion.a>
              ))}
            </div>
          </div>

          {/* Links Columns (using divs to completely bypass default ul/li list styles) */}
          <div className="lg:col-span-7 grid grid-cols-2 sm:grid-cols-3 gap-8 sm:gap-6">
            {columns.map((col, idx) => (
              <div key={idx} className="flex flex-col gap-4">
                <span className="text-xs uppercase tracking-wider font-semibold text-zinc-500">
                  {col.title}
                </span>
                <div className="flex flex-col gap-3">
                  {col.links.map((link, lIdx) => (
                    <motion.span
                      key={lIdx}
                      onClick={link.onClick}
                      whileHover={{ x: 4 }}
                      className="text-zinc-400 hover:text-orange-500 text-[14px] text-left transition-colors duration-200 cursor-pointer w-fit inline-block border-0 bg-transparent p-0 m-0 outline-none shadow-none"
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

        {/* Big Brand Watermark: logotext.svg (full opacity, wide layout, shifted up) */}
        <div className="relative w-full -mt-10 sm:-mt-20 pt-4 pb-16 flex justify-center items-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="w-full max-w-[1000px] px-6 flex justify-center select-none pointer-events-none"
          >
            <img src="/logotext.svg" alt="Appliqa Watermark" className="w-full h-auto" />
          </motion.div>
        </div>

        {/* Bottom Bar: Logo, Copyright & Legal */}
        <div className="border-t border-zinc-900 pt-8 flex flex-col md:flex-row justify-between items-center gap-6">
          {/* Logo / Brand */}
          <div className="flex flex-col sm:flex-row items-center gap-4 cursor-pointer" onClick={() => handleNav('/')}>
            <img src="/logotext.svg" alt="Appliqa" height="20" style={{ display: 'block', height: '20px' }} />
            <span className="text-[11px] text-zinc-600 font-medium">
              © {new Date().getFullYear()} Appliqa Inc. All rights reserved.
            </span>
          </div>

          {/* Legal Links (using span with reset to bypass button styling issues) */}
          <div className="flex flex-wrap gap-x-8 gap-y-2 justify-center text-xs text-zinc-500">
            <span onClick={() => {}} className="hover:text-orange-500 transition-colors duration-200 cursor-pointer">About Appliqa</span>
            <span onClick={() => {}} className="hover:text-orange-500 transition-colors duration-200 cursor-pointer">Privacy Policy</span>
            <span onClick={() => {}} className="hover:text-orange-500 transition-colors duration-200 cursor-pointer">Terms of Service</span>
            <span onClick={() => {}} className="hover:text-orange-500 transition-colors duration-200 cursor-pointer">Cookie Settings</span>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
