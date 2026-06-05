import React from 'react';
import { motion } from 'framer-motion';

interface SplitHeadlineProps {
  /** The normal (white) portion of the text */
  text: string;
  /** The highlighted (violet) portion — typically the last word(s) */
  highlight: string;
  /** Optional subtitle shown below the headline */
  subtitle?: string;
  /** Custom className for the h1 element */
  className?: string;
  /** Custom className for the subtitle */
  subtitleClassName?: string;
}

/**
 * Animated headline with split-text blur+slide entrance.
 * The `text` part renders in white and the `highlight` part in violet-500.
 * Each character animates in with a staggered delay, blur, and vertical slide.
 */
const SplitHeadline: React.FC<SplitHeadlineProps> = ({
  text,
  highlight,
  subtitle,
  className = 'text-4xl font-black text-slate-900 dark:text-white tracking-tight mb-1',
  subtitleClassName = 'text-slate-500 text-sm',
}) => {
  const baseChars = text.split('');
  const highlightChars = highlight.split('');
  const totalBase = baseChars.length;

  return (
    <div>
      <h1 className={className}>
        {baseChars.map((char, i) => (
          <motion.span
            key={`b-${i}`}
            initial={{ opacity: 0, y: 20, filter: 'blur(8px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={{ duration: 0.4, delay: i * 0.03, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="inline-block"
            style={char === ' ' ? { width: '0.3em' } : undefined}
          >
            {char === ' ' ? '\u00A0' : char}
          </motion.span>
        ))}
        {highlightChars.map((char, i) => (
          <motion.span
            key={`h-${i}`}
            initial={{ opacity: 0, y: 20, filter: 'blur(8px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={{ duration: 0.4, delay: (totalBase + i) * 0.03, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="inline-block text-violet-500"
          >
            {char === ' ' ? '\u00A0' : char}
          </motion.span>
        ))}
      </h1>
      {subtitle && (
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: (totalBase + highlightChars.length) * 0.03 + 0.1, ease: 'easeOut' }}
          className={subtitleClassName}
        >
          {subtitle}
        </motion.p>
      )}
    </div>
  );
};

export default SplitHeadline;
