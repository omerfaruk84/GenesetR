import React, {useState, useEffect} from 'react';
import { connect } from 'react-redux';
import { Field, Select, Slider, Divider, Toggle,Spacer, Label } from '@oliasoft-open-source/react-ui-library';
import { geneRegulationCoreSettingsChanged } from '../../../store/settings/gene-regulation-core-settings';
import { GeneRegulationCoreSettingsTypes } from './enums';
import styles from './settings.module.scss';
import { set, get } from 'idb-keyval';
import Axios from 'axios';


const GeneRegulationSettings = ({
  geneRegulationCoreSettings,
  geneRegulationCoreSettingsChanged,
}) => {

 
  const [geneOptions, setGeneOptions] = useState([]);

  useEffect(populateGeneOptions,[])

  function populateGeneOptions(){

    let check = new Set()

    get("geneList_K562gwps_perturb").then((val) => {
      console.log("val", val)
      if (val && val.size > 0) {
        
        for (let item of val) {
          check.add(item.split("_")[0])
        }
      }
      return get("geneList_K562gwps_genes");
    }).then((val) => {
      console.log("val2", val)
      if (val && val.size > 0) {
        for (let item of val) {
          check.add(item.split("_")[0])
        }
      }
     
      if (check.size === 0) {
        return Axios.post("https://genesetr.uio.no/api/getData",
        //return Axios.post("https://ca10-2001-700-100-400a-00-f-f95c.ngrok-free.app/getData",
          {
            headers: {
              'ngrok-skip-browser-warning': '69420',
            },
            body: JSON.stringify({
              dataset: "K562gwps",
              request: 'getAllGenes'
            }),
          })
      }
    }).then(response => {
      if (response && response.data) {
        response.data.result.perturbations.forEach((val) => {
          check.add(val.split("_")[0])
        })
        response.data.result.genes.forEach((val) => {
          check.add(val.split("_")[0])
        })

        //console.log("Received genes and pert", response.data)
    
        set("geneList_K562gwps_perturb", new Set(response.data.result.perturbations));
        set("geneList_K562gwps_genes", new Set(response.data.result.genes));
      }

      check.delete("") // There is one empty coming that needs to be removed
      // Convert the set to array here
      let temp = Array.from(check).filter(val => !val.startsWith("non-")).map(val => ({ label: val, value: val }));
      // Now that all asynchronous operations are done, it's safe to sort and set gene options.
      setGeneOptions(temp.sort((a, b) => a.label.localeCompare(b.label)));
       });       
       
  }
   

  return (
    <>
      <Field label='Select a gene'>
        <Select
          onChange={({ target: { value } }) => geneRegulationCoreSettingsChanged({
            settingName: GeneRegulationCoreSettingsTypes.SELECTED_GENE,
            newValue: value
          })}
          options={geneOptions}
          value={geneRegulationCoreSettings?.selectedGene}
        />
      </Field>
    
      <Field label='Show Exprresional Regulation' labelLeft labelWidth="250px" helpText="Adjust symbol opacity based on clustering probability">
      <Toggle      
       onChange={({ target: { checked } }) => geneRegulationCoreSettingsChanged({
        settingName: GeneRegulationCoreSettingsTypes.INCLUDE_EXP,
        newValue: checked
      })}
      checked={geneRegulationCoreSettings?.include_exp}
    /></Field>
      <Field  labelLeft label='Absolute Z Score threshold'>
        <div className={styles.inputRange}>         
          <Slider
            label={geneRegulationCoreSettings?.absoluteZScore}
            max={200}
            min={4}
            value={geneRegulationCoreSettings?.absoluteZScore * 20}
            onChange={({ target: { value } }) => geneRegulationCoreSettingsChanged({
              settingName: GeneRegulationCoreSettingsTypes.ABSOLUTE_Z_SCORE,
              newValue: value / 20,
            })}
          />
        </div>
      </Field>
      <Field  labelLeft label='Minimum Neighbour Count'>
        <div className={styles.inputRange}>         
          <Slider
            label={geneRegulationCoreSettings?.neighbourCount}
            max={5}
            min={1}
            value={geneRegulationCoreSettings?.neighbourCount}
            onChange={({ target: { value } }) => geneRegulationCoreSettingsChanged({
              settingName: GeneRegulationCoreSettingsTypes.NEIGHBOUR_COUNT,
              newValue: value,
            })}
          />
        </div>
      </Field>
     
      <Field  label='Filter Black Listed sgRNAs'>
      <Spacer width="10px" />
      <Toggle      
       onChange={({ target: { checked } }) => geneRegulationCoreSettingsChanged({
        settingName: GeneRegulationCoreSettingsTypes.FILTER1_ENABLED,
        newValue: checked
        })}
        checked={geneRegulationCoreSettings?.filter1Enabled}
        label="Enabled"
      /> 
      <Spacer width="16px" />
      <Toggle      
       onChange={({ target: { checked } }) => geneRegulationCoreSettingsChanged({
        settingName: GeneRegulationCoreSettingsTypes.FILTER1_DIRECTIONAL,
        newValue: checked
        })}
        checked={geneRegulationCoreSettings?.filter1Directional}
        disabled = {!geneRegulationCoreSettings?.filter1Enabled}
        label="Directional Only"
      />        
        <div className={styles.inputRange}>  
          <Slider
            label={geneRegulationCoreSettings?.filterBlackListed}            
            max={60}            
            min={24}
            disabled = {!geneRegulationCoreSettings?.filter1Enabled}
            value={geneRegulationCoreSettings?.filterBlackListed*20}
            onChange={({ target: { value } }) => geneRegulationCoreSettingsChanged({
              settingName: GeneRegulationCoreSettingsTypes.FILTER_BLACKLISTED,
              newValue: value/20,
            })}
          />
        </div>
      </Field>
      <Field  label='Filter Black Listed Genes'>
      <Spacer width="10px" />
      <Toggle      
       onChange={({ target: { checked } }) => geneRegulationCoreSettingsChanged({
        settingName: GeneRegulationCoreSettingsTypes.FILTER2_ENABLED,
        newValue: checked
        })}
        checked={geneRegulationCoreSettings?.filter2Enabled}
        label="Enabled"
      /> 
      <Spacer width="16px" />
      <Toggle      
       onChange={({ target: { checked } }) => geneRegulationCoreSettingsChanged({
        settingName: GeneRegulationCoreSettingsTypes.FILTER2_DIRECTIONAL,
        newValue: checked
        })}
        checked={geneRegulationCoreSettings?.filter2Directional}
        disabled = {!geneRegulationCoreSettings?.filter2Enabled}
        label="Directional Only"
      />  
        <div className={styles.inputRange}>         
          <Slider
            label={geneRegulationCoreSettings?.filterBlackListedExp}
            disabled = {!geneRegulationCoreSettings?.filter2Enabled}
            max={60}
            min={24}
            value={geneRegulationCoreSettings?.filterBlackListedExp*20}
            onChange={({ target: { value } }) => geneRegulationCoreSettingsChanged({
              settingName: GeneRegulationCoreSettingsTypes.FILTER_BLACKLISTEDEXP,
              newValue: value/20,
            })}
          />
        </div>
      </Field>

      <Field  label='Perturbation Count Filter'>
      <Toggle      
       onChange={({ target: { checked } }) => geneRegulationCoreSettingsChanged({
        settingName: GeneRegulationCoreSettingsTypes.FILTER3_ENABLED,
        newValue: checked
        })}
        checked={geneRegulationCoreSettings?.filter3Enabled}
        label="Enabled"
      /> 
      <div className={styles.inputRange}>         
          <Slider
            label={geneRegulationCoreSettings?.filterCount1}
            disabled = {!geneRegulationCoreSettings?.filter3Enabled}
            max={2500}
            step={250}
            min={250}
            value={geneRegulationCoreSettings?.filterCount1}
            onChange={({ target: { value } }) => geneRegulationCoreSettingsChanged({
              settingName: GeneRegulationCoreSettingsTypes.FILTER_COUNT1,
              newValue: value,
            })}
          />
        </div>
      </Field>

      <Field  label='Gene Expression Count Filter'>
      <Toggle      
       onChange={({ target: { checked } }) => geneRegulationCoreSettingsChanged({
        settingName: GeneRegulationCoreSettingsTypes.FILTER4_ENABLED,
        newValue: checked
        })}
        checked={geneRegulationCoreSettings?.filter4Enabled}
        label="Enabled"
      /> 
      <div className={styles.inputRange}>         
          <Slider
            label={geneRegulationCoreSettings?.filterCount2}
            disabled = {!geneRegulationCoreSettings?.filter4Enabled}
            max={1000}
            step={250}
            min={250}
            value={geneRegulationCoreSettings?.filterCount2}
            onChange={({ target: { value } }) => geneRegulationCoreSettingsChanged({
              settingName: GeneRegulationCoreSettingsTypes.FILTER_COUNT2,
              newValue: value,
            })}
          />
        </div>
      </Field>

      <Field  label='Simplified View' helpText="If enabled only links between Gene of Interest and its immediate neighbours will be shown.">
      <Toggle      
       onChange={({ target: { checked } }) => geneRegulationCoreSettingsChanged({
        settingName: GeneRegulationCoreSettingsTypes.FILTER5_ENABLED,
        newValue: checked
        })}
        checked={geneRegulationCoreSettings?.filter5Enabled}
        label="Enabled"
      /> 
      <div className={styles.inputRange}>         
          <Slider
            label={geneRegulationCoreSettings?.filterCount5}
            disabled = {!geneRegulationCoreSettings?.filter5Enabled}
            max={100}
            min={1}
            value={geneRegulationCoreSettings?.filterCount5}
            onChange={({ target: { value } }) => geneRegulationCoreSettingsChanged({
              settingName: GeneRegulationCoreSettingsTypes.FILTER_COUNT5,
              newValue: value,
            })}
          />
        </div>
      </Field>




      <Field label='Only Linked to Gene Of Interest' labelLeft labelWidth="250px" helpText="Adjust symbol opacity based on clustering probability">
      <Toggle      
       onChange={({ target: { checked } }) => geneRegulationCoreSettingsChanged({
        settingName: GeneRegulationCoreSettingsTypes.ONLY_LINKED,
        newValue: checked
      })}
      checked={geneRegulationCoreSettings?.onlyLinked}
    /></Field>

     <Field label='Node Size Based on Final Map' labelLeft labelWidth="250px" helpText="Adjust symbol opacity based on clustering probability">
      <Toggle      
       onChange={({ target: { checked } }) => geneRegulationCoreSettingsChanged({
        settingName: GeneRegulationCoreSettingsTypes.BASED_ON_FINAL,
        newValue: checked
      })}
      checked={geneRegulationCoreSettings?.basedOnFinal}
    /></Field> 
     <Field label='Include Correlation' labelLeft labelWidth="250px" helpText="Adjust symbol opacity based on clustering probability">
      <Toggle      
       onChange={({ target: { checked } }) => geneRegulationCoreSettingsChanged({
        settingName: GeneRegulationCoreSettingsTypes.INCLUDE_CORR,
        newValue: checked
      })}
      checked={geneRegulationCoreSettings?.include_corr}
    /></Field>
      <Field labelLeft label='Correlation R threshold'>
        <div className={styles.inputRange}>         
          <Slider
            label={geneRegulationCoreSettings?.corr_cutoff}
            max={16}
            min={1}
            value={geneRegulationCoreSettings?.corr_cutoff * 20}
            onChange={({ target: { value } }) => geneRegulationCoreSettingsChanged({
              settingName: GeneRegulationCoreSettingsTypes.CORR_CUTOFF,
              newValue: value / 20,
            })}
          />
        </div>
      </Field>
      
      <Divider align="left"> Edges to display </Divider>

      <Field label='Upstream Positive Regulators' labelLeft labelWidth="250px" helpText="Adjust symbol opacity based on clustering probability">
      <Toggle      
       onChange={({ target: { checked } }) => geneRegulationCoreSettingsChanged({
        settingName: GeneRegulationCoreSettingsTypes.UPR,
        newValue: checked
      })}
      checked={geneRegulationCoreSettings?.upr}
    /></Field>
    <Field label='Upstream Negative Regulators' labelLeft labelWidth="250px" helpText="Adjust symbol opacity based on clustering probability">
      <Toggle      
       onChange={({ target: { checked } }) => geneRegulationCoreSettingsChanged({
        settingName: GeneRegulationCoreSettingsTypes.UNR,
        newValue: checked
      })}
      checked={geneRegulationCoreSettings?.unr}
    /></Field>
    <Field label='Downstream Positively Regulated' labelLeft labelWidth="250px" helpText="Adjust symbol opacity based on clustering probability">
      <Toggle      
       onChange={({ target: { checked } }) => geneRegulationCoreSettingsChanged({
        settingName: GeneRegulationCoreSettingsTypes.DPR,
        newValue: checked
      })}
      checked={geneRegulationCoreSettings?.dpr}
    /></Field>
    <Field label='Downstream Negatively Regulated' labelLeft labelWidth="250px" helpText="Adjust symbol opacity based on clustering probability">
      <Toggle      
       onChange={({ target: { checked } }) => geneRegulationCoreSettingsChanged({
        settingName: GeneRegulationCoreSettingsTypes.DNR,
        newValue: checked
      })}
      checked={geneRegulationCoreSettings?.dnr}
    /></Field>
    <Field label='UPR to DPR' labelLeft labelWidth="250px" helpText="Adjust symbol opacity based on clustering probability">
      <Toggle      
       onChange={({ target: { checked } }) => geneRegulationCoreSettingsChanged({
        settingName: GeneRegulationCoreSettingsTypes.UPR_DPR,
        newValue: checked
      })}
      checked={geneRegulationCoreSettings?.upr_dpr}
    /></Field>
    <Field label='UPR to DNR' labelLeft labelWidth="250px" helpText="Adjust symbol opacity based on clustering probability">
      <Toggle      
       onChange={({ target: { checked } }) => geneRegulationCoreSettingsChanged({
        settingName: GeneRegulationCoreSettingsTypes.UPR_DNR,
        newValue: checked
      })}
      checked={geneRegulationCoreSettings?.upr_dnr}
    /></Field>
    <Field label='UNR to DPR' labelLeft labelWidth="250px" helpText="Adjust symbol opacity based on clustering probability">
      <Toggle      
       onChange={({ target: { checked } }) => geneRegulationCoreSettingsChanged({
        settingName: GeneRegulationCoreSettingsTypes.UNR_DPR,
        newValue: checked
      })}
      checked={geneRegulationCoreSettings?.unr_dpr}
    /></Field>
    <Field label='UNR to DNR' labelLeft labelWidth="250px" helpText="Adjust symbol opacity based on clustering probability">
      <Toggle      
       onChange={({ target: { checked } }) => geneRegulationCoreSettingsChanged({
        settingName: GeneRegulationCoreSettingsTypes.UNR_DNR,
        newValue: checked
      })}
      checked={geneRegulationCoreSettings?.unr_dnr}
    /></Field>
     <Field label='Among UPR' labelLeft labelWidth="250px" helpText="Adjust symbol opacity based on clustering probability">
      <Toggle      
       onChange={({ target: { checked } }) => geneRegulationCoreSettingsChanged({
        settingName: GeneRegulationCoreSettingsTypes.AMONG_UPR,
        newValue: checked
      })}
      checked={geneRegulationCoreSettings?.among_upr}
    /></Field>
      <Field label='Among DPR' labelLeft labelWidth="250px" helpText="Adjust symbol opacity based on clustering probability">
      <Toggle      
       onChange={({ target: { checked } }) => geneRegulationCoreSettingsChanged({
        settingName: GeneRegulationCoreSettingsTypes.AMONG_DPR,
        newValue: checked
      })}
      checked={geneRegulationCoreSettings?.among_dpr}
    /></Field>
    



    </>
  );
};

const mapStateToProps = ({ settings }) => ({
  geneRegulationCoreSettings: settings?.geneRegulationCore ?? {},
});

const mapDispatchToProps = {
  geneRegulationCoreSettingsChanged,
};

const MainContainer = connect(mapStateToProps, mapDispatchToProps)(GeneRegulationSettings);

export { MainContainer as GeneRegulationSettings };


