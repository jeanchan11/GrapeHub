import React from 'react';
import { motion } from 'motion/react';

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

  const logoSizes = {
    sm: 'w-7 h-7',
    md: 'w-12 h-12',
    lg: 'w-20 h-20'
  };

  return (
    <div className={`relative flex items-center justify-center ${dimensions[size]} ${className}`}>
      {/* Outer Rotating Ring */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: "linear"
        }}
        className="absolute inset-0 rounded-full border-4 border-transparent border-t-violet-500"
      />
      
      {/* Inner Pulsing Logo Container */}
      <motion.div
        animate={{ 
          scale: [1, 1.1, 1],
          opacity: [0.8, 1, 0.8]
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        className="flex items-center justify-center"
      >
        <img 
          src="/logobranca.png" 
          alt="Logo" 
          className={`${logoSizes[size]} object-contain dark:invert-0 invert`}
          referrerPolicy="no-referrer"
        />
      </motion.div>
    </div>
  );
};

export default LoadingSpinner;
