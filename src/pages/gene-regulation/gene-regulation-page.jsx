import React from 'react';
import { connect } from 'react-redux';
import { Row, Column, Spacer, Heading } from '@oliasoft-open-source/react-ui-library';
import { ChartTableResultsGene } from './chart-table-gene-results';
import styles from './gene-regulation-page.module.scss';
import { ModulePathNames } from '../../store/results/enums';

const GeneRegulationPage = () => {
  


  
  const tableData = {
    headers: [
      {
        cells: [
          { value: "Name" },
          { value: "Weight" },
          { value: "Energy" },
          { value: "Origin" }
        ]
      }
    ],
    rows: [
      {
        cells: [
          { value: "Brown rice", testId: "table-tbody-cell-brown-rice" },
          { value: 100, testId: "table-tbody-cell-100" },
          { value: 361, testId: "table-tbody-cell-361" },
          { value: "Vietnam", testId: "table-tbody-cell-vietnam" }
        ]
      },
      {
        cells: [
          { value: "Buckwheat", testId: "table-tbody-cell-buckwheat" },
          { value: 50, testId: "table-tbody-cell-50" },
          { value: 358, testId: "table-tbody-cell-358" },
          { value: "Poland", testId: "table-tbody-cell-poland" }
        ]
      },
      {
        cells: [
          { value: "Couscous", testId: "table-tbody-cell-couscous" },
          { value: 10, testId: "table-tbody-cell-10" },
          { value: 368, testId: "table-tbody-cell-368" },
          { value: "France", testId: "table-tbody-cell-france" }
        ]
      }
    ]
  };

  return (
    <div className={styles.mainView}>
      <Heading>Gene Regulation</Heading>
      <Spacer />
      <Row wrap width="100%" height="100%">
        <Column width="100%" height="100%"  widthTablet="100%">
          <ChartTableResultsGene tableData={tableData}  />
        </Column>       
      </Row>
    </div>
  );
};


const mapStateToProps = ({ calcResults }, { path }) => ({
  geneRegulationResults: calcResults?.[ModulePathNames?.[path]]?.result ?? null,
});
const mapDispatchToProps = {};

const MainContainer = connect(mapStateToProps, mapDispatchToProps)(GeneRegulationPage);
export { MainContainer as GeneRegulationPage };
