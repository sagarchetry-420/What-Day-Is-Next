import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

function Section({ title, children, delay = 0 }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay }}
      className="py-6 sm:py-8"
    >
      <h2 className="mb-4 text-xl font-semibold text-theme-primary sm:text-2xl">{title}</h2>
      <div className="space-y-3 text-sm leading-7 text-theme-secondary sm:text-base">{children}</div>
    </motion.section>
  );
}

function Privacy() {
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
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm text-theme-secondary transition-colors hover:text-theme-primary"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M19 12H5M5 12L12 19M5 12L12 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Back to Home
          </Link>

          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.05 }}
            className="font-brand mt-8 text-4xl text-theme-primary sm:mt-10 sm:text-5xl lg:text-6xl"
          >
            Privacy Policy
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="mt-4 max-w-2xl text-base text-theme-secondary sm:mt-6 sm:text-lg"
          >
            We keep your data handling minimal and transparent. This policy explains how location is used inside
            WhatDayIsNext.
          </motion.p>

          <div className="mt-8 sm:mt-12">
            <Section title="Location Data" delay={0.12}>
              <p>
                WhatDayIsNext requests browser location access only to identify your country and state/region so we can
                show relevant holidays.
              </p>
            </Section>

            <Section title="How We Use Your Location" delay={0.15}>
              <ul className="list-disc space-y-2 pl-5">
                <li>Coordinates are used with OpenStreetMap Nominatim to resolve location names.</li>
                <li>Detected location is cached in your browser for 24 hours to reduce repeat prompts.</li>
                <li>Location details are not stored on our server.</li>
              </ul>
            </Section>

            <Section title="Data Storage" delay={0.18}>
              <p>Local storage may contain:</p>
              <ul className="list-disc space-y-2 pl-5">
                <li>Detected location cache (24h)</li>
                <li>Manually selected location preference</li>
              </ul>
            </Section>

            <Section title="Consent & Control" delay={0.21}>
              <p>
                Allowing location enables automatic regional holiday matching. If denied, you can still use manual
                location search at any time.
              </p>
            </Section>

            <Section title="Third-Party Services" delay={0.24}>
              <p>
                Reverse geocoding uses OpenStreetMap Nominatim. See their{' '}
                <a
                  href="https://osmfoundation.org/wiki/Privacy_Policy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent-orange underline-offset-2 hover:underline"
                >
                  privacy policy
                </a>
                .
              </p>
            </Section>
          </div>
        </div>
      </motion.main>

      <Footer />
    </div>
  );
}

export default Privacy;
