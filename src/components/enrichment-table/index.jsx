import { Table, Button } from '@oliasoft-open-source/react-ui-library';
import React, { useState , useEffect} from 'react';
import { saveAs } from 'file-saver';
import { FaDownload } from 'react-icons/fa';

const EnrichmentTable = ({headings, keyedData, helps}) => {
    const rowsPerPageOptions = [
      { label: '10 / page', value: 10 },
      { label: '20 / page', value: 20 },
      { label: '50 / page', value: 50 },
      { label: '100 / page', value: 100 },
      { label: 'Show all', value: 0 },
    ];
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [selectedPage, setSelectedPage] = useState(1);
    const [filters, setFilters] = useState({});
    const [sorts, setSorts] = useState({});

    const exportData = () => {
        // Convert data to a tab-separated string
        const csvData = keyedData.map(item => Object.values(item).join('\t')).join('\n');
      
        // Create a blob with the data
        const blob = new Blob([csvData], { type: 'text/plain;charset=utf-8' });
      
        // Save the blob as a file using FileSaver.js
        saveAs(blob, 'data.tsv');
    }


    useEffect(() => {
      setSelectedPage(1);
    }, [filters, sorts]);
    const firstVisibleRow = (selectedPage - 1) * rowsPerPage;
    const lastVisibleRow =
      rowsPerPage === 0 ? keyedData.length - 1 : firstVisibleRow + rowsPerPage;
    const filterAndSortDataRows = (dataRows, filters, sorts) =>
      dataRows
        .filter((row) =>
          Object.keys(filters).every((key) => {
            return filters[key] === ''
              ? true
              : row[key].toString().toUpperCase().includes(filters[key].toUpperCase());
          }),
        )
        .sort((a, b) =>
          Object.entries(sorts)
            .map(([key, value]) => {
              switch (value) {
                case 'up': {
                  return a[key] - b[key];
                }
                case 'down': {
                  return b[key] - a[key];
                }
                default:
                  return 0;
              }
            })
            .reduce((a, acc) => a || acc, 0),
        );
    const dataHeaders = (
      dataRowsKeys,
      helpInfo,
      filters,
      setFilters,
      sorts,
      setSorts,
    ) => {
      const dataSortCells = dataRowsKeys.map((key) => {
        const sort = Object.keys(sorts).includes(key) ? sorts[key] : '';
        const prettifyHeaderValue = `${key[0].toUpperCase()}${key.slice(1)}`;        
        const help = (helpInfo !== undefined && helpInfo[key] !== undefined)?  { tooltip:  helpInfo[key] }:"" ;
        return {
          key,
          value: prettifyHeaderValue,
          hasSort: true,
          sort,
          onSort: () => {
            const newSort = sort === '' ? 'up' : sort === 'up' ? 'down' : '';
            setSorts({ ...sorts, [key]: newSort });
          },
          helpIcon:help ,
        };
        

      });
      const dataFilterCells = dataRowsKeys.map((key) => {
        const filterValue = Object.keys(filters).includes(key)
          ? filters[key]
          : '';
        return {
          key,
          value: filterValue,
          type: 'Input',
          placeholder: 'Filter',
          onChange: (ev) => setFilters({ ...filters, [key]: ev.target.value }),
        };
      });
      return { dataSortCells, dataFilterCells };
    };
    const { dataSortCells, dataFilterCells } = dataHeaders(
      headings,
      helps,
      filters,
      setFilters,
      sorts,
      setSorts,
    );
    console.log(dataSortCells, helps)
    const filteredAndSortedData = filterAndSortDataRows(
      keyedData,
      filters,
      sorts,
    );

    
    const dataRows = [
      ...filteredAndSortedData
        .slice(firstVisibleRow, lastVisibleRow)
        .map((dataRow) => {
          const rowsCells = Object.entries(dataRow).map(([key, value]) => ({
            key,
            value,
            type: 'Input',
            //disabled: true,
          }));
          return {
            cells: rowsCells,
          };
        }),
    ];
    const table = {
      headers: [
        {
          cells: dataSortCells,
        },
        {
          cells: dataFilterCells,
        },
      ],
      rows: dataRows,
      footer: {
        actions: [
            {
              icon: <FaDownload />,
              label: 'Download',
              disabled: keyedData=== undefined,
              onClick: () =>{                
                const csvData = (headings.join('\t')) + '\n' + ( keyedData.map(item => Object.values(item).join('\t')).join('\n'));
                ;
                // Create a blob with the data
                const blob = new Blob([csvData], { type: 'text/plain;charset=utf-8' });
              
                // Save the blob as a file using FileSaver.js
                saveAs(blob, 'data.tsv'); }

            }
          ],
        pagination: {
          rowCount: filteredAndSortedData.length,
          selectedPage,
          rowsPerPage: {
            onChange: (evt) => {
              const { value } = evt.target;
              setRowsPerPage(Number(value));
            },
            options: rowsPerPageOptions,
            value: rowsPerPage,
          },
          onSelectPage: (evt) => setSelectedPage(evt),
          small: true,
        },
      },
    };
    return <Table table={table} />;
  };
  export default EnrichmentTable;
