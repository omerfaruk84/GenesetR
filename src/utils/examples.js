/**
 * Curated examples for the "Example" menus: gene sets that give a clear,
 * interpretable result, so a first-time visitor sees what a module is for.
 */

/** Gene lists (complexes and pathways whose members cluster together). */
export const EXAMPLE_GENE_SETS = [
  {
    id: "mediator",
    name: "Mediator complex",
    about: "Subunits of the Mediator co-activator; knock-downs give near-identical profiles",
    genes: [
      "MED1", "MED4", "MED6", "MED7", "MED8", "MED9", "MED10", "MED11", "MED12", "MED13",
      "MED14", "MED15", "MED16", "MED17", "MED18", "MED19", "MED20", "MED21", "MED22", "MED23",
      "MED24", "MED25", "MED26", "MED27", "MED28", "MED29", "MED30", "MED31", "CCNC", "CDK8",
    ],
  },
  {
    id: "isr-upr",
    name: "Integrated stress response and UPR",
    about: "eIF2 kinases, eIF2B, ATF4 targets and the three ER stress sensors",
    genes: [
      "ATF4", "DDIT3", "EIF2AK3", "EIF2AK4", "EIF2S1", "EIF2B1", "EIF2B2", "EIF2B3", "EIF2B4",
      "EIF2B5", "PPP1R15A", "GCN1", "HSPA5", "XBP1", "ERN1", "ATF6", "DNAJB9", "HERPUD1",
      "SEL1L", "SYVN1", "EDEM1",
    ],
  },
  {
    id: "ribosome-biogenesis",
    name: "Ribosome biogenesis",
    about: "Small-subunit processome and snoRNP proteins",
    genes: [
      "UTP3", "UTP4", "UTP6", "UTP11", "UTP14A", "UTP15", "UTP18", "UTP20", "WDR3", "WDR36",
      "WDR43", "WDR75", "NOP56", "NOP58", "FBL", "DKC1", "NAT10", "RCL1", "BMS1", "IMP3",
      "IMP4", "MPHOSPH10", "NOL6", "NOL11", "HEATR1", "PWP2", "TBL3", "KRR1", "RRP9", "DDX10",
    ],
  },
  {
    id: "mtorc1",
    name: "mTORC1 and amino-acid sensing",
    about: "mTORC1, TSC, Rag GTPases, Ragulator, GATOR1 and GATOR2",
    genes: [
      "MTOR", "RPTOR", "MLST8", "AKT1S1", "RHEB", "TSC1", "TSC2", "RRAGA", "RRAGC", "LAMTOR1",
      "LAMTOR2", "LAMTOR3", "LAMTOR4", "LAMTOR5", "FLCN", "FNIP1", "NPRL2", "NPRL3", "DEPDC5",
      "SLC38A9", "WDR24", "WDR59", "MIOS", "SEH1L",
    ],
  },
  {
    id: "proteasome",
    name: "Proteasome",
    about: "Core (PSMA/PSMB) and regulatory (PSMC/PSMD) particle subunits",
    genes: [
      "PSMA1", "PSMA2", "PSMA3", "PSMA4", "PSMA5", "PSMA6", "PSMA7", "PSMB1", "PSMB2", "PSMB3",
      "PSMB4", "PSMB5", "PSMB6", "PSMB7", "PSMC1", "PSMC2", "PSMC3", "PSMC4", "PSMC5", "PSMC6",
      "PSMD1", "PSMD2", "PSMD3", "PSMD4", "PSMD6", "PSMD7", "PSMD11", "PSMD12", "PSMD13", "PSMD14",
    ],
  },
];

/** Signature formulas: "+" genes go up, "-" genes go down. */
export const EXAMPLE_SIGNATURES = [
  {
    id: "upr",
    name: "Unfolded protein response",
    about: "ER chaperones and ERAD genes up, housekeeping genes down",
    formula:
      "HSPA5+DDIT3+EDEM1+PPP1R15A+HERPUD1+DNAJC3+DNAJB9+DNAJB11+MANF+SDF2L1+HSP90B1+SELENOK+CDK2AP2+CALR-TUBB-SLC25A3-PTMA-PRDX1-PPIA-TUBB4B-HSPE1-CD59",
  },
  {
    id: "isr",
    name: "Integrated stress response (ATF4 targets)",
    about: "Amino-acid synthesis and transport genes induced by ATF4",
    formula: "ATF4+DDIT3+ASNS+TRIB3+CHAC1+SESN2+SLC7A11+PSAT1+PHGDH+SHMT2+MTHFD2+VEGFA+ATF3+DDIT4",
  },
  {
    id: "cholesterol",
    name: "Cholesterol biosynthesis (SREBP targets)",
    about: "Sterol synthesis and uptake genes",
    formula: "HMGCR+HMGCS1+LDLR+INSIG1+SQLE+FDFT1+IDI1+MVD+LSS+DHCR7+SC5D+FDPS+ACAT2",
  },
];

/**
 * Signatures for the "TF regulators" page: genes that go up and genes that go
 * down, with the transcription factor the analysis is expected to find.
 */
export const EXAMPLE_REGULATOR_SETS = [
  {
    id: "myc-targets",
    name: "MYC targets",
    about: "Nucleolar and metabolic genes induced by MYC; MYC and MAX come first",
    up: ["NCL", "NPM1", "LDHA", "PPA1", "SNRPD1", "EBNA1BP2", "NOP56", "FBL", "CDK4", "ODC1"],
    down: [],
  },
  {
    id: "p53-targets",
    name: "p53 targets",
    about: "Genes induced by p53; TP53 comes first",
    up: ["CDKN1A", "MDM2", "BAX", "FAS", "RRM2B", "SESN1", "TP53I3", "ZMAT3", "BTG2", "PLK3", "GDF15", "TNFRSF10B"],
    down: [],
  },
  {
    id: "upr",
    name: "Unfolded protein response (up and down)",
    about: "ER chaperones and ERAD genes up, housekeeping genes down; XBP1 comes first",
    up: ["HSPA5", "DDIT3", "EDEM1", "PPP1R15A", "HERPUD1", "DNAJC3", "DNAJB9", "DNAJB11", "MANF", "SDF2L1", "HSP90B1", "SELENOK", "CALR"],
    down: ["TUBB", "SLC25A3", "PTMA", "PRDX1", "PPIA", "TUBB4B", "HSPE1", "CD59"],
  },
];

/**
 * Signatures for the signature mode of the "Integrated analysis" page, with the
 * perturbed genes the analysis is expected to find.
 */
export const EXAMPLE_INTEGRATED_SIGNATURES = [
  {
    id: "cholesterol",
    name: "Cholesterol synthesis",
    about: "Sterol synthesis and uptake genes; the SREBP pathway (MBTPS1, SCAP, MBTPS2, SREBF2) is needed for them",
    up: ["HMGCS1", "HMGCR", "LDLR", "INSIG1", "SQLE", "FDFT1", "IDI1", "MVD", "DHCR7", "SC5D", "FDPS", "LSS", "ACAT2", "STARD4"],
    down: [],
  },
  {
    id: "isr",
    name: "ATF4 targets",
    about: "Amino-acid synthesis and transport genes of the integrated stress response",
    up: ["DDIT3", "ASNS", "TRIB3", "CHAC1", "SESN2", "SLC7A11", "PSAT1", "PHGDH", "SHMT2", "MTHFD2", "ATF3", "DDIT4"],
    down: [],
  },
  {
    id: "upr",
    name: "Unfolded protein response (up and down)",
    about: "ER chaperones and ERAD genes up, housekeeping genes down",
    up: ["HSPA5", "DDIT3", "EDEM1", "PPP1R15A", "HERPUD1", "DNAJC3", "DNAJB9", "DNAJB11", "MANF", "SDF2L1", "HSP90B1", "SELENOK", "CALR"],
    down: ["TUBB", "SLC25A3", "PTMA", "PRDX1", "PPIA", "TUBB4B", "HSPE1", "CD59"],
  },
];

/** Lists of perturbed genes for the "common effects" mode of the "Integrated analysis" page. */
export const EXAMPLE_PERTURBATION_SETS = [
  {
    id: "proteasome",
    name: "Proteasome subunits",
    about: "Their loss raises heat-shock and ubiquitin genes (HSPA1A, UBC, SQSTM1)",
    genes: ["PSMA1", "PSMB3", "PSMD4", "PSMC3", "PSMA6", "POMP"],
  },
  {
    id: "srebp",
    name: "SREBP pathway",
    about: "Site-1 and site-2 proteases, SCAP and SREBF2",
    genes: ["MBTPS1", "MBTPS2", "SCAP", "SREBF2"],
  },
  {
    id: "mediator",
    name: "Mediator subunits",
    about: "Subunits of the Mediator co-activator",
    genes: ["MED12", "MED14", "MED17", "MED20", "MED23", "MED24", "MED30"],
  },
];

/**
 * Gene lists for the "Gene list" tab of the Function atlas: complexes whose
 * members separate into blocks on the similarity heatmap.
 */
export const EXAMPLE_ATLAS_LISTS = [
  {
    id: "integrator",
    name: "Integrator, Mediator and exosome",
    about: "Three complexes of RNA synthesis and decay; Integrator splits into its modules (INTS10/13/14/15 apart from the core)",
    genes: [
      "INTS1", "INTS2", "INTS3", "INTS4", "INTS5", "INTS6", "INTS7", "INTS8", "INTS9", "INTS10",
      "INTS11", "INTS12", "INTS13", "INTS14", "INTS15", "MED12", "MED14", "MED17", "MED20", "MED23",
      "MED24", "MED30", "EXOSC2", "EXOSC3", "EXOSC4", "EXOSC5", "EXOSC6", "EXOSC7", "EXOSC8", "EXOSC9",
      "EXOSC10", "DIS3",
    ],
  },
];
