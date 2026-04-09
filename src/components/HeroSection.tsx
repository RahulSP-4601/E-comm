"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";

const TOTAL_FRAMES = 168;
const MOBILE_BREAKPOINT = 768;
const STICKY_HEIGHT = "185vh";

function buildFrameSources() {
  return Array.from(
    { length: TOTAL_FRAMES },
    (_, index) => `/frames/ezgif-frame-${String(index + 1).padStart(3, "0")}.png`,
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export default function HeroSection() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const visualRef = useRef<HTMLDivElement | null>(null);
  const frameSources = useMemo(() => buildFrameSources(), []);
  const framesRef = useRef<HTMLImageElement[]>([]);
  const frameProgressRef = useRef(0);
  const drawRafRef = useRef<number | null>(null);
  const resizeRafRef = useRef<number | null>(null);
  const scrollRafRef = useRef<number | null>(null);
  const [framesLoaded, setFramesLoaded] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  const isReady = isMobile || shouldReduceMotion || framesLoaded;
  const fallbackFrame = frameSources[0];

  useEffect(() => {
    const mediaQuery = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);

    const sync = () => {
      setIsMobile(mediaQuery.matches);
    };

    sync();
    mediaQuery.addEventListener("change", sync);

    return () => {
      mediaQuery.removeEventListener("change", sync);
    };
  }, []);

  useEffect(() => {
    if (isMobile || shouldReduceMotion) {
      return;
    }

    let cancelled = false;
    let loadedCount = 0;

    const images = frameSources.map((src, index) => {
      const image = new Image();
      image.decoding = "async";
      image.loading = "eager";
      image.src = src;

      const complete = () => {
        loadedCount += 1;
        if (!cancelled && loadedCount === frameSources.length) {
          framesRef.current = images;
          setFramesLoaded(true);
        }
      };

      image.addEventListener("load", complete, { once: true });
      image.addEventListener(
        "error",
        () => {
          if (!cancelled) {
            framesRef.current[index] = image;
          }
          complete();
        },
        { once: true },
      );

      return image;
    });

    framesRef.current = images;

    return () => {
      cancelled = true;
    };
  }, [frameSources, isMobile, shouldReduceMotion]);

  useEffect(() => {
    if (!isReady || isMobile || shouldReduceMotion) {
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const context = canvas.getContext("2d", { alpha: true });
    if (!context) {
      return;
    }

    const draw = () => {
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const width = Math.max(1, Math.floor(rect.width * dpr));
      const height = Math.max(1, Math.floor(rect.height * dpr));

      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }

      const activeIndex = clamp(Math.round(frameProgressRef.current * (TOTAL_FRAMES - 1)), 0, TOTAL_FRAMES - 1);
      const image = framesRef.current[activeIndex];

      context.clearRect(0, 0, width, height);
      if (!image) {
        return;
      }

      const baseScale = Math.min(width / image.width, height / image.height);
      const drawWidth = image.width * baseScale;
      const drawHeight = image.height * baseScale;
      const x = (width - drawWidth) / 2;
      const y = (height - drawHeight) / 2;

      context.save();
      context.filter = "blur(42px) saturate(118%)";
      context.globalAlpha = 0.18;
      context.drawImage(image, x, y, drawWidth, drawHeight);
      context.restore();

      context.save();
      context.filter = "saturate(108%) contrast(105%)";
      context.drawImage(image, x, y, drawWidth, drawHeight);
      context.restore();
    };

    const queueDraw = () => {
      if (drawRafRef.current !== null) {
        cancelAnimationFrame(drawRafRef.current);
      }

      drawRafRef.current = window.requestAnimationFrame(draw);
    };

    const syncScroll = () => {
      const section = sectionRef.current;
      const visual = visualRef.current;
      if (!section) {
        return;
      }

      const rect = section.getBoundingClientRect();
      const travel = Math.max(1, rect.height - window.innerHeight);
      const progress = clamp(-rect.top / travel, 0, 1);

      frameProgressRef.current = progress;
      if (visual) {
        visual.style.transform = `translateY(${progress * -8}px)`;
      }

      queueDraw();
    };

    const onScroll = () => {
      if (scrollRafRef.current !== null) {
        cancelAnimationFrame(scrollRafRef.current);
      }

      scrollRafRef.current = window.requestAnimationFrame(syncScroll);
    };

    const onResize = () => {
      if (resizeRafRef.current !== null) {
        cancelAnimationFrame(resizeRafRef.current);
      }

      resizeRafRef.current = window.requestAnimationFrame(syncScroll);
    };

    syncScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);

      if (drawRafRef.current !== null) {
        cancelAnimationFrame(drawRafRef.current);
      }
      if (resizeRafRef.current !== null) {
        cancelAnimationFrame(resizeRafRef.current);
      }
      if (scrollRafRef.current !== null) {
        cancelAnimationFrame(scrollRafRef.current);
      }
    };
  }, [isMobile, isReady, shouldReduceMotion]);

  return (
    <section ref={sectionRef} className="relative isolate" style={{ height: STICKY_HEIGHT }}>
      <div className="sticky top-0 h-screen overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_74%_42%,rgba(196,147,79,0.18),transparent_0_24%),radial-gradient(circle_at_16%_76%,rgba(101,28,39,0.32),transparent_0_24%),linear-gradient(180deg,#190d0b_0%,#120908_52%,#100807_100%)]" />
        <div className="cinematic-grain pointer-events-none absolute inset-0 opacity-20" />
        <div className="pointer-events-none absolute inset-y-0 right-[-8%] w-[28vw] bg-[radial-gradient(circle_at_center,rgba(218,181,117,0.14),transparent_68%)] blur-3xl" />
        <div className="pointer-events-none absolute left-[-10%] top-[58%] h-[32vh] w-[28vw] rounded-full bg-[radial-gradient(circle,rgba(96,32,43,0.22),transparent_72%)] blur-3xl" />

        <div className="relative mx-auto grid h-full max-w-[1520px] items-center gap-10 px-6 py-8 sm:px-10 lg:grid-cols-[minmax(320px,0.82fr)_minmax(0,1.18fr)] lg:gap-8 lg:px-12 xl:px-16">
          <motion.div
            initial={shouldReduceMotion ? false : { opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            className="relative z-10 max-w-[34rem] self-center lg:pr-6"
          >
            <motion.div
              initial={shouldReduceMotion ? false : { opacity: 0, x: -28 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
              className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/6 px-4 py-2 backdrop-blur-md"
            >
              <span className="h-2 w-2 rounded-full bg-[var(--color-gold)] shadow-[0_0_20px_rgba(214,183,121,0.78)]" />
              <span className="text-[11px] uppercase tracking-[0.34em] text-[var(--color-gold)]">Aarvi Sarees</span>
            </motion.div>

            <div className="mt-7 space-y-3 sm:space-y-4">
              <motion.span
                initial={shouldReduceMotion ? false : { opacity: 0, x: -44 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.92, delay: 0.16, ease: [0.22, 1, 0.36, 1] }}
                className="block font-[family-name:var(--font-display)] text-[3.8rem] leading-[0.9] tracking-[-0.03em] text-white sm:text-[4.9rem] lg:text-[5.8rem] xl:text-[6.4rem]"
              >
                Elegance in
              </motion.span>
              <motion.span
                initial={shouldReduceMotion ? false : { opacity: 0, x: -58 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.96, delay: 0.28, ease: [0.22, 1, 0.36, 1] }}
                className="block font-[family-name:var(--font-display)] text-[3.8rem] leading-[0.9] tracking-[-0.03em] text-white sm:text-[4.9rem] lg:text-[5.8rem] xl:text-[6.4rem]"
              >
                Every Drape
              </motion.span>
            </div>

            <motion.p
              initial={shouldReduceMotion ? false : { opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.82, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="mt-8 max-w-[31rem] text-[1.02rem] leading-8 text-[var(--color-mist)] sm:text-[1.08rem]"
            >
              Scroll through a cinematic saree study where the drape feels alive, poised, and luxuriously controlled.
            </motion.p>

            <motion.div
              initial={shouldReduceMotion ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.76, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="mt-10 flex flex-wrap items-center gap-4"
            >
              <motion.a
                href="#collection"
                whileHover={shouldReduceMotion ? undefined : { y: -2, scale: 1.01 }}
                whileTap={shouldReduceMotion ? undefined : { scale: 0.985 }}
                className="inline-flex items-center justify-center rounded-full bg-[var(--color-gold)] px-7 py-3.5 text-sm font-semibold uppercase tracking-[0.18em] text-[var(--color-ink)] shadow-[0_18px_44px_rgba(214,183,121,0.28)] transition-colors hover:bg-[#e2c58f]"
              >
                Shop Collection
              </motion.a>

              <span className="text-[11px] uppercase tracking-[0.34em] text-[var(--color-mist)]/80">
                Scroll to reveal the drape
              </span>
            </motion.div>
          </motion.div>

          <div className="relative flex h-[58vh] min-h-[420px] items-center lg:h-[84vh] lg:min-h-[680px] lg:justify-end">
            <div
              ref={visualRef}
              className="relative z-10 h-full w-full origin-center overflow-hidden rounded-[2.25rem] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.02))] shadow-[0_36px_120px_rgba(0,0,0,0.4)] backdrop-blur-xl lg:ml-auto lg:max-w-[54rem]"
            >
              <div className="absolute inset-[1.2rem] rounded-[1.7rem] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.015))]" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_16%,rgba(255,255,255,0.09),transparent_28%),linear-gradient(180deg,rgba(255,255,255,0.02),transparent_30%,rgba(0,0,0,0.1))]" />
              <div className="absolute inset-x-[8%] bottom-[4%] h-[13%] rounded-full bg-[radial-gradient(circle,rgba(214,183,121,0.28),transparent_70%)] blur-3xl" />
              <div className="absolute inset-y-[2rem] left-1/2 w-[min(34rem,72%)] -translate-x-1/2 rounded-[1.7rem] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.035),rgba(255,255,255,0.012))] shadow-[0_24px_60px_rgba(0,0,0,0.22)]" />

              {isMobile || shouldReduceMotion ? (
                <div
                  className="absolute inset-y-[2rem] left-1/2 w-[min(34rem,72%)] -translate-x-1/2 rounded-[1.7rem] bg-contain bg-center bg-no-repeat shadow-[0_24px_60px_rgba(0,0,0,0.26)]"
                  style={{ backgroundImage: `url(${fallbackFrame})` }}
                  aria-label="Aarvi Sarees campaign still"
                  role="img"
                />
              ) : (
                <canvas
                  ref={canvasRef}
                  className="absolute inset-y-[2rem] left-1/2 w-[min(34rem,72%)] -translate-x-1/2 rounded-[1.7rem] shadow-[0_24px_60px_rgba(0,0,0,0.26)]"
                />
              )}

              {!isReady && !isMobile ? (
                <div className="absolute inset-y-[2rem] left-1/2 z-20 flex w-[min(34rem,72%)] -translate-x-1/2 items-center justify-center rounded-[1.7rem] bg-[rgba(18,11,9,0.76)] backdrop-blur-xl">
                  <div className="space-y-4 text-center">
                    <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-white/10 border-t-[var(--color-gold)]" />
                    <p className="text-[11px] uppercase tracking-[0.3em] text-[var(--color-mist)]">
                      Preparing Frames
                    </p>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
