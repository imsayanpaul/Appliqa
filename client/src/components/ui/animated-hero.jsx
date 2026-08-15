import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { MoveRight, Sparkles } from "lucide-react";

function Hero() {
  const navigate = useNavigate();
  const [titleNumber, setTitleNumber] = useState(0);
  const titles = useMemo(
    () => [
      "AI Optimization",
      "Smart Search",
      "ATS Scanner",
      "Cover Letters",
      "Recruiter DMs",
    ],
    []
  );

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (titleNumber === titles.length - 1) {
        setTitleNumber(0);
      } else {
        setTitleNumber(titleNumber + 1);
      }
    }, 2000);
    return () => clearTimeout(timeoutId);
  }, [titleNumber, titles]);

  return (
    <div className="w-full pt-10 pb-12 px-4 sm:px-6 relative text-center">
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="flex gap-5 items-center justify-center flex-col max-w-4xl mx-auto"
      >
        {/* Subtle Pill Badge */}
        

        <div className="flex gap-3 flex-col w-full">
          <h1 className="text-4xl sm:text-6xl md:text-7xl tracking-tight text-center font-black text-[#171717] leading-[1.08]">
            <span>Outsmart the hiring algorithm with</span>
            <span className="relative flex w-full h-14 sm:h-18 md:h-24 justify-center overflow-hidden text-center text-[#F45B25] mt-1">
              &nbsp;
              <AnimatePresence mode="wait" initial={false}>
                <motion.span
                  key={titleNumber}
                  className="absolute font-black whitespace-nowrap text-[#F45B25]"
                  initial={{ y: 35, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: -35, opacity: 0 }}
                  transition={{ duration: 0.25, ease: "easeInOut" }}
                >
                  {titles[titleNumber]}
                </motion.span>
              </AnimatePresence>
            </span>
          </h1>

          <p className="text-base sm:text-lg md:text-xl leading-relaxed text-[#66615C] max-w-2xl text-center mx-auto mt-2 font-normal">
            Appliqa uses AI to scan your resume, optimize for ATS keyword matches, auto-generate cover letters, and tailor recruiter messages to land you interviews faster.
          </p>
        </div>

        <div className="flex flex-row items-center justify-center gap-3 mt-3">
          <button 
            onClick={() => navigate("/profile")}
            className="px-8 py-4 rounded-2xl bg-[#171717] hover:bg-[#F45B25] text-white text-sm font-bold transition-all duration-200 border-none cursor-pointer flex items-center gap-2.5 shadow-xl shadow-neutral-900/10 hover:shadow-[#F45B25]/25"
          >
            <span>Get Started</span>
            <MoveRight className="w-4 h-4" />
          </button>
        </div>
      </motion.div>
    </div>
  );
}

export { Hero };
