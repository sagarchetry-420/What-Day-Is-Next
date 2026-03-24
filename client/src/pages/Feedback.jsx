import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { fetchFeedbacks } from '../services/feedbackApi';

function FeedbackCardSkeleton({ count = 6 }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 lg:gap-6">
      {Array.from({ length: count }).map((_, index) => (
        <motion.article
          key={`feedback-skeleton-${index}`}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25, delay: index * 0.03 }}
          className="holiday-card-skeleton rounded-2xl p-5 sm:p-6"
        >
          <div className="skeleton-shimmer h-5 w-2/5 rounded-lg" />
          <div className="skeleton-shimmer mt-4 h-3.5 w-full rounded-md" />
          <div className="skeleton-shimmer mt-2 h-3.5 w-11/12 rounded-md" />
          <div className="skeleton-shimmer mt-2 h-3.5 w-3/4 rounded-md" />
          <div className="skeleton-shimmer mt-5 h-3 w-1/3 rounded-md" />
        </motion.article>
      ))}
    </div>
  );
}

function formatDate(value) {
  if (!value) {
    return '';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

function feedbackDisplayName(feedback) {
  const safeName = String(feedback?.name || '').trim();
  const safeEmail = String(feedback?.email || '').trim();
  if (safeName) {
    return safeName;
  }
  if (safeEmail) {
    return safeEmail;
  }
  return 'Anonymous';
}

function Feedback() {
  const [feedbacks, setFeedbacks] = useState([]);
  const [loadingFeedbacks, setLoadingFeedbacks] = useState(true);
  const [listError, setListError] = useState('');

  useEffect(() => {
    let active = true;

    async function loadFeedbacks() {
      setLoadingFeedbacks(true);
      setListError('');
      try {
        const data = await fetchFeedbacks();
        if (active) {
          setFeedbacks(data);
        }
      } catch (err) {
        if (active) {
          setFeedbacks([]);
          setListError(err instanceof Error ? err.message : 'Unexpected error while loading feedbacks.');
        }
      } finally {
        if (active) {
          setLoadingFeedbacks(false);
        }
      }
    }

    loadFeedbacks();

    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      <motion.main
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mx-auto flex w-full flex-1 flex-col px-4 py-8 sm:px-6 sm:py-12 lg:px-10"
      >
        <div className="mx-auto w-full max-w-5xl">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-theme-secondary transition-colors hover:text-theme-primary"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M19 12H5M5 12L12 19M5 12L12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Back to Home
          </Link>

          <section className="mt-8 sm:mt-10">
            <div className="mb-4 flex items-center justify-between gap-4 sm:mb-6">
              <h2 className="text-base font-medium text-theme-secondary sm:text-lg">
                Read what users are saying.
              </h2>
              <Link
                to="/feedback/add"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center rounded-xl px-1 py-1 text-sm font-medium text-accent-orange transition-colors hover:text-theme-primary"
              >
                Give Feedback
              </Link>
            </div>

            {loadingFeedbacks && (
              <div>
                <p className="mb-4 text-sm text-theme-secondary">Loading feedbacks...</p>
                <FeedbackCardSkeleton count={6} />
              </div>
            )}

            {!loadingFeedbacks && listError && (
              <p className="text-sm text-red-400">{listError}</p>
            )}

            {!loadingFeedbacks && !listError && feedbacks.length === 0 && (
              <p className="text-sm text-theme-secondary">No feedbacks yet.</p>
            )}

            {!loadingFeedbacks && !listError && feedbacks.length > 0 && (
              <div className="grid gap-4 sm:grid-cols-2 sm:gap-5 lg:grid-cols-3 lg:gap-6">
                {feedbacks.map((feedback, index) => (
                  <motion.article
                    key={feedback.id || `${feedbackDisplayName(feedback)}-${index}`}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.02 }}
                    className="holiday-card rounded-2xl bg-theme-secondary p-5 sm:p-6"
                  >
                    <p className="text-base font-semibold text-accent-orange sm:text-lg">
                      {feedbackDisplayName(feedback)}
                    </p>
                    <p className="mt-3 text-sm leading-6 text-theme-secondary">
                      {feedback.message || 'No message provided.'}
                    </p>
                    <p className="mt-4 text-xs uppercase tracking-widest text-theme-muted">
                      {formatDate(feedback.created_at)}
                    </p>
                  </motion.article>
                ))}
              </div>
            )}
          </section>
        </div>
      </motion.main>

      <Footer />
    </div>
  );
}

export default Feedback;
