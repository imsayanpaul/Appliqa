import { motion } from 'framer-motion';

function SplashScreen() {
    return (
        <div className="splash-screen">
            {/* Ambient glow behind logo */}
            <div className="splash-glow" />

            {/* Logo with pulse */}
            <motion.div
                className="splash-logo"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 120, damping: 14, delay: 0.1 }}
            >
                <svg width="76" height="76" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block' }}>
                    <rect width="100" height="100" rx="22" fill="#0A0A0A" stroke="rgba(255, 255, 255, 0.08)" strokeWidth="1"/>
                    <path d="M30 70 L50 30 L70 70 M38 58 L62 58" stroke="#f97316" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            </motion.div>

            {/* App name */}
            <motion.h1
                className="splash-title"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35, duration: 0.5 }}
            >
                Appli<span>qa</span>
            </motion.h1>

            {/* Tagline */}
            <motion.p
                className="splash-tagline"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6, duration: 0.5 }}
            >
                Finding your next opportunity…
            </motion.p>

            {/* Loading bar */}
            <motion.div
                className="splash-bar-track"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.75 }}
            >
                <div className="splash-bar-fill" />
            </motion.div>
        </div>
    );
}

export default SplashScreen;
