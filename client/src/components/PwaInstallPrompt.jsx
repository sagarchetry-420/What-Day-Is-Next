import { useEffect, useMemo, useState } from 'react';

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

  const canShowPrompt = useMemo(() => {
    return readPromptState() === 'new';
  }, []);

  useEffect(() => {
    if (!canShowPrompt) {
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

  const closePrompt = () => {
    setVisible(false);
  };

  const handleInstall = async () => {
    if (!deferredPrompt) {
      return;
    }

    await deferredPrompt.prompt();
    const choiceResult = await deferredPrompt.userChoice;
    if (choiceResult?.outcome === 'accepted') {
      writePromptState('installed');
    }
    setVisible(false);
    setDeferredPrompt(null);
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

  return (
    <div className="pwa-install-overlay" role="dialog" aria-modal="true" aria-labelledby="pwa-install-title">
      <div className="pwa-install-modal">
        <h2 id="pwa-install-title" className="text-lg font-semibold text-theme-primary">
          Install this app for a better experience
        </h2>
        
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
            disabled={!deferredPrompt}
            className="rounded-lg bg-accent-orange px-4 py-2 text-sm font-medium text-black transition-opacity hover:opacity-90"
          >
            Install
          </button>
        </div>
        {!deferredPrompt && (
          <p className="mt-3 text-xs text-theme-muted">
            Install prompt is preparing. If it does not appear, open your browser menu and choose Install App.
          </p>
        )}
      </div>
    </div>
  );
}

export default PwaInstallPrompt;
