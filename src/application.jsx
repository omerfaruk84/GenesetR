import React from 'react';
import { BrowserRouter as Router, } from 'react-router-dom';
import { MainView } from './components/main-view';
import { SideBar } from './components/side-bar';
import './global.scss';

const Application = () => {
  return (
    <div className='application'>
      <Router>
        <MainView />
      </Router>
    </div>
  );
};

export { Application };
