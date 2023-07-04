import { toast } from "@oliasoft-open-source/react-ui-library";
import { get, set} from 'idb-keyval';


async function performEnrichment(geneList, datasets) {
   
    console.log("Here we are starting", geneList, datasets)
    //Get hash of the genelist.
    let hashVal = hashGeneList(geneList);
    console.log("Here is hashVal", hashVal)
    //check whther exists in db   ==  getByHashId
    let listID = undefined
    
    await get(hashVal).then((val) => {  
        listID = val;
        console.log("ID was in hash",listID);
    }).catch((error)=> {
        console.log("Not in hash?",error);
    })
     
    if(!listID){
        //if not exists connect to enrichr and getListID
        //SavetoDB HashID,geneListID     
        listID = await runEnrichr(geneList)
        if(listID)
            set(hashVal, listID).then(()=> {
                console.log("HashID saved to DB");
            });
        console.log("Here after listID", listID)
        //saveHashID({hashid:hashVal, listid:listID})
    }
    
    if(listID)
    {
        console.log("Here listID proc 1", listID)
        //check whther database contains data for genelistId for each dataset
        //For the missing ones call getEnrichr with genelistID
        //{data: {name: x,  data: y}, time:}
        datasets= datasets.trim().trim(",").split(",")
        var datasetsSet = new Set(datasets)
        var enrichRdata =[]
        
        await get("enrichr_" + listID ).then((results) => {  
            //Collecting all available data from the storage
            console.log("Checking results?",results);
            if(results)
            {                
                for(let i in results.data){
                    enrichRdata.push(results.data[i])
                    if(results.data[i].name && datasetsSet.has(results.data[i].name)){                    
                        datasetsSet.delete(results.data[i].name)
                    }
                } 
            }
        }).catch((error)=> {
            console.log("Not in hash?",error);
        }) 

        console.log("Initial results enrichRdata",enrichRdata,datasetsSet);

        //if there are still remaining we need to get them from API 
        var operations= []       
        if(datasetsSet.size>0){            
            for(let dataset of datasetsSet)
            {
                operations.push(getEnrichr(listID,dataset));
            }
            //console.log("operations", operations);
            let enrichRresults  = await Promise.allSettled(operations);           

            //console.log("enrichRresults", enrichRresults);
            //console.log("Data Before", enrichRdata);
            //PUSH THE NEW RESULTS TO db

            for(let result in enrichRresults){
                //console.log("Check res", result);
                if(result && enrichRresults[result].status === "fulfilled" )
                    enrichRdata.push(enrichRresults[result].value)
            }

            await set("enrichr_" + listID , {data: enrichRdata, time:Date.now()}).then(()=> {
                //console.log("Data saved to DB");
            });
            //{data: {name: x,  data: y}, time:}



            console.log("Data After", enrichRdata);
            
            datasetsSet = new Set(datasets)
            //filter the requested databases            
            for( let i =enrichRdata.length-1;i>-1; i--){                
                if(enrichRdata[i].name && datasetsSet.has(enrichRdata[i].name)) continue;
                enrichRdata.splice(i,1);
            }

            console.log("Data After Filtering", enrichRdata);

           
        }

        console.log("Returning result",enrichRdata )
        return enrichRdata       
    }
}

//Create a basic hash function for genelists.
//Sort the list take first item, last item, count, length of allgenes
function hashGeneList(geneList) {
    geneList = geneList.trim(',').split(',').sort()
    if(geneList && geneList.length>1){
        let sum = 0;
        for(var x in geneList) sum = sum + x.length
        return geneList.length + geneList[0]+ geneList[geneList.length-1] + sum
    }
    return undefined;
}



      const runEnrichr = (genes) => {  
        //We need to remove _2 as second sgRNAs contain that. 
        console.log("genes",genes.replaceAll("_2","").split(",").length)
        let genes_str = genes.replaceAll("_2","").replaceAll(",","\n");
        let description = 'Example gene list';
       
        const formData = new FormData();
      
        formData.append('list', genes_str);
        formData.append('description', description);
        console.log("genes_str",genes_str.split("\n").length, genes_str)
        
      
        return new Promise((resolve, reject) => {
          fetch('https://maayanlab.cloud/Enrichr/addList', {
            method: 'POST',
            body: formData
          })
            .then(response => {
              if (response.ok) {
                return response.json();
              } else {
                throw new Error('Request failed.');
              }
            })
            .then(data => {
              //console.log(data); // Handle the response data
             /* getEnrichr(data.userListId, "KEGG_2015").then(
                response => {                        
                  console.log("response2",response);                  
                })*/
              resolve(data.userListId); // Resolve the promise with the response data
            })
            .catch(error => {
              toast({
                message: { "type":  "Error",
                "icon": true,
                "heading": "Enrichr",
                "content": "Sorry. Enrichr servers are not responding."},
                autoClose:2000
              })
              reject(error); // Reject the promise with the error message
            });
        });
      }
  

      const getEnrichr = (listID, datasets) => {             
      
        return new Promise((resolve, reject) => {
          fetch('https://maayanlab.cloud/Enrichr/enrich?userListId=' + listID + "&backgroundType=" + datasets , {
            method: 'GET'
          })
            .then(response => {
              if (response.ok) {
                return response.json();
              } else {
                throw new Error('Request failed.');
              }
            })
            .then(result => {
              console.log(result); // Handle the response data
              resolve({name:datasets, data:result[datasets]}); // Resolve the promise with the response data
            })
            .catch(error => {
              toast({
                message: { "type":  "Error",
                "icon": true,
                "heading": "Enrichr",
                "content": "Sorry. Error fetching enrichment results. Enrichr servers are not responding."},
                autoClose:2000
              })
              reject(error); // Reject the promise with the error message
            });
        });
      }
  
      export {performEnrichment}
