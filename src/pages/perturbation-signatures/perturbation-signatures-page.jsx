import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { connect } from 'react-redux';
import styles from './perturbation-signatures-page.module.scss';
import { ModulePathNames } from '../../store/results/enums';
import { LoadingPage } from '../../components/loading-page';
import { Accordion, AccordionSummary, AccordionDetails } from "@mui/material";
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { ButtonGroup, Spacer } from '@oliasoft-open-source/react-ui-library';
import { FaChartBar, FaTable } from 'react-icons/fa';
import EnrichmentTable from '../../components/enrichment-table-new/index.jsx';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';

const moduleDescription = {
  title: "Gene Perturbation Signatures",
  description: "This module shows how perturbation of genes affects various gene signatures (cellular programs). Enter a list of genes to see how their knockdown impacts Hallmark pathways and other gene signatures across different cell lines.",
  features: [
    "Analyze effects of gene perturbations on Hallmark gene signatures",
    "View results as interactive heatmap or sortable table",
    "Compare signature effects across multiple cell lines",
    "Identify genes that regulate specific cellular programs"
  ]
};

// Color scale for heatmap
const getColorForValue = (value, minVal, maxVal) => {
  if (value === null || value === undefined) return '#f0f0f0';

  const normalized = (value - minVal) / (maxVal - minVal || 1);

  // Blue (negative) to White (zero) to Red (positive)
  if (value < 0) {
    const intensity = Math.min(1, Math.abs(normalized - 0.5) * 2);
    const r = Math.round(255 - intensity * 200);
    const g = Math.round(255 - intensity * 200);
    const b = 255;
    return `rgb(${r}, ${g}, ${b})`;
  } else {
    const intensity = Math.min(1, (normalized - 0.5) * 2);
    const r = 255;
    const g = Math.round(255 - intensity * 200);
    const b = Math.round(255 - intensity * 200);
    return `rgb(${r}, ${g}, ${b})`;
  }
};

const PerturbationSignaturesPage = ({
  results,
  calcResults,
  path,
}) => {
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(true);
  const [selectedView, setSelectedView] = useState(0); // 0 = heatmap, 1 = table
  const transformWrapperRef = useRef(null);

  const moduleName = ModulePathNames?.[path];
  const isCalculationRunning = calcResults?.[moduleName]?.running;
  const progressMessage = calcResults?.[moduleName]?.progressMessage;
  const progressPercentage = calcResults?.[moduleName]?.progressPercentage;

  // Auto-close description after 10 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsDescriptionExpanded(false);
    }, 10000);
    return () => clearTimeout(timer);
  }, []);

  // Close description when calculation runs or results appear
  useEffect(() => {
    if (isCalculationRunning || results) {
      setIsDescriptionExpanded(false);
    }
  }, [isCalculationRunning, results]);

  // Process results for display
  const { tableData, heatmapData, genes, signatures, cellLines, minVal, maxVal } = useMemo(() => {
    if (!results || !results.heatmap_data) {
      return { tableData: [], heatmapData: null, genes: [], signatures: [], cellLines: [], minVal: -3, maxVal: 3 };
    }

    const allGenes = results.genes || [];
    const allSignatures = results.signatures || [];
    const allCellLines = results.cell_lines || [];

    // Build table data
    const tableRows = [];
    let globalMin = 0;
    let globalMax = 0;

    for (const gene of allGenes) {
      for (const sig of allSignatures) {
        const row = {
          Gene: gene,
          Signature: sig.replace('HALLMARK_', '').replace(/_/g, ' '),
        };

        for (const cellLine of allCellLines) {
          const score = results.data?.[gene]?.[sig]?.[cellLine];
          if (score !== undefined && score !== null) {
            row[cellLine] = score;
            globalMin = Math.min(globalMin, score);
            globalMax = Math.max(globalMax, score);
          }
        }

        // Calculate average across cell lines
        const scores = allCellLines
          .map(cl => results.data?.[gene]?.[sig]?.[cl])
          .filter(s => s !== undefined && s !== null);

        if (scores.length > 0) {
          row.Average = scores.reduce((a, b) => a + b, 0) / scores.length;
          tableRows.push(row);
        }
      }
    }

    return {
      tableData: tableRows,
      heatmapData: results.heatmap_data,
      genes: allGenes,
      signatures: allSignatures,
      cellLines: allCellLines,
      minVal: Math.min(-3, globalMin),
      maxVal: Math.max(3, globalMax),
    };
  }, [results]);

  // Table columns
  const columns = useMemo(() => {
    const cols = [
      {
        accessorKey: 'Gene',
        header: 'Perturbed Gene',
        size: 120,
        filterVariant: 'autocomplete',
      },
      {
        accessorKey: 'Signature',
        header: 'Signature',
        size: 200,
        filterVariant: 'autocomplete',
      },
    ];

    cellLines.forEach(cellLine => {
      cols.push({
        accessorKey: cellLine,
        header: cellLine.replace('gwps', ''),
        size: 80,
        Cell: ({ cell }) => {
          const value = cell.getValue();
          if (value === undefined || value === null) return '-';
          const color = getColorForValue(value, minVal, maxVal);
          return (
            <div
              style={{
                backgroundColor: color,
                padding: '4px 8px',
                borderRadius: '4px',
                textAlign: 'center',
              }}
            >
              {value.toFixed(2)}
            </div>
          );
        },
      });
    });

    cols.push({
      accessorKey: 'Average',
      header: 'Average',
      size: 80,
      Cell: ({ cell }) => {
        const value = cell.getValue();
        if (value === undefined || value === null) return '-';
        const color = getColorForValue(value, minVal, maxVal);
        return (
          <div
            style={{
              backgroundColor: color,
              padding: '4px 8px',
              borderRadius: '4px',
              textAlign: 'center',
              fontWeight: 'bold',
            }}
          >
            {value.toFixed(2)}
          </div>
        );
      },
    });

    return cols;
  }, [cellLines, minVal, maxVal]);

  const handleResetZoom = useCallback(() => {
    transformWrapperRef.current?.resetTransform();
  }, []);

  const handleFitToScreen = useCallback(() => {
    if (transformWrapperRef.current) {
      transformWrapperRef.current.setTransform(0, 0, 0.8);
    }
  }, []);

  // Render heatmap
  const renderHeatmap = () => {
    if (!heatmapData || Object.keys(heatmapData).length === 0) {
      return (
        <div className={styles.noData}>
          No heatmap data available. Enter gene names and run the analysis.
        </div>
      );
    }

    // Use the first cell line's heatmap data for now
    const firstCellLine = Object.keys(heatmapData)[0];
    const data = heatmapData[firstCellLine];

    if (!data || !data.rows || !data.columns || !data.values) {
      return <div className={styles.noData}>Invalid heatmap data format</div>;
    }

    const { rows, columns: cols, values } = data;

    return (
      <div className={styles.heatmapContainer}>
        <div className={styles.heatmapControls}>
          <div className={styles.zoomControls}>
            <button onClick={handleResetZoom} className={styles.zoomButton}>
              RESET ZOOM
            </button>
            <button onClick={handleFitToScreen} className={styles.zoomButton}>
              FIT TO SCREEN
            </button>
          </div>
          <div className={styles.colorLegend}>
            <span>Downregulated</span>
            <div className={styles.gradientBar}></div>
            <span>Upregulated</span>
          </div>
        </div>

        <TransformWrapper
          initialScale={0.8}
          minScale={0.2}
          maxScale={3}
          limitToBounds={false}
          ref={transformWrapperRef}
        >
          <TransformComponent>
            <div className={styles.heatmapGrid}>
              {/* Header row with signature names */}
              <div className={styles.heatmapRow}>
                <div className={styles.rowLabel}></div>
                {cols.map((col, idx) => (
                  <div key={idx} className={styles.colLabel}>
                    {col.replace('HALLMARK_', '').replace(/_/g, ' ')}
                  </div>
                ))}
              </div>

              {/* Data rows */}
              {rows.map((gene, rowIdx) => (
                <div key={rowIdx} className={styles.heatmapRow}>
                  <div className={styles.rowLabel}>{gene}</div>
                  {values[rowIdx]?.map((val, colIdx) => (
                    <div
                      key={colIdx}
                      className={styles.heatmapCell}
                      style={{
                        backgroundColor: getColorForValue(val, minVal, maxVal),
                      }}
                      title={`${gene} → ${cols[colIdx]}: ${val?.toFixed(2) || 'N/A'}`}
                    >
                      {val !== null ? val.toFixed(1) : ''}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </TransformComponent>
        </TransformWrapper>
      </div>
    );
  };

  return (
    <div className={styles.mainView}>
      {isCalculationRunning && (
        <LoadingPage
          progressMessage={progressMessage}
          progressPercentage={progressPercentage}
        />
      )}

      {!isCalculationRunning && (
        <>
          {!results ? (
            <div>
              <Accordion
                expanded={isDescriptionExpanded}
                onChange={(event, expanded) => setIsDescriptionExpanded(expanded)}
                sx={{
                  marginBottom: '14px',
                  backgroundColor: '#f8f9fa',
                  border: '1px solid #e9ecef',
                  borderRadius: '8px',
                  '&:before': { display: 'none' },
                  '& .MuiAccordionSummary-root': {
                    minHeight: '30px',
                    height: '30px',
                  },
                  '& .MuiAccordionSummary-root.Mui-expanded': {
                    minHeight: '30px',
                    height: '30px',
                  },
                }}
              >
                <AccordionSummary
                  expandIcon={<ExpandMoreIcon />}
                  sx={{
                    backgroundColor: '#f5f5f5',
                    borderBottom: '1px solid #e0e0e0',
                    minHeight: '30px',
                    '&.Mui-expanded': { minHeight: '30px' },
                  }}
                >
                  <h3 style={{ margin: 0, color: '#495057', fontSize: '16px' }}>
                    {moduleDescription.title}
                  </h3>
                </AccordionSummary>
                <AccordionDetails sx={{ padding: '5px 14px 5px' }}>
                  <p style={{ margin: '0 0 12px 0', color: '#424242', fontSize: '14px', lineHeight: '1.4' }}>
                    {moduleDescription.description}
                  </p>
                  <div style={{ fontSize: '13px', color: '#424242' }}>
                    <strong>Key Features:</strong>
                    <ul style={{ margin: '4px 0 0 20px', padding: '0' }}>
                      {moduleDescription.features.map((feature, index) => (
                        <li key={index} style={{ marginBottom: '2px' }}>{feature}</li>
                      ))}
                    </ul>
                  </div>
                </AccordionDetails>
              </Accordion>

              <div className={styles.instructions}>
                <h4>How to use:</h4>
                <ol>
                  <li>Enter gene symbols in the sidebar (e.g., TP53, MYC, BRCA1)</li>
                  <li>Optionally select specific cell lines</li>
                  <li>Click "Run" to see how perturbation of these genes affects gene signatures</li>
                </ol>
              </div>
            </div>
          ) : (
            <div className={styles.resultsContainer}>
              <div className={styles.controlBar}>
                <ButtonGroup
                  items={[
                    { icon: <FaChartBar />, key: 0, label: 'Heatmap' },
                    { icon: <FaTable />, key: 1, label: 'Table' },
                  ]}
                  onSelected={(key) => setSelectedView(key)}
                  value={selectedView}
                />
                <div className={styles.resultsSummary}>
                  <span>{genes.length} genes</span>
                  <span>{signatures.length} signatures</span>
                  <span>{cellLines.length} cell lines</span>
                </div>
              </div>

              <Spacer height={10} />

              {selectedView === 0 ? (
                renderHeatmap()
              ) : (
                <div className={styles.tableContainer}>
                  <EnrichmentTable data={tableData} columns={columns} />
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

const mapStateToProps = ({ calcResults }, { path }) => ({
  results: calcResults?.[ModulePathNames?.[path]]?.result ?? null,
  calcResults,
  path,
});

const MainContainer = connect(mapStateToProps)(PerturbationSignaturesPage);
export { MainContainer as PerturbationSignaturesPage };
