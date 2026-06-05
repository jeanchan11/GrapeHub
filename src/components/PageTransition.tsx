import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface PageTransitionProps {
  pageKey: string;
  children: React.ReactNode;
}

/**
 * iOS-style notification dropdown page transition.
 * On page change, the entire page content drops in from above
 * with a smooth spring-dampened animation + staggered opacity.
 */
const PageTransition: React.FC<PageTransitionProps> = ({ pageKey, children }) => {
  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={pageKey}
        initial={{ opacity: 0, y: -32, scale: 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 8, scale: 0.998 }}
        transition={{
          duration: 0.42,
          ease: [0.32, 0.72, 0, 1],       // iOS-style cubic-bezier
          opacity: { duration: 0.3 },
          scale: { duration: 0.38 },
        }}
        style={{ minHeight: '100%' }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
};

export default PageTransition;
