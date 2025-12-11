import React, { useState, useEffect } from 'react';
import { Tabs, Tab, Box } from '@mui/material';
import { DataTable } from '@oliasoft-open-source/react-ui-library';
import ReactECharts from 'echarts-for-react';
import styles from './deregulated-genes.module.scss';

const DeregulatedGenes = ({ data, multiDatasetData }) => {
  const [activeTab, setActiveTab] = useState(0);
  const [tableData, setTableData] = useState([]);
  const [heatmapData, setHeatmapData] = useState(null);

  useEffect(() => {
    if (data && data.results) {
      // Process table data
      const processedTableData = data.results.map((gene, index) => ({
        id: index,
        gene: gene.gene_symbol || gene.gene,
        avgZScore: gene.avg_z_score?.toFixed(3) || '0.000',
        frequency: gene.frequency || 0,
        direction: gene.direction || 'N/A',
        perturbationCount: gene.perturbation_count || 0,
      }));
      setTableData(processedTableData);

      // Process heatmap data
      if (data.heatmap_data) {
        processHeatmapData(data.heatmap_data);
      }
    }
  }, [data]);

  const processHeatmapData = (heatmapData) => {
    if (!heatmapData || !heatmapData.genes || !heatmapData.perturbations || !heatmapData.matrix) {
      return;
    }

    const option = {
      tooltip: {
        position: 'top',
        formatter: (params) => {
          const gene = heatmapData.genes[params.value[0]];
          const perturbation = heatmapData.perturbations[params.value[1]];
          const zScore = params.value[2];
          return `Gene: ${gene}<br/>Perturbation: ${perturbation}<br/>Z-Score: ${zScore.toFixed(3)}`;
        }
      },
      grid: {
        left: 120,
        right: 50,
        top: 100,
        bottom: 50
      },
      xAxis: {
        type: 'category',
        data: heatmapData.perturbations,
        axisLabel: {
          interval: 0,
          rotate: 45,
          fontSize: 10
        }
      },
      yAxis: {
        type: 'category',
        data: heatmapData.genes,
        axisLabel: {
          fontSize: 10
        }
      },
      visualMap: {
        min: -5,
        max: 5,
        calculable: true,
        orient: 'horizontal',
        left: 'center',
        top: 20,
        inRange: {
          color: ['#313695', '#4575b4', '#74add1', '#abd9e9', '#e0f3f8', '#ffffbf', '#fee090', '#fdae61', '#f46d43', '#d73027', '#a50026']
        }
      },
      series: [{
        name: 'Z-Score',
        type: 'heatmap',
        data: heatmapData.matrix.flatMap((row, i) =>
          row.map((value, j) => [i, j, value])
        ),
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowColor: 'rgba(0, 0, 0, 0.5)'
          }
        }
      }]
    };

    setHeatmapData(option);
  };

  const tableColumns = [
    {
      key: 'gene',
      title: 'Gene Symbol',
      dataIndex: 'gene',
      width: 150,
      sorter: (a, b) => a.gene.localeCompare(b.gene),
    },
    {
      key: 'avgZScore',
      title: 'Avg Z-Score',
      dataIndex: 'avgZScore',
      width: 120,
      sorter: (a, b) => parseFloat(a.avgZScore) - parseFloat(b.avgZScore),
    },
    {
      key: 'frequency',
      title: 'Frequency',
      dataIndex: 'frequency',
      width: 100,
      sorter: (a, b) => a.frequency - b.frequency,
    },
    {
      key: 'direction',
      title: 'Direction',
      dataIndex: 'direction',
      width: 100,
      sorter: (a, b) => a.direction.localeCompare(b.direction),
    },
    {
      key: 'perturbationCount',
      title: 'Perturbation Count',
      dataIndex: 'perturbationCount',
      width: 150,
      sorter: (a, b) => a.perturbationCount - b.perturbationCount,
    },
  ];

  return (
    <div className={styles.container}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={activeTab} onChange={(e, newValue) => setActiveTab(newValue)}>
          <Tab label="Table" />
          <Tab label="Heatmap" />
          {multiDatasetData && <Tab label="Multi-Dataset" />}
        </Tabs>
      </Box>

      <Box sx={{ padding: 2, height: 'calc(100% - 48px)', overflow: 'auto' }}>
        {activeTab === 0 && (
          <div className={styles.tableContainer}>
            {tableData.length > 0 ? (
              <DataTable
                columns={tableColumns}
                dataSource={tableData}
                pagination={{
                  pageSize: 50,
                  showSizeChanger: true,
                  pageSizeOptions: [10, 25, 50, 100, 500],
                }}
                scroll={{ y: 'calc(100vh - 300px)' }}
              />
            ) : (
              <div className={styles.noData}>No results available</div>
            )}
          </div>
        )}

        {activeTab === 1 && (
          <div className={styles.heatmapContainer}>
            {heatmapData ? (
              <ReactECharts
                option={heatmapData}
                style={{ height: 'calc(100vh - 250px)', width: '100%' }}
                opts={{ renderer: 'canvas' }}
              />
            ) : (
              <div className={styles.noData}>No heatmap data available</div>
            )}
          </div>
        )}

        {activeTab === 2 && multiDatasetData && (
          <div className={styles.multiDatasetContainer}>
            <p>Multi-dataset results will be displayed here</p>
            <pre>{JSON.stringify(multiDatasetData, null, 2)}</pre>
          </div>
        )}
      </Box>
    </div>
  );
};

export { DeregulatedGenes };
