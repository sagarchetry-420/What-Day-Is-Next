import { Link } from 'react-router-dom';

function Footer() {
  return (
    <footer className="w-full bg-transparent">
      <div className="flex w-full items-center justify-between px-4 py-6 text-xs leading-5 text-theme-secondary sm:px-6 sm:text-sm lg:px-10">
        <Link
          to="/privacy"
          className="transition-colors hover:text-theme-primary"
        >
          Privacy Policy
        </Link>
        <p className="text-theme-muted leading-5">&copy; 2024 WhatDayIsNext</p>
      </div>
    </footer>
  );
}

export default Footer;
