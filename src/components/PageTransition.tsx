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
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{
          duration: 0.3,
          ease: [0.32, 0.72, 0, 1],
        }}
        style={{ minHeight: '100%' }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
};

export default PageTransition;
