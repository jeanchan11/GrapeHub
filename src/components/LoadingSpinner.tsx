import React from 'react';
import { motion } from 'framer-motion';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ size = 'md', className = '' }) => {
  const dimensions = {
    sm: 'w-12 h-12',
    md: 'w-20 h-20',
    lg: 'w-32 h-32'
  };

  const maskStyle = {
    maskImage: 'url(/logobranca.png)',
    WebkitMaskImage: 'url(/logobranca.png)',
    maskSize: 'contain',
    WebkitMaskSize: 'contain',
    maskRepeat: 'no-repeat',
    WebkitMaskRepeat: 'no-repeat',
    maskPosition: 'center',
    WebkitMaskPosition: 'center'
  };

  return (
    <motion.div 
      className={`relative ${dimensions[size]} ${className} flex items-center justify-center`}
      animate={{
        scale: [1, 1, 1.06, 1, 1]
      }}
      transition={{
        duration: 3.2,
        repeat: Infinity,
        ease: "easeInOut",
        times: [0, 0.7, 0.78, 0.86, 1]
      }}
    >
      {/* Background Silhouette (Empty Logo) */}
      <div 
        className="absolute inset-0 bg-slate-400/20 dark:bg-white/10 transition-colors"
        style={maskStyle}
      />

      {/* Rising Liquid Mask Container */}
      <div className="absolute inset-0 overflow-hidden" style={maskStyle}>
        {/* Animated Liquid Level */}
        <motion.div
          className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-violet-600 to-violet-500"
          animate={{
            height: ['0%', '100%', '100%', '0%', '0%'],
            opacity: [1, 1, 0, 0, 1]
          }}
          transition={{
            duration: 3.2,
            repeat: Infinity,
            ease: "easeInOut",
            times: [0, 0.7, 0.85, 0.9, 1]
          }}
        >
          {/* Back Wave (slower, opposite direction, depth effect) */}
          <motion.svg
            viewBox="0 0 200 20"
            className="absolute left-0 w-[200%] h-3 fill-current text-violet-600/35 pointer-events-none"
            style={{ bottom: 'calc(100% - 1px)' }}
            animate={{ x: ['-50%', '0%'] }}
            transition={{
              duration: 1.6,
              repeat: Infinity,
              ease: "linear",
            }}
          >
            <path d="M 0 10 Q 25 5, 50 10 T 100 10 Q 125 5, 150 10 T 200 10 L 200 20 L 0 20 Z" />
          </motion.svg>

          {/* Front Wave (faster, matches primary color) */}
          <motion.svg
            viewBox="0 0 200 20"
            className="absolute left-0 w-[200%] h-3 fill-current text-violet-500 pointer-events-none"
            style={{ bottom: 'calc(100% - 1.5px)' }}
            animate={{ x: ['0%', '-50%'] }}
            transition={{
              duration: 1.1,
              repeat: Infinity,
              ease: "linear",
            }}
          >
            <path d="M 0 10 Q 25 5, 50 10 T 100 10 Q 125 5, 150 10 T 200 10 L 200 20 L 0 20 Z" />
          </motion.svg>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default LoadingSpinner;
