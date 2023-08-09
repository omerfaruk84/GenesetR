import os
import time
from enum import Enum
from celery import Celery
from fastapi import FastAPI, Body, Form, HTTPException, Request
import pyarrow.parquet as pq
import pandas as pd
import inchlib_clust
import pymde
import umap.umap_ as umap
from scipy.spatial import ConvexHull
from sklearn.decomposition import PCA
from sklearn.cluster import SpectralCoclustering
from sklearn.manifold import TSNE
import hdbscan
import seaborn as sns
from scipy import interpolate
from scipy.stats import norm
#from bokeh.embed import json_item
#from bokeh.plotting import figure
#from bokeh.layouts import column, row
#from bokeh.models import Tap, CDSView, IndexFilter, CustomJSFilter, TextAreaInput, CustomJS, Div, Switch, CheckboxButtonGroup, Spinner, Slider, LabelSet,Columncell_line, BoxSelectTool, BoxZoomTool, LassoSelectTool, PolySelectTool, CustomJSHover, HoverTool
import json
import numpy as np	
import requests
import gseapy as gp
import redis
from celery import states
from celery.exceptions import Ignore
import pyarrow as pa
from datetime import datetime, timedelta

celery = Celery('tasks', backend='redis://localhost:6379/0', broker='redis://localhost:6379/0', result_backend = 'redis://localhost:6379/0')
genelistTemp = "NELFB;NELFCD;C1orf109;EIF4G1;DHPS;MIOS;TAF2;DDX52;NELFA;DOHH;EIF1AD;ATXN10;TTC27;CLNS1A;RPTOR;TAF6;TAF1;LTV1;TAF8;YAE1D1;EIF4A1;OGT;CTBP2;TAF10;DKC1;METTL14;RAE1;TAF1B;DDX20;EIF4E;LAMTOR3;SPATA5;PDCD2;LAMTOR2;EIF5A;ATF4;DIMT1;POP7;SHQ1;ILF3;ALDOA;RHEB;SNUPN;C19orf53;SEC24A;DIEXF;ILF2;RANBP1;SEH1L;GGA1;C9orf114;TAF7;NHP2;DHX33;POP5;HIRA;GGTLC2;ZNRD1;PPRC1;WDR12;CCNH;EIF3M;WDR59;CCDC101;GEMIN8;RSL1D1;KRR1;NOP10;BANF1;EEF2;IL17RA;PRODH;NOLC1;RBM19;EXOSC4;POP1;GEMIN6;EXOSC5;CDK9;GEMIN4;EXOSC7;PLA2G3;FAM168B;SETD1B;RPS19;ANKLE2;NOC4L;DDX49;TTC14;NOL10;YPEL1;RIMBP3;ZNHIT3;YEATS2;UTP23;TAF1C;DGCR8;GTF3A;INTS10;RPP14;SBNO1;TAF1D;EIF3H;TRMT2A;CD2BP2;TTC28;METTL3;NOM1;RPLP2;USP7;PWP2;MLST8;KAT7;RPS21;ZNF236;WDR24;DCTN6;C12orf45;SMTN;KNSTRN;GTF2E1;RPS5;PATZ1;TAF13;TMEM191B;LAMTOR1;UBTF;SUPT4H1;TRMT112;EXOSC9;METAP1;ZCCHC7;VAT1;BMS1;SLC25A18;RPP38;VPS18;USP36;OSM;GTF2A2;DDX21;ACTR5;GPN2;MYC;PRPF40A;KRI1;CMTR1;SSU72;AATF;C3orf17;TTC4;DDX47;COPS6;RRP7A;TSR1;DDX18;GAL3ST1;GPKOW;RPF2;DDX54;NHP2L1;HSPA14;TPT1;LSM8;ST14;MAPK1;BAIAP2L2;TSR2;GEMIN7;WDR3;EIF6;DDX10;RANGAP1;SETD1A;CABIN1;MAX;NUP88;DPH2;C16orf93;COPS8;WDR18;MYBBP1A;CSTF3;SSRP1;RPL39;TBCD;CHORDC1;ABT1;NUDC;PAK1IP1;LOC101929372;POP4;POLR1E;ZC3H8;RPP30;PRR14L;MICALL1;JUNB;PELP1;AHR;DCAF7;TAF12;GSTT2B;CACNG2;ATXN2;BYSL;TST;MICAL3;RRP1;RRP12;RPL13A;SMARCB1;ZNF205;MN1;NWD1;UTP6;RPL10A;DEFB112;RB1CC1;EXOSC2;SNAPC5;MTOR;CCDC116;CREB5;C21orf59;RCL1;MAK16;IGF2BP1;NOL9;UTP15;TRIM64;CTBP1;WDR55;VPS41;RPS10-NUDT3;WDR61;RCC1;TMUB2;SNRPD2;RPS3A;SPATA5L1;UBXN7;CELSR1;GP1BB;DHX37;SEPTIN1;ITPKC;IMP4;GNL3L;RPS25;DDX55;CRYBA4;MCHR1;APOBEC3G;PGK1;SNAPC1;MAZ;SUPT16H;EXOSC3;DDTL;LAS1L;RIOK1;EXOSC10;YWHAH;NOL6;DDX42;CD3EAP;NOP16;DCAF13;PAXBP1;TLK2;PDPK1;PHEX;SUN2;SRFBP1;TANGO2;NRBP1;MROH8;GEMIN5;VPREB1;TRMU;CLC;LSM14A;NMD3;AHCYL1;WDR74;FBXO17;FBRS;MDN1;MED23;P2RX6;RBBP6;TESK1;METAP2;DNAJB5;SEPTIN5;GGT7;NUPR1;CRYBB3;RPS6KB1;LILRA5;RABEP2;SELM;C22orf31;RPS15A;LSM4;NOP58;LDLRAP1;TBL3;BPTF;ALYREF;FAM227A;CCDC59;RASL10A;RPAP3;RIMBP3B;C8orf34;ZNHIT6;TAF4;PSME3;LAMTOR4;GTF2F2;CAMTA2;PAMR1;RPS11;NELFE;COL1A1;PAFAH1B1;SLC7A3;UTP20;ISG20L2;SNAPC4;AAMP;BCOR;NUBP2;NAT10;TXNRD2;EIF3F;SEPTIN4;DGCR14;PROSER3;RBFOX2;NOP9;PADI4;ADRB3;UTP14A;SRRD;ZNF793;FXYD5;DPH5;GTPBP4;RPS23;CDC16;MORC2;TAF5;C12orf29;LRP4;GTPBP1;USP18;HSPB9;NOL11;WDR46;NAA11;CSNK2B;CTDP1;MAT1A;WDR75;PRDM10;KIR2DS4;ARR3;CSH2;MNAT1;MACF1;COPS2;AFP;C18orf21;ZNF689;AP1B1;CHRFAM7A;DDX17;KLF1;DOCK5;TECRL;ARRDC5;RYR1;EXOC1;MIEF1;ANKRD54;GSC2;PLXNA4;BTBD10;DGCR2;ARHGAP22;HOMER3;RPS3;ATP2A1;THSD7A;FAM171A1;RPS2;URB1;COX6A2;NEURL1;DDT;POLR1D;SBDS;GTF2F1;TBX6;LIPF;TBC1D3K;SMIM19;RRP36;ABCC3;LSM12;NLE1;TOP1;FKBPL;NOB1;KRTAP12-2;THOC3;SPG11;CLOCK;LOC100289561;VNN3;CHRNA6;PES1;GCNT3;NTSR1;ADAP1;TAF11;TRNAU1AP;ZNF836;FBXO7;CCDC9;SOCS5;KLHL22;WFDC8;HOXA5;LGALS1;ZNF613;NOL12;ZMYND11;PCDHB14;ERMAP;ADSL;CIITA;SIK3;PTDSS1;KCNJ4;MATN2;C8orf59;SH3RF2;C17orf78;EFTUD2;BLOC1S2;EMG1;NKX1-1;POTEB3;ANKRD31;NUP155;GNAS;RHBDD3;LHX4;DNAJC2;C21orf2;LETM2;U2AF2;RNF19A;CBX1;FAIM;COPS3;"

redis_client = redis.Redis(host='localhost', port=6379, db=0)


@celery.task(name="calculateCorr",  serializer='json', task_track_started = True)
def calculateCorr(payload = Body(...), retType =0):
  def on_failure(self, *args, **kwargs):
        pass 
  geneList = payload["geneList"]
  targetList = payload["targetList"]
  dataType = payload["dataType"] # eg genes pert
  processtype = payload["processtype"] #eg Spearman Pearson
  if len(geneList)<2:        
      raise Exception("Upps. Gene list is empty.")
  
  corrResults = None
  #We need to have at least 10 genes to perform correlation based on a subset.
  if(len(targetList)<10):
       corrResults = getDataNew(geneList,geneList,payload["cell_line"], dataType, processtype)
  else:
      #We need to get the raw data and perform correlation
      subdata = getDataNew(geneList,targetList,payload["cell_line"], dataType)
      corrResults =subdata.corr(method=processtype)
       
  if corrResults is None or corrResults.shape[0]<1:
        raise Exception("Calculations didnt yield anything. What is going on? Are you sure about your genelist?") 
  
  if retType==0:
    return corrResults.to_json()
  else :
    return corrResults
     


@celery.task(name="calculateCorrCluster",  serializer='json', task_track_started = True)
def calculateCorrCluster(payload = Body(...)): 
    def on_failure(self, *args, **kwargs):
        pass
    data = calculateCorr(payload,1) 
    data = data.round(decimals=2)   
    return clusterData(data, payload)
    
def clusterData(data, payload):
  row_distance="euclidean" if "row_distance" not in payload else payload["row_distance"]
  row_linkage="single" if "row_linkage" not in payload else payload["row_linkage"]
  axis="both" if "axis" not in payload else payload["axis"]
  column_distance="euclidean" if "column_distance" not in payload else payload["column_distance"]
  column_linkage="ward" if "column_linkage" not in payload else payload["column_linkage"]
  normalize = True if "normalize" not in payload else payload["normalize"]=="True"
  write_original = True if "write_original" not in payload else payload["write_original"]=="True"
  dontCluster = False if "dontCluster" not in payload else payload["dontCluster"]=="True"
  #instantiate the Cluster object
  c = inchlib_clust.Cluster()

  # read csv data file with specified delimiter, also specify whether there is a header row, the type of the data (numeric/binary) and the string representation of missing/unknown values
  #c.read_csv(filename="/path/to/file.csv", delimiter=",", header=bool, missing_value=str/False, datatype="numeric/binary")
  rows = [[i for i in data.columns]] + [[i for i in row] for row in data.itertuples()]
  rows[0].insert(0, "x")
  c.read_data(rows, header=True, missing_value=False, datatype="numeric") #use read_data() for list of lists instead of a data file
  
  if normalize:
    # normalize data to (0,1) scale, but after clustering write the original data to the heatmap
    c.normalize_data(feature_range=(0,1), write_original=write_original)
 
  # cluster data according to the parameters
  if not dontCluster:
    c.cluster_data(row_distance=row_distance, row_linkage=row_linkage, axis=axis, column_distance=column_distance, column_linkage=column_linkage)

  # instantiate the Dendrogram class with the Cluster instance as an input
  d = inchlib_clust.Dendrogram(c)

  # create the cluster heatmap representation and define whether you want to compress the data by defining the maximum number of heatmap rows, the resulted value of compressed (merged) rows and whether you want to write the features
  d.create_cluster_heatmap(compress=0, compressed_value="median", write_data=True)

  # export the cluster heatmap on the standard output or to the file if filename specified
  return d.export_cluster_heatmap_as_json()

@celery.task(name="calcPCA",  serializer='json', task_track_started = True)
def calcPCA(self, payload = Body(...)):    
    geneList = None
    #PCA samples are rows. So if we are performing on perturbations we need to get transposed data 
    dataType = "pert" if "dataType" not in payload else payload["dataType"]
    cell_line="K562gwps" if "cell_line" not in payload else payload["cell_line"]
    numcomponents=85 if "numcomponents" not in payload else payload["numcomponents"]
    retType=2 if "retType" not in payload else payload["retType"]
    targetList= [] if "targetList" not in payload else payload["targetList"]     
    if "geneList" not in payload or  payload["geneList"] == "":
      geneList = genelistTemp.split(';') #Wil be fixed
    else:
      geneList = payload["geneList"]

    print("Running calcPCA with settings: dataType: {} \ncell_line: {} \n numcomponents: {} \nretType: {}"
          .format(dataType,cell_line,numcomponents, retType))

    if len(geneList)<2:
        raise Exception("Are you sure that you have entered genes or perturbations to the list?")       
        
    
    #PCA samples are rows. So if we are performing on perturbations we need to get transposed data
    PCASource = getDataNew(geneList, targetList, cell_line,dataType)   
    print("PCASource.shape")  
    print(PCASource.shape) 
  
    if numcomponents ==100:
         numcomponents = 99.99    
    
    start= time.time()
    try: 
        numcomponents = float(numcomponents)/100  
    
        pca = PCA(n_components=numcomponents) #random_state = 42 for stability        
        pca.fit_transform(PCASource)     
        print("estimated numcomponents" + str(pca.n_components_) )
        print("estimated explained_variance_" + str(pca.explained_variance_) )
        if pca.n_components_ <3:
            pca = PCA(n_components=3)
            pca.fit_transform(PCASource) 
            
        result = pd.DataFrame(pca.components_, columns=PCASource.columns).round(3)
        explained_variance_ = pd.DataFrame(pca.explained_variance_).round(3)
        explained_variance_ratio_ = pd.DataFrame(pca.explained_variance_ratio_).round(3)    

    except Exception as err:
        print(str(err))
        raise Exception(str(err))
        
    end= time.time()
    if retType == 1:
        return [result.transpose(), explained_variance_, explained_variance_ratio_, end-start]
    else:
        return result.to_json(orient="split")

@celery.task(bind = True, name="calcPCAGraph",  serializer='json', task_track_started = True)
def calcPCAGraph(self, payload = Body(...)):
   payload["retType"] = 1 
   try: 
    result, variance, variance_ratio, timeCost  = calcPCA(self, payload)
    payload["task_id"] = self.request.id
    graphData =  generateGraph(result, payload)
    graphData["ratio"] = variance_ratio[0].values.tolist()
    graphData["variance"] = variance[0].values.tolist()
    graphData["dataset"] = payload["cell_line"]
    graphData["taskID"] =self.request.id
    graphData["resultShape"] =  str(result.shape[0]) + " " + str(result.shape[1])
    graphData["taskName"] = "PCA (Variance treshold: " + str(payload["numcomponents"]) + ")"
    graphData['timeCost'] =  timeCost
    
   except Exception as ex:
        print(str(ex))
        self.update_state(state=states.FAILURE,
            meta={
                'exc_type': type(ex).__name__,
                'exc_message': str(ex),
                'custom': str(ex),
            })
        raise Ignore()   
   #redis_client.set("user:tableCache:" + self.request.id, parquet_data)
   #redis_client.expire("user:tableCache:" + self.request.id, 86400)

   return json.dumps(graphData)
#return generateGraph(result,"PCA graph", payload)  

#def handle_task_failure(task_id, exc):
    # Handle the task failure and save error information to Redis
#    error_msg = str(exc)
#    redis_client.hset(task_id, "status", "FAILURE")
#    redis_client.hset(task_id, "error_msg", error_msg)


#@celery.task(on_failure=lambda task_id, task_exc, traceback, **kwargs: handle_task_failure(task_id, task_exc))

@celery.task(name="calcMDE",  serializer='json', task_track_started = True)
def calcMDE(current_task, payload= Body(...)):
    cell_line=1 if "cell_line" not in payload else payload["cell_line"]
    numcomponents=3 if "numcomponents" not in payload else payload["numcomponents"]
    PreprocessingMethod = True if "PreprocessingMethod" not in payload else payload["PreprocessingMethod"] == "preserve_neighbors"
    constraint="Standardized" if "pyMdeConstraint" not in payload else payload["pyMdeConstraint"]
    retType=2 if "retType" not in payload else payload["retType"]    

    if "geneList" not in payload or  payload["geneList"] == "":
      geneList = genelistTemp.split(';') #Wil be fixed
    else:
      geneList = payload["geneList"]
    dataType = "pert" if "dataType" not in payload else payload["dataType"]
    targetList= [] if "targetList" not in payload else payload["targetList"]  
    
    
    if constraint == "Standardized":
        constraint = pymde.Standardized()
        repulsiveFraction=0.5 if "repulsiveFraction" not in payload else payload["repulsiveFraction"]    
    else:
        constraint = pymde.Centered()        
        repulsiveFraction=1 if "repulsiveFraction" not in payload else payload["repulsiveFraction"]  
    #pymde.seed(0) 
    
    print("Running calcMDE with settings: cell_line: {} \nnumcomponents: {} \n PreprocessingMethod: {} \nconstraint: {} \nretType: {} \ndataType: {}"
          .format(cell_line,numcomponents,PreprocessingMethod, constraint, retType, dataType))

    #cell_line 1- Raw Data 2-Correlation data 3-PCA Data
    #dataType 1- Perturbation 2- Gene Expression
    
    if len(geneList)<2:
        raise ValueError("Are you sure that you have entered genes or perturbations to the list?")       
        
    

    MdeEmbedSource = getDataNew(geneList, targetList, cell_line,dataType).T    
    print("MdeEmbedSource.shape")  
    print(MdeEmbedSource.shape) 
    
    curIndex = MdeEmbedSource.index.tolist()

    MdeEmbedSource = MdeEmbedSource.to_numpy()
    start= time.time()
    try:
       if PreprocessingMethod:
         if "pyMdeConstraint" not in payload:
           constraint=pymde.Standardized()
         mde =  pymde.preserve_neighbors(MdeEmbedSource,constraint=constraint,
       repulsive_fraction=repulsiveFraction,embedding_dim=numcomponents)
       else:
         if "pyMdeConstraint" not in payload:
           constraint=None        
         mde = pymde.preserve_distances(MdeEmbedSource,constraint=constraint,embedding_dim=numcomponents)
          
       result = mde.embed(snapshot_every= 5)    
       result2 =mde.solve_stats.snapshots             
    except Exception as ex:
        print(str(ex))
        raise Exception(str(ex))        
    
    end= time.time() 
    result = pd.DataFrame(result.numpy()) 
    for i in range(0, len(result2)-1):
        result = pd.concat([result, pd.DataFrame(result2[i].numpy())], ignore_index=True, axis=1)
    
    result["GeneSymbol"] = curIndex
   
    result.set_index("GeneSymbol", inplace=True)
    result = result.round(3)   
    if retType == 1:
        return result , end-start
    else:
        return result.to_json(orient="split")

@celery.task(name="calcUMAP",  serializer='json', task_track_started = True)
def calcUMAP(current_task,payload = Body(...)):

  cell_line=1 if "cell_line" not in payload else payload["cell_line"]
  numcomponents=3 if "numcomponents" not in payload else payload["numcomponents"]
  metric="euclidean" if "metric" not in payload else payload["metric"]
  n_neighbors=15 if "n_neighbors" not in payload else payload["n_neighbors"]
  min_dist=0.1 if "min_dist" not in payload else payload["min_dist"]
  retType=2 if "retType" not in payload else payload["retType"]    

  if "geneList" not in payload or  payload["geneList"] == "":
      geneList = genelistTemp.split(';') #Wil be fixed
  else:
      geneList = payload["geneList"]
  dataType = "pert" if "dataType" not in payload else payload["dataType"]
  targetList= [] if "targetList" not in payload else payload["targetList"]   
  
  if len(geneList)<2:
        raise ValueError("Are you sure that you have entered genes or perturbations to the list?")       
        

  UMAPSource = getDataNew(geneList, targetList, cell_line,dataType).T 
  print("UMAPSource.shape 1")  
  print(UMAPSource.shape)    
  
  
 
  try:
    curIndex = UMAPSource.index.tolist()
    UMAPSource = UMAPSource.to_numpy()
    start = time.time()
    #random_state=42,    this will be added to establish reproduciblity
    reducer = umap.UMAP( n_neighbors=n_neighbors, n_components=numcomponents,min_dist=min_dist, metric=metric)
    result = reducer.fit_transform(UMAPSource)
    end = time.time()
    
    result = pd.DataFrame(result)    
    result = result.round(3)
    result["GeneSymbol"] = curIndex   
    result.set_index("GeneSymbol", inplace=True)  
  except Exception as ex:
      print(str(ex))
      raise Exception(str(ex))      

  
  if retType == 1:
      return result,(end-start)
  else:
      return result.to_json(orient="split")


@celery.task(name="calctSNE",  serializer='json', task_track_started = True)
def calctSNE(current_task,payload = Body(...)):

  cell_line=1 if "cell_line" not in payload else payload["cell_line"]
  numcomponents=2 if "numcomponents" not in payload else payload["numcomponents"]
  metric="euclidean" if "metric" not in payload else payload["metric"]
  learning_rate= "auto" if "learning_rate" not in payload else payload["learning_rate"]
  perplexity= 30.0 if "perplexity" not in payload else payload["perplexity"]
  early_exaggeration =12.0 if "early_exaggeration" not in payload else payload["early_exaggeration"]
  n_iter =1000 if "n_iter" not in payload else payload["n_iter"]
  retType=2 if "retType" not in payload else payload["retType"]

  if "geneList" not in payload or  payload["geneList"] == "":
      geneList = genelistTemp.split(';') #Wil be fixed
  else:
      geneList = payload["geneList"]
  dataType = "pert" if "dataType" not in payload else payload["dataType"]
  targetList= [] if "targetList" not in payload else payload["targetList"]
  
  if len(geneList)<2:
        raise ValueError("Are you sure that you have entered genes or perturbations to the list?")       

  tSNESource = getDataNew(geneList, targetList, cell_line,dataType).T 

  try:    
    curIndex = tSNESource.index.tolist()
    tSNESource = tSNESource.to_numpy()
    #if gpu_avail :
    #      try :
    #          tsne_vects_out = TSNECuda(n_components=2, early_exaggeration=early_exaggeration, perplexity=perp, learning_rate=learning_rate).fit_transform(npall)
    #          return tsne_vects_out
    #      except Exception as e:
    #          print('Error using GPU, defaulting to CPU TSNE implemenation. Error message:\n\n' + str(e))
    method = "exact" if numcomponents>3  else "barnes_hut"
    
    start = time.time()   
    #random_state = 42 
    tsne = TSNE(n_components=numcomponents,method =method, n_iter=n_iter, metric= metric, perplexity=perplexity, early_exaggeration=early_exaggeration, learning_rate=learning_rate, n_jobs=-1)
    #print(tSNESource.shape)
    #print(tSNESource)
    result = tsne.fit_transform(tSNESource)
    end = time.time()
    result = pd.DataFrame(result)
    #print(result)    
    result = result.round(3)
    result["GeneSymbol"] = curIndex   
    result.set_index("GeneSymbol", inplace=True)  
  except Exception as ex:
      print(str(ex))
      raise Exception(str(ex))   
    
  if retType == 1:
    return result,end-start
  else:
    return result.to_json(orient="split")
 


@celery.task(name="findPath",  serializer='json', task_track_started = True)
def findPath(payload = Body(...)): 

    downgeneList = payload["downgeneList"]    
    cutoff=0.2 if "cutoff" not in payload else payload["cutoff"]
    depth=2 if "depth" not in payload else payload["depth"]
    checkCorr=True if "checkCorr" not in payload else payload["checkCorr"] == "True"
    corrCutOff= 0.1 if "corrCutOff" not in payload else payload["corrCutOff"] 
    BioGridData= True if "BioGridData" not in payload else payload["BioGridData"] == "True"
    upgeneList= [] if "upgeneList" not in payload else payload["upgeneList"]
    nodeData = {}
    edgeData = {}  
    currentMap = {}

    for i in range (0, depth):
        print("Run " + str(i))
        #If initial run set the inital settings.
        if i==0:
            downreg = downgeneList
            upreg = upgeneList
            unionList = list(set(downreg) | set(upreg))            
            upregSet = set(upreg)
            downregSet = set(downreg)        
            
            if len(downreg)<2:        
                 raise Exception("Upps. Down regulated genes list is empty.")
        
        #Find perturbations (columns) in the down regulated gene list  
        result = getDataNew(downreg)
    
        #if there is no other level we need to filter to union list with downregulated genes
        if depth-i == 1:            
            #Filter genes that are included in upregulated or down regulated genes list
            result = result.filter(items = unionList, axis=0)   
            if result.shape[0]<1 and depth-i ==1:
                 raise Exception("Unfortunately, no pathways found!")
        
        
        #Calculate the Max and Min Expression levels.
        result.loc['MaxExp'] = result.max()
        result.loc['MinExp'] = result.min()
        
        #Transpose the file and filter rows based on max or min expression
        result = result.transpose()    
        result = result[(result['MaxExp'] >cutoff ) | (result['MinExp'] <cutoff)] #sort_values(by=[gene])
    
        #Now in rows we have perturbations, in columns we have their effects
        if result.shape[0]<1 and depth-i ==1 :
            raise Exception("Unfortunately, no pathways found!")

        colNames = result.columns.tolist()
        print("Level" + str(i) + " Target count " + str(len(downreg)))
        downreg = []
        #Generate the network from the remaining list
        for c in range(0, result.shape[1]): #rows
            for r in range(0, result.shape[0]): #rows                
                if (result.iloc[r,c] > cutoff and colNames[c] in upregSet) or (result.iloc[r,c] < -1 * cutoff and colNames[c] in downregSet):                    
                    # we found a target that is upregulated or downregulated we need to resolve the upstream
                    edgeData = addEdge(currentMap,edgeData, result.index[r], colNames[c], result.iloc[r,c], nodeData, upregSet, downregSet)
                elif result.iloc[r,c] < cutoff*-1 and depth-i > 1:
                    #We can only investigate the ones that are downregulated
                    downreg.append(colNames[c])
                    #We need to track what downregulates this gene
                    if  colNames[c] not in currentMap:
                        currentMap[colNames[c]] = []
                    currentMap[colNames[c]].append((result.index[r],result.iloc[r,c]))
        i=i+1
    print("Finalizing")
    
    nodeList = list(nodeData.keys())

    if checkCorr:
      # For each existing edge we need to check whether there is correlation between pertuirbations.
      # If there is we will        
     
      corrMap = getDataNew(nodeList,processtype="pearson")
      corrMap = corrMap.filter(items = nodeList, axis =0)
      
      #For every existing edge we will check whther a correlation also exists
      edges = list(edgeData.keys())
      for edge in edges:
          edgex = edge.split("+")        
          if edgex[0] == edgex[1]:
              continue
          # Maybe we should eliminate the ones where one node is upregulated while the other one is down
          try:        
              data = corrMap.loc[edgex[0],edgex[1]]
              if  abs(data) < corrCutOff:
                  continue       
              edgeData[edgex[0] + "+cor+" + edgex[1]] = "{\"id\":\"" + edgex[0] + "+cor+" + edgex[1] + "\",\"source\":\"" + edgex[0] + "\",\"target\":\"" + edgex[1] + "\",\"value\":" + str(data) + "}"
          except:
              continue
    
    if BioGridData:
      #Get bio grid interactions:
      datax = getBioGRIDInteractors(nodeList,True)    
      if datax is not None:    
          for row in range(0, len(datax.index)):
              gene1 = datax.iloc[row,3].upper()
              gene2 = datax.iloc[row,4].upper()       
              if gene1 not in nodeList or gene2 not in nodeList:
                  continue
              info = datax.iloc[row,5] + datax.iloc[row,6] + datax.iloc[row,7] + datax.iloc[row,8] + datax.iloc[row,9]
              edgeData[gene1 + "+int+" + gene2] = "{\"id\":\"" + gene1 + "+int+" + gene2 + "\",\"source\":\"" + gene1 + "\",\"target\":\"" + gene2 + "\",\"info\":" + info + "}"

    #Calculate the number of neighbours for each node.
    
    #Calculate the number of connected components for each node
    
    
    #jsonFile = "{\"container\": \"document.getElementById('cy')\", \"elements\": {\"nodes\": [" + ','.join(list(nodeData.values()))
    jsonFile = "{\"nodes\": [" + ','.join(list(nodeData.values()))

    
    jsonFile = jsonFile.strip(',')
    jsonFile = jsonFile + "],\"edges\": [" + ','.join(list(edgeData.values()))
    #jsonFile = jsonFile.strip(',') + "]}, \"layout\": {\"name\": \"grid\",\"rows\": 3}, \"style\": [{\"selector\": \"node\",\"style\": {\"label\": \"data(id)\"}}]}"
    jsonFile = jsonFile.strip(',') + "]}"

    return jsonFile

def generateGraph(result,payload = Body(...)):
    
    print(os.getcwd())    
    print(payload["task_id"]) 
     # Save the DataFrame to the temp location
    file_path = os.getcwd() +  '/temp/' + str(payload["task_id"])  + '.pq' 
    
    #result.columns = result.columns.astype(str)
    result.transpose().to_parquet(file_path)   
    # Get the current time and add 24 hours  
    expiration_time = datetime.utcnow() + timedelta(days=1)
    # Schedule the file for deletion after 24 hours
    delete_files.apply_async(args=[[file_path]], eta=expiration_time)
    output ={}
        
    if result.shape[1]==2:       
        output["PC1"] = result.iloc[:,0].values.tolist()
        output["PC2"] = result.iloc[:,1].values.tolist()
        output["PC3"] = ""
    elif result.shape[1]>2:       
        output["PC1"] = result.iloc[:,0].values.tolist()
        output["PC2"] = result.iloc[:,1].values.tolist()
        output["PC3"] = result.iloc[:,2].values.tolist()
    
    output["GeneSymbols"] = result.index.tolist()   
     
    clusterer, interp_x, interp_y =  HDBScanClustering(result,payload)
       
    if clusterer is not None:
        output["clusterProb"] = clusterer.probabilities_.tolist()
        output["clusterLabels"] = clusterer.labels_.tolist()    
        output["clusterCount"] = (clusterer.labels_.max()+1).tolist()   
        
        for i in range(0,len(interp_x)):           
            output["x" + str(i)] = interp_x[i] 
            output["y" + str(i)] = interp_y[i]  
     
    else:
        output["clusterCount"] = 0  
    return  output

@celery.task(bind = True, name="calcMDEGraph", serializer='json', task_track_started = True)
def calcMDEGraph(self, payload = Body(...)):    
    payload["retType"] = 1    
    
    try: 
        result, timeCost  = calcMDE(self, payload)        
        payload["task_id"] = self.request.id
        graphData = generateGraph(result, payload)
        graphData["dataset"] = payload["cell_line"]
        graphData["timeCost"] = timeCost
        graphData["taskID"] =self.request.id
        graphData["resultShape"] =  str(result.shape[0]) + " " + str(result.shape[1])
        graphData["taskName"] = "MDE: " + str(payload["numcomponents"]) 
    except Exception as ex:
        self.update_state(state=states.FAILURE,
            meta={
                'exc_type': type(ex).__name__,
                'exc_message': str(ex),
                'custom': str(ex),
            })
        raise Ignore() 
   
    return json.dumps(graphData) 

@celery.task(bind= True, name="calcUMAPGraph",  serializer='json', task_track_started = True)
def calcUMAPGraph(self, payload = Body(...)):
    payload["retType"] = 1    
    try:
        print("Starting UMAP calculation") 
        result, timeCost = calcUMAP(self, payload)
        print("Finished UMAP calculation")        
        payload["task_id"] = self.request.id
        graphData = generateGraph(result, payload)
        graphData["dataset"] = payload["cell_line"]
        graphData["taskID"] =self.request.id
        graphData["timeCost"] =str(timeCost)
        graphData["resultShape"] =  str(result.shape[0]) + " " + str(result.shape[1])
        graphData["taskName"] = "UMAP: " + str(payload["numcomponents"]) 
    except Exception as ex:
        print(str(ex))
        self.update_state(state=states.FAILURE,
            meta={
                'exc_type': type(ex).__name__,
                'exc_message': str(ex),
                'custom': str(ex),
            })
        raise Ignore() 
   
    return json.dumps(graphData) 

@celery.task(bind = True, name="calctSNEGraph",  serializer='json', task_track_started = True)
def calctSNEGraph(self, payload = Body(...)):
    payload["retType"] = 1
    try: 
        result, timeCost  = calctSNE(self, payload)        
        payload["task_id"] = self.request.id
        graphData = generateGraph(result, payload)
        graphData["dataset"] = payload["cell_line"]
        graphData["taskID"] =self.request.id
        graphData["resultShape"] = str(result.shape[0]) + " " + str(result.shape[1])
        graphData["taskName"] = "tSNE: " + str(payload["numcomponents"]) 
        graphData["timeCost"] = timeCost
        
    except Exception as ex:
        print(str(ex))
        self.update_state(state=states.FAILURE,
            meta={
                'exc_type': type(ex).__name__,
                'exc_message': str(ex),
                'custom': str(ex),
            })
        raise Ignore() 
   
    return json.dumps(graphData) 

def getUpstream(genes, payload ):
    dataType = "0" #if "dataType" not in payload else str(payload["dataType"]) 
    cell_line="K562gwps" if "cell_line" not in payload else str(payload["cell_line"])
   
    #TODO we need to add cell_line here if we will support multiple cell lines
    # Get results as perturbation X gene expression matrix
    # We give a gene list and find what regulates it
    try:
        result = getDataNew(genes,datasetType="genes",cell_line=cell_line)
    except:
        result = None
    
    return result
   

def getDownstream(genes, payload ):   
    cell_line="K562gwps" if "cell_line" not in payload else str(payload["cell_line"])    
 
    #TODO we need to add cell_line here if we will support multiple cell lines
    # Get results as gene expression X Perturbation matrix
    # We give a genelist and find what happens to doen stream if we knockdown these genes    
    try:
        result = getDataNew(genes,datasetType="pert",cell_line=cell_line)
    except:
        result = None    
    return result

def getCorrelatingPerturbations(perturbations, payload, rowstoget = []):  
     
    cell_line="K562gwps" if "cell_line" not in payload else str(payload["cell_line"])
    if perturbations == None or len(perturbations)<1 or rowstoget == None or len(rowstoget)<1:
        return None
    
    try:
        result = getDataNew(perturbations,rowstoget, datasetType="pert",cell_line=cell_line,processtype="pearson")
    except:
        result = None    
    return result
  

 

            

def addLink(df, fromList, message,  edges, filter):
    if df is not None:                    
        edges.extend([
        {
            "From": row, 
            "To": col,
            "id": f"{row}+exp+{col}",
            "value": df.at[row, col],
            "Type": message,
            "Type2": "Exp"
        }
        for row in fromList        
        for col in df.columns.values        
        if (row in df.index) and ((filter < 0 and df.at[row, col] < filter) or (filter > 0 and df.at[row, col] > filter))
        ])
          


def addCorrelation( list1,list2,message, filter_value, edges, payload):
    if list1 is not None and list2 is not None:
        smallerList = list(list1.index) if len(list1.index)< len(list2.index) else list(list2.index)
        largerList = list(list2.index) if len(list1.index)<= len(list2.index) else list(list1.index)  
        df= getCorrelatingPerturbations(smallerList, payload, largerList)
        if df is not None:
            for pert2, row in df.iterrows():
                for pert1, value in row.items():
                    if pert1 == pert2: continue
                    if (filter_value > 0 and value > filter_value) or (filter_value < 0 and value < filter_value):
                        
                        edges.append({
                            "From": pert2,
                            "To": pert1,
                            "id": f"{pert2}+cor+{pert1}",
                            "value": value,
                            "Type": message,
                            "Type2": "Corr"
                        })
        #print(f"edges after {message} Corr" + str(len(edges)))

@celery.task(name="expandGene", bind = True, serializer='json', task_track_started = True)
def expandGene(self,payload):
   
    #'dataType': 1, 'cell_line': 1, 'gene': 'SLC39A10', 'absoluteZScore': 0.3,
    #{'dataType': 1, 'cell_line': 1, 'gene': 'SLC39A10', 'absoluteZScore': 0.3}
    info = "Started"
    self.update_state(state='PROGRESS', meta={'current': 1, 'message': info})
    
    

    try:
        gene = "SLC39A10" if "gene" not in payload else payload["gene"] 
        filter = 0.25 #if "filter" not in payload else payload["filter"] 
        corrFilter = 0.25 #if "corrFilter" not in payload else payload["corrFilter"] 
        dataType = "1" if "dataType" not in payload else str(payload["dataType"])
        cell_line= "1" if "cell_line" not in payload else str(payload["cell_line"])
        
        #print("Checking gene " + gene )
        if os.path.exists("precalc/" + gene + ".json.gz"):
            with gzip.open("precalc/" + gene + ".json.gz", "rb") as file:              
                # Send the uncompressed JSON data as the response
                return file.read().decode("utf-8").replace("Infinity", "\"3\"")
        
        edges = []
        #Get upstream regulators.
        
        U = getUpstream( [gene],payload)  
        UASet = set()
        UISet = set()
        UI = None
        UA = None      
        if U is not None:
            #print("U.shape " +str( U.shape[0]) + " " + str(U.shape[1]) )
            UI = U[U[gene] > filter] 
            UA = U[U[gene] < filter*-1]
            #print("UI.shape " + str(UI.shape[0]) + " " + str(UI.shape[1]) )
            #print("UA.shape " + str(UA.shape[0]) + " " + str(UA.shape[1]) )
            
            for pertX in UI.index:
                edges.append({"From":pertX, "To":gene,"id": pertX+"+exp+" +gene, "value":UI.at[pertX,gene], "Type": "UNR", "Type2": "Exp"  })
            for pertX in UA.index:
                edges.append({"From":pertX, "To":gene,"id": pertX+"+exp+" +gene, "value":UA.at[pertX,gene], "Type": "UPR", "Type2": "Exp"  }) 
            # print("edges " + ' '.join(map(str, edges))  )
            print("edges " + str(len(edges)) )
            UASet.update(UA.index.to_list())
            UISet.update(UI.index.to_list()) 
            UASet.discard(gene) # We need to remove the gene itself from the list
            UASet.discard(gene + "_2") # We need to remove the gene itself from the list 
            info = info + "\n" + str(len(UASet)) + " upstream positive regulators and " + str(len(UISet)) + " upstream negative regulators found!"
        else:                
            info = info + "No upstream regulators found!"  
            
        self.update_state(state='PROGRESS', meta={'current': 5, 'message': info})    
        #Get downstream. We may have multiple sgRNAs per gene. We need to think what to do about it
        D = getDownstream( [gene],payload)   
        DI = None
        DA = None             
        DASet = set()
        DISet = set()
        if D is not None:
            #print("D.shape " + str(D.shape[0]) + " " + str(D.shape[1]) )
            DI = D[D[gene] > filter]            
            DA = D[D[gene] < filter*-1]
            print("DI.shape " + str(DI.shape[0]) + " " + str(DI.shape[1]) )
            print("DA.shape " +str( DA.shape[0]) + " " + str( DA.shape[1]) )
            #Link downstream
            for geneX in DI.index:
                edges.append({"From":gene, "To":geneX, "id": gene+"+exp+" +geneX,"value":DI.at[geneX,gene], "Type": "DNR" , "Type2": "Exp"  })
            print("edges after adding DI " + str(len(edges)) )
            for geneX in DA.index:
                edges.append({"From":gene, "To":geneX,"id": gene+"+exp+" +geneX, "value":DA.at[geneX,gene], "Type": "DPR" , "Type2": "Exp" })   
            print("edges after adding DA " + str(len(edges)) )
            DASet.update(DA.index.to_list())
            DISet.update(DI.index.to_list())
            DASet.discard(gene) # We need to remove the gene itself from the list
            DASet.discard(gene + "_2") # We need to remove the gene itself from the list 
            info = info + "\n" + str(len(DASet)) + " downstream positively regulated genes and " + str(len(DISet)) + " downstream negatively regulated genes found!"
        else:                
            info = info + "No sgRNAs available for this gene. So downstream genes can not be examined!"  
        
        info =  info + "\nCurrent number of edges" +   str(len(edges))
        self.update_state(state='PROGRESS', meta={'current': 10, 'message': info})    
        
            
        #Check whether genes in DA is regulated by any gene in UA
        #Best way would be checking upstream of DA and assess whther any UA is there
        #print("Check point 3")
        if len(DASet)>0:
            UDA = getUpstream(list(DASet),payload)
            addLink(UDA,UASet,"UPR_DPR",edges,filter*-1)
            info =  info + "\nEdges after adding UPR to DPR" +   str(len(edges))             
            print("edges after adding UA to DA " + str(len(edges)))
            addLink(UDA,UISet,"UNR_DPR",edges,filter)
            info =  info + "\nEdges after adding UNR to DPR" +   str(len(edges))  
            print("edges after adding UI to DA " + str(len(edges)))          
            addLink(UDA,DASet,"DPR_DPR",edges,filter*-1) #
            info =  info + "\nEdges after adding DPR to DPR" +   str(len(edges))  
            print("edges after adding DPR_DPR " + str(len(edges)))
            addLink(UDA,DISet,"DNR_DPR",edges,filter) #
            info =  info + "\nEdges after adding DNR to DPR" +   str(len(edges))  
            print("edges after adding DNR_DPR " + str(len(edges)))              
        
        self.update_state(state='PROGRESS', meta={'current': 20, 'message': info}) 
          
        print("Check point 4")
        if len(DISet)>0:    
            UDI = getUpstream(list(DISet),payload) #DI set is a genelist
            addLink(UDI,UISet,"UNR_DNR",edges,filter*-1)
            print("edges after adding UI to DI " + str(len(edges)))
            addLink(UDI,UASet,"UPR_DNR",edges,filter)
            print("edges after adding UA to DI " + str(len(edges)))
            addLink(UDI,DISet,"DNR_DNR",edges,filter*-1) #
            print("edges after adding DNR_DNR " + str(len(edges)))
            addLink(UDI,DASet,"DPR_DNR",edges,filter) #
            print("edges after adding DPR_DNR " + str(len(edges)))     
        
        if len(UASet)>0:
            UUA = getUpstream(list(UASet),payload)
            addLink(UUA,UASet,"UPR_UPR",edges,filter*-1) #
            print("edges after adding UPR_UPR " + str(len(edges)))
            addLink(UUA,UISet,"UNR_UPR",edges,filter) #
            print("edges after adding UNR_UPR " + str(len(edges)))
            
        if len(UISet)>0:
            UUI = getUpstream(list(UISet),payload)
            addLink(UUI,UISet,"UNR_UNR",edges,filter*-1) #
            print("edges after adding UNR_UNR " + str(len(edges)))
            addLink(UUI,UASet,"UPR_UNR",edges,filter) #
            print("edges after adding UPR_UNR " + str(len(edges)))
                                                    
        #Get Correlating Perturbations
        directCorrPert= getCorrelatingPerturbations([gene], payload)
        print("Check point 5")
        if directCorrPert is not None:
            posCorr = directCorrPert[directCorrPert[gene] > corrFilter] 
            negCorr = directCorrPert[directCorrPert[gene] < corrFilter*-1]
            for pertX in posCorr.index:
                edges.append({"From":gene, "To":pertX, "id": pertX+"+cor+" +gene, "value":posCorr.at[pertX,gene], "Type": "DPC" , "Type2": "Corr"  }) #Direct Positive Correlation
            print("edges after DPC Corr " + str(len(edges)) )
            for pertX in negCorr.index:
                edges.append({"From":gene, "To":pertX, "id": pertX+"+cor+" +gene, "value":negCorr.at[pertX,gene], "Type": "DNC" , "Type2": "Corr" })   
            print("edges after DNC Corr " + str(len(edges)) )
        
        
        addCorrelation(UI,DI,"UNR_DNR",filter,edges,payload)        
        addCorrelation(UI,DA,"UNR_DPR",filter*-1,edges,payload)        
        addCorrelation(UA,DA,"UPR_DPR",filter,edges,payload)
        addCorrelation(UA,DI,"UPR_DNR",filter*-1,edges,payload)
        addCorrelation(UA,UA,"UPR_UPR",filter,edges,payload)
        addCorrelation(UI,UI,"UNR_UNR",filter,edges,payload)
        addCorrelation(DA,DA,"DPR_DPR",filter,edges,payload)
        addCorrelation(DI,DI,"DNR_DNR",filter,edges,payload)
        addCorrelation(UA,UI,"UPR_UNR",filter*-1,edges,payload)
        addCorrelation(DA,DI,"DPR_DNR",filter*-1,edges,payload)
      
     

        nodeMap = {}
        #Generate nodes
        for edge in edges:
            if edge["From"] not in nodeMap:
                nodeMap[edge["From"]] = {"id":edge["From"]}           
                 
            if edge["To"] not in nodeMap:
                nodeMap[edge["To"]] = {"id":edge["To"]}                        
    
        
        #We would like to get knockdown efficiency for the nodes
        downstream = getDownstream(nodeMap.keys(), payload)
        print("Almost complete 1")
        if downstream is not None:
            indexSet = set(downstream.index.tolist())
            colSet = set(downstream.columns.values)  
          
            for node in nodeMap.keys():
                if(node in indexSet and node in colSet):
                    nodeMap[node]["kd"] = downstream.at[node,node]
                
                if(node in indexSet and node+ "_2" in colSet):
                    nodeMap[node]["kd2"] = downstream.at[node, node+ "_2"]
                
                if node == gene:
                    continue;    
                elif(node in UASet or node+ "_2" in UASet):
                    nodeMap[node]["category"]  = 0
                elif(node in UISet or node+ "_2" in UISet):
                    nodeMap[node]["category"]  = 1
                elif(node in DASet or node+ "_2" in DASet):
                    nodeMap[node]["category"]  = 2  
                elif(node in DISet or node+ "_2" in DISet):
                    nodeMap[node]["category"]  = 3
                          
        
        print("Almost complete")
        
        return json.dumps({"nodes": list(nodeMap.values()), "edges": edges })
    except Exception as ex:
        print(str(ex))
        self.update_state(state=states.FAILURE,
            meta={
                'exc_type': type(ex).__name__,
                'exc_message': str(ex),
                'custom': str(ex),
            })
        raise Ignore()       

@celery.task(name="heatMap",  serializer='json', task_track_started = True)
def heatMap(payload = Body(...)):
    if "geneList" not in payload or  payload["geneList"] == "":
      geneList = genelistTemp.split(';') #Wil be fixed
    else:
      geneList = payload["geneList"]

    cell_line="K562gwps" if "cell_line" not in payload else payload["cell_line"]    
    targetList= geneList if "targetList" not in payload else payload["targetList"]  
    
    if len(targetList) <2:
        targetList=geneList

    if len(geneList)<1 or len(geneList)<1:
         raise Exception("Please enter genes to target list") 
       
    results = getDataNew(targetList, geneList, cell_line,datasetType = "genes")     
    return clusterData(results, payload)

@celery.task(name="calcGeneSignature", bind = True, serializer='json', task_track_started = True)
def calcGeneSignature(self, payload = Body(...)):
    cp1 = time.time()
    print("Check 1 " + str(cp1) )
    formula = "MT1G+MT1X+SLC39A10" if "formula" not in payload else payload["formula"]
    
    formula = "DUMMY+" + formula.replace(" ", "")
    
    substractList = []
    additionList = []
    print("formula")
    print(formula)
    formula = formula.split("-")    
    for i in range(1, len(formula)):
        if len(formula[i])>0:
            genes =formula[i].split("+")
            substractList.append(genes[0])
            for j in range(1, len(genes)):
                additionList.append(genes[j])
    
    genes =formula[0].split("+")
    for j in range(1, len(genes)):
        additionList.append(genes[j])        
                
    # create a list of column names from the formula string
    #columns = formula.replace(" ", "").split("+")
    #columns = [col.split("-") for col in columns]
    #columns = [col for sublist in columns for col in sublist]
    #columns = list(set(columns))
    
    
    
    cp2 = time.time()
    print("Check 2 " + str(cp2-cp1) )
    print("substractList")
    print(substractList)
    print("additionList")
    print(additionList)
   
    df = getDataNew((substractList + additionList),datasetType = "genes") 
    cp3 = time.time()
    #print("Check 3 " + str(cp3-cp2) )
   
    if not isinstance(df, pd.DataFrame):
        self.update_state(state=states.FAILURE,
            meta={
                'exc_type': "",
                'exc_message': "None of the entered genes were detected in the Perturb-Seq data",
                'custom': "None of the entered genes were detected in the Perturb-Seq data",
            })
        raise Ignore() 
   
    # filter out non-existing genes
    #valid_cols = df.columns.to_list()
    invalid_cols = set(substractList + additionList) - set(df.columns)
    cp4 = time.time()
    print("Check 4 " + str(cp4-cp3) )
    #for col in invalid_cols:
    #        formula = formula.replace(col, str(0))
    cp5 = time.time()
    print("Check 5 " + str(cp5-cp4) )        
    if invalid_cols:
        print(f"Columns {invalid_cols} not found in DataFrame. Ignored in formula.")
    
    # evaluate the formula for each row of the DataFrame
    
    #for index, row in df.iterrows():  
    #    row_formula = formula     
    #    for col in df.columns:
    #        row_formula = row_formula.replace(col, str(row[col]))
    #    result = pd.eval(row_formula)
    #    results.append(result)
    
    # add a column with zeros
    df = df.assign(RESULTS=np.zeros(len(df)))
    count =0
    for j in range(0, len(additionList)):
        if additionList[j] not in  invalid_cols:
            df["RESULTS"] =  df["RESULTS"] +  df[additionList[j]]
            count = count+1
        
    for j in range(0, len(substractList)):
        if substractList[j] not in  invalid_cols:
            df["RESULTS"] =  df["RESULTS"] -  df[substractList[j]]
            count = count+1
    print("count " + str(count))
    
    
    if count>0:
        df["RESULTS"] = df["RESULTS"]/count
    
    #We need to fix the genes included in the gene signature. We will remove the effect of the gene from itself. 
    #But if one gene only we can ignore it.
    if (len(additionList) + len(substractList)) != 1:
        for j in range(0, len(substractList)):
            if substractList[j] in df.index and substractList[j] not in  invalid_cols:
                df.at[substractList[j], "RESULTS"] = df.at[substractList[j], "RESULTS"] + df.at[substractList[j], substractList[j]]/count
            if substractList[j]+"_2" in df.index and substractList[j] not in  invalid_cols:
                df.at[substractList[j]+"_2", "RESULTS"] = df.at[substractList[j]+"_2", "RESULTS"] + df.at[substractList[j], substractList[j]]/count
        
        for j in range(0, len(additionList)):
            if additionList[j] in df.index and additionList[j] not in  invalid_cols:
                df.at[additionList[j], "RESULTS"] = df.at[additionList[j], "RESULTS"] - df.at[additionList[j], additionList[j]]/count
            if additionList[j]+"_2" in df.index and additionList[j] not in  invalid_cols:
                df.at[additionList[j]+"_2", "RESULTS"] = df.at[additionList[j]+"_2", "RESULTS"] - df.at[additionList[j], additionList[j]]/count

    
    #Round values
    df['RESULTS'] = df['RESULTS'].round(3)
    cp6 = time.time()
    print("Check 6 " + str(cp6-cp5) ) 
    results = df['RESULTS'].values
    # calculate the mean and standard deviation of the data
    mean = np.mean(results)
    std = np.std(results)

    # define a normal distribution using the mean and standard deviation
    dist = norm(mean, std)

    # calculate the probability density at each data point
    x = np.linspace(np.min(results), np.max(results), 100)
    y = dist.pdf(x)
    x = np.round(x, 2)
    y = np.round(y, 2)

    cp7 = time.time()
    print("Check 7 " + str(cp7-cp6) ) 
    finalresults ={}  
    finalresults["x"]  = x.tolist()
    finalresults["y"]  = y.tolist()
    finalresults["genes"]  = df.index.tolist()
    b = pd.Series(results, index=df.index).to_list() # nested lists with same data, indices
    # b = json.dump(b, separators=(',', ':'), sort_keys=True, indent=4)
    finalresults["results"]  = b
    # return the results as a Series with the same index as the original DataFrame
    return  json.dumps(finalresults)

##############################################
#########   --- HELPER FUNCTIONS ---  ########
##############################################
def HDBScanClustering(data, payload = Body(...)):     
    
    min_cluster_size=5 if "min_cluster_size" not in payload else payload["min_cluster_size"]
    min_samples = None if "minimumSamples" not in payload else payload["minimumSamples"]
    metric="euclidean" if "clusteringMetric" not in payload else payload["clusteringMetric"]
    cluster_selection_epsilon= 0.0 if "clusterSelectionEpsilon" not in payload else payload["clusterSelectionEpsilon"]
    cluster_selection_method="eom" if "clusteringMethod" not in payload else payload["clusteringMethod"].lower()

    if min_samples==0:
        min_samples = None
    print("Running HDB Scan with settings: min_cluster_size: {} \nmin_samples: {} \nmetric: {} \n cluster_selection_epsilon: {} \ncluster_selection_method: {}".format(min_cluster_size,min_samples,metric, cluster_selection_epsilon,cluster_selection_method))
    clusterer = hdbscan.HDBSCAN(min_cluster_size=min_cluster_size,metric=metric ,
                cluster_selection_method =cluster_selection_method, 
                min_samples=min_samples, cluster_selection_epsilon=cluster_selection_epsilon).fit(data) 
     
    clabels = clusterer.labels_.view().reshape(clusterer.labels_.shape[0], -1)    
    
    i=0    
    interp_x =[]
    interp_y =[]
    while i < clusterer.labels_.max()+1: #cluster count       
        count =0
        points = []
        for row in range(0,len(clabels)):            
            if int(clabels[row]) ==  i:                    
                points.append([float(data.iloc[row,0]),float(data.iloc[row,1])])
                count+=1               
        points = np.array(points, np.float16)       
        
           
        if count>0:               
            try:
                hull = ConvexHull(points)
                # get x and y coordinates
                # repeat last point to close the polygon
                x_hull = np.append(points[hull.vertices,0],points[hull.vertices,0][0])
                y_hull = np.append(points[hull.vertices,1],points[hull.vertices,1][0])
                # interpolate
                dist = np.sqrt((x_hull[:-1] - x_hull[1:])**2 + (y_hull[:-1] - y_hull[1:])**2)
                dist_along = np.concatenate(([0], dist.cumsum()))
                spline, u = interpolate.splprep([x_hull, y_hull],u=dist_along, s=0, per=1)
                interp_d = np.linspace(dist_along[0], dist_along[-1], 50)
                interpx, interpy = interpolate.splev(interp_d, spline)
                interp_x.append(interpx.tolist()) 
                interp_y.append(interpy.tolist()) 
            except:
                interp_x.append([]) 
                interp_y.append([])                    
        i+=1   

    return clusterer, interp_x, interp_y

def addEdge(currentMap:dict,edgeData, node1, node2, data, nodeData, upSet, downSet):
    #If node1 not in the map it should be at the first level so we need to add directly.
    if(node1 not in nodeData):
        addNode(node1,nodeData,upSet, downSet)
    
    if(node2 not in nodeData):
        addNode(node2,nodeData,upSet, downSet)
    
    #If knockdown itself add info to the node
    if node1 == node2:
       if "\"kd\"" not in nodeData[node1]:
          nodeData[node1] = nodeData[node1].replace("}", ",\"kd\":" + str(data)   + "}")      
    elif node1 + "+" + node2 not in edgeData:    
        edgeData[node1 + "+" + node2] = "{\"id\":\"" + node1 + "+" + node2 + "\",\"source\":\"" + node1 + "\",\"target\":\"" + node2 + "\",\"value\":" + str(data) + "}"

    #({'id': node1 + "_" + node2 , 'source': node1, 'target': node2, 'value:': data})
    #print("Adding edge: " + node1 + "_" + node2)    
    if node1 in currentMap:
        for sgRNAx in currentMap[node1]:
            if sgRNAx[0] + "+" + node1 not in edgeData:   
                addEdge(currentMap, edgeData,sgRNAx[0],node1,sgRNAx[1], nodeData, upSet, downSet)
    return edgeData

def addNode(node,nodeData,upSet, downSet):    
    if node not in nodeData:
        #print("Adding node: " + node)  
        if node in downSet:
            nodeData[node] =  "{\"id\":\"" + node + "\",\"direction\":\"down\"}" #{'id': node, 'direction': 'down'}
        elif node in upSet:
            nodeData[node] = "{\"id\":\"" + node + "\",\"direction\":\"up\"}"
        else:
           nodeData[node] = "{\"id\":\"" + node + "\",\"direction\":\"none\"}"

def getBioGRIDInteractors(geneList, returnDF = False):
   
    evidenceList = ["POSITIVE GENETIC", "PHENOTYPIC ENHANCEMENT"]
    geneList = ["STE11", "NMD4"]  # Yeast Genes STE11 and NMD4
    
    returnType = "TAB2"
    if returnDF:
        returnType = "json"    
        
    # These parameters can be modified to match any search criteria following
    # the rules outlined in the Wiki: https://wiki.thebiogrid.org/doku.php/biogridrest
    params = {
        "accesskey": "7b1729fdc6013fdcb090d83f375f92b5",
        "format": returnType,  # Return results in JSON format can set TAB2
        "geneList": "|".join(geneList),  # Must be | separated
        "searchNames": "true",  # Search against official names
        "includeInteractors": "false",  # Set to true to get any interaction involving EITHER gene, set to false to get interactions between genes
        #"taxId": 559292,  # Limit to Saccharomyces cerevisiae
        "evidenceList": "|".join(evidenceList),  # Exclude these two evidence types
        "includeEvidence": "false",  # If false "evidenceList" is evidence to exclude, if true "evidenceList" is evidence to show
        "includeHeader": "true",
    }
    # Additional options to try, you can uncomment them as necessary
    # params["start"] = 5 # Specify where to start fetching results from if > 10,000 results being returned
    # params["max"] = 10 # Specify the number of results to return, max is 10,000
    # params["interSpeciesExcluded"] = "false" # true or false, If ‘true’, interactions with interactors from different species will be excluded (ex. no Human -> Mouse interactions)
    params["selfInteractionsExcluded"] = "true" # true or false, If ‘true’, interactions with one interactor will be excluded. (ex. no STE11 -> STE11 interactions)
    # params["searchIds"] = "false" # true or false, If ‘true’, ENTREZ_GENE, ORDERED LOCUS and SYSTEMATIC_NAME (orf) will be examined for a match with the geneList
    params["searchSynonyms"] = "true" # true or false, If ‘true’, SYNONYMS will be examined for a match with the geneList
    # params["searchBiogridIds"] = "false" # true or false, If ‘true’, BIOGRID INTERNAL IDS will be examined for a match with the geneList
    # params["excludeGenes"] = "false" # true or false, If 'true' the geneList becomes a list of genes to EXCLUDE rather than to INCLUDE
    # params["includeInteractorInteractions"] = "true" # true or false, If ‘true’ interactions between the geneList’s first order interactors will be included. Ignored if includeInteractors is ‘false’ or if excludeGenes is set to ‘true’.
    # params["htpThreshold"] = 50 # Any publication with more than this many interactions will be excluded
    # params["throughputTag"] = "any" # any, low, high. If set to low, only `low throughput` interactions will be returned, if set to high, only `high throughput` interactions will be returned
    # params["additionalIdentifierTypes"] = "SGD|FLYBASE|REFSEQ" # You can specify a | separated list of additional identifier types to search against (see get_identifier_types.py)

    r = requests.get("https://webservice.thebiogrid.org/interactions", params=params)
    
    if not returnDF:
        return r.text
    
    interactions = r.json()
    
    # Create a hash of results by interaction identifier
    data = {}
    if len(interactions) == 0:
        return None
    for interaction_id, interaction in interactions.items():
        data[interaction_id] = interaction
        # Add the interaction ID to the interaction record, so we can reference it easier
        data[interaction_id]["INTERACTION_ID"] = interaction_id

    # Load the data into a pandas dataframe
    dataset = pd.DataFrame.from_dict(data, orient="index")

    # Re-order the columns and select only the columns we want to see

    columns = [
        "INTERACTION_ID",
        "ENTREZ_GENE_A",
        "ENTREZ_GENE_B",
        "OFFICIAL_SYMBOL_A",
        "OFFICIAL_SYMBOL_B",
        "EXPERIMENTAL_SYSTEM",
        "PUBMED_ID",
        "PUBMED_AUTHOR",
        "THROUGHPUT",
        "QUALIFICATIONS",
    ]
    dataset = dataset[columns]
    return dataset   
 
 
    
def getDataNew(genes_cols, genes_rows =[], cell_line="K562gwps", datasetType ="pert", processtype="data"):
    data_file="" 
    
    #cell_line will be the id of cell line name rpe1_essential/k562_essential/k562_gwps        
    #datasettype will be pert/genes
    #processtype will be data/pearson/kendall/spearman 
    
    #get rid of empy ones from the lists 
    genes_cols = list(filter(None, genes_cols))
    genes_rows = list(filter(None, genes_rows)) 
    
    if len(str(cell_line))>30:
        data_file = os.path.join(os.getcwd(), "temp", f"{cell_line}.pq")
    else:
        data_file = f"{os.getcwd()}/data/{cell_line}_{processtype}_{datasetType}.parquet"
        
    
    if len(genes_cols) >0:  
        parquet_file = pq.ParquetFile(data_file)
        columns_in_file = [c for c in genes_cols if c in parquet_file.schema.names] + [(c + "_2") for c in genes_cols if (c + "_2") in parquet_file.schema.names]
        
        if len(columns_in_file) ==0 or  not columns_in_file: 
            raise Exception("No genes found in the database. Genes searched: " + ' '.join(map(str, genes_cols)))
        df = pd.read_parquet(data_file,columns = set(columns_in_file))
    else:
        df = pd.read_parquet(data_file)  
         
    #print("Reading raw data:" + data_file)
    #print(df.shape)
    #print(len(df.index))
    #print(df.index)
    
    if genes_rows:
        df_filtered = df[df.index.isin(genes_rows + [(r + "_2") for r in genes_rows] )]
        if df_filtered.empty:
            raise Exception("No genes found in the database. Genes searched: " + ' '.join(map(str,df_filtered = df[df.index.isin(genes_rows)])))

        return df_filtered
    else:
        return df
        


@celery.task
def delete_files(file_paths):
    for file_path in file_paths:
        if os.path.isfile(file_path):
            os.remove(file_path)


def calculateClusterCounts():
    geneList = ["IER3IP1","YIPF5","SEC61B","HSPA5","TMEM167A","SPCS3","SEL1L","INTS8","SMG5","MANF","SEC61A1","UFL1","UPF2","CNOT3","SLC35B1","SRP19","EIF2B3","SSR1","SLC39A7","TTI1","SCYL1","DDRGK1","SEC61G","SEC63","TMED2","SYVN1","BTAF1","SSR2","MED12","SMG7","TMED10","OXA1L","MRPS9","HYOU1","HSD17B12","MTHFD1","EPRS1","PSMA4","MED21","DNAJB9","ATP5F1B","VPS29","XPO1","UMPS","INTS10","DNAJC19","UROD","ATF6","TELO2","PRELID3B","SRPRB","UPF1","IDH3A","KANSL3","HSD17B10","DHX30","ASCC3","MNAT1","SAMM50","HSP90B1","INTS15","POLR3A","MRPL22","P4HB","TARS2","SLC33A1","EIF2B5","EMC2","PPP1R10","MED30","AARS1","SMC1A","PSMD4","INTS2","THRAP3","MRPS33","FAF2","AFG3L2","FECH","MED19","UQCRB","COX6C","MRPL17","SRP72","CLNS1A","OGT","TSEN2","DDX39B","PSMA7","MRPL18","PMPCB","SARS1","MED22","PSMD6","GTF2H1","PRRC2A","NDUFA8","SPCS2","ORC5","CDK6","PNISR","RNGTT","MRPS14","PSMB2","PHB1","PSMD12","ATP5ME","XRN1","MRPL43","MED23","TIMM44","ZFX","YTHDC1","MRPL34","GTF3C2","FLCN","SSR3","CCAR1","GAB2","MRPS18A","FARSB","TCF3","MRPL19","SSBP1","MRPS27","SAE1","CTPS1","GRSF1","SHOC2","SMNDC1","COX4I1","EEF1A1","VPS16","MED1","MRPS21","DAD1","METTL17","PFDN2","INPPL1","ZEB2","NDUFS1","EP400","GNPNAT1","MRPL13","MARS2","LONP1","PDIA6","SOCS1","TLK2","TPR","TARS1","CHCHD4","NSD1","ILF2","MCM6","EIF5","KDM5C","MRPS5","VARS1","PUM1","GBF1","HBS1L","SLC7A1","ZNF236","MRPL10","MRPL33","HARS1","NEDD8","SLC39A9","CALU","CSNK1A1","TTI2","MRPL55","SAP18","TRMT10C","IPO13","PSMB7","INTS14","PTCD3","MRPS23","PGD","MRPS12","RPN1","MED17","CBLL1","ALYREF","DNAJA3","HEATR1","GMPPB","PRPF39","SMC3","MED27","MRPL58","GADD45GIP1","ATP5MJ","SDHC","PSMD11","ATP5PD","CNOT2","MED6","NUP54","MED18","SNRNP70","MTPAP","MED14","DDOST","DARS1","CAD","ALG9","LAMTOR1","NDUFA9","SUPT6H","BRIP1","SLC25A51","COX10","FNIP1","GFM1","CDK7","MRPS10","PTDSS1","SUGT1","PSMD13","DTYMK","PSMD14","MRPL16","CCNH","MCM3","EIF2B4","IARS2","MRPL9","PPP2R1A","PET117","POLR2L","LRPPRC","GINS4","SEM1","UBA6","HCCS","UQCRC1","KANSL2","ZNF687","DHX15","RPL41","MRPS35","CHMP6","ALG12","DERL2","COX7C","PRKCSH","MED10","VPS4A","COPB1","EIF2S1","PSMB5","BRD8","DMAP1","MED24","SMARCA5","MRPL37","MED31","MRPS17","LYL1","NRDE2","CENPI","NCAPD2","ELL","EIF2B2","SRSF3","RPN2","MRPL27","PSMC6","MED20","RARS2","ZFR","RANBP3","COQ2","ORC2","GTF2E1","ZEB1","PNPT1","EMC4","MRPL51","POLR3B","PPRC1","MRPL32","COPG1","CARM1","PSMB1","CCDC174","CCND3","PTCD1","MRPL39","RARS1","POLG2","LAMTOR5","MRPS16","ZBTB14","ALG13","MCM2","PSMA2","FUBP3","TIAL1","MRPL36","FOXN3","MRPS18B","CHERP","TRRAP","VPS39","LAMTOR4","SMN2","UBE4B","MRPS31","MYC","BCR","MRPL35","PHB2","MARS1","THOC2","HSPA13","DMAC1","ARHGAP22","ERCC2","PABPC4","GTF2H3","MRPL20","MED16","TMCO1","CPNE1","MRPL42","SRP68","TAPT1","MCM10","DLD","XRCC5","TFB1M","MYB","TAF13","RHOXF2","RHOXF2B","ATP13A1","SRF","STT3A","MRPS7","LAMTOR2","ACAD9","ATP5PB","SNAI1","ZCRB1","NDUFB4","SKA3","OPA1","DHDDS","GTF3C1","MRPL15","MRPL49","SEC11A","SNRNP27","PSMC1","TWNK","TBP","MCM5","PPP2R2A","MED7","PGK1","CYB5B","UBE2J1","TRPM7","HINFP","CPSF6","BMS1","DNAJC24","PSMC3","MRPL3","SLC25A3","FASTKD5","NEDD8-MDP1","BCLAF1","HEXIM1","ATP5MF","ATP5PO","SINHCAF","RRAGA","CUL3","CARS2"]
    dataType = 1
    cell_line=1 # "acc6404c-274b-46cc-acf1-badaee19d5f5" #1
    numcomponents=3
    retType=1
    task_id = "test" 
    with open('C:\\Users\\omerfk\\source\\repos\myAPI\\PCA-resultsnew.txt', 'w') as f:
        print('numcomponents\tClusterCOunt\ttotalGenes\tcurrentCluster\tTerm\tOverlap\tAdjusted P-value\tOdds Ratio\tGeneCount\tGeneCountInTheluster\tTimeCost', file=f)
        # for PCA print('numcomponents\tPCACompenentCount\tClusterCOunt\ttotalGenes\tcurrentCluster\tTerm\tOverlap\tAdjusted P-value\tOdds Ratio\tGeneCount\tGeneCountInTheluster', file=f)
       
        #for i in range(3,28,1):
        #for i in range(3,398,5):
        for i in range(30,100,5):
            numcomponents= i
            payload = {"task_id": task_id, "geneList": geneList, "dataType":dataType,"cell_line":cell_line, "numcomponents":numcomponents, "retType":retType  }
            #result = json.loads(calcUMAPGraph(payload))  
            #result = json.loads(calcMDEGraph(payload))  
            #result = json.loads(calctSNEGraph(payload))  
            result = json.loads(calcPCAGraph(payload)) 
            gene_clusters = {}
            
            if len(result['clusterLabels'])==0:
                print(str(i) + "\t0\t0\t0\t0\t0\t0\t0\t0\t0\t" + str(result['timeCost']), file=f)
                continue
            for j in range(len(result['clusterLabels'])):
                gene = result['GeneSymbols'][j]
                cluster = result['clusterLabels'][j]
                if cluster not in gene_clusters:
                    gene_clusters[cluster] = []
                gene_clusters[cluster].append(gene)
            
            cluster_score = 0
            for j in range(0,result['clusterCount']):
                enr = gp.enrich(gene_clusters[j], 
                 gene_sets=["./gsea/GO_Biological_Process_2021.gmt"], # kegg is a dict object  "./gsea/c2.cp.kegg.v2023.1.Hs.symbols.gmt", ,"./gsea/c5.go.cc.v2023.1.Hs.symbols.gmt" "./gsea/c5.go.bp.v2023.1.Hs.symbols.gmt",
                 background=20000,
                 outdir=None,
                 verbose=False)
                #print(enr.results.head(1)) graphData["resultShape"]
                results2 = enr.results.sort_values(by=['Odds Ratio'], ascending=False)
                print(str(i) + "\t"  + str(result['clusterCount'])
                #print(str(i) + "\t"  + str(result["resultShape"].split(" ")[1]) + "\t" + str(result['clusterCount'])
                      + "\t" + str(len(list(filter(lambda x: x > -1, result['clusterLabels']))))
                      + "\t" + str(j+1)                      
                      + "\t" + str(results2.iloc[0,1])
                      + "\t" + str(results2.iloc[0,2])
                      + "\t" + str(results2.iloc[0,4])  
                      + "\t" + str(results2.iloc[0,5])
                      + "\t" + str(len(results2.iloc[0,6].split(";")))  #Count of genes in top term 
                      + "\t" + str(len(gene_clusters[j])) #Total number of genes in the cluster   
                      + "\t" + str(result['timeCost'])
                      + "\t" + str((len(results2.iloc[0,6].split(";")) * len(results2.iloc[0,6].split(";")) /  len(gene_clusters[j])))      
                      , file=f)
                cluster_score = cluster_score + (len(results2.iloc[0,6].split(";")) * len(results2.iloc[0,6].split(";")) /  len(gene_clusters[j]))
                # for PCA print(str(i) + "\t"  + str(result["resultShape"].split(" ")[1]) + "\t" + str(result['clusterCount'])
              

               
                
        print("Finished")


def calculateClusterCounts2():
    #Omer ER stress genes
    #geneList = ["IER3IP1","YIPF5","SEC61B","HSPA5","TMEM167A","SPCS3","SEL1L","INTS8","SMG5","MANF","SEC61A1","UFL1","UPF2","CNOT3","SLC35B1","SRP19","EIF2B3","SSR1","SLC39A7","TTI1","SCYL1","DDRGK1","SEC61G","SEC63","TMED2","SYVN1","BTAF1","SSR2","MED12","SMG7","TMED10","OXA1L","MRPS9","HYOU1","HSD17B12","MTHFD1","EPRS1","PSMA4","MED21","DNAJB9","ATP5F1B","VPS29","XPO1","UMPS","INTS10","DNAJC19","UROD","ATF6","TELO2","PRELID3B","SRPRB","UPF1","IDH3A","KANSL3","HSD17B10","DHX30","ASCC3","MNAT1","SAMM50","HSP90B1","INTS15","POLR3A","MRPL22","P4HB","TARS2","SLC33A1","EIF2B5","EMC2","PPP1R10","MED30","AARS1","SMC1A","PSMD4","INTS2","THRAP3","MRPS33","FAF2","AFG3L2","FECH","MED19","UQCRB","COX6C","MRPL17","SRP72","CLNS1A","OGT","TSEN2","DDX39B","PSMA7","MRPL18","PMPCB","SARS1","MED22","PSMD6","GTF2H1","PRRC2A","NDUFA8","SPCS2","ORC5","CDK6","PNISR","RNGTT","MRPS14","PSMB2","PHB1","PSMD12","ATP5ME","XRN1","MRPL43","MED23","TIMM44","ZFX","YTHDC1","MRPL34","GTF3C2","FLCN","SSR3","CCAR1","GAB2","MRPS18A","FARSB","TCF3","MRPL19","SSBP1","MRPS27","SAE1","CTPS1","GRSF1","SHOC2","SMNDC1","COX4I1","EEF1A1","VPS16","MED1","MRPS21","DAD1","METTL17","PFDN2","INPPL1","ZEB2","NDUFS1","EP400","GNPNAT1","MRPL13","MARS2","LONP1","PDIA6","SOCS1","TLK2","TPR","TARS1","CHCHD4","NSD1","ILF2","MCM6","EIF5","KDM5C","MRPS5","VARS1","PUM1","GBF1","HBS1L","SLC7A1","ZNF236","MRPL10","MRPL33","HARS1","NEDD8","SLC39A9","CALU","CSNK1A1","TTI2","MRPL55","SAP18","TRMT10C","IPO13","PSMB7","INTS14","PTCD3","MRPS23","PGD","MRPS12","RPN1","MED17","CBLL1","ALYREF","DNAJA3","HEATR1","GMPPB","PRPF39","SMC3","MED27","MRPL58","GADD45GIP1","ATP5MJ","SDHC","PSMD11","ATP5PD","CNOT2","MED6","NUP54","MED18","SNRNP70","MTPAP","MED14","DDOST","DARS1","CAD","ALG9","LAMTOR1","NDUFA9","SUPT6H","BRIP1","SLC25A51","COX10","FNIP1","GFM1","CDK7","MRPS10","PTDSS1","SUGT1","PSMD13","DTYMK","PSMD14","MRPL16","CCNH","MCM3","EIF2B4","IARS2","MRPL9","PPP2R1A","PET117","POLR2L","LRPPRC","GINS4","SEM1","UBA6","HCCS","UQCRC1","KANSL2","ZNF687","DHX15","RPL41","MRPS35","CHMP6","ALG12","DERL2","COX7C","PRKCSH","MED10","VPS4A","COPB1","EIF2S1","PSMB5","BRD8","DMAP1","MED24","SMARCA5","MRPL37","MED31","MRPS17","LYL1","NRDE2","CENPI","NCAPD2","ELL","EIF2B2","SRSF3","RPN2","MRPL27","PSMC6","MED20","RARS2","ZFR","RANBP3","COQ2","ORC2","GTF2E1","ZEB1","PNPT1","EMC4","MRPL51","POLR3B","PPRC1","MRPL32","COPG1","CARM1","PSMB1","CCDC174","CCND3","PTCD1","MRPL39","RARS1","POLG2","LAMTOR5","MRPS16","ZBTB14","ALG13","MCM2","PSMA2","FUBP3","TIAL1","MRPL36","FOXN3","MRPS18B","CHERP","TRRAP","VPS39","LAMTOR4","SMN2","UBE4B","MRPS31","MYC","BCR","MRPL35","PHB2","MARS1","THOC2","HSPA13","DMAC1","ARHGAP22","ERCC2","PABPC4","GTF2H3","MRPL20","MED16","TMCO1","CPNE1","MRPL42","SRP68","TAPT1","MCM10","DLD","XRCC5","TFB1M","MYB","TAF13","RHOXF2","RHOXF2B","ATP13A1","SRF","STT3A","MRPS7","LAMTOR2","ACAD9","ATP5PB","SNAI1","ZCRB1","NDUFB4","SKA3","OPA1","DHDDS","GTF3C1","MRPL15","MRPL49","SEC11A","SNRNP27","PSMC1","TWNK","TBP","MCM5","PPP2R2A","MED7","PGK1","CYB5B","UBE2J1","TRPM7","HINFP","CPSF6","BMS1","DNAJC24","PSMC3","MRPL3","SLC25A3","FASTKD5","NEDD8-MDP1","BCLAF1","HEXIM1","ATP5MF","ATP5PO","SINHCAF","RRAGA","CUL3","CARS2"]
    
    #Bilals Gene List 470 LG LR
    geneList = ["NELFB","NELFCD","EIF4G1","DHPS","MIOS","TAF2","DDX52","NELFA","DOHH","EIF1AD","ATXN10","TTC27","CLNS1A","RPTOR","TAF6","TAF1","LTV1","TAF8","YAE1","EIF4A1","OGT","CTBP2","TAF10","DKC1","METTL14","RAE1","TAF1B","DDX20","EIF4E","LAMTOR3","SPATA5","PDCD2","LAMTOR2","EIF5A","ATF4","DIMT1","POP7","SHQ1","ILF3","ALDOA","RHEB","SNUPN","SEC24A","UTP25","ILF2","RANBP1","SEH1L","GGA1","SPOUT1","TAF7","NHP2","DHX33","POP5","HIRA","POLR1H","PPRC1","WDR12","CCNH","EIF3M","WDR59","GEMIN8","RSL1D1","KRR1","NOP10","BANF1","EEF2","IL17RA","PRODH","NOLC1","RBM19","EXOSC4","POP1","GEMIN6","EXOSC5","CDK9","GEMIN4","EXOSC7","FAM168B","SETD1B","RPS19","ANKLE2","NOC4L","DDX49","TTC14","NOL10","YPEL1","ZNHIT3","YEATS2","UTP23","TAF1C","DGCR8","GTF3A","INTS10","RPP14","SBNO1","TAF1D","EIF3H","TRMT2A","CD2BP2","METTL3","NOM1","RPLP2","USP7","PWP2","MLST8","KAT7","RPS21","ZNF236","WDR24","DCTN6","NOPCHAP1","SMTN","KNSTRN","GTF2E1","RPS5","PATZ1","TAF13","LAMTOR1","UBTF","SUPT4H1","TRMT112","EXOSC9","METAP1","ZCCHC7","VAT1","BMS1","RPP38","VPS18","USP36","GTF2A2","DDX21","ACTR5","GPN2","MYC","PRPF40A","KRI1","CMTR1","SSU72","AATF","NEPRO","TTC4","DDX47","COPS6","RRP7A","TSR1","DDX18","GPKOW","RPF2","DDX54","HSPA14","TPT1","MAPK1","TSR2","GEMIN7","WDR3","EIF6","DDX10","RANGAP1","SETD1A","CABIN1","MAX","NUP88","DPH2","COPS8","WDR18","MYBBP1A","CSTF3","SSRP1","RPL39","TBCD","CHORDC1","ABT1","NUDC","PAK1IP1","POP4","POLR1E","ZC3H8","RPP30","PRR14L","MICALL1","JUNB","PELP1","AHR","DCAF7","TAF12","ATXN2","BYSL","TST","MICAL3","RRP1","RRP12","RPL13A","SMARCB1","ZNF205","UTP6","RPL10A","RB1CC1","EXOSC2","SNAPC5","MTOR","CCDC116","CREB5","CFAP298","RCL1","MAK16","IGF2BP1","NOL9","UTP15","CTBP1","WDR55","VPS41","RPS10-NUDT3","SKIC8","RCC1","TMUB2","SNRPD2","RPS3A","SPATA5L1","UBXN7","GP1BB","DHX37","SEPTIN1","ITPKC","IMP4","GNL3L","RPS25","DDX55","APOBEC3G","PGK1","SNAPC1","MAZ","SUPT16H","EXOSC3","LAS1L","RIOK1","EXOSC10","YWHAH","NOL6","DDX42","POLR1G","NOP16","DCAF13","PAXBP1","TLK2","PDPK1","SUN2","SRFBP1","TANGO2","NRBP1","GEMIN5","TRMU","LSM14A","NMD3","AHCYL1","WDR74","FBXO17","FBRS","MDN1","MED23","RBBP6","METAP2","SEPTIN5","RPS6KB1","RABEP2","SELENOM","RPS15A","LSM4","NOP58","LDLRAP1","TBL3","BPTF","ALYREF","CCDC59","RPAP3","ZNHIT6","PSME3","LAMTOR4","GTF2F2","CAMTA2","RPS11","NELFE","PAFAH1B1","UTP20","ISG20L2","SNAPC4","AAMP","BCOR","NUBP2","NAT10","TXNRD2","EIF3F","ESS2","RBFOX2","NOP9","UTP14A","SRRD","ZNF793","FXYD5","DPH5","GTPBP4","RPS23","CDC16","MORC2","TAF5","GTPBP1","NOL11","WDR46","NAA11","CSNK2B","CTDP1","WDR75","PRDM10","CSH2","MNAT1","MACF1","COPS2","ZNF689","AP1B1","DDX17","KLF1","EXOC1","MIEF1","ANKRD54","GSC2","BTBD10","DGCR2","ARHGAP22","HOMER3","RPS3","FAM171A1","RPS2","URB1","DDT","POLR1D","SBDS","GTF2F1","TBX6","SMIM19","RRP36","LSM12","NLE1","TOP1","FKBPL","NOB1","THOC3","SPG11","CLOCK","PES1","TAF11","TRNAU1AP","ZNF836","FBXO7","CCDC9","KLHL22","HOXA5","LGALS1","ZNF613","NOL12","ZMYND11","ERMAP","ADSL","SIK3","PTDSS1","RBIS","EFTUD2","BLOC1S2","EMG1","NKX1-1","NUP155","GNAS","RHBDD3","LHX4","DNAJC2","CFAP410","U2AF2","RNF19A","CBX1","FAIM","COPS3"]

    dataType = 1
    #cell_line= 1  # "acc6404c-274b-46cc-acf1-badaee19d5f5" #1
    #cell_line = "8d44df7c-efe6-4ea5-9170-9d7c5786be63" #PCA 85   141 comp
    #cell_line = "834abf9c-251d-496a-9cc0-c754f797ba93" #UMAP3
    #cell_line = "bfed49f8-4a6e-450e-9e5e-4873c0f72626" #UMAP50
    #cell_line = "6e041848-85f8-4da0-a457-3ee44cfa9130" #UMAP100
    #cell_line = "32f6e351-5f49-4695-a927-3ded4c0e2ed2" #UMAP173
    #cell_line = "e4db0d9c-0e0b-4108-9729-0e2f5350ab40" #MDE43
    cell_line = "c5e9d4f2-75ab-4efe-a791-e0e47ef4d434" #PCA 60 Bilal

    perplexity= 1
    numcomponents=3
    retType=1
    task_id = "test"
    repeat_count = 1
    metric= "correlation" # "euclidean"
 
    
    with open('C:\\Users\\omerfk\\source\\repos\myAPI\\Results\\Bilal\\PCA60UMAPcorr-results.txt', 'w') as f: 
        with open('C:\\Users\\omerfk\\source\\repos\myAPI\\Results\\Bilal\\PCA60UMAPcorr-results-details.txt', 'w') as f2:
            #print('numcomponents\tClusterCOunt\ttotalGenes\tcurrentCluster\tTerm\tOverlap\tAdjusted P-value\tOdds Ratio\tGeneCount\tGeneCountInTheluster\tTimeCost', file=f)
            print('numcomponents\tPCACompenentCount\tClusterCOunt\ttotalGenes\tcurrentCluster\tTerm\tOverlap\tAdjusted P-value\tOdds Ratio\tGeneCount\tGeneCountInTheluster', file=f)
            mainnumofcomponents = list()
            mainclustersCounts = list()
            mainclusterGeneCounts = list()
            mainclusteringScores = list()
            maincomputationTimes = list()
            mainmappedGenes = list()
            mainclustersmorethanonegene = list()
            mainclustershighratio = list()
            for k in range(0,repeat_count,1):
                numofcomponents = list()
                clustersCounts = list()
                clusterGeneCounts = list()
                clusteringScores = list()
                computationTimes = list()
                mappedGenes = list()
                clustersmorethanonegene = list()
                clustershighratio = list()
                maxScoreLoc = 0
                maxScore =0
                maxClustCount =0
                #for i in range(3,102,5): #for mde    #Bilal 408  Omer 398
                #for i in range(3,28,1): #28
                for i in range(3,408,5):
                #for i in range(3,173,3): #173
                    print("\n\n#############################\n")
                    print("Current repeat:" + str(k)+ "\n")                    
                    print("Current position:" + str(i)+ "\n")
                    print("Current max cluster score:" + str(maxScore) + "\n")
                    print("Current maxLoc:" + str(maxScoreLoc)+ "\n")
                    print("Current maxClustCount:" + str(maxClustCount)+ "\n")
                    print("#############################\n\n")
                    numcomponents= i
                    payload = {"metric": metric, "task_id": task_id, "perplexity": perplexity , "geneList": geneList, "dataType":dataType,"cell_line":cell_line, "numcomponents":numcomponents, "retType":retType  }
                    result = json.loads(calcUMAPGraph(payload))  
                    #result = json.loads(calcMDEGraph(payload))  
                    #result = json.loads(calcPCAGraph(payload))  
                    #result = json.loads(calctSNEGraph(payload))
                    gene_clusters = {}
                    
                    if len(result['clusterLabels'])==0:
                        print(str(i) + "\t0\t0\t0\t0\t0\t0\t0\t0\t0\t" + str(result['timeCost']), file=f)
                        continue
                    for j in range(len(result['clusterLabels'])):
                        gene = result['GeneSymbols'][j].replace("_2","")
                        cluster = result['clusterLabels'][j]
                        if cluster not in gene_clusters:
                            gene_clusters[cluster] = []
                        gene_clusters[cluster].append(gene)
                    
                    cluster_score = 0
                    mappedGeneCount = 0
                    clusterswithmorethanonegene =0
                    clusterswithhighratio =0 #0.3 or more
                    for j in range(0,result['clusterCount']):
                        enr = gp.enrich(gene_clusters[j], 
                         gene_sets=["./gsea/GO_Biological_Process_2021.gmt"], # kegg is a dict object  "./gsea/c2.cp.kegg.v2023.1.Hs.symbols.gmt", ,"./gsea/c5.go.cc.v2023.1.Hs.symbols.gmt" "./gsea/c5.go.bp.v2023.1.Hs.symbols.gmt",
                         background=20000,
                         outdir=None,
                         verbose=False)
                        #print(enr.results.head(1)) graphData["resultShape"]
                        results2 = enr.results.sort_values(by=['Odds Ratio'], ascending=False)
                        print(str(i) + "\t"  + str(result['clusterCount'])
                        #print(str(i) + "\t"  + str(result["resultShape"].split(" ")[1]) + "\t" + str(result['clusterCount'])
                              + "\t" + str(len(list(filter(lambda x: x > -1, result['clusterLabels']))))
                              + "\t" + str(j+1)                      
                              + "\t" + str(results2.iloc[0,1])
                              + "\t" + str(results2.iloc[0,2])
                              + "\t" + str(results2.iloc[0,4])  
                              + "\t" + str(results2.iloc[0,5])
                              + "\t" + str(len(results2.iloc[0,6].split(";")))  #Count of genes in top term 
                              + "\t" + str(len(gene_clusters[j])) #Total number of genes in the cluster   
                              + "\t" + str(result['timeCost'])
                              + "\t" + str((len(results2.iloc[0,6].split(";")) * len(results2.iloc[0,6].split(";")) /  len(gene_clusters[j])))      
                              , file=f)
                        if (len(results2.iloc[0,6].split(";")) /  len(gene_clusters[j])) > 0.3:
                            clusterswithhighratio=clusterswithhighratio+1
                        if len(results2.iloc[0,6].split(";")) > 1:
                            clusterswithmorethanonegene= clusterswithmorethanonegene +1
                        mappedGeneCount = mappedGeneCount + len(results2.iloc[0,6].split(";"))
                        cluster_score = cluster_score + (len(results2.iloc[0,6].split(";")) * len(results2.iloc[0,6].split(";")) /  len(gene_clusters[j]))
                        # for PCA print(str(i) + "\t"  + str(result["resultShape"].split(" ")[1]) + "\t" + str(result['clusterCount'])
                    
                    if cluster_score > maxScore:
                        maxScore = cluster_score
                        maxScoreLoc = i
                        maxClustCount = result['clusterCount']
                        
                        
                    clustershighratio.append(clusterswithhighratio)
                    clustersmorethanonegene.append(clusterswithmorethanonegene)
                    numofcomponents.append(i)
                    clustersCounts.append(result['clusterCount'])
                    clusterGeneCounts.append(len(list(filter(lambda x: x > -1, result['clusterLabels'])))) 
                    clusteringScores.append(cluster_score)
                    computationTimes.append(result['timeCost'])
                    mappedGenes.append(mappedGeneCount)  
                
                mainnumofcomponents.append(numofcomponents)
                mainmappedGenes.append(mappedGenes)
                mainclustersCounts.append(clustersCounts)
                mainclusterGeneCounts.append(clusterGeneCounts)
                mainclusteringScores.append(clusteringScores)
                maincomputationTimes.append(computationTimes)
                mainclustershighratio.append(clustershighratio)
                mainclustersmorethanonegene.append(clustersmorethanonegene)
            
            try:
                my_array = np.array(mainnumofcomponents)            
                numofcomponentsmeans = np.mean(my_array, axis=0)
                print(numofcomponentsmeans)              
            except:
                pass
            
            try:
                my_array = np.array(mainmappedGenes)
                # Calculate mean and standard error of mean for each index
                mappedGenesmeans = np.mean(my_array, axis=0)
                mappedGenessem = np.std(my_array, axis=0) / np.sqrt(my_array.shape[0])           
                print(mappedGenesmeans)
                print("mappedGenessem")  
                print(mappedGenessem)
            except:
                pass
            try: 
                my_array = np.array(mainclustersCounts)
                # Calculate mean and standard error of mean for each index
                clustersCountsmeans = np.mean(my_array, axis=0)
                clustersCountssem = np.std(my_array, axis=0) / np.sqrt(my_array.shape[0]) 
                print(clustersCountsmeans)
                print("clustersCountssem")  
                print(clustersCountssem)
            except:
                pass    
                
            try:     
                my_array = np.array(mainclusterGeneCounts)
                # Calculate mean and standard error of mean for each index
                clusterGeneCountsmeans = np.mean(my_array, axis=0)
                clusterGeneCountssem = np.std(my_array, axis=0) / np.sqrt(my_array.shape[0]) 
                print(clusterGeneCountsmeans)
                print("clusterGeneCountssem")  
                print(clusterGeneCountssem)
            except:
                pass 
            
            try:    
                my_array = np.array(mainclusteringScores)
                # Calculate mean and standard error of mean for each index
                clusteringScoresmeans = np.mean(my_array, axis=0)
                clusteringScoressem = np.std(my_array, axis=0) / np.sqrt(my_array.shape[0]) 
                print(clusteringScoresmeans)
                print("clusteringScoressem")  
                print(clusteringScoressem)
            except:
                pass  
            try:  
                my_array = np.array(maincomputationTimes)
                # Calculate mean and standard error of mean for each index
                computationTimesmeans = np.mean(my_array, axis=0)
                computationTimessem = np.std(my_array, axis=0) / np.sqrt(my_array.shape[0]) 
                print(computationTimesmeans)
                print("computationTimessem")  
                print(computationTimessem)
            except:
                pass
            
            try:  
                my_array = np.array(mainclustershighratio)
                # Calculate mean and standard error of mean for each index
                clustershighratiomeans = np.mean(my_array, axis=0)
                clustershighratiosem = np.std(my_array, axis=0) / np.sqrt(my_array.shape[0]) 
                print(clustershighratiomeans)
                print("mainclustershighratiosem")  
                print(clustershighratiosem)
            except:
                pass
            
            try:  
                my_array = np.array(mainclustersmorethanonegene)
                # Calculate mean and standard error of mean for each index
                clustersmorethanonegenemeans = np.mean(my_array, axis=0)
                clustersmorethanonegenesem = np.std(my_array, axis=0) / np.sqrt(my_array.shape[0]) 
                print(clustersmorethanonegenemeans)
                print("mainclustersmorethanonegenesem")  
                print(clustersmorethanonegenesem)
            except:
                pass
            
            print("NumOfComponents\tmappedGenesCount\tClusterCount\tclusterGeneCount\tclusteringScore\tcomputationTimes\tclustershighratio\tclustersmorethanonegene\t" +
                  "mappedGenesCountSem\tClusterCountSem\tclusterGeneCountSem\tclusteringScoreSem\tcomputationTimesSem\tclustershighratiosem\tclustersmorethanonegenesem"
                  , file=f2)
            for i in range (0, len(mappedGenesmeans)):
                print(str(numofcomponentsmeans[i]) + "\t" +
                      str(mappedGenesmeans[i]) + "\t" +
                      str(clustersCountsmeans[i]) + "\t" +
                      str(clusterGeneCountsmeans[i]) + "\t" +
                      str(clusteringScoresmeans[i]) + "\t" +
                      str(computationTimesmeans[i]) + "\t" +
                      str(clustershighratiomeans[i]) + "\t" +
                      str(clustersmorethanonegenemeans[i]) + "\t" +
                      str(mappedGenessem[i]) + "\t" +
                      str(clustersCountssem[i]) + "\t" +
                      str(clusterGeneCountssem[i]) + "\t" +
                      str(clusteringScoressem[i]) + "\t" +
                      str(computationTimessem[i]) + "\t" +
                      str(clustershighratiosem[i]) + "\t" +
                      str(clustersmorethanonegenesem[i])                      
                      , file=f2)

                     
            
                        
    print("Finished")

def calculateClusterCounts3():
    geneList = ["IER3IP1","YIPF5","SEC61B","HSPA5","TMEM167A","SPCS3","SEL1L","INTS8","SMG5","MANF","SEC61A1","UFL1","UPF2","CNOT3","SLC35B1","SRP19","EIF2B3","SSR1","SLC39A7","TTI1","SCYL1","DDRGK1","SEC61G","SEC63","TMED2","SYVN1","BTAF1","SSR2","MED12","SMG7","TMED10","OXA1L","MRPS9","HYOU1","HSD17B12","MTHFD1","EPRS1","PSMA4","MED21","DNAJB9","ATP5F1B","VPS29","XPO1","UMPS","INTS10","DNAJC19","UROD","ATF6","TELO2","PRELID3B","SRPRB","UPF1","IDH3A","KANSL3","HSD17B10","DHX30","ASCC3","MNAT1","SAMM50","HSP90B1","INTS15","POLR3A","MRPL22","P4HB","TARS2","SLC33A1","EIF2B5","EMC2","PPP1R10","MED30","AARS1","SMC1A","PSMD4","INTS2","THRAP3","MRPS33","FAF2","AFG3L2","FECH","MED19","UQCRB","COX6C","MRPL17","SRP72","CLNS1A","OGT","TSEN2","DDX39B","PSMA7","MRPL18","PMPCB","SARS1","MED22","PSMD6","GTF2H1","PRRC2A","NDUFA8","SPCS2","ORC5","CDK6","PNISR","RNGTT","MRPS14","PSMB2","PHB1","PSMD12","ATP5ME","XRN1","MRPL43","MED23","TIMM44","ZFX","YTHDC1","MRPL34","GTF3C2","FLCN","SSR3","CCAR1","GAB2","MRPS18A","FARSB","TCF3","MRPL19","SSBP1","MRPS27","SAE1","CTPS1","GRSF1","SHOC2","SMNDC1","COX4I1","EEF1A1","VPS16","MED1","MRPS21","DAD1","METTL17","PFDN2","INPPL1","ZEB2","NDUFS1","EP400","GNPNAT1","MRPL13","MARS2","LONP1","PDIA6","SOCS1","TLK2","TPR","TARS1","CHCHD4","NSD1","ILF2","MCM6","EIF5","KDM5C","MRPS5","VARS1","PUM1","GBF1","HBS1L","SLC7A1","ZNF236","MRPL10","MRPL33","HARS1","NEDD8","SLC39A9","CALU","CSNK1A1","TTI2","MRPL55","SAP18","TRMT10C","IPO13","PSMB7","INTS14","PTCD3","MRPS23","PGD","MRPS12","RPN1","MED17","CBLL1","ALYREF","DNAJA3","HEATR1","GMPPB","PRPF39","SMC3","MED27","MRPL58","GADD45GIP1","ATP5MJ","SDHC","PSMD11","ATP5PD","CNOT2","MED6","NUP54","MED18","SNRNP70","MTPAP","MED14","DDOST","DARS1","CAD","ALG9","LAMTOR1","NDUFA9","SUPT6H","BRIP1","SLC25A51","COX10","FNIP1","GFM1","CDK7","MRPS10","PTDSS1","SUGT1","PSMD13","DTYMK","PSMD14","MRPL16","CCNH","MCM3","EIF2B4","IARS2","MRPL9","PPP2R1A","PET117","POLR2L","LRPPRC","GINS4","SEM1","UBA6","HCCS","UQCRC1","KANSL2","ZNF687","DHX15","RPL41","MRPS35","CHMP6","ALG12","DERL2","COX7C","PRKCSH","MED10","VPS4A","COPB1","EIF2S1","PSMB5","BRD8","DMAP1","MED24","SMARCA5","MRPL37","MED31","MRPS17","LYL1","NRDE2","CENPI","NCAPD2","ELL","EIF2B2","SRSF3","RPN2","MRPL27","PSMC6","MED20","RARS2","ZFR","RANBP3","COQ2","ORC2","GTF2E1","ZEB1","PNPT1","EMC4","MRPL51","POLR3B","PPRC1","MRPL32","COPG1","CARM1","PSMB1","CCDC174","CCND3","PTCD1","MRPL39","RARS1","POLG2","LAMTOR5","MRPS16","ZBTB14","ALG13","MCM2","PSMA2","FUBP3","TIAL1","MRPL36","FOXN3","MRPS18B","CHERP","TRRAP","VPS39","LAMTOR4","SMN2","UBE4B","MRPS31","MYC","BCR","MRPL35","PHB2","MARS1","THOC2","HSPA13","DMAC1","ARHGAP22","ERCC2","PABPC4","GTF2H3","MRPL20","MED16","TMCO1","CPNE1","MRPL42","SRP68","TAPT1","MCM10","DLD","XRCC5","TFB1M","MYB","TAF13","RHOXF2","RHOXF2B","ATP13A1","SRF","STT3A","MRPS7","LAMTOR2","ACAD9","ATP5PB","SNAI1","ZCRB1","NDUFB4","SKA3","OPA1","DHDDS","GTF3C1","MRPL15","MRPL49","SEC11A","SNRNP27","PSMC1","TWNK","TBP","MCM5","PPP2R2A","MED7","PGK1","CYB5B","UBE2J1","TRPM7","HINFP","CPSF6","BMS1","DNAJC24","PSMC3","MRPL3","SLC25A3","FASTKD5","NEDD8-MDP1","BCLAF1","HEXIM1","ATP5MF","ATP5PO","SINHCAF","RRAGA","CUL3","CARS2"]
    dataType = 1
    #cell_line= 1  
    #cell_line= "acc6404c-274b-46cc-acf1-badaee19d5f5" # PCA 60
    #cell_line = "f2fa9853-9cfd-43ee-ba7f-90a1ce81d166" #UMAP 173
    cell_line = "c5e9d4f2-75ab-4efe-a791-e0e47ef4d434" #PCA 60 Bilal
    numcomponents=1
    retType=1
    task_id = "test"
    repeat_count = 1
    
    with open('C:\\Users\\omerfk\\source\\repos\myAPI\\Results\\Bilal\\PCA60MDE-results.txt', 'w') as f: 
        with open('C:\\Users\\omerfk\\source\\repos\myAPI\\Results\\Bilal\\PCA60MDE-results-details.txt', 'w') as f2:
            #print('numcomponents\tClusterCOunt\ttotalGenes\tcurrentCluster\tTerm\tOverlap\tAdjusted P-value\tOdds Ratio\tGeneCount\tGeneCountInTheluster\tTimeCost', file=f)
            print('perplexity\tPCACompenentCount\tClusterCOunt\ttotalGenes\tcurrentCluster\tTerm\tOverlap\tAdjusted P-value\tOdds Ratio\tGeneCount\tGeneCountInTheluster', file=f)
            mainnumofcomponents = list()
            mainclustersCounts = list()
            mainclusterGeneCounts = list()
            mainclusteringScores = list()
            maincomputationTimes = list()
            mainmappedGenes = list()
            for k in range(0,repeat_count,1):
                numofcomponents = list()
                clustersCounts = list()
                clusterGeneCounts = list()
                clusteringScores = list()
                computationTimes = list()
                mappedGenes = list()
                
                #for i in range(3,102,3): #for mde
                #for i in range(3,28,1): #28
                #for i in range(3,398,5):
                for i in range(1,60,3):
                    perplexity= i
                    payload = {"task_id": task_id, "geneList": geneList, "dataType":dataType,"cell_line":cell_line, 
                               "numcomponents":numcomponents, "perplexity":perplexity, "retType":retType  }
                    #result = json.loads(calcUMAPGraph(payload))  
                    #result = json.loads(calcMDEGraph(payload))  
                    #result = json.loads(calcPCAGraph(payload))  
                    result = json.loads(calctSNEGraph(payload))
                    gene_clusters = {}
                    
                    if len(result['clusterLabels'])==0:
                        print(str(i) + "\t0\t0\t0\t0\t0\t0\t0\t0\t0\t" + str(result['timeCost']), file=f)
                        continue
                    for j in range(len(result['clusterLabels'])):
                        gene = result['GeneSymbols'][j]
                        cluster = result['clusterLabels'][j]
                        if cluster not in gene_clusters:
                            gene_clusters[cluster] = []
                        gene_clusters[cluster].append(gene)
                    
                    cluster_score = 0
                    mappedGeneCount = 0
                    for j in range(0,result['clusterCount']):
                        enr = gp.enrich(gene_clusters[j], 
                         gene_sets=["./gsea/GO_Biological_Process_2021.gmt"], # kegg is a dict object  "./gsea/c2.cp.kegg.v2023.1.Hs.symbols.gmt", ,"./gsea/c5.go.cc.v2023.1.Hs.symbols.gmt" "./gsea/c5.go.bp.v2023.1.Hs.symbols.gmt",
                         background=20000,
                         outdir=None,
                         verbose=False)
                        #print(enr.results.head(1)) graphData["resultShape"]
                        results2 = enr.results.sort_values(by=['Odds Ratio'], ascending=False)
                        print(str(i) + "\t"  + str(result['clusterCount'])
                        #print(str(i) + "\t"  + str(result["resultShape"].split(" ")[1]) + "\t" + str(result['clusterCount'])
                              + "\t" + str(len(list(filter(lambda x: x > -1, result['clusterLabels']))))
                              + "\t" + str(j+1)                      
                              + "\t" + str(results2.iloc[0,1])
                              + "\t" + str(results2.iloc[0,2])
                              + "\t" + str(results2.iloc[0,4])  
                              + "\t" + str(results2.iloc[0,5])
                              + "\t" + str(len(results2.iloc[0,6].split(";")))  #Count of genes in top term 
                              + "\t" + str(len(gene_clusters[j])) #Total number of genes in the cluster   
                              + "\t" + str(result['timeCost'])
                              + "\t" + str((len(results2.iloc[0,6].split(";")) * len(results2.iloc[0,6].split(";")) /  len(gene_clusters[j])))      
                              , file=f)
                        mappedGeneCount = mappedGeneCount + len(results2.iloc[0,6].split(";"))
                        cluster_score = cluster_score + (len(results2.iloc[0,6].split(";")) * len(results2.iloc[0,6].split(";")) /  len(gene_clusters[j]))
                        # for PCA print(str(i) + "\t"  + str(result["resultShape"].split(" ")[1]) + "\t" + str(result['clusterCount'])
                    numofcomponents.append(i)
                    clustersCounts.append(result['clusterCount'])
                    clusterGeneCounts.append(len(list(filter(lambda x: x > -1, result['clusterLabels'])))) 
                    clusteringScores.append(cluster_score)
                    computationTimes.append(result['timeCost'])
                    mappedGenes.append(mappedGeneCount)  
                
                mainnumofcomponents.append(numofcomponents)
                mainmappedGenes.append(mappedGenes)
                mainclustersCounts.append(clustersCounts)
                mainclusterGeneCounts.append(clusterGeneCounts)
                mainclusteringScores.append(clusteringScores)
                maincomputationTimes.append(computationTimes)
            
            try:
                my_array = np.array(mainnumofcomponents)            
                numofcomponentsmeans = np.mean(my_array, axis=0)
                print(numofcomponentsmeans)              
            except:
                pass
            
            try:
                my_array = np.array(mainmappedGenes)
                # Calculate mean and standard error of mean for each index
                mappedGenesmeans = np.mean(my_array, axis=0)
                mappedGenessem = np.std(my_array, axis=0) / np.sqrt(my_array.shape[0])           
                print(mappedGenesmeans)
                print("mappedGenessem")  
                print(mappedGenessem)
            except:
                pass
            try: 
                my_array = np.array(mainclustersCounts)
                # Calculate mean and standard error of mean for each index
                clustersCountsmeans = np.mean(my_array, axis=0)
                clustersCountssem = np.std(my_array, axis=0) / np.sqrt(my_array.shape[0]) 
                print(clustersCountsmeans)
                print("clustersCountssem")  
                print(clustersCountssem)
            except:
                pass    
                
            try:     
                my_array = np.array(mainclusterGeneCounts)
                # Calculate mean and standard error of mean for each index
                clusterGeneCountsmeans = np.mean(my_array, axis=0)
                clusterGeneCountssem = np.std(my_array, axis=0) / np.sqrt(my_array.shape[0]) 
                print(clusterGeneCountsmeans)
                print("clusterGeneCountssem")  
                print(clusterGeneCountssem)
            except:
                pass 
            
            try:    
                my_array = np.array(mainclusteringScores)
                # Calculate mean and standard error of mean for each index
                clusteringScoresmeans = np.mean(my_array, axis=0)
                clusteringScoressem = np.std(my_array, axis=0) / np.sqrt(my_array.shape[0]) 
                print(clusteringScoresmeans)
                print("clusteringScoressem")  
                print(clusteringScoressem)
            except:
                pass  
            try:  
                my_array = np.array(maincomputationTimes)
                # Calculate mean and standard error of mean for each index
                computationTimesmeans = np.mean(my_array, axis=0)
                computationTimessem = np.std(my_array, axis=0) / np.sqrt(my_array.shape[0]) 
                print(computationTimesmeans)
                print("computationTimessem")  
                print(computationTimessem)
            except:
                pass
            
            print("NumOfComponents\tmappedGenesCount\tClusterCount\tclusterGeneCount\tclusteringScore\tcomputationTimes\t" +
                  "mappedGenesCountSem\tClusterCountSem\tclusterGeneCountSem\tclusteringScoreSem\tcomputationTimesSem"
                  , file=f2)
            for i in range (0, len(mappedGenesmeans)):
                print(str(numofcomponentsmeans[i]) + "\t" +
                      str(mappedGenesmeans[i]) + "\t" +
                      str(clustersCountsmeans[i]) + "\t" +
                      str(clusterGeneCountsmeans[i]) + "\t" +
                      str(clusteringScoresmeans[i]) + "\t" +
                      str(computationTimesmeans[i]) + "\t" +
                      str(mappedGenessem[i]) + "\t" +
                      str(clustersCountssem[i]) + "\t" +
                      str(clusterGeneCountssem[i]) + "\t" +
                      str(clusteringScoressem[i]) + "\t" +
                      str(computationTimessem[i])
                      , file=f2)

            
                        
    print("Finished")

def findSmallestStdev():
    
    df = pd.read_parquet("K562_Orginal_Zscore.parquet")
    df= df.round(3)
    std_dev = df.std()

    # Get column names for the 100 columns with smallest standard deviation
    cols_smallest_std_dev = std_dev.nsmallest(50).index.tolist()

    print("Columns with smallest standard deviation:")
    print('+'.join(cols_smallest_std_dev))
    
def expandGene2(payload):

    try:
        gene = "SLC39A10" if "gene" not in payload else payload["gene"] 
        filter = 0.25 #if "filter" not in payload else payload["filter"] 
        corrFilter = 0.25 #if "corrFilter" not in payload else payload["corrFilter"] 

        edges = []

        
        U = getUpstream( [gene],payload)  
        UASet = set()
        UISet = set()
        UI = None
        UA = None      
        if U is not None:
            UI = U[U[gene] > filter] 
            UA = U[U[gene] < filter*-1]

            
            for pertX in UI.index:
                edges.append({"From":pertX, "To":gene,"id": pertX+"+exp+" +gene, "value":UI.at[pertX,gene], "Type": "UNR", "Type2": "Exp"  })
            for pertX in UA.index:
                edges.append({"From":pertX, "To":gene,"id": pertX+"+exp+" +gene, "value":UA.at[pertX,gene], "Type": "UPR", "Type2": "Exp"  }) 
            UASet.update(UA.index.to_list())
            UISet.update(UI.index.to_list()) 
            UASet.discard(gene) # We need to remove the gene itself from the list
            UASet.discard(gene + "_2") # We need to remove the gene itself from the list 

            
        #Get downstream. We may have multiple sgRNAs per gene. We need to think what to do about it
        D = getDownstream( [gene],payload)   
        DI = None
        DA = None             
        DASet = set()
        DISet = set()
        if D is not None:
            #print("D.shape " + str(D.shape[0]) + " " + str(D.shape[1]) )
            DI = D[D[gene] > filter]            
            DA = D[D[gene] < filter*-1]
            #Link downstream
            for geneX in DI.index:
                edges.append({"From":gene, "To":geneX, "id": gene+"+exp+" +geneX,"value":DI.at[geneX,gene], "Type": "DNR" , "Type2": "Exp"  })
            for geneX in DA.index:
                edges.append({"From":gene, "To":geneX,"id": gene+"+exp+" +geneX, "value":DA.at[geneX,gene], "Type": "DPR" , "Type2": "Exp" })   
            DASet.update(DA.index.to_list())
            DISet.update(DI.index.to_list())
            DASet.discard(gene) # We need to remove the gene itself from the list
            DASet.discard(gene + "_2") # We need to remove the gene itself from the list 
               
            
        #Check whether genes in DA is regulated by any gene in UA
        #Best way would be checking upstream of DA and assess whther any UA is there
        #print("Check point 3")
        if len(DASet)>0:
            UDA = getUpstream(list(DASet),payload)
            addLink(UDA,UASet,"UPR_DPR",edges,filter*-1)
            addLink(UDA,UISet,"UNR_DPR",edges,filter)
            addLink(UDA,DASet,"DPR_DPR",edges,filter*-1) #
            addLink(UDA,DISet,"DNR_DPR",edges,filter) #

        if len(DISet)>0:    
            UDI = getUpstream(list(DISet),payload) #DI set is a genelist
            addLink(UDI,UISet,"UNR_DNR",edges,filter*-1)
            addLink(UDI,UASet,"UPR_DNR",edges,filter)
            addLink(UDI,DISet,"DNR_DNR",edges,filter*-1) #
            addLink(UDI,DASet,"DPR_DNR",edges,filter) #
        
        if len(UASet)>0:
            UUA = getUpstream(list(UASet),payload)
            addLink(UUA,UASet,"UPR_UPR",edges,filter*-1) #
            addLink(UUA,UISet,"UNR_UPR",edges,filter) #
            
        if len(UISet)>0:
            UUI = getUpstream(list(UISet),payload)
            addLink(UUI,UISet,"UNR_UNR",edges,filter*-1) #
            addLink(UUI,UASet,"UPR_UNR",edges,filter) #
                                                    
        #Get Correlating Perturbations
        directCorrPert= getCorrelatingPerturbations([gene], payload)
        if directCorrPert is not None:
            posCorr = directCorrPert[directCorrPert[gene] > corrFilter] 
            negCorr = directCorrPert[directCorrPert[gene] < corrFilter*-1]
            for pertX in posCorr.index:
                edges.append({"From":gene, "To":pertX, "id": pertX+"+cor+" +gene, "value":posCorr.at[pertX,gene], "Type": "DPC" , "Type2": "Corr"  }) #Direct Positive Correlation
            for pertX in negCorr.index:
                edges.append({"From":gene, "To":pertX, "id": pertX+"+cor+" +gene, "value":negCorr.at[pertX,gene], "Type": "DNC" , "Type2": "Corr" })   

        addCorrelation(UI,DI,"UNR_DNR",filter,edges,payload)        
        addCorrelation(UI,DA,"UNR_DPR",filter*-1,edges,payload)        
        addCorrelation(UA,DA,"UPR_DPR",filter,edges,payload)
        addCorrelation(UA,DI,"UPR_DNR",filter*-1,edges,payload)
        addCorrelation(UA,UA,"UPR_UPR",filter,edges,payload)
        addCorrelation(UI,UI,"UNR_UNR",filter,edges,payload)
        addCorrelation(DA,DA,"DPR_DPR",filter,edges,payload)
        addCorrelation(DI,DI,"DNR_DNR",filter,edges,payload)
        addCorrelation(UA,UI,"UPR_UNR",filter*-1,edges,payload)
        addCorrelation(DA,DI,"DPR_DNR",filter*-1,edges,payload)
      
     

        nodeMap = {}
        #Generate nodes
        for edge in edges:
            if edge["From"] not in nodeMap:
                nodeMap[edge["From"]] = {"id":edge["From"]}           
                 
            if edge["To"] not in nodeMap:
                nodeMap[edge["To"]] = {"id":edge["To"]}                        
    
        
        #We would like to get knockdown efficiency for the nodes
        downstream = getDownstream(nodeMap.keys(), payload)
        if downstream is not None:
            indexSet = set(downstream.index.tolist())
            colSet = set(downstream.columns.values)  
          
            for node in nodeMap.keys():
                if(node in indexSet and node in colSet):
                    nodeMap[node]["kd"] = downstream.at[node,node]
                
                if(node in indexSet and node+ "_2" in colSet):
                    nodeMap[node]["kd2"] = downstream.at[node, node+ "_2"]
                
                if node == gene:
                    continue;    
                elif(node in UASet or node+ "_2" in UASet):
                    nodeMap[node]["category"]  = 0
                elif(node in UISet or node+ "_2" in UISet):
                    nodeMap[node]["category"]  = 1
                elif(node in DASet or node+ "_2" in DASet):
                    nodeMap[node]["category"]  = 2  
                elif(node in DISet or node+ "_2" in DISet):
                    nodeMap[node]["category"]  = 3
                          
        
        return json.dumps({"nodes": list(nodeMap.values()), "edges": edges })
    except Exception as ex:    
       print(ex)
       
         
import pickle  
import gzip  
import multiprocessing
from functools import partial

def process_gene(geneX):
    if not os.path.exists("C:/temp/genereg2/" + geneX + ".json.gz"):
        try:
            result = expandGene2(payload = {"gene":geneX})
            if(result == None):
                return (geneX, False)
            with gzip.GzipFile("C:/temp/genereg2/" + geneX + ".json.gz", 'w') as fout:  # write compressed bytes to file
                fout.write(result.encode('utf-8'))
                print("File Saved")
            return (geneX, True)
        except Exception as ex:
            print("File Error")
            print(ex)
            return (geneX, False)
    return (geneX, True)

if __name__ == "__main__":
    #findSmallestStdev()
    #calculateClusterCounts2()
    #calcGeneSignature(payload = {})
    #expandGene(payload = {})
    df = pd.read_parquet("data/K562gwps_data_pert.parquet")
    allgenes = set(df.index.to_list() + df.columns.to_list())
    
    #errors =[]
    #i=0
    
    # Create pool of processes
    pool = multiprocessing.Pool(processes=7) #processes=6

    # Use partial to make a new function that has process_gene as its base but with additional fixed parameters
    func = partial(process_gene)

    # Start counter
    counter = 0

    errors = []
    # imap applies the function to all genes, distributing the work among the processes in the Pool.
    for gene, success in pool.imap(func, allgenes):
        counter += 1
        if not success:
            errors.append(gene)
        print("Completed " + str(counter) + "/" + str(len(allgenes)) + "   %" + str(counter*100/len(allgenes)))

    with open("C:/temp/genereg2/errors.txt", "w") as file:
        file.write(" ".join(str(item) for item in errors))
    
    
    
    