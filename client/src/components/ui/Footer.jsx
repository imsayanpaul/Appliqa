import { useNavigate } from 'react-router-dom';
import { FiArrowUpRight } from 'react-icons/fi';
import { Logo } from './Logo';

const COLUMNS = [
  {
    title: 'product',
    links: [
      { name: 'Job search', href: '/search' },
      { name: 'Resume builder', href: '/resume-creator' },
      { name: 'Career advisor', href: '/advisor' },
      { name: 'Career path', href: '/career' },
      { name: 'Application tracker', href: '/saved' },
    ],
  },
  {
    title: 'company',
    links: [
      { name: 'Pricing', href: '/pricing' },
      { name: 'Source on GitHub', href: 'https://github.com/imsayanpaul/Appliqa', external: true },
    ],
  },
  {
    title: 'legal',
    links: [
      { name: 'Privacy policy', href: '/privacy' },
      { name: 'Terms of service', href: '/terms' },
      { name: 'Security', href: '/security' },
    ],
  },
];

function Footer({ signedIn = false }) {
  const navigate = useNavigate();

  const handleNav = (e, href) => {
    e.preventDefault();
    navigate(href);
    document.querySelector('main')?.scrollTo({ top: 0 });
  };

  return (
    <footer className="bg-[#171717] text-white">
      <div className="ds-frame !border-white/15 grid grid-cols-1 lg:grid-cols-12">
        <div className="lg:col-span-5 ds-cell !py-12 border-b lg:border-b-0 lg:border-r border-white/15 flex flex-col justify-between gap-10">
          <a href="/" onClick={(e) => handleNav(e, '/')} aria-label="Appliqa home" className="text-white w-fit">
            <Logo height={26} accent="#FF6A33" />
          </a>
          <p className="ds-lede !text-white m-0 max-w-sm">
            Job search, resume scoring and applications, in one place.
          </p>
          <a
            href={signedIn ? '/search' : '/profile'}
            onClick={(e) => handleNav(e, signedIn ? '/search' : '/profile')}
            className="ds-btn ds-btn-accent w-full sm:w-72"
          >
            {signedIn ? 'Search jobs' : 'Create free account'} <FiArrowUpRight size={18} className="ds-btn-arrow" />
          </a>
        </div>

        <nav aria-label="Footer" className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-3">
          {COLUMNS.map((col, i) => (
            <div
              key={col.title}
              className={`ds-cell !py-12 border-white/15 ${i < COLUMNS.length - 1 ? 'border-b sm:border-b-0 sm:border-r' : ''}`}
            >
              <h2 className="ds-mono text-white/50 m-0 mb-6">{col.title}</h2>
              <ul className="list-none m-0 p-0 space-y-3">
                {col.links.map((link) => (
                  <li key={link.name}>
                    <a
                      href={link.href}
                      {...(link.external
                        ? { target: '_blank', rel: 'noopener noreferrer' }
                        : { onClick: (e) => handleNav(e, link.href) })}
                      className="inline-flex items-center gap-1.5 text-[15px] text-white/85 hover:text-white no-underline"
                    >
                      {link.name}
                      {link.external && <FiArrowUpRight size={13} aria-hidden="true" />}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </div>

      <div className="border-t border-white/15">
        <div className="ds-frame !border-white/15 px-6 sm:px-8 pr-36 sm:pr-40 h-14 flex items-center justify-between gap-4">
          <span className="ds-mono text-white/50">© {new Date().getFullYear()} appliqa</span>
          <span className="ds-mono text-white/50 flex items-center gap-2">
            made for job seekers <span className="ds-square" />
          </span>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
