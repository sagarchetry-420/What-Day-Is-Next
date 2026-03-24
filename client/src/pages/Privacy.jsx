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
            This page describes our privacy policy and your rights when using WhatDayIsNext.
          </motion.p>

          <div className="mt-8 sm:mt-12">
            <Section title="Information We Collect" delay={0.12}>
              <p>
                We collect only the information needed to provide core app features. This can include basic usage data
                and location details when you choose to share them.
              </p>
            </Section>

            <Section title="How We Use Information" delay={0.15}>
              <ul className="list-disc space-y-2 pl-5">
                <li>To show relevant holiday and date information.</li>
                <li>To improve reliability, performance, and user experience.</li>
                <li>To keep the service secure and prevent misuse.</li>
              </ul>
            </Section>

            <Section title="Data Retention" delay={0.18}>
              <ul className="list-disc space-y-2 pl-5">
                <li>We retain data only as long as needed for service operation and legal obligations.</li>
                <li>You can clear locally stored data through your browser settings at any time.</li>
              </ul>
            </Section>

            <Section title="Consent & Control" delay={0.21}>
              <p>
                You control whether optional permissions are granted. You may update preferences or revoke permissions
                through your browser/device settings.
              </p>
            </Section>

            <Section title="Sharing of Information" delay={0.24}>
              <p>
                We do not sell your personal data. We may share limited information with service providers when
                necessary to operate the app and comply with law.
              </p>
            </Section>

            <Section title="Your Rights" delay={0.27}>
              <p>
                Depending on your region, you may have rights to access, correct, delete, or restrict use of your
                personal information.
              </p>
            </Section>

            <Section title="Policy Updates" delay={0.3}>
              <p>
                We may update this Privacy Policy from time to time. Continued use of the app after changes means you
                accept the updated policy.
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
