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
      { name: TabNames.GENE_REGULATION, to: ROUTES.GENE_REGULATION, about: "Network of regulators and targets of a gene" },
      { name: TabNames.GENE_REGULATION_ENHANCED, to: ROUTES.GENE_REGULATION_ENHANCED, about: "Regulation network combined over several datasets" },
      { name: TabNames.EXPRESSIONANALYZER, to: ROUTES.EXPRESSIONANALYZER, about: "What changes a gene's expression, and what it changes" },
      { name: TabNames.CELL_CYCLE, to: ROUTES.CELL_CYCLE, about: "Cell-cycle phase shifts caused by a perturbation" },
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
      { name: TabNames.GENELISTCOMPARE, to: ROUTES.GENELISTCOMPARE, about: "Saved gene lists and their overlaps" },
      { name: TabNames.CORRELATION_WEBGL, to: ROUTES.CORRELATION_WEBGL, about: "Correlation map, WebGL renderer for large lists", advanced: true },
      { name: TabNames.CORRELATION_FAST, to: ROUTES.CORRELATION_FAST, about: "Correlation map, fast cluster renderer", advanced: true },
    ],
  },
  {
    id: "contexts",
    title: "Compare contexts",
    question: "Is an effect the same in other cell types?",
    items: [
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
