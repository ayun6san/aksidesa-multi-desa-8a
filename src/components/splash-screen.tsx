'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2 } from 'lucide-react';

interface SplashScreenProps {
  onComplete: () => void;
}

export function SplashScreen({ onComplete }: SplashScreenProps) {
  const [isAnimating, setIsAnimating] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsAnimating(false);
      setTimeout(onComplete, 500);
    }, 2500);

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <AnimatePresence>
      {isAnimating && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden"
          suppressHydrationWarning
        >
          {/* Background Gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-700" />
          
          {/* Animated Background Circles */}
          <div className="absolute inset-0 overflow-hidden">
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 0.1 }}
              transition={{ duration: 1.5, ease: 'easeOut' }}
              className="absolute -top-20 -right-20 w-96 h-96 rounded-full bg-white"
            />
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 0.08 }}
              transition={{ duration: 1.5, delay: 0.2, ease: 'easeOut' }}
              className="absolute -bottom-32 -left-32 w-[500px] h-[500px] rounded-full bg-white"
            />
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 0.05 }}
              transition={{ duration: 1.5, delay: 0.4, ease: 'easeOut' }}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-white"
            />
          </div>

          {/* Content Container */}
          <div className="relative z-10 flex flex-col items-center">
            {/* Logo Container */}
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className="mb-8"
            >
              {/* Logo Circle */}
              <div className="relative">
                <motion.div
                  initial={{ scale: 0.8 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                  className="w-28 h-28 md:w-32 md:h-32 rounded-full bg-white shadow-2xl flex items-center justify-center"
                >
                  {/* Logo Icon */}
                  <div className="relative">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ duration: 0.5, delay: 0.3 }}
                      className="w-16 h-16 md:w-20 md:h-20"
                    >
                      <svg viewBox="0 0 100 100" className="w-full h-full">
                        {/* Stylized Village/Desa Icon */}
                        <motion.path
                          initial={{ pathLength: 0 }}
                          animate={{ pathLength: 1 }}
                          transition={{ duration: 1, delay: 0.5 }}
                          d="M50 15 L85 45 L85 85 L15 85 L15 45 Z"
                          fill="none"
                          stroke="#059669"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <motion.path
                          initial={{ pathLength: 0 }}
                          animate={{ pathLength: 1 }}
                          transition={{ duration: 0.8, delay: 0.7 }}
                          d="M50 15 L50 45 M30 45 L30 65 M50 45 L50 75 M70 45 L70 65"
                          fill="none"
                          stroke="#10b981"
                          strokeWidth="2"
                          strokeLinecap="round"
                        />
                        <motion.circle
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ duration: 0.3, delay: 1 }}
                          cx="50"
                          cy="30"
                          r="8"
                          fill="#059669"
                        />
                      </svg>
                    </motion.div>
                  </div>
                </motion.div>

                {/* Decorative Ring */}
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.8, delay: 0.2 }}
                  className="absolute inset-0 rounded-full border-4 border-white/30"
                />
              </div>
            </motion.div>

            {/* App Name */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="text-center"
            >
              <h1 className="text-4xl md:text-5xl font-bold text-white tracking-wider mb-2">
                AKSIDESA
              </h1>
              <motion.div
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 0.6, delay: 0.8 }}
                className="h-0.5 bg-white/50 mx-auto mb-4"
                style={{ width: '180px' }}
              />
              <p className="text-sm md:text-base text-white/90 font-medium tracking-wide">
                Sistem Informasi Digital Desa
              </p>
            </motion.div>

            {/* Loading Indicator */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 1 }}
              className="mt-10 flex flex-col items-center"
            >
              <Loader2 className="w-6 h-6 text-white animate-spin" />
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5, delay: 1.2 }}
                className="text-white/70 text-xs mt-3 tracking-wider"
              >
                Memuat Aplikasi...
              </motion.p>
            </motion.div>

            {/* Version */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 1.5 }}
              className="absolute bottom-8 text-white/50 text-xs tracking-wider"
            >
              Versi 1.0.0
            </motion.p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
