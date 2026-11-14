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
