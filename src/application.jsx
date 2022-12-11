import React from 'react';
import { BrowserRouter as Router, } from 'react-router-dom';
import { MainView } from './components/main-view';
import { SideBar } from './components/side-bar';
import './global.scss';

const Application = () => {
  return (
    <div className='application'>
      <Router>
        <SideBar />
        <MainView />
      </Router>
    </div>
  );
};

export { Application };
