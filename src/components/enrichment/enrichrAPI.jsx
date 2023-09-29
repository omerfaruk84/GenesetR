import { toast } from "@oliasoft-open-source/react-ui-library";
import { get, set } from "idb-keyval";

// async function to perform enrichment
async function performEnrichment(geneList, datasets) {
  console.log("Triggered 1");
  // Get hash of the genelist.
  let hashVal = hashGeneList(geneList);

  // check whether the genelist exists in the database
  let listID = undefined;
  try {
    listID = await get(hashVal);
    console.log("Triggered listID", listID, geneList);
  } catch (error) {
    console.log("Not in hash?", error);
  }

  if (!listID) {
    // if the genelist does not exist, connect to Enrichr and get the list ID+
    console.log("Triggered 2");
    listID = await runEnrichr(geneList);

    if (listID) {
      await set(hashVal, listID);
    }
  }

  if (listID) {
    // check whether the database contains data for each dataset
    datasets = datasets.trim().trim(",").split(",");
    var datasetsSet = new Set(datasets);
    var enrichRdata = [];

    try {
      // get all available data from the storage
      let results = await get("enrichr_" + listID);
      //console.log("Checking results?", results);
      if (results) {
        for (let i in results.data) {
          enrichRdata.push(results.data[i]);
          if (results.data[i].name && datasetsSet.has(results.data[i].name)) {
            datasetsSet.delete(results.data[i].name);
          }
        }
      }
    } catch (error) {
      console.log("Not in hash?", error);
    }

    // if there are still missing datasets, retrieve them from the API
    var operations = [];
    if (datasetsSet.size > 0) {
      for (let dataset of datasetsSet) {
        operations.push(getEnrichr(listID, dataset));
      }
      let enrichRresults = await Promise.allSettled(operations);

      for (let result of enrichRresults) {
        if (result.status === "fulfilled" && result.value) {
          enrichRdata.push(result.value);
        }
      }

      await set("enrichr_" + listID, { data: enrichRdata, time: Date.now() });

      datasetsSet = new Set(datasets);
      // filter the requested databases
      for (let i = enrichRdata.length - 1; i > -1; i--) {
        if (enrichRdata[i].name && datasetsSet.has(enrichRdata[i].name)) {
          continue;
        }
        enrichRdata.splice(i, 1);
      }
    }

    return enrichRdata;
  }
}

//Create a basic hash function for genelists.
//Sort the list take first item, last item, count, length of allgenes
function hashGeneList(geneList) {
  geneList = geneList.trim(",").split(",").sort();
  if (geneList && geneList.length > 1) {
    let sum = 0;
    for (var x in geneList) sum = sum + x.length;
    return geneList.length + geneList[0] + geneList[geneList.length - 1] + sum;
  }
  return undefined;
}

const runEnrichr = (genes) => {
  //We need to remove _2 as second sgRNAs contain that.
  let genes_str = genes.replaceAll("_2", "").replaceAll(",", "\n");
  let description = "Example gene list 1";
  const formData = new FormData();

  formData.append("list", genes_str);
  formData.append("description", description);
  //console.log("genes_str",genes_str.split("\n").length, genes_str)

  return new Promise((resolve, reject) => {
    fetch("https://maayanlab.cloud/Enrichr/addList", {
      method: "POST",
      body: formData,
    })
      .then((response) => {
        if (response.ok) {
          return response.json();
        } else {
          throw new Error("Request failed.");
        }
      })
      .then((data) => {
        resolve(data.userListId); // Resolve the promise with the response data
      })
      .catch((error) => {
        /*toast({
                message: { "type":  "Error",
                "icon": true,
                "heading": "Enrichr",
                "content": "Sorry. Enrichr servers are not responding."},
                autoClose:2000
              })*/
        console.log("Sorry. Enrichr servers are not responding.", error);
        reject(error); // Reject the promise with the error message
      });
  });
};

const getEnrichr = (listID, datasets) => {
  console.log("datasets", datasets);
  return fetch(
    `https://maayanlab.cloud/Enrichr/enrich?userListId=${listID}&backgroundType=${datasets}`,
    {
      method: "GET",
    }
  )
    .then((response) => {
      if (response.ok) {
        return response.json();
      } else {
        throw new Error("Request failed.");
      }
    })
    .then((result) => {
      //console.log(result);
      return { name: datasets, data: result[datasets] };
    })
    .catch((error) => {
      toast({
        message: {
          type: "Error",
          icon: true,
          heading: "Enrichr",
          content:
            "Sorry. Error fetching enrichment results. Enrichr servers are not responding.",
        },
        autoClose: 2000,
      });
      throw error;
    });
};

export { performEnrichment };
