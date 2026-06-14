import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export const LampContainer = ({
  children,
  className,
}) => {
  return (
    <div
      className={cn(
        "relative flex flex-col items-center justify-center overflow-hidden bg-black w-full rounded-md z-0 pt-28 pb-4",
        className
      )}
    >
      {/* Absolute Lamp Background Graphic (Visible on Desktop/Tablet landscape) */}
      <div className="hidden md:flex absolute inset-x-0 top-0 h-[350px] items-center justify-center isolate z-0 overflow-hidden pointer-events-none scale-y-125">
        {/* Left conic gradient beam */}
        <motion.div
          initial={{ opacity: 0.5, width: "15rem" }}
          whileInView={{ opacity: 1, width: "30rem" }}
          transition={{
            delay: 0.3,
            duration: 0.8,
            ease: "easeInOut",
          }}
          style={{
            backgroundImage: "conic-gradient(from 70deg at center top, #f97316 0%, transparent 50%, transparent 100%)"
          }}
          className="absolute inset-auto right-1/2 h-56 overflow-visible w-[30rem] text-white"
        >
          <div className="absolute w-[100%] left-0 bg-black h-40 bottom-0 z-20 [mask-image:linear-gradient(to_top,white,transparent)]" />
          <div className="absolute w-40 h-[100%] left-0 bg-black bottom-0 z-20 [mask-image:linear-gradient(to_right,white,transparent)]" />
        </motion.div>
        
        {/* Right conic gradient beam */}
        <motion.div
          initial={{ opacity: 0.5, width: "15rem" }}
          whileInView={{ opacity: 1, width: "30rem" }}
          transition={{
            delay: 0.3,
            duration: 0.8,
            ease: "easeInOut",
          }}
          style={{
            backgroundImage: "conic-gradient(from 290deg at center top, transparent 0%, transparent 50%, #f97316 100%)"
          }}
          className="absolute inset-auto left-1/2 h-56 w-[30rem] text-white"
        >
          <div className="absolute w-40 h-[100%] right-0 bg-black bottom-0 z-20 [mask-image:linear-gradient(to_left,white,transparent)]" />
          <div className="absolute w-[100%] right-0 bg-black h-40 bottom-0 z-20 [mask-image:linear-gradient(to_top,white,transparent)]" />
        </motion.div>
        
        <div className="absolute top-1/2 h-48 w-full translate-y-12 scale-x-150 bg-black blur-2xl"></div>
        <div className="absolute top-1/2 z-50 h-48 w-full bg-transparent opacity-10 backdrop-blur-md"></div>
        <div className="absolute inset-auto z-50 h-36 w-[28rem] -translate-y-1/2 rounded-full bg-orange-500 opacity-30 blur-3xl"></div>
        
        {/* Glow point */}
        <motion.div
          initial={{ width: "8rem" }}
          whileInView={{ width: "16rem" }}
          transition={{
            delay: 0.3,
            duration: 0.8,
            ease: "easeInOut",
          }}
          className="absolute inset-auto z-30 h-36 w-64 -translate-y-[6rem] rounded-full bg-orange-500/80 blur-2xl"
        ></motion.div>
        
        {/* Horizontal light line */}
        <motion.div
          initial={{ width: "15rem" }}
          whileInView={{ width: "30rem" }}
          transition={{
            delay: 0.3,
            duration: 0.8,
            ease: "easeInOut",
          }}
          className="absolute inset-auto z-50 h-0.5 w-[30rem] -translate-y-[7rem] bg-orange-500"
        ></motion.div>

        <div className="absolute inset-auto z-40 h-44 w-full -translate-y-[12.5rem] bg-black"></div>
      </div>

      {/* Mobile/Tablet Portrait Glow Background */}
      <div className="flex md:hidden absolute inset-0 z-0 pointer-events-none overflow-hidden items-center justify-center">
        <div style={{
          position: "absolute",
          width: "120%",
          height: "220px",
          top: "-40px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(249, 115, 22, 0.16) 0%, rgba(249, 115, 22, 0.04) 60%, transparent 100%)",
          filter: "blur(32px)",
          animation: "mobile-glow-pulse 5s ease-in-out infinite alternate"
        }} />
        <div style={{
          position: "absolute",
          width: "80%",
          height: "120px",
          top: "0",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(236, 72, 153, 0.08) 0%, transparent 80%)",
          filter: "blur(24px)"
        }} />
      </div>

      {/* Children content layout naturally */}
      <div className="relative z-50 flex flex-col items-center px-5 w-full max-w-4xl mx-auto text-center">
        {children}
      </div>
    </div>
  );
};
