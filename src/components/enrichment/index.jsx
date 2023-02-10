import { Table, Spacer, Select, Row} from '@oliasoft-open-source/react-ui-library';
import React, { useEffect, useRef,useState  } from 'react';
import { connect } from 'react-redux';
    /*
      Mock table data store (real apps should use Redux or similar)
    */
    const headings = ['Section', 'Width', 'Height'];
    let keyedData = [...Array(175).keys()].map((_c, i) => ({
      Section: i,
      Width: i * 2,
      Height: i * 2,
    }));
    /*
          Container component manages state and configuration of table
        */
    
    const TableWithSortAndFilter = () => {
      const rowsPerPageOptions = [
        { label: '10 / page', value: 10 },
        { label: '20 / page', value: 20 },
        { label: '50 / page', value: 50 },
        { label: 'Show all', value: 0 },
      ];
      const [rowsPerPage, setRowsPerPage] = useState(10);
      const [selectedPage, setSelectedPage] = useState(1);
      const [filters, setFilters] = useState({});
      const [sorts, setSorts] = useState({});
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
                : row[key].toString().includes(filters[key]);
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
        filters,
        setFilters,
        sorts,
        setSorts,
      ) => {
        const dataSortCells = dataRowsKeys.map((key) => {
          const sort = Object.keys(sorts).includes(key) ? sorts[key] : '';
          const prettifyHeaderValue = `${key[0].toUpperCase()}${key.slice(1)}`;
          return {
            key,
            value: prettifyHeaderValue,
            hasSort: true,
            sort,
            onSort: () => {
              const newSort = sort === '' ? 'up' : sort === 'up' ? 'down' : '';
              setSorts({ ...sorts, [key]: newSort });
            },
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
        filters,
        setFilters,
        sorts,
        setSorts,
      );
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
              disabled: true,
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
    
    
    const mapStateToProps = ({  settings,calcResults }) => ({
        pcaGraph: calcResults?.pcaGraph ?? null,
        pathFinderGraph: calcResults?.pathFinderGraph ?? null,
        graphmapSettings: settings?.graphmap ?? {},
        pathfinderSettings: settings?.pathfinder ?? {},
      })
      
    const MainContainer = connect(mapStateToProps)(TableWithSortAndFilter);
      
    export { MainContainer as TableWithSortAndFilter };