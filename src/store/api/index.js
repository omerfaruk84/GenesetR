import Axios from 'axios';

const runPcaGraphCalc = async (core, pca, _clustering) => {
  const body = {
    geneList: core.peturbationList,
    dataType: core.dataType,
    filter: "",
    dataSource: pca.pcaSource,
    numcomponents: pca.numberOfComponents,
    retType: 0,
    request: 'PCAGraph'
  };

  const { task_id } = await Axios.post("https://88d9-2001-700-4a01-10-00-40.eu.ngrok.io/getData", {
    body: JSON.stringify(body),
    request: 'longTask',
  })
    .then(response => response.data);


  const delay = ms => new Promise(res => setTimeout(res, ms));
  const fetchPcaGraph = async () => {
    let times = 10;
    do {
      const { _status, data: { task_result } }  = await Axios.get("https://88d9-2001-700-4a01-10-00-40.eu.ngrok.io/tasks/" + task_id, {
        headers: {
          'ngrok-skip-browser-warning': '69420',
        },
      });
      if (task_result !== null) {
        return task_result;
      };

      await delay(3000);
      times--;
    } while (times > 0);
  };

  return fetchPcaGraph(task_id);
};

export { runPcaGraphCalc };
