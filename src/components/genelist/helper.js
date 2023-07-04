import pLimit from 'p-limit';
import axios from 'axios';
import { set, get } from 'idb-keyval';


const batchSize = 5;
const limit = pLimit(5); // limit to 5 requests at a time

async function getAliasesForGeneList(genes) {
  console.log("Checking alliases for ", genes)
  let aliases = new Map();
  const remainingGenes = [];
    //first chek aliases from local db

    let geneAliasMap = await get("geneAlias");
    if(!geneAliasMap) geneAliasMap = new Map();   
   
    if (geneAliasMap && geneAliasMap.size>0) {
        //console.log("geneAliasMap", geneAliasMap)
        // Iterate over the geneList and populate the geneAliasList and remainingGenes
        genes.forEach((gene) => {
            if (geneAliasMap.has(gene)) 
            {                
                aliases.set(gene, geneAliasMap.get(gene));
            } else {
                remainingGenes.push(gene);
            }
        });        

    } else {            
            remainingGenes.push(...genes);
    }

 
  // divide the gene list into batches
  
  const batches = [];
  for (let i = 0; i < remainingGenes.length; i += batchSize) {
    batches.push(remainingGenes.slice(i, i + batchSize));
  }
  
  // query aliases for each gene in each batch
  await Promise.allSettled(
    batches.map(async (batch) => {
      await Promise.allSettled(
        batch.map(async (gene) => {
          const url = `https://www.cbioportal.org/api/genes?alias=${gene}`;
          try {
            const response = await limit(() => axios.get(url));
            console.log("Got resposne ", response)
            if(response.status ===200) 
            {           
            const data = response.data[0];            
            if(data)
                aliases.set(gene, data.hugoGeneSymbol);
            }
          } catch (error) {
            console.error(`Error getting alias for ${gene}: ${error.message}`);
          }
        })
      );
    })
  );

  
  for (let [key, value] of aliases) { 
    geneAliasMap.set(key, value);  
    }

   set("geneAlias",geneAliasMap);   
  return aliases;
}


async function checkGenes(currentGenes, isPerturbationList, cellLine, isGeneSignature){
  let notFound = [];
  let notExist = [];
  let notInPerturbSeq = [];
  let found = []
  let suggestions =[]
  let query = []
  

  let extension =  "_perturb";
  if(!isPerturbationList || isGeneSignature ) 
    extension = "_genes"
  let perturbDict = await get("geneList_" + cellLine + extension)
  console.log("perturbDict"+ cellLine + extension , perturbDict)
  
  if (perturbDict && perturbDict.size > 0) { 
    let genes  = ""
      if(isGeneSignature)  
        genes = currentGenes.replace(/\s/g, '').split(/[+-]/).filter(gene => gene.length > 0);
      else
        genes = currentGenes.replace(/^\\n+|\\n+$/g, '').split("\n").filter(gene => gene.trim().length>0);
      
      console.log("genes" , genes)
      notFound = genes.filter(gene => !perturbDict.has(gene));
      found = genes.filter(gene => perturbDict.has(gene));
  
      
      let allGenes = await get("allHugoGenes");
      if (allGenes && allGenes.size > 0) {       
        notExist = notFound.filter(gene => !allGenes.has(gene));
        //console.log("notExist", notExist)
        notInPerturbSeq = notFound.filter(gene => allGenes.has(gene));
        //console.log("notInPerturbSeq", notInPerturbSeq)
      } else {
        notExist = notFound;
      }

      let notExist2 =[]
      let aliasExist =[]
      let aliasExist2 =[]

      let aliases = await  getAliasesForGeneList(notExist);
      //console.log("aliases", aliases)
      for(let i=notExist.length -1; i>-1; i--){
        //console.log("checking ", notExist[i])
        if(aliases.has(notExist[i])){
          //console.log("aliases.has(notExist[i])", notExist[i])
          //console.log("perturbDict", perturbDict.has(aliases.get(notExist[i])), aliases.get(notExist[i]))
          //If therer is an alias check perturb seq has alias of it
          if (!perturbDict.has(aliases.get(notExist[i]))){
            //console.log("!perturbDict.has(aliases[notExist[i]])", notExist[i])
            //alias does not exist among perturbseq so we should remove it or add it to notInPerturbSeq list
            //if(allGenes && allGenes.has(aliases.get(notExist[i]))){
              //console.log("allGenes.has(aliases[notExist[i]])", notExist[i])
              //This gene exists but not in perturbseq 
              notInPerturbSeq.push(notExist[i])
            //}                       
          }else {
            //then we have it in perturbseq data so offer to change it
            aliasExist.push(notExist[i])
            aliasExist2.push(aliases.get(notExist[i]))
            suggestions.push(
              {
                type : "SingleAlias",
                alias: aliases.get(notExist[i])  ,
                genes: [
                  {              
                    hugoGeneSymbol: notExist[i]          
                  },
                ],
              }
            )            

          }          
        }else {
          //No such a gene so needs to be deleted
          notExist2.push(notExist[i])
          suggestions.push(
            {
              type : "SingleNotExists",
              alias: [],
              genes: notExist[i],
            }
          )

        } 
        
        //console.log(suggestions,query )
      }
     
      if(notInPerturbSeq.length>0){
      //console.log("adding notInPerturbSeq", notInPerturbSeq)
        suggestions.push(
          {
            type : isPerturbationList? "Not among targets":"Not among detected",
            alias: [],          
            genes: [
              {              
                hugoGeneSymbol: notInPerturbSeq           
              },
            ],
          }
        )        

      }

      if(notExist2.length>2){
        //console.log("adding notInPerturbSeq", notInPerturbSeq)
          suggestions.push(
            {
              type : isPerturbationList? "Not exists targets":"Not exists detected", 
              alias:    [],        
              genes: [
                {              
                  hugoGeneSymbol: notExist2           
                },
              ],
            }
          )       
        }

        if(aliasExist.length>2){
          //console.log("adding notInPerturbSeq", notInPerturbSeq)
            suggestions.push(
              {
                type : isPerturbationList? "Alias targets":"Alias detected",
                alias: aliasExist2,                 
                genes: [
                  {              
                    hugoGeneSymbol: aliasExist
                  },
                ],
              }
            )      
          }

      }else {
        console.log("Upps where is the list for genes?")
        suggestions = Error();
      }
  
  
      return {       
        validatingGenes: false,
        isEmpty:  currentGenes.length<1,   
        suggestions: suggestions,        
      };  
}
export {getAliasesForGeneList, checkGenes};