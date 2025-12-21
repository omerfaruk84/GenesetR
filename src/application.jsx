import React, { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { MainView } from './components/main-view';
import { Toaster } from '@oliasoft-open-source/react-ui-library';
import { fetchBlacklistData } from './store/blacklist';
import { fetchDatasetsFromBackend, setSessionId } from './store/settings/core-settings';
import './global.scss';

// Generate UUID v4
const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

const Application = () => {
  const dispatch = useDispatch();

  useEffect(() => {
    // Initialize or retrieve session ID
    let sessionId = localStorage.getItem('genesetr_session_id');
    if (!sessionId) {
      sessionId = generateUUID();
      localStorage.setItem('genesetr_session_id', sessionId);
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
