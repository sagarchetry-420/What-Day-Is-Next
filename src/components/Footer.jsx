import { Link } from 'react-router-dom';

function Footer() {
  return (
    <footer className="w-full bg-transparent">
      <div className="flex w-full items-center justify-between gap-3 px-4 py-6 text-[11px] leading-5 text-theme-secondary sm:gap-6 sm:px-6 sm:text-sm lg:px-10">
        <div className="flex items-center gap-4 sm:gap-6">
          <Link
            to="/privacy"
            className="whitespace-nowrap transition-colors hover:text-theme-primary"
          >
            Privacy Policy
          </Link>
          <Link
            to="/feedback"
            className="whitespace-nowrap transition-colors hover:text-theme-primary"
          >
            Feedback
          </Link>
        </div>
        <p className="whitespace-nowrap text-theme-muted leading-5 text-right">&copy; 2026 WhatDayIsNext</p>
      </div>
    </footer>
  );
}

export default Footer;
