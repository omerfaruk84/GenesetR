import { ROUTES } from "../../common/routes";
import { TabNames } from "./enums";

/**
 * The navigation, organised by the question a visitor comes with rather than
 * by method. Used by the top bar and by the start page.
 *
 * Each item: { name, to, about } - `about` is a one-line description.
 * Items flagged `advanced` are alternative renderings of another page.
 * Items flagged `secondary` also appear in an earlier group; they do not mark
 * their group as the current one.
 */
export const NAV_GROUPS = [
  {
    id: "gene",
    title: "Explore a gene",
    question: "What does my gene do, and what controls it?",
    items: [
      { name: "Gene page", to: ROUTES.GENE, about: "Everything about one gene across all datasets" },
      { name: "Explore a drug", to: ROUTES.DRUG, about: "One drug in 47 cell lines: response by dose, genes it changes, similar drugs and knock-downs" },
      { name: TabNames.GENE_REGULATION, to: ROUTES.GENE_REGULATION, about: "Network of regulators and targets of a gene" },
      { name: TabNames.GENE_REGULATION_ENHANCED, to: ROUTES.GENE_REGULATION_ENHANCED, about: "Regulation network combined over several datasets" },
      { name: TabNames.EXPRESSIONANALYZER, to: ROUTES.EXPRESSIONANALYZER, about: "What changes a gene's expression, and what it changes" },
      { name: TabNames.CELL_CYCLE, to: ROUTES.CELL_CYCLE, about: "Which perturbations push cells into G1, S or G2/M, in every dataset" },
      { name: "Integrated analysis", to: ROUTES.INTEGRATED, about: "Consensus targets and regulators of a gene over all knock-down datasets", secondary: true },
    ],
  },
  {
    id: "geneset",
    title: "Explore a gene set",
    question: "How do the genes in my list relate to each other?",
    items: [
      { name: TabNames.CORRELATION, to: ROUTES.CORRELATION, about: "Clustered correlation map of knock-down or expression profiles" },
      { name: TabNames.DR, to: ROUTES.DR, about: "PCA, UMAP, t-SNE or MDE with clustering and enrichment" },
      { name: TabNames.HEATMAP, to: ROUTES.HEATMAP, about: "Expression of chosen genes under chosen perturbations" },
      { name: TabNames.GENESIGNATURE, to: ROUTES.GENESIGNATURE, about: "Perturbations that switch a gene signature on or off" },
      { name: TabNames.DEREGULATED_GENES, to: ROUTES.DEREGULATED_GENES, about: "Genes that a set of perturbations changes in common" },
      { name: "TF regulators", to: ROUTES.TF_REGULATORS, about: "Transcription factors that switch a gene set on or off, from overexpression and knock-down" },
      { name: TabNames.GENELISTCOMPARE, to: ROUTES.GENELISTCOMPARE, about: "Saved gene lists and their overlaps" },
    ],
  },
  {
    id: "contexts",
    title: "Compare contexts",
    question: "Is an effect the same in other cell types?",
    items: [
      { name: "Integrated analysis", to: ROUTES.INTEGRATED, about: "Effects that reproduce across cell contexts: all knock-down datasets combined, for a gene, a signature or a gene list" },
      { name: TabNames.MULTIDATASET_COMPARISON, to: ROUTES.MULTIDATASET_COMPARISON, about: "One gene's effects side by side in the genome-wide datasets" },
      { name: "Gene page: conservation", to: ROUTES.GENE, about: "How well a knock-down profile is conserved between datasets", secondary: true },
      { name: TabNames.DATASETS, to: ROUTES.DATASETS, about: "Cell lines, perturbation types and sizes of all datasets", secondary: true },
    ],
  },
  {
    id: "mechanisms",
    title: "Find mechanisms",
    question: "How are these genes connected?",
    items: [
      { name: TabNames.PATHFINDER, to: ROUTES.PATHFINDER, about: "Regulatory paths that connect the genes of a list" },
      { name: "TF regulators", to: ROUTES.TF_REGULATORS, about: "Activators and repressors of a gene set, supported by overexpression and knock-down", secondary: true },
      { name: "Drug and gene connectivity", to: ROUTES.DRUG, about: "Knock-downs whose profile mimics or reverses a drug", secondary: true },
      { name: TabNames.GENE_REGULATION, to: ROUTES.GENE_REGULATION, about: "Upstream and downstream network of one gene", secondary: true },
      { name: TabNames.GENE_REGULATION_ENHANCED, to: ROUTES.GENE_REGULATION_ENHANCED, about: "Network with evidence from several datasets", secondary: true },
    ],
  },
  {
    id: "data",
    title: "Bring your data",
    question: "Can I analyse my own experiment here?",
    items: [
      { name: "Project my signature", to: ROUTES.PROJECT_SIGNATURE, about: "Find perturbations that mimic or reverse your differential-expression result" },
      { name: TabNames.UPLOAD_DATASET, to: ROUTES.UPLOAD_DATASET, about: "Analyse your own expression matrix with every module" },
      { name: TabNames.GENESIGNATURE, to: ROUTES.GENESIGNATURE, about: "Find perturbations that reproduce your up/down gene list", secondary: true },
    ],
  },
];

/** Plain links shown next to the groups. */
export const NAV_LINKS = [
  { name: TabNames.DATASETS, to: ROUTES.DATASETS },
  { name: TabNames.ABOUT, to: ROUTES.ABOUTUS },
];
