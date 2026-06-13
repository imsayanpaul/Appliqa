import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { MoveRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ContainerScroll } from "@/components/ui/container-scroll-animation";

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

  const titleComponent = (
    <div className="flex gap-6 items-center justify-center flex-col max-w-3xl mx-auto mb-4">
      <div className="flex gap-4 flex-col w-full">
        <h1 className="text-4xl sm:text-5xl md:text-6xl tracking-tighter text-center font-bold text-white leading-tight">
          <span>Outsmart the hiring algorithm with</span>
          <span className="relative flex w-full h-12 sm:h-14 md:h-20 justify-center overflow-hidden text-center text-orange-500 mt-2">
            &nbsp;
            {titles.map((title, index) => (
              <motion.span
                key={index}
                className="absolute font-bold whitespace-nowrap"
                initial={{ opacity: 0, y: -80 }}
                transition={{ type: "spring", stiffness: 120, damping: 16, mass: 0.8 }}
                animate={
                  titleNumber === index
                    ? {
                        y: 0,
                        opacity: 1,
                      }
                    : {
                        y: titleNumber > index ? -80 : 80,
                        opacity: 0,
                      }
                }
              >
                {title}
              </motion.span>
            ))}
          </span>
        </h1>

        <p className="text-sm sm:text-base md:text-lg leading-relaxed tracking-tight text-zinc-400 max-w-2xl text-center mx-auto mt-2">
          Appliqa uses AI to scan your resume, optimize for ATS keyword matches, auto-generate cover letters, and tailor recruiter messages to land you interviews faster.
        </p>
      </div>
      <div className="flex flex-row gap-3 mt-2">
        <Button size="lg" className="gap-4 shadow-lg shadow-orange-500/20" onClick={() => navigate("/profile")}>
          Get Started <MoveRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );

  return (
    <div className="w-full overflow-hidden pt-16 lg:pt-24 relative">
      {/* Top logo for logged-out landing page */}
      <div 
        className="absolute top-6 left-6 md:left-6 md:top-6 z-10 cursor-pointer max-md:left-1/2 max-md:-translate-x-1/2 max-md:top-6" 
        onClick={() => navigate("/")}
      >
        <img src="/logotext.svg" alt="Appliqa" height="22" style={{ display: 'block', height: '22px' }} />
      </div>

      <div className="container mx-auto px-4">
        <ContainerScroll titleComponent={titleComponent}>
          <img 
            src="/github.png" 
            alt="Appliqa Dashboard Preview" 
            className="w-full h-full object-cover object-top block rounded-2xl"
            draggable={false}
            fetchpriority="high"
            loading="eager"
          />
        </ContainerScroll>
      </div>
    </div>
  );
}

export { Hero };
