import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { searchLocations } from '../utils/locationLabels';

function LocationSearch({ onSelect, disabled = false, successAnimationKey = 0 }) {
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const [clearAnimationKey, setClearAnimationKey] = useState(0);

  const results = useMemo(() => searchLocations(query, 8), [query]);
  const showResults = focused && query.trim().length > 0;

  return (
    <div className="relative w-full max-w-md">
      <label htmlFor="location-search" className="sr-only">
        Search your state and country
      </label>
      <motion.div
        initial={false}
        animate={{
          scale: focused ? 1.01 : 1,
          y: successAnimationKey > 0 ? [0, -1, 0] : 0,
        }}
        transition={{ duration: 0.25, ease: 'easeOut' }}
        className="search-input search-input-animated flex items-center gap-3 rounded-2xl px-5 py-3.5"
      >
        <AnimatePresence>
          {clearAnimationKey > 0 && (
            <motion.span
              key={clearAnimationKey}
              initial={{ opacity: 0.35, scale: 0.94 }}
              animate={{ opacity: 0, scale: 1.04 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
              className="search-clear-indicator"
              aria-hidden="true"
            />
          )}
        </AnimatePresence>
        <motion.svg
          animate={{
            rotate: focused ? 12 : 0,
            scale: focused ? 1.1 : 1,
            opacity: focused ? 1 : 0.5,
          }}
          transition={{ duration: 0.25 }}
          className="h-5 w-5 shrink-0 text-theme-secondary"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
          <line x1="20" y1="20" x2="16.65" y2="16.65" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </motion.svg>
        <input
          id="location-search"
          type="text"
          className="w-full bg-transparent text-sm text-theme-primary placeholder:text-theme-muted focus:outline-none"
          placeholder="Search state, region, or country..."
          value={query}
          disabled={disabled}
          onFocus={() => setFocused(true)}
          onBlur={() => setTimeout(() => setFocused(false), 150)}
          onChange={(e) => setQuery(e.target.value)}
        />
        <AnimatePresence>
          {query && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.15 }}
              type="button"
              className="shrink-0 rounded-full p-1.5 text-theme-muted transition-colors hover:text-theme-primary"
              onClick={() => {
                setClearAnimationKey((value) => value + 1);
                setQuery('');
              }}
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
              </svg>
            </motion.button>
          )}
        </AnimatePresence>
      </motion.div>

      <AnimatePresence>
        {showResults && (
          <motion.div
            layout
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.24, ease: 'easeOut' }}
            className="search-results mt-3 overflow-x-hidden overflow-y-auto rounded-2xl p-2"
          >
            {results.length > 0 ? (
              results.map((result, index) => (
                <motion.button
                  key={result.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.15, delay: index * 0.025 }}
                  whileHover={{ x: 4 }}
                  whileTap={{ scale: 0.98 }}
                  type="button"
                  className="search-result block w-full rounded-xl px-4 py-3 text-left text-sm text-theme-primary"
                  onMouseDown={() => {
                    onSelect(result);
                    setQuery('');
                  }}
                >
                  {result.label}
                </motion.button>
              ))
            ) : (
              <p className="px-4 py-3 text-sm text-theme-muted">No matching locations</p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default LocationSearch;
