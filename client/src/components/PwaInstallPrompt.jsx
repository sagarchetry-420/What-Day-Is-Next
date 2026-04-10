import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';

const PROMPT_STATE_KEY = 'wdin_install_prompt_state_v1';
const LEGACY_DISMISSED_KEYS = ['wdin_install_prompt_dismissed', 'wdin_install_prompt_dismissed_v2'];
const LEGACY_INSTALLED_KEY = 'wdin_app_installed';

function readPromptState() {
  try {
    const value = localStorage.getItem(PROMPT_STATE_KEY);
    if (value === 'installed') {
      return value;
    }
    return 'new';
  } catch (error) {
    console.error('Unable to read install prompt state:', error);
    return 'new';
  }
}

function writePromptState(value) {
  try {
    localStorage.setItem(PROMPT_STATE_KEY, value);
  } catch (error) {
    console.error('Unable to persist install prompt state:', error);
  }
}

function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [visible, setVisible] = useState(false);
  const [showIosHelp, setShowIosHelp] = useState(false);

  const canShowPrompt = useMemo(() => {
    return readPromptState() === 'new';
  }, []);

  const isIosSafari = useMemo(() => {
    const userAgent = navigator.userAgent || '';
    const isIOS = /iphone|ipad|ipod/i.test(userAgent);
    const isSafari = /safari/i.test(userAgent) && !/crios|fxios|edgios|chrome|android/i.test(userAgent);
    return isIOS && isSafari;
  }, []);

  useEffect(() => {
    if (!canShowPrompt) {
      return undefined;
    }

    const isStandalone =
      window.matchMedia?.('(display-mode: standalone)')?.matches ||
      window.navigator.standalone === true;
    if (isStandalone) {
      writePromptState('installed');
      return undefined;
    }

    setVisible(true);

    const handleBeforeInstallPrompt = (event) => {
      event.preventDefault();
      setDeferredPrompt(event);
    };

    const handleAppInstalled = () => {
      writePromptState('installed');
      setVisible(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [canShowPrompt]);

  useEffect(() => {
    if (visible) {
      document.body.classList.add('pwa-install-open');
    } else {
      document.body.classList.remove('pwa-install-open');
    }
    return () => document.body.classList.remove('pwa-install-open');
  }, [visible]);

  const closePrompt = () => {
    setVisible(false);
    setShowIosHelp(false);
  };

  const handleInstall = async () => {
    if (!deferredPrompt) {
      if (isIosSafari) {
        setShowIosHelp((value) => !value);
      }
      return;
    }

    await deferredPrompt.prompt();
    const choiceResult = await deferredPrompt.userChoice;
    if (choiceResult?.outcome === 'accepted') {
      writePromptState('installed');
    }
    setVisible(false);
    setDeferredPrompt(null);
    setShowIosHelp(false);
  };

  useEffect(() => {
    try {
      LEGACY_DISMISSED_KEYS.forEach((key) => localStorage.removeItem(key));
      localStorage.removeItem(LEGACY_INSTALLED_KEY);
    } catch (error) {
      console.error('Unable to clean up legacy install prompt flags:', error);
    }
  }, []);

  if (!visible) {
    return null;
  }

  return createPortal(
    <div className="pwa-install-overlay" role="dialog" aria-modal="true" aria-labelledby="pwa-install-title">
      <div className="pwa-install-modal">
        <h2 id="pwa-install-title" className="text-lg font-semibold text-theme-primary">
          Install this app for a better experience
        </h2>
        <p className="mt-2 text-sm text-theme-secondary">
          Install WhatDayIsNext for faster access and experience.
        </p>
        <div className="mt-5 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={closePrompt}
            className="rounded-lg px-3 py-2 text-sm text-theme-secondary transition-colors hover:text-theme-primary"
          >
            Later
          </button>
          <button
            type="button"
            onClick={handleInstall}
            disabled={!deferredPrompt && !isIosSafari}
            className="rounded-lg bg-accent-orange px-4 py-2 text-sm font-medium text-black transition-opacity hover:opacity-90"
          >
            {deferredPrompt ? 'Install' : isIosSafari ? 'How to Install' : 'Install'}
          </button>
        </div>
        {!deferredPrompt && !isIosSafari && (
          <p className="mt-3 text-xs text-theme-muted">
            Install prompt is preparing. If it does not appear, open your browser menu and choose Install App.
          </p>
        )}
        {isIosSafari && showIosHelp && (
          <p className="mt-3 text-xs text-theme-muted">
            On iPhone/iPad Safari: tap Share, then tap Add to Home Screen.
          </p>
        )}
      </div>
    </div>,
    document.body
  );
}

export default PwaInstallPrompt;
