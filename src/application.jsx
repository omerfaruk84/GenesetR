import React from 'react';
import { HeatMap } from './components/heat-map';
import ExampleJson from './components/heat-map/example.json';

const Application = () => {
  return (
    <div>
      <HeatMap data={ExampleJson} />
    </div>
  );
};

export { Application };
