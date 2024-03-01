import { createSlice } from "@reduxjs/toolkit";
import { CoreSettingsTypes } from "../../../components/side-bar/settings/enums";
import { connect } from "react-redux";
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
  cellLine: ["K562gwps", "11258 8248"],
  dataType: "pert",
  peturbationList: defaultGeneList,
  targetGeneList: "",
  graphType: "2D",
  datasetList: [
    {
      droppable: true,
      id: "K562gwps",
      name: "K562 Whole Genome",
      parent: 0,
      active: true,
    },
    {
      droppable: true,
      id: "K562essential",
      name: "K562 Essential",
      details: "Main",

      parent: 0,
    },
    {
      droppable: true,
      id: "RPE1essential",
      name: "RPE1 Essential",

      parent: 0,
    },
  ],
};

export const coreSettingsSlice = createSlice({
  name: "core",
  initialState,
  reducers: {
    coreSettingsChanged: (state, action) => {
      const { settingName, newValue } = action.payload;
      state[settingName] = newValue;
    },
  },
});

export const { coreSettingsChanged } = coreSettingsSlice.actions;

const coreSettingsReducer = coreSettingsSlice.reducer;

export { coreSettingsReducer };
