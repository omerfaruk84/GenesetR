import React, { useEffect } from 'react';
import $ from 'jquery';
import InCHlib from 'biojs-vis-inchlib';
//import InCHlib from '@baliga-lab/inchlib.js';
import styles from './heat-map.module.scss';

const HeatMap = ({ graphData }) => {
  useEffect(() => {
    if (graphData) {
      // Should inject heat map into div with id=inchlib
      $(function () {
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
          //heatmap_part_width:0.7,
          // column_dendrogram:false,
          // dendrogram:false,
          //fixed_row_id_size:12,
        });
        window.inchlib.read_data(graphData);
        window.inchlib.draw();
        window.inchlib.add_prefix();
        
        /*window.inchlib.events.row_onmouseover = function(ids, evt){
          console.log("row_onmouseover",ids,evt)
        };*/

        /*
      window.inchlib.events.heatmap_onmouseout = function(evt){
        console.log("heatmap_onmouseout", evt)
      };*/
      
      window.inchlib.events.row_onclick = function(ids, evt){
        console.log("row_onmouseover",ids,evt)
      };

      window.inchlib.events.dendrogram_node_highlight = function(object_ids, evt){
        console.log("dendrogram_node_highlight",object_ids,evt)
          //var i;
          /*
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
          */
      }

      window.inchlib.events.dendrogram_node_unhighlight = function(){
          // scaffolds_element.hide();
          console.log("dendrogram_node_unhighlight")
      }

      window.inchlib.events.empty_space_onclick = function(){
          /*
          hide_molecule();
          dendrogram.highlight_rows([]);
          bind_dendrogram_events();*/
          console.log("dendrogram_node_unhighlight")
      }
  

        
      });

      
    }
  }, [graphData]);

  return (
    <div className={styles.mainView}>
      <div id='dendrogram'></div>
    </div>
  );
};

export { HeatMap };
