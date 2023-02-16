import React from 'react';
import { MainView } from './components/main-view';
import { Toaster } from '@oliasoft-open-source/react-ui-library';
import './global.scss';

const Application = () => {
  return (
    <div className='application'>
      <MainView />
      <Toaster />
   </div>
    
  );
};

export { Application };
