import React, { useEffect, useState } from 'react';
import $ from 'jquery';
//import InCHlib from 'biojs-vis-inchlib';
import InCHlib from '../../store/extra/inchlib-1.2.0.js'
//import InCHlib from '@baliga-lab/inchlib.js';
import styles from './heat-map.module.scss';
import { GeneSetEnrichmentTable } from "../enrichment/";
import { FaChartBar, FaTable } from 'react-icons/fa';
import EnrichmentTable from '../enrichment-table';
import {connect} from 'react-redux';

import { Spacer, Select, Row , Card, Heading, ButtonGroup} from "@oliasoft-open-source/react-ui-library";

const HeatMap = ({ graphData, correlationSettings }) => {
  const [selectedGenes, setSelectedGenes] = useState({});
  const [selectedView, setSelectedView] = useState(0);
  const [keyedData, setkeyedData] = useState([{}]);
  
 
  const tableInfo = []
  const headings  = ['Gene 1', 'Gene 2', 'Corr R']
  const helps = {'Corr R':'Correlation Co-efficient'}
  const tabOptions = [
    {
      label: 'Graph',
      value: 'graph',
    },
    {
      label: 'Table',
      value: 'table',
    }   
  ];
  useEffect(() => {  
    //console.log("HI2",correlationSettings?.filter)  
    if(graphData?.data?.nodes){
      tableInfo.length =0
      //console.log("HI")
      for(let i in graphData?.data?.nodes){
        if(graphData?.data?.nodes[i].count ===1){
          let gene1= graphData?.data?.nodes[i].objects[0];
          for(let j in graphData?.data?.nodes[i].features){
            if(Math.abs(graphData?.data?.nodes[i].features[j])>=correlationSettings?.filter && graphData?.data?.feature_names[j] !== gene1 )
              tableInfo.push({'Gene 1': gene1, 'Gene 2':graphData?.data?.feature_names[j], 'Corr R':graphData?.data?.nodes[i].features[j]})
          }    
        }else break;
      }
      setkeyedData(tableInfo)
    }
  },[correlationSettings?.filter , graphData])
 

  useEffect(() => {
    if (graphData) {
      // Should inject heat map into div with id=inchlib
  
      $(document).ready(function () {
        var current_gene = "";
       
        var target_element = $("#dendrogram");
        var offset = target_element.offset();
        var max_y = offset?.top + 150;
        var x_pos = offset?.left;
        var loading = $('#loading');
        loading.fadeOut();
        var protein_card = $("#protein_card");
        var protein_div = $("#protein_div");
        var protein_canvas = $("<div></div>");

        //protein_div.css({"left": x_pos + target_element.width()-40, "top": max_y});

        window.inchlib = new InCHlib({
          target: "dendrogram",
          metadata: false,
          column_metadata: false,
          max_height: 1500,          
          dendrogram: true,
          width: 1000,
          heatmap_colors: "BuWhRd",
          metadata_colors: "Reds",
          draw_row_ids: true,
          heatmap_part_width:0.85,
          //independent_columns: false,
          //column_dendrogram:false,
          // dendrogram:false,
          //fixed_row_id_size:12,
        });
        window.inchlib.read_data(graphData);
        window.inchlib.draw();
        //window.inchlib.add_prefix();
        
        window.inchlib.events.row_onmouseover = function(ids, evt){
         // console.log("row_onmouseover",ids,evt)
        };

        
      window.inchlib.events.heatmap_onmouseout = function(evt){
       // console.log("heatmap_onmouseout", evt)
      };
      
      window.inchlib.events.row_onclick = function(ids){   
        //console.log("ids", ids)   
        //console.log("current_gene", current_gene)      
        if(ids.length === 1 && ids[0] !== current_gene){
          current_gene = ids[0];
          //get_protein_from_pdb(ids[0]);
          window.inchlib.highlight_rows(ids);
          window.inchlib.unhighlight_cluster();
      }
      loading.fadeOut();
      };

      function get_protein_from_pdb(id){
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

      //define function for dendrogram_node_onclick event
      window.inchlib.events.dendrogram_node_onclick = function(object_ids){        
        setSelectedGenes(object_ids.map(gene => gene.split("_")[0]));

        var i;
            
            for(i = 0; i<object_ids.length; i++){
                if(object_ids[i] === current_gene){
                    return;
                }
            }
            $("#protein > canvas").hide();
            protein_card.hide();
            window.inchlib.highlight_rows([]);
      };

      window.inchlib.events.empty_space_onclick = function(){
        window.inchlib.highlight_rows([]);
        window.inchlib.unhighlight_cluster();        
    }

    
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

        
      });

      
    }
  }, [graphData]);



  
  return (
    <div className={styles.mainView}>
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
      <Spacer height={5}/>

      {keyedData && selectedView === 1 && (
      <> 
        
        <EnrichmentTable keyedData={keyedData} headings = {headings} helps= {helps} />        
      </>
      )}
      
      <> 
        <script src="https://www.openscreen.cz/software/inchlib/static/js/inchlib-1.2.0.min.js"></script>
        <div id='dendrogram'  hidden={selectedView ===1}></div>
        <div id="protein_div">
            <div id="protein">
                <div id="protein_src"></div>
                <div id="loading">
                    <img src="https://www.openscreen.cz/software/inchlib/static/img/loading.gif"/>
                </div>
            </div>
            <div id="protein_card"></div>
            <div id="overflow_div"></div>
            {selectedGenes.length>3?(
              <div hidden={selectedView ===1} style={{marginLeft:"auto", width : "90%", paddingLeft: "20px"} }>
            <Row width="100%" height="90%" justifyContent={"center"}> 
              <GeneSetEnrichmentTable genesets={{"Selected Genes": selectedGenes.join()}} />
            </Row></div>)
            :(null)}
        </div>
      </>
           

      
    </div>
  );
};

const mapStateToProps = ({  settings }) => ({
  correlationSettings: settings?.correlation ?? {}

})

const MainContainer = connect(mapStateToProps)(HeatMap);

export { MainContainer as HeatMap };;



