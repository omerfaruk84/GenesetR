import React from 'react';
import { connect } from 'react-redux';
import { Row, Column, Spacer, Heading } from '@oliasoft-open-source/react-ui-library';
import { GeneSignature } from '../../components/genesignature/genesignature';
import styles from './gene-signature-page.module.scss';
import { ModulePathNames } from '../../store/results/enums';
import VideoHelpPage from '../../components/video-help';
import helpVideo from '../../common/videos/6.webm'
import { Accordion, AccordionSummary, AccordionDetails } from "@mui/material";
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
const moduleDescription = {
  title: "Gene Signature Analysis",
  description: "This module identifies genes that induce specific phenotypes upon their perturbation by applying mathematical expressions to z-score normalized data. It helps to identify sets of genes responsible for specific phenotypic changes (e.g. genes that regulate ER stress, cholesterol biosynthesis, etc).",
  tabs: {
    chart: "Graph showing perturbations ranked by their effect on the gene signature. Green dots indicate perturbations that increase the signature, red dots decrease it.",
    table: "Table of all perturbations showing their effect direction and z-scores based on the gene signature analysis.",
    similarGenes: "This table lists genes that show similar expression patterns to your gene signature and may be considered for inclusion in the signature to enhance its specificity. Higher similarity scores indicate stronger correlation with your signature."
  }
};
const GeneSignaturePage = (geneRegulationResults) => {
  

  return (
    
    <div className={styles.mainView}>
      {geneRegulationResults.geneRegulationResults !== null ? (      
          <GeneSignature data = {geneRegulationResults}/>
          ) : (
            <div>  
            <Accordion defaultExpanded={true}
            sx={{
              marginBottom: '14px',
              backgroundColor: '#f8f9fa', 
              border: '1px solid #e9ecef',

              borderRadius: '8px',
              '&:before': {
                display: 'none',
              },
              '& .MuiAccordionSummary-root': {
      minHeight: '30px',
      height: '30px',
    }
    , '& .MuiAccordionSummary-root.Mui-expanded': {
      minHeight:  '30px',
      height: '30px',
    }}}>
            <AccordionSummary
              expandIcon={<ExpandMoreIcon />}
               sx={{ 
            backgroundColor: '#f5f5f5',
            borderBottom: '1px solid #e0e0e0',
            minHeight: '30px',
            '&.Mui-expanded': {
              minHeight: '30px'
            }
          }}
            >
              <h3 style={{ margin: 0, color: '#495057', fontSize: '16px' }}>{moduleDescription.title}</h3>
            </AccordionSummary>
            <AccordionDetails sx={{ padding: '5px 14px 5px' }}>
              <p style={{ margin: '0 0 0px 0', color: '#424242', fontSize: '14px', lineHeight: '1.4' }}>
                {moduleDescription.description}
              </p>    
              
             
            </AccordionDetails>
          </Accordion>
            <VideoHelpPage videoFile={helpVideo}/>
            </div>
          )}
    </div>
  );
};



const mapStateToProps = ({ calcResults }, { path }) => ({
  geneRegulationResults: calcResults?.[ModulePathNames?.[path]]?.result ?? null,
});
const mapDispatchToProps = {};

const MainContainer = connect(mapStateToProps, mapDispatchToProps)(GeneSignaturePage);
export { MainContainer as GeneSignaturePage };
