import React, { useEffect, useState, useMemo, useRef } from "react";
import $ from "jquery";
//import InCHlib from 'biojs-vis-inchlib';
//import InCHlib from "../../store/extra/inchlib-1.2.0.js";
import InCHlib from "../../store/extra/inchlib-2.0.js";
import RangeSlider from "../../store/extra/range-slider.main.min.js";
//import InCHlib from '@baliga-lab/inchlib.js';
import styles from "./heat-map.module.scss";
import { GeneSetEnrichmentTable } from "../enrichment/index.jsx";
import { FaChartBar, FaTable } from "react-icons/fa";
import EnrichmentTable from "../enrichment-table-new/index.jsx";
import { connect } from "react-redux";
import * as PIXI from "pixi.js";

import {
  Spacer,
  Select,
  Row,
  Card,
  Heading,
  ButtonGroup,
} from "@oliasoft-open-source/react-ui-library";
import { ConstructionOutlined } from "@mui/icons-material";

const HeatMap = ({ graphData, correlationSettings }) => {
  const [selectedGenes, setSelectedGenes] = useState({});
  const [selectedView, setSelectedView] = useState(0);
  const [keyedData, setkeyedData] = useState([{}]);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const appRef = useRef(null); // Create a ref for the Pixi.js app

  console.log("Rerendered");
  useEffect(() => {
    function resize() {
      const size = [900, 600];
      const ratio = size[0] / size[1];
      const divElement = document.getElementById("dendrogram");
      //const w = ref.current.offsetWidth;
      //const h = ref.current.offsetWidth / ratio;
      if (
        !appRef.current ||
        !appRef.current.renderer ||
        !appRef.current.stage
      ) {
        console.log("Creating APP");
        appRef.current = new PIXI.Application({
          width: 800,
          height: 600,
          // autoResize: true,
          resolution: window.devicePixelRatio * 3,
          antialias: true,
          transparent: true,
          background: 0xffffff,
          //resizeTo: divElement,
            autoDensity: true,
        });
        divElement.innerHTML = "";
        divElement?.appendChild(appRef.current.view);
      }

      const parentWidth = divElement.offsetWidth;
      const parentHeight = divElement.offsetHeight;
      const parentRatio = parentWidth / parentHeight;
      const appRatio =
        appRef.current.renderer.width / appRef.current.renderer.height;

      if (parentRatio > appRatio) {
        appRef.current.view.style.width = parentHeight * appRatio + "px";
        appRef.current.view.style.height = parentHeight + "px";
      } else {
        appRef.current.view.style.width = parentWidth + "px";
        appRef.current.view.style.height = parentWidth / appRatio + "px";
      }
      //appRef.current.renderer.view.style.width = "800px";
      //appRef.current.renderer.view.style.height = "600px";
      //appRef.current.renderer.resize(800, 600);
      appRef.current.renderer.render(appRef.current.stage);
    }
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  useEffect(() => {
    var target = document.getElementById("dendrogram");
    console.log("Componenet load", appRef);
    // Create the Pixi.js app when the component mounts
    if (!appRef.current || !appRef.current.renderer || !appRef.current.stage) {
      console.log("Creating APP");
      appRef.current = new PIXI.Application({
        width: 800,
        height: 600,
        autoResize: true,
        resolution: window.devicePixelRatio * 1,
        antialias: true,
        transparent: true,
        background: 0xffffff,
        resizeTo: document.getElementById("dendrogram"),
        autoDensity: true,
      });
      if (target) {
        target.innerHTML = "";
        target.appendChild(appRef.current.view);
      }
    }

    // Add event listeners for mouse interactions
    const handleWheel = (event) => {
      if (event.shiftKey) {
        event.preventDefault();

        let newScale = scale + event.deltaY * -0.0005;

        // Restrict scale
        newScale = Math.min(Math.max(0.125, newScale), 4);

        // Set scale
        setScale(newScale);
      }
    };

    const handleMouseDown = (event) => {
      // Check if middle button (wheel) is pressed
      if (event.shiftKey) {
        setIsDragging(true);
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    const handleMouseMove = (event) => {
      if (isDragging) {
        setPosition((prevPosition) => ({
          x: prevPosition.x + event.movementX,
          y: prevPosition.y + event.movementY,
        }));
      }
    };

    // Attach event listeners
    document.addEventListener("wheel", handleWheel);
    document.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("mouseup", handleMouseUp);
    document.addEventListener("mousemove", handleMouseMove);

    return () => {
      console.log("Destroying APP");
      // Clean up Pixi.js resources and remove event listeners when the component unmounts
      //appRef.current.destroy();
      document.removeEventListener("wheel", handleWheel);
      document.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("mouseup", handleMouseUp);
      document.removeEventListener("mousemove", handleMouseMove);
    };
  }, []); //[scale, isDragging]);
  //const [rowCount, setrowCount] = useState(1);

  let rowCount = 0;
  const tableInfo = [];
  const columns = useMemo(
    () => [
      {
        accessorKey: "Gene 1", //normal accessorKey
        header: "Gene 1",
        size: 75,
        filterVariant: "autocomplete",
        minSize: 50, //min size enforced during resizing
        maxSize: 150,
        muiFilterTextFieldProps: {
          placeholder: "Symbol",
          size: "small",
        },
      },
      {
        accessorKey: "Gene 2",
        header: "Gene 2",
        size: 75,
        filterVariant: "autocomplete",
        muiFilterTextFieldProps: {
          placeholder: "Symbol",
          size: "small",
        },
      },

      {
        accessorKey: "Corr R",
        header: "Score",
        size: 50,
        filterVariant: "range-slider",
        muiFilterSliderProps: {
          size: "small",
          color: "primary",
          step: 0.01,
        },
        enableResizing: true,
      },
    ],
    []
  );

  const tabOptions = [
    {
      label: "Graph",
      value: "graph",
    },
    {
      label: "Table",
      value: "table",
    },
  ];

  useEffect(() => {
    console.log("Data received part1", graphData);

    rowCount = 0;
    if (graphData?.data?.nodes) {
      tableInfo.length = 0;
      //console.log("HI")
      for (let i in graphData?.data?.nodes) {
        if (graphData?.data?.nodes[i].count === 1) {
          rowCount++;
          let gene1 = graphData?.data?.nodes[i].objects[0];
          for (let j in graphData?.data?.nodes[i].features) {
            if (
              Math.abs(graphData?.data?.nodes[i].features[j]) >=
                correlationSettings?.filter &&
              graphData?.data?.feature_names[j] !== gene1
            )
              tableInfo.push({
                "Gene 1": gene1,
                "Gene 2": graphData?.data?.feature_names[j],
                "Corr R": graphData?.data?.nodes[i].features[j],
              });
          }
        } else break;
      }
      setkeyedData(tableInfo);
    }
  }, [correlationSettings?.filter, graphData]);

  useEffect(() => {
    console.log("Data received part2", graphData, appRef);
    var target = document.getElementById("dendrogram");
    if (!appRef.current) {
      appRef.current = new PIXI.Application({
        width: 800,
        height: 600,
        autoResize: true,
        autoStart: false,
        resolution: window.devicePixelRatio * 1,
        antialias: true,
        transparent: true,
        background: 0xffffff,
        resizeTo: target,
        autoDensity: true,
      });
    }
    if (target && appRef && appRef.current.view) {
      target.innerHTML = "";
      target.appendChild(appRef.current.view);
    }

    if (graphData && appRef.current && target) {
      //graphData = JSON.parse(graphData?.pert)
      // Should inject heat map into div with id=inchlib
      $(document).ready(function () {
        var current_gene = "";

        var target_element = $("#dendrogram");
        var offset = target_element.offset();
        var max_y = offset?.top + 150;
        var x_pos = offset?.left;
        var loading = $("#loading");
        loading.fadeOut();
        var protein_card = $("#protein_card");
        var protein_div = $("#protein_div");
        var protein_canvas = $("<div></div>");

        //protein_div.css({"left": x_pos + target_element.width()-40, "top": max_y});

        if (appRef.current != null && appRef.current.renderer != null) {
          window.inchlib = new InCHlib({
            app: appRef.current,
            target: "dendrogram",
            metadata: false,
            column_metadata: false,
            max_height: 1500,
            dendrogram: true,
            column_dendrogram: false,
            width: Math.min(graphData?.data?.feature_names.length * 13, 2000),
            heatmap_colors: "BuWhRd",
            metadata_colors: "Reds",
            independent_columns: false, //Color based on whole heatmap
            draw_row_ids: rowCount > 100 ? false : true,
            heatmap_part_width: 0.97,
            max_column_width: 10,
            max_row_height: 10,
            fixed_row_id_size: rowCount > 100 ? 0 : 9,

            highlighted_rows: ["TELO2", "MED17"],
            //independent_columns: false,
            //column_dendrogram:false,
            // dendrogram:false,
            //fixed_row_id_size:12,
          });

          console.log("graphData", graphData?.data);
          window.inchlib.read_data(graphData);
          console.log("window.inchlib", window.inchlib);
          window.inchlib.draw();

          //window.inchlib.add_prefix();
          let cordinates = Object.entries(
            window.inchlib.leaves_y_coordinates
          ).sort((a, b) => a[1] - b[1]);
          let genesinrows = [];
          const valueKeyMap = new Map();
          for (const [key, value] of Object.entries(
            window.inchlib.objects2leaves
          )) {
            // Add the value as the key and the key as the value to the valueKeyMap map.
            valueKeyMap.set(value, key);
          }

          for (let key in cordinates) {
            genesinrows.push(valueKeyMap.get(cordinates[key][0]));
          }

          for (let key in graphData?.data?.feature_names) {
            valueKeyMap.set(graphData?.data?.feature_names[key], key);
          }

          let columnOrder = [];

          for (let key in genesinrows) {
            columnOrder.push(valueKeyMap.get(genesinrows[key]));
          }

          console.log("columnOrder", columnOrder);
          window.inchlib.update_settings({
            columns_order: columnOrder.reverse(),
          });
          window.inchlib.redraw();
          appRef.current.renderer.render(appRef.current.stage);

          window.inchlib.events.row_onmouseover = function (ids, evt) {
            // console.log("row_onmouseover",ids,evt)
          };

          window.inchlib.events.heatmap_onmouseout = function (evt) {
            // console.log("heatmap_onmouseout", evt)
          };

          window.inchlib.events.row_onclick = function (ids) {
            console.log("ids", ids);
            //console.log("current_gene", current_gene)
            if (ids.length === 1 && ids[0] !== current_gene) {
              current_gene = ids[0];
              //get_protein_from_pdb(ids[0]);
              window.inchlib.highlight_rows(ids);
              window.inchlib.unhighlight_cluster();
            }
            loading.fadeOut();
          };

          function get_protein_from_pdb(id) {
            protein_canvas = $("#protein > canvas");
            protein_canvas.hide();
            //loading.fadeIn();

            protein_card.hide();

            protein_card.fadeIn();
            /*$.ajax({
            type: 'GET',
            dataType: "json",
            url: "/software/inchlib/get_pdb_file",
            data:{pdb_id: id, webgl: webgl},
            success: function(pdb){
                if(webgl){
                    $("#protein_src").val(pdb.pdb_file);
                    glmol.loadMolecule();
                    loading.hide();
                    protein_canvas.fadeIn();
                }
                create_pdb_card(pdb);
                protein_card.fadeIn();
            },
        });*/
          }

          //Set the genes for GSEA analyzes
          window.inchlib.events.column_dendrogram_node_onclick = function (
            column_indexes,
            node_id,
            evt
          ) {
            console.log("column_indexes", column_indexes);
            console.log(node_id);
            console.log(evt);
            let selectedGenesTemp = [];
            for (let gene in column_indexes) {
              selectedGenesTemp.push(
                window.inchlib.data?.feature_names[gene].split("_")[0]
              );
            }

            if (selectedGenesTemp.length > 3)
              setSelectedGenes(selectedGenesTemp);
          };

          //define function for dendrogram_node_onclick event
          window.inchlib.events.dendrogram_node_onclick = function (
            object_ids
          ) {
            setSelectedGenes(object_ids.map((gene) => gene.split("_")[0]));

            var i;

            for (i = 0; i < object_ids.length; i++) {
              if (object_ids[i] === current_gene) {
                return;
              }
            }
            $("#protein > canvas").hide();
            protein_card.hide();
            window.inchlib.highlight_rows([]);
          };

          window.inchlib.events.empty_space_onclick = function () {
            console.log("SSS");
            window.inchlib.highlight_rows([]);
            window.inchlib.unhighlight_cluster();
          };

          /*
      window.inchlib.events.dendrogram_node_highlight = function(object_ids, evt){
        console.log("dendrogram_node_highlight",object_ids,evt)
          //var i;
          
          $.ajax({
              type: 'GET',
              dataType: "json",
              url: "/software/inchlib/get_scaffolds",
              data:{compounds: object_ids},
              success: function(scaffolds){
                  hide_molecule();
                  show_scaffolds(scaffolds, evt);
                  dendrogram.events.row_onmouseover = function(ids, evt){
                      floating_mol.hide();
                      floating_mol.css({"top": evt.evt.pageY, "left": evt.evt.pageX+30});
                      floating_mol.find("img").attr("src", molecule_url + ids[0] + ".png");
                      floating_mol.show();
                  };
              },
          });
          
          for(i = 0; i<object_ids.length; i++){
              if(object_ids[i] == current_mol){
                  return;
              }
          }
          dendrogram.highlight_rows([]);
          
      }


      /*

      window.inchlib.events.dendrogram_node_unhighlight = function(){
          // scaffolds_element.hide();
          console.log("dendrogram_node_unhighlight")
      }

      window.inchlib.events.empty_space_onclick = function(){
          
          hide_molecule();
          dendrogram.highlight_rows([]);
          bind_dendrogram_events();
          console.log("dendrogram_node_unhighlight")
      }
  */
        }
      });
    }

    return () => {
      // Clean up Pixi.js resources when the component unmounts
      if (appRef.current) {
        // Destroy the Pixi.js app instance
        appRef.current.stage.removeChildren();
       //appRef.current = null;
      }
    };
  }, [graphData]);

  return (
    <div className={styles.mainView}>
      <ButtonGroup
        items={[
          {
            icon: <FaChartBar />,
            key: 0,
            label: "Chart",
          },
          {
            icon: <FaTable />,
            key: 1,
            label: "Table",
          },
        ]}
        onSelected={(key) => setSelectedView(key)}
        value={selectedView}
      />
      <Spacer height={5} />

      {keyedData && selectedView === 1 && (
        <>
          <EnrichmentTable data={keyedData} columns={columns} />
        </>
      )}

      <>
       <script src="../../store/extra/range-slider.main.min.js"></script>
        {console.log("Re renderx")}
        <div
          id="dendrogram"
          //onWheel={handleWheel}
          //onMouseDown={handleMouseDown}
          //onMouseUp={handleMouseUp}
          //onMouseMove={handleMouseMove}
          hidden={selectedView === 1}
          style={{
            //transform: `scale(${scale})`,
            display: "flex",
            //justifyContent: "center",
            overflow: "scroll",
          }}
        ></div>

        <div
          id="protein_div"
          style={{
            marginLeft: "auto",
            display: "block",
            marginRight: "auto",
            width: "100%",
          }}
        >
          <div id="protein">
            <div id="protein_src"></div>
            <div id="loading">
              <img src="https://www.openscreen.cz/software/inchlib/static/img/loading.gif" />
            </div>
          </div>
          <div id="protein_card"></div>
          <div id="overflow_div"></div>
          {selectedGenes.length > 3 ? (
            <div
              hidden={selectedView === 1}
              style={{
                display: "block",
                marginLeft: "auto",
                marginRight: "auto",
                width: "100%",
              }}
            >
              <GeneSetEnrichmentTable
                genesets={{ "Selected Genes": selectedGenes.join() }}
              />
            </div>
          ) : null}
        </div>
      </>
    </div>
  );
};

const mapStateToProps = ({ settings }) => ({
  correlationSettings: settings?.correlation ?? {},
});

const MainContainer = connect(mapStateToProps)(HeatMap);

export { MainContainer as HeatMap };
