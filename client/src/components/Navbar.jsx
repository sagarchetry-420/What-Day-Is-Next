import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../contexts/ThemeContext';

function Navbar() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';
  const [hasScrolledDown, setHasScrolledDown] = useState(false);
  const previousScrollYRef = useRef(0);

  useEffect(() => {
    function handleScroll() {
      const currentScrollY = window.scrollY;
      const delta = currentScrollY - previousScrollYRef.current;
      const isScrollingDown = delta > 1;

      if (currentScrollY <= 8) {
        setHasScrolledDown(false);
      } else if (isScrollingDown) {
        setHasScrolledDown(true);
      }

      previousScrollYRef.current = currentScrollY;
    }

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <motion.header
      className="sticky top-0 z-50 w-full"
      animate={hasScrolledDown ? { y: 14 } : { y: 0 }}
      transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
    >
      <motion.div
        layout
        transition={{ layout: { duration: 0.35, ease: [0.25, 0.1, 0.25, 1] } }}
        className={`flex items-center justify-between py-4 sm:py-5 ${
          hasScrolledDown
            ? 'mx-3 w-auto rounded-3xl bg-theme-card/90 px-8 shadow-sm backdrop-blur-md sm:mx-4 sm:px-10 lg:mx-6 lg:px-20'
            : 'w-full bg-transparent px-4 sm:px-6 lg:px-10'
        }`}
        style={{
          borderRadius: hasScrolledDown ? 28 : 0,
        }}
        animate={{
          backgroundColor: hasScrolledDown ? 'var(--color-card-90)' : 'transparent',
          boxShadow: hasScrolledDown
            ? '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)'
            : '0 0 0 0 rgb(0 0 0 / 0)',
        }}
      >
        <div className="flex items-center">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-accent-orange">
            <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-5 w-5">
              <rect x="3" y="4" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2" />
              <line x1="3" y1="10" x2="21" y2="10" stroke="currentColor" strokeWidth="2" />
              <line x1="8" y1="2" x2="8" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <line x1="16" y1="2" x2="16" y2="6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </span>
        </div>

        <motion.button
          onClick={toggleTheme}
          className="theme-toggle relative flex h-10 w-10 items-center justify-center rounded-xl text-theme-secondary hover:text-theme-primary"
          whileTap={{ scale: 0.9 }}
          aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          <AnimatePresence mode="wait" initial={false}>
            {isDark ? (
              <motion.svg
                key="sun"
                initial={{ rotate: -90, opacity: 0, scale: 0.5 }}
                animate={{ rotate: 0, opacity: 1, scale: 1 }}
                exit={{ rotate: 90, opacity: 0, scale: 0.5 }}
                transition={{ duration: 0.25 }}
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="2" />
                <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </motion.svg>
            ) : (
              <motion.svg
                key="moon"
                initial={{ rotate: 90, opacity: 0, scale: 0.5 }}
                animate={{ rotate: 0, opacity: 1, scale: 1 }}
                exit={{ rotate: -90, opacity: 0, scale: 0.5 }}
                transition={{ duration: 0.25 }}
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </motion.svg>
            )}
          </AnimatePresence>
        </motion.button>
      </motion.div>
    </motion.header>
  );
}

export default Navbar;

