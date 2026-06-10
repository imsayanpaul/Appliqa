import React, { useRef, useState, useEffect, useLayoutEffect } from "react";
import { useScroll, useTransform, motion, useSpring } from "framer-motion";

export const ContainerScroll = ({
  titleComponent,
  children,
}) => {
  const containerRef = useRef(null);
  const scrollContainerRef = useRef(null);

  // Detect the nearest scrollable ancestor (e.g. <main>) so
  // useScroll works even when html/body have overflow:hidden.
  useLayoutEffect(() => {
    if (!containerRef.current) return;
    let el = containerRef.current.parentElement;
    while (el) {
      const style = window.getComputedStyle(el);
      if (style.overflowY === "auto" || style.overflowY === "scroll") {
        scrollContainerRef.current = el;
        return;
      }
      el = el.parentElement;
    }
  }, []);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    container: scrollContainerRef,
  });

  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => {
      window.removeEventListener("resize", checkMobile);
    };
  }, []);

  const scaleDimensions = () => {
    return isMobile ? [0.7, 0.9] : [1.05, 1];
  };

  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });

  const rotate = useTransform(smoothProgress, [0, 1], [20, 0]);
  const scale = useTransform(smoothProgress, [0, 1], scaleDimensions());
  const translate = useTransform(smoothProgress, [0, 1], [0, -100]);

  return (
    <div
      className="h-[50rem] md:h-[65rem] flex items-center justify-center relative p-2 md:p-10"
      ref={containerRef}
    >
      <div
        className="py-10 md:py-16 w-full relative"
        style={{
          perspective: "1000px",
        }}
      >
        <Header translate={translate} titleComponent={titleComponent} />
        <Card rotate={rotate} translate={translate} scale={scale}>
          {children}
        </Card>
      </div>
    </div>
  );
};

export const Header = ({ translate, titleComponent }) => {
  return (
    <motion.div
      style={{
        translateY: translate,
      }}
      className="div max-w-5xl mx-auto text-center"
    >
      {titleComponent}
    </motion.div>
  );
};

export const Card = ({
  rotate,
  scale,
  children,
}) => {
  return (
    <motion.div
      style={{
        rotateX: rotate,
        scale,
        boxShadow:
          "0 0 #0000004d, 0 9px 20px #0000004a, 0 37px 37px #00000042, 0 84px 50px #00000026, 0 149px 60px #0000000a, 0 233px 65px #00000003",
      }}
      className="max-w-5xl -mt-8 md:-mt-12 mx-auto h-[30rem] md:h-[40rem] w-full border-4 border-orange-500 p-1.5 md:p-3 bg-zinc-950 rounded-[30px] shadow-2xl shadow-orange-500/10"
    >
      <div className="h-full w-full overflow-hidden rounded-2xl bg-orange-500 md:rounded-2xl md:p-4 relative">
        {children}
        <div 
          className="absolute inset-0 w-full h-full pointer-events-none opacity-[0.18] mix-blend-overlay" 
          style={{ 
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` 
          }} 
        />
      </div>
    </motion.div>
  );
};
