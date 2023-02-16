import React, { useState } from 'react';
import { Table, Spacer, ButtonGroup } from '@oliasoft-open-source/react-ui-library';
import { FaChartBar, FaTable } from 'react-icons/fa';

const ChartTableResultsGene = ({
  tableData,
}) => {
  const [selectedView, setSelectedView] = useState(1);

  return (
    <>
      <ButtonGroup
        items={[
          {
            icon: <FaChartBar />,
            key: 0,
            label: 'Chart',
          },
          {
            icon: <FaTable />,
            key: 1,
            label: 'Table',
          }
        ]}
        onSelected={(key) => setSelectedView(key)}
        value={selectedView}
      />
      <Spacer />
      {tableData && selectedView === 1 && (
        <Table table={tableData} />
      )}
      {selectedView === 0 && (
        <>
          {/** Chart View */}
        </>
      )}
      <Spacer height={70} />
    </>
  );
};

export { ChartTableResultsGene };
