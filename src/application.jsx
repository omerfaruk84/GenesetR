import React from 'react';
import { MainView } from './components/main-view';
import { SideBar } from './components/side-bar';
import './global.scss';

const Application = () => {
  return (
    <div className='application'>
      <SideBar />
      <MainView />
    </div>
  );
};

export { Application };
