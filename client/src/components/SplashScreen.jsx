import { motion } from 'framer-motion';

function SplashScreen() {
    return (
        <div className="splash-screen">
            {/* Ambient glow behind logo */}
            <div className="splash-glow" />

            {/* Logo with pulse */}
            <motion.div
                className="splash-logo"
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 120, damping: 14, delay: 0.1 }}
            >
                <svg width="72" height="72" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="16" cy="16" r="16" fill="url(#splashGrad)" />
                    <defs>
                        <linearGradient id="splashGrad" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
                            <stop stopColor="#FF9966" />
                            <stop offset="1" stopColor="#FF5E62" />
                        </linearGradient>
                    </defs>
                </svg>
                {/* Orbiting ring */}
                <div className="splash-orbit" />
            </motion.div>

            {/* App name */}
            <motion.h1
                className="splash-title"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35, duration: 0.5 }}
            >
                Appliqa
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
