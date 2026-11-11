import React, { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { MainView } from './components/main-view';
import { Toaster } from '@oliasoft-open-source/react-ui-library';
import { fetchBlacklistData } from './store/blacklist';
import { fetchDatasetsFromBackend, setSessionId } from './store/settings/core-settings';
import './global.scss';

const SESSION_STORAGE_KEY = 'genesetr_session_id';
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// Generate a UUID v4 from a cryptographically secure source. The session id is
// the only thing protecting a user's uploaded datasets, so it must not be guessable.
const generateUUID = () => {
  const cryptoObj = typeof window !== 'undefined' ? (window.crypto || window.msCrypto) : undefined;

  if (cryptoObj && typeof cryptoObj.randomUUID === 'function') {
    return cryptoObj.randomUUID();
  }

  if (cryptoObj && typeof cryptoObj.getRandomValues === 'function') {
    const bytes = new Uint8Array(16);
    cryptoObj.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
    bytes[8] = (bytes[8] & 0x3f) | 0x80; // RFC 4122 variant
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0'));
    return (
      hex.slice(0, 4).join('') + '-' +
      hex.slice(4, 6).join('') + '-' +
      hex.slice(6, 8).join('') + '-' +
      hex.slice(8, 10).join('') + '-' +
      hex.slice(10, 16).join('')
    );
  }

  throw new Error('Secure random number generator is not available in this browser');
};

const getOrCreateSessionId = () => {
  let stored = null;
  try {
    stored = localStorage.getItem(SESSION_STORAGE_KEY);
  } catch (e) {
    stored = null;
  }

  // Keep an existing id only if it already is a UUID
  if (stored && UUID_PATTERN.test(stored)) {
    return stored;
  }

  const sessionId = generateUUID();
  try {
    localStorage.setItem(SESSION_STORAGE_KEY, sessionId);
  } catch (e) {
    // Storage unavailable (e.g. private mode): the id lives for this page load only
  }
  return sessionId;
};

const Application = () => {
  const dispatch = useDispatch();

  useEffect(() => {
    // Initialize or retrieve session ID
    let sessionId = null;
    try {
      sessionId = getOrCreateSessionId();
    } catch (e) {
      console.error('Could not create a session id:', e);
    }

    // Set session ID in Redux store
    dispatch(setSessionId(sessionId));

    // Load initial data when the application starts
    dispatch(fetchBlacklistData());
    dispatch(fetchDatasetsFromBackend(sessionId));
  }, [dispatch]);

  return (
    <div className='application'>
      <MainView />
      <Toaster />
    </div>

  );
};

export { Application };
