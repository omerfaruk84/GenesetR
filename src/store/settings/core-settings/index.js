import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { fetchDatasets } from "../../api";
const defaultGeneList = `TAF1C
  ACTR5
  UTP6
  RPS19
  GTF2E1
  RIMBP3B
  RCL1
  GEMIN4
  EIF1AD
  GSC2
  FBRS
  COPS3
  PAXBP1
  NAT10
  RPS21
  LAMTOR3
  CSTF3
  URB1
  CSNK2B
  TTC14
  SPATA5
  C22orf31
  VPS41
  SBDS
  TAF8
  TTC4
  WDR61
  ZNHIT3
  EIF3H
  LSM12
  KAT7
  RASL10A
  C19orf53
  CLNS1A
  RIMBP3
  MTOR
  YEATS2
  GEMIN7
  EIF4E
  SSRP1
  TAF12
  ATF4
  DKC1
  GGTLC2
  FBXO7
  PLA2G3
  PPRC1
  TAF5
  C1orf109
  WDR3
  EXOSC2
  ZMYND11
  UBXN7
  GPN2
  DGCR2
  CTBP2
  PRR14L
  MLST8
  DOHH
  YWHAH
  EXOSC10
  EFTUD2
  CTBP1
  NELFB
  RPS3
  HIRA
  EIF3F
  USP7
  NHP2
  NELFA
  NOP10
  PDPK1
  SPATA5L1
  RPTOR
  TAF4
  EIF5A
  WDR18
  SBNO1
  PRPF40A
  TPT1
  DHPS
  TAF2
  SETD1A
  SRRD`;

const initialState = {
  currentModule: "pca",
  cellLine: {       
        id: "K562gwps",
        name: "K562 Whole Genome",
        parent: 0,
        active: true,
        resultShape: "11258 8248",
        perturbationCount: 11258,
        geneCount: 8248,
        isMixscape: false,
        isWholeGenome: true
      },
  dataType: "pert",
  peturbationList: defaultGeneList,
  targetGeneList: "",
  graphType: "2D",
  datasetList: [], // Will be populated from backend
  mixscapePerturbed: true,
  mixscapeAll: true,
  datasetAdded: false,
  lastTaskID: null,
  datasetsLoading: false,
  datasetsError: null,
};

// Async thunk to fetch datasets from backend
export const fetchDatasetsFromBackend = createAsyncThunk(
  'core/fetchDatasets',
  async (_, { rejectWithValue }) => {
    try {
      const datasets = await fetchDatasets();
      return datasets;
    } catch (error) {
      return rejectWithValue(error.message);
    }
  }
);

export const coreSettingsSlice = createSlice({
  name: "core",
  initialState,
  reducers: {
    coreSettingsChanged: (state, action) => {
      const { settingName, newValue } = action.payload;
      state[settingName] = newValue;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchDatasetsFromBackend.pending, (state) => {
        state.datasetsLoading = true;
        state.datasetsError = null;
      })
      .addCase(fetchDatasetsFromBackend.fulfilled, (state, action) => {
        state.datasetsLoading = false;
        state.datasetList = action.payload;
        // Update cellLine to first available dataset if current one doesn't exist
        if (action.payload.length > 0) {
          const currentExists = action.payload.find(dataset => dataset.id === state.cellLine.id);
          if (!currentExists) {
            state.cellLine = action.payload[0];
          } else {
            // Update cellLine with latest data from backend
            state.cellLine = currentExists;
          }
        }
      })
      .addCase(fetchDatasetsFromBackend.rejected, (state, action) => {
        state.datasetsLoading = false;
        state.datasetsError = action.payload;
      });
  },
});

export const { coreSettingsChanged } = coreSettingsSlice.actions;

const coreSettingsReducer = coreSettingsSlice.reducer;

export { coreSettingsReducer };
