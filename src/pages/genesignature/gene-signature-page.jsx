import React, { useState, useEffect } from 'react';
import { connect } from 'react-redux';
import { GeneSignature } from '../../components/genesignature/genesignature';
import styles from './gene-signature-page.module.scss';
import { ModulePathNames } from '../../store/results/enums';
import VideoHelpPage from '../../components/video-help';
import helpVideo from '../../common/videos/6.webm';
import { Accordion, AccordionSummary, AccordionDetails } from "@mui/material";
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { LoadingPage } from '../../components/loading-page';

const normalizeGeneSignatureFormula = (value = "") =>
  (value || "").toString().replace(/\s+/g, "").toUpperCase();

const normalizeDatasetIds = (datasets = []) => {
  if (!Array.isArray(datasets)) return [];
  return datasets
    .map((ds) => {
      if (typeof ds === "object" && ds !== null) return ds.id || ds.value || String(ds);
      return String(ds);
    })
    .filter(Boolean);
};

const moduleDescription = {
  title: "Gene Signature Analysis",
  description: "This module identifies genes that induce specific phenotypes upon their perturbation by applying mathematical expressions to z-score normalized data. It helps to identify sets of genes responsible for specific phenotypic changes (e.g. genes that regulate ER stress, cholesterol biosynthesis, etc).",
  tabs: {
    chart: "Graph showing perturbations ranked by their effect on the gene signature. Green dots indicate perturbations that increase the signature, red dots decrease it.",
    table: "Table of all perturbations showing their effect direction and z-scores based on the gene signature analysis.",
    similarGenes: "This table lists genes that show similar expression patterns to your gene signature and may be considered for inclusion in the signature to enhance its specificity. Higher similarity scores indicate stronger correlation with your signature."
  }
};

const GeneSignaturePage = ({ 
  geneRegulationResults, 
  genesignatureSimilarResults, 
  genesignatureMultiDatasetResults,
  genesignatureSimilarLoading, 
  blacklistData, 
  blacklistLoading,
  calcResults,
  coreSettings,
  genesignatureSettings,
  path
}) => {
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(true);

  const signature = (coreSettings?.targetGeneList || "").trim();
  const formulaKey = normalizeGeneSignatureFormula(signature);
  const selectedDatasets = normalizeDatasetIds(genesignatureSettings?.selectedDatasets || []);
  const cacheForFormula = calcResults?.geneSignatureCache?.[formulaKey] || {};
  const hasCachedSelectedDatasets = selectedDatasets.some((ds) => {
    const cached = cacheForFormula?.[ds];
    return !!cached && !cached?._error;
  });

  const hasAnyResults = !!(geneRegulationResults || hasCachedSelectedDatasets || genesignatureSimilarResults);

  // Check if any gene signature calculation is running
  const isMainCalculationRunning = calcResults?.[ModulePathNames?.[path]]?.running;
  const isMultiDatasetRunning = calcResults?.["genesignatureMultiDataset"]?.running;
  const isAnyCalculationRunning = isMainCalculationRunning || isMultiDatasetRunning;

  // Auto-close description after 10 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsDescriptionExpanded(false);
    }, 10000); // 10 seconds

    return () => clearTimeout(timer);
  }, []);

  // Close description when calculation runs or results appear
  useEffect(() => {
    if (isAnyCalculationRunning || geneRegulationResults) {
      setIsDescriptionExpanded(false);
    }
  }, [isAnyCalculationRunning, geneRegulationResults]);
  
  // Get progress state from the currently running calculation
  const getProgressState = () => {
    if (isMultiDatasetRunning) {
      return {
        message: calcResults["genesignatureMultiDataset"].progressMessage,
        percentage: calcResults["genesignatureMultiDataset"].progressPercentage,
      };
    } else if (isMainCalculationRunning) {
      const moduleName = ModulePathNames?.[path];
      return {
        message: calcResults[moduleName]?.progressMessage,
        percentage: calcResults[moduleName]?.progressPercentage,
      };
    }
    return { message: null, percentage: null };
  };
  
  const progressState = getProgressState();

  return (
    
    <div className={styles.mainView}>
      {isAnyCalculationRunning && (
        <LoadingPage 
          progressMessage={progressState.message}
          progressPercentage={progressState.percentage}
        />
      )}
      {!isAnyCalculationRunning && (
      <>
      {hasAnyResults ? (      
        <GeneSignature 
          data={geneRegulationResults} 
          similarData={genesignatureSimilarResults} 
          multiDatasetData={genesignatureMultiDatasetResults}
          similarLoading={genesignatureSimilarLoading}
          blacklistData={blacklistData} 
          blacklistLoading={blacklistLoading} 
        />
        ) : (
            <div>  
            <Accordion 
              expanded={isDescriptionExpanded}
              onChange={(event, expanded) => setIsDescriptionExpanded(expanded)}
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
      </>
      )}
    </div>
  );
};



const mapStateToProps = ({ calcResults, blacklist, settings }, { path }) => ({
  geneRegulationResults: calcResults?.[ModulePathNames?.[path]]?.result ?? null,
  genesignatureSimilarResults: calcResults?.genesignatureSimilarGraph?.result ?? null,
  genesignatureMultiDatasetResults: calcResults?.genesignatureMultiDataset?.result ?? null,
  genesignatureSimilarLoading: calcResults?.genesignatureSimilarGraph?.running ?? false,
  blacklistData: blacklist?.data,
  blacklistLoading: blacklist?.loading,
  calcResults,
  coreSettings: settings?.core ?? {},
  genesignatureSettings: settings?.genesignature ?? {},
  path,
});
const mapDispatchToProps = {};

const MainContainer = connect(mapStateToProps, mapDispatchToProps)(GeneSignaturePage);
export { MainContainer as GeneSignaturePage };
