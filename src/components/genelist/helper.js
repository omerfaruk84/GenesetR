import pLimit from 'p-limit';
import axios from 'axios';
import { set, get } from 'idb-keyval';


const batchSize = 5;
const limit = pLimit(5); // limit to 5 requests at a time

async function getAliasesForGeneList(genes) {
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
  console.log("Checking alliases for ", remainingGenes)
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
export {getAliasesForGeneList};