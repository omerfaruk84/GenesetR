import React, { useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { MainView } from './components/main-view';
import { Toaster } from '@oliasoft-open-source/react-ui-library';
import { fetchBlacklistData } from './store/blacklist';
import { fetchDatasetsFromBackend } from './store/settings/core-settings';
import './global.scss';

const Application = () => {
  const dispatch = useDispatch();

  useEffect(() => {
    // Load initial data when the application starts
    dispatch(fetchBlacklistData());
    dispatch(fetchDatasetsFromBackend());
  }, [dispatch]);

  return (
    <div className='application'>
      <MainView />
      <Toaster />
   </div>
    
  );
};

export { Application };
