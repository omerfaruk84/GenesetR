import React from 'react';
import { connect } from 'react-redux';
import { ModulePathNames } from '../../store/results/enums';
import { Column, Row, Flex, Heading, Spacer } from "@oliasoft-open-source/react-ui-library";
import styles from './mainpage.module.scss';
import { useNavigate, useEffect  } from "react-router-dom";
import { ROUTES } from '../../common/routes';
import { coreSettingsChanged } from '../../store/settings/core-settings';
import { CoreSettingsTypes } from '../../components/side-bar/settings/enums';

const MainPage = ({ coreSettingsChanged }) => {
  const navigate  = useNavigate ();
  const handleClick = (page) => {
    console.log(page)
    switch(page){
      case 1:
        navigate (ROUTES.GENE_REGULATION);
        break;
      case 2:
        navigate (ROUTES.GENESIGNATURE);
          break;
      case 3:
        navigate (ROUTES.PATHFINDER);
          break;
      case 4:
        navigate (ROUTES.DR);
        break;
      case 5:
        coreSettingsChanged({
          settingName: CoreSettingsTypes.DATA_TYPE,
          newValue: 1
        })
        navigate (ROUTES.CORRELATION);
        break;
      case 6:
          coreSettingsChanged({
          settingName: CoreSettingsTypes.DATA_TYPE,
          newValue: 2
        })
          navigate (ROUTES.CORRELATION);
          break;
      case 7:
        navigate (ROUTES.HEATMAP);
        break;

      default:
        console.log(`Strange! You shouldn't be seeing this message.`);
    }  
  }

  


  return (
    <>
  <div className={styles.parentOfMainView}>
    <div className={styles.mainView}>
    
    <h1 style={{fontFamily: "Droid Sans", fontSize:"30px"}}>GeneSetR</h1>

      
        <p className={styles.infoSection}>
        Capitalizing on the power of Genome-wide Perturb-Seq (GWPS) data, GeneSetR provides a novel 
        platform for in-depth analysis of user defined gene lists. GeneSetR is a user-friendly tool 
        to interpret and cluster gene lists, helping researchers to navigate the Genomewide Perturb-Seq 
        (GWPS) dataset that recently became available.       
        </p>


    
    <div className ={`${styles['glass-panel']}`}>      
    <h2 style={{margin:"0px"}}>Potential Analyses in GeneSetR:</h2>
    <div className ={`${styles['button-container']}`}>
    <button  onClick={() =>handleClick(1)} className ={`${styles['glass-button']}`}>Find genes that regulate, or are regulated, by a given gene of interest</button><Row/>
    <button  onClick={() =>handleClick(3)} className ={`${styles['glass-button']}`}>Analyze RNA-seq results to identify pathways</button>
    <button  onClick={() =>handleClick(4)} className ={`${styles['glass-button']}`}>Cluster a given genelist to identify functional groups</button>
    <button  onClick={() =>handleClick(5)} className ={`${styles['glass-button']}`}>Draw a correlation map based on knockdown profiles</button>
    <button  onClick={() =>handleClick(6)} className ={`${styles['glass-button']}`}>Generate a correlation map based on expression of genes upon perturbations</button>
    <button  onClick={() =>handleClick(7)} className ={`${styles['glass-button']}`}>Generate a heatmap illustrating the relationship between chosen genes and perturbations</button>
    <button  onClick={() =>handleClick(2)} className ={`${styles['glass-button']}`}>Find perturbations that modulate a given gene signature</button>

    </div>
    </div>

    <Spacer height={45}/>
    <div id="refer" style = {{width : "60%", maxWidth:"880px" ,fontSize:"1.2em" , justifyContent: "start",flexDirection: "column", display: "flex"}}>
    <div>
    <b >To acknowledge GenesetR, please cite:</b> <br/>
    </div>
    <div style = {{marginLeft: "20px"}}>
                <a style = {{ color: "#D90000", outline: "0", textDecoration: "none", fontSize:"0.9em"}} href="https://www.ncbi.nlm.nih.gov/pubmed/" id="pubmedCitation-link" target="_blank">
                    Kuzu OF, Saatcioglu F.<br/>GeneSetR<br/><i> ...</i>.
                </a>
                <br/><br/>
            </div>
      </div>
  

      <div  style= {{ display: "flex",  justifyContent :"center"}} >
<div  style= {{ width: "60%",  maxWidth:"750px" , display:"grid", gridTemplateColumns: "1fr 1fr",    alignItems :"center", justifySelf: "center"}}>

      <a  target="_blank" rel="noopener noreferrer" href="https://www.uio.no/">
      <img style= {{marginLeft: "10%", maxWidth: "90%", height: "auto",  objectFit:"contain"}} alt='University of Oslo' src='/images/uio-logo2.png'/>
      </a>
     
     
      <a   target="_blank" rel="noopener noreferrer" href="https://saatcioglulab.org/">
      <img style= {{marginLeft: "10%", maxWidth: "100%", maxHeight:"45px" , height: "auto",  objectFit:"contain"}} alt='Saatcioglu Lab' src='/images/fslab2.png' />
      </a>   
</div></div>

<div  style= {{ width: "100%", maxWidth:"880px" , justifyContent:"start", display: "flex", alignItems :"center"}}>

    <a  target="_blank" rel="noopener noreferrer" href="https://github.com/omerfaruk84/GenesetR/issues">
    <img style= {{height: "30px", marginLeft: "28%"}} src="https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png"/>
    </a>
    <a  style= {{fontSize: "1em"}} target="_blank" rel="noopener noreferrer" href="https://github.com/omerfaruk84/GenesetR/issues">
    <span style= {{marginLeft: "10px"}}>Click here to raise an issue on GitHub</span>
    </a>
        
    <a  style= {{fontSize: "1em",  marginLeft: "3%"}} target="_blank" rel="noopener noreferrer" href="https://github.com/omerfaruk84/GenesetR_API">
    <span  style = {{color: "#D90000"}} >Would you like to contribute?</span> <span>  Visit our   </span>
    <a  target="_blank" rel="noopener noreferrer" href="https://github.com/omerfaruk84/GenesetR_API">
    <img style= {{width: "45px"}} src="https://github.githubassets.com/images/modules/logos_page/GitHub-Logo.png"/>
    </a>
    <span style= {{marginLeft: "3px"}}>page.</span>
    </a>             
                 

</div>
</div>
</div>
    </>
  );
};

const mapStateToProps = ({ settings }, { path }) => ({
  coreSettings: settings?.core ?? {},
});

const mapDispatchToProps = {
  coreSettingsChanged,
};

const MainContainer = connect(mapStateToProps, mapDispatchToProps)(MainPage);
export { MainContainer as MainPage };