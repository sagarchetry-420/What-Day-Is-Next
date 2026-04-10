import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { submitFeedback } from '../services/feedbackApi';

function AddFeedbackFormSkeleton() {
  return (
    <div className="mt-8 space-y-4 rounded-2xl p-5 sm:mt-12 sm:space-y-5 sm:p-6">
      <div>
        <div className="skeleton-shimmer mb-2 h-4 w-28 rounded-md" />
        <div className="skeleton-shimmer h-11 w-full rounded-xl" />
      </div>
      <div>
        <div className="skeleton-shimmer mb-2 h-4 w-28 rounded-md" />
        <div className="skeleton-shimmer h-11 w-full rounded-xl" />
      </div>
      <div>
        <div className="skeleton-shimmer mb-2 h-4 w-36 rounded-md" />
        <div className="skeleton-shimmer h-32 w-full rounded-xl" />
      </div>
      <div className="skeleton-shimmer h-5 w-20 rounded-md" />
    </div>
  );
}

function AddFeedback() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [pageReady, setPageReady] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const id = setTimeout(() => setPageReady(true), 350);
    return () => clearTimeout(id);
  }, []);

  useEffect(() => {
    if (!success) {
      return undefined;
    }
    const id = setTimeout(() => {
      setSuccess('');
    }, 8000);
    return () => clearTimeout(id);
  }, [success]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    const trimmedMessage = message.trim();
    if (!trimmedMessage) {
      setError('Feedback message is required.');
      return;
    }

    setSubmitting(true);
    try {
      await submitFeedback({
        name: name.trim(),
        email: email.trim(),
        message: trimmedMessage
      });
      setSuccess('Thanks for your feedback!');
      setName('');
      setEmail('');
      setMessage('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unexpected error while submitting feedback.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      <motion.main
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mx-auto flex w-full flex-1 flex-col px-4 py-8 sm:px-6 sm:py-12 lg:px-10"
      >
        <div className="mx-auto w-full max-w-3xl">
          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.05 }}
            className="font-brand mt-8 text-4xl text-theme-primary sm:mt-10 sm:text-5xl lg:text-6xl"
          >
            Give Feedback
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="mt-4 max-w-2xl text-base text-theme-secondary sm:mt-6 sm:text-lg"
          >
            Share your thoughts with us. Name and email are optional.
          </motion.p>

          <motion.div
            layout
            transition={{ layout: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1] } }}
          >
            <AnimatePresence mode="popLayout">
              {success && (
                <motion.div
                  key="success-popup"
                  layout
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{
                    duration: 0.4,
                    ease: [0.25, 0.1, 0.25, 1],
                    layout: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }
                  }}
                  className="mt-6 rounded-2xl p-4 sm:p-5"
                  style={{
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--bg-tertiary)',
                    backdropFilter: 'blur(14px)'
                  }}
                >
                  <p className="text-base font-semibold text-accent-orange">Thanks for sharing your feedback.</p>
                  <p className="mt-1 text-sm text-theme-secondary">
                    We received your message and will use it to improve WhatDayIsNext.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {!pageReady ? (
              <motion.div layout>
                <AddFeedbackFormSkeleton />
              </motion.div>
            ) : (
              <motion.form
                layout
                onSubmit={handleSubmit}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.4,
                  delay: 0.12,
                  ease: [0.25, 0.1, 0.25, 1],
                  layout: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }
                }}
                className="mt-8 space-y-4 rounded-2xl p-5 sm:mt-12 sm:space-y-5 sm:p-6"
              >
            <div>
              <label htmlFor="feedback-name" className="mb-2 block text-sm text-theme-secondary">Name (optional)</label>
              <input
                id="feedback-name"
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                className="w-full rounded-xl border border-transparent bg-theme-tertiary px-4 py-3 text-sm text-theme-primary outline-none transition-colors focus:border-accent-orange"
                placeholder="Your name"
                autoComplete="name"
              />
            </div>

            <div>
              <label htmlFor="feedback-email" className="mb-2 block text-sm text-theme-secondary">Email (optional)</label>
              <input
                id="feedback-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="w-full rounded-xl border border-transparent bg-theme-tertiary px-4 py-3 text-sm text-theme-primary outline-none transition-colors focus:border-accent-orange"
                placeholder="you@example.com"
                autoComplete="email"
              />
            </div>

            <div>
              <label htmlFor="feedback-message" className="mb-2 block text-sm text-theme-secondary">
                Feedback message <span className="text-accent-orange">*</span>
              </label>
              <textarea
                id="feedback-message"
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                className="min-h-32 w-full rounded-xl border border-transparent bg-theme-tertiary px-4 py-3 text-sm text-theme-primary outline-none transition-colors focus:border-accent-orange"
                placeholder="Write your feedback..."
                required
              />
            </div>

            {error && <p className="text-sm text-red-400">{error}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center justify-center rounded-xl px-1 py-1 text-sm font-medium text-accent-orange transition-colors hover:text-theme-primary disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? 'Submitting...' : 'Submit'}
            </button>
              </motion.form>
            )}
          </motion.div>
        </div>
      </motion.main>

      <Footer />
    </div>
  );
}

export default AddFeedback;
