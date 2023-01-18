import Axios from 'axios';

const runPcaGraphCalc = async (core, pca, _clustering) => {
  const body = {
    geneList: core.peturbationList?.replaceAll('\n', ';'),
    dataType: core.dataType,
    filter: "",
    dataSource: core.dataSource,
    numcomponents: pca.numberOfComponents,
    retType: 0,
    request: 'PCAGraph'
  };

  const { task_id } = await Axios.post("https://94bf-2001-700-4a01-10-00-36.eu.ngrok.io/getData", {
    body: JSON.stringify(body),
  })
    .then(response => response.data);


  const delay = ms => new Promise(res => setTimeout(res, ms));
  const fetchPcaGraph = async () => {
    let times = 1;
    do {
      const { data: { task_result } }  = await Axios.get("https://94bf-2001-700-4a01-10-00-36.eu.ngrok.io/tasks/" + task_id, {
        headers: {
          'ngrok-skip-browser-warning': '69420',
        },
      });
      if (task_result !== null) {
        return task_result;
      };

      await delay(times*250);
      times++;
    } while (times < 30);
  };

  return fetchPcaGraph(task_id);
};

export { runPcaGraphCalc };
