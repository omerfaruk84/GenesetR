import React, { useState } from "react";
import { Link } from "react-router-dom";
import { ROUTES } from "../../common/routes";
import styles from "./about.module.scss";
import { SERVER_ADDRESS } from "../../store/api/config";
import VideoHelpPage from "../../components/video-help";
import helpVideo0 from "../../common/videos/1.webm";
import helpVideo1 from "../../common/videos/2.webm";
import helpVideo2 from "../../common/videos/3.webm";
import helpVideo3 from "../../common/videos/4.webm";
import helpVideo4 from "../../common/videos/5.webm";
import helpVideo5 from "../../common/videos/6.webm";

const HELP_TABS = [
  { label: "Correlation", video: helpVideo0 },
  { label: "DR & Clustering", video: helpVideo1 },
  { label: "Gene Regulation", video: helpVideo2 },
  { label: "HeatMap", video: helpVideo3 },
  { label: "Path Explorer", video: helpVideo4 },
  { label: "Gene Signature", video: helpVideo5 },
  { label: "API" },
];

const Em = ({ children }) => <strong className={styles.em}>{children}</strong>;

// Newest first. `body` is a paragraph or a list of lines.
const UPDATES = [
  {
    date: "2025-12-20",
    title: "GeneSetR v2 released",
    items: [
      "New whole-genome Perturb-Seq datasets: HCT116 and HEK293 (plus merged GWPS datasets: intersection/union, and a new K562GWPS analysis dataset)",
      "GWPS datasets integrated across many modules for consistent cross-module comparisons",
      "New modules: MultiDataset Comparison, Gene Regulation+, Cell Cycle, Deregulated Genes",
      "Upload your own datasets (CSV/TSV/TXT) for temporary analysis",
      "Many bug fixes and stability improvements (including memory leak fixes)",
      "Programmatic access (API) for pipelines and scripts (see the API tab under Help)",
    ],
  },
  {
    date: "Near future",
    body: "As we continuously strive to enhance your experience with GeneSetR, we are excited to share a sneak peek into some features slated for our next release:",
    items: [
      "First of all, recognizing the importance of comprehensive data analysis, we are working to increase the range of datasets covered by GeneSetR.",
      "We understand the critical role of speed and efficiency in data analysis. That's why our upcoming release will feature a heatmap rendering engine that leverages WebGL technology. This advancement will replace the current canvas-based engine, delivering a substantial boost in rendering speed and performance.",
      "GeneSetR will push the heatmap limits to over 1000 × 1000, significantly larger than the current ~300 × 300 size limit.",
    ],
  },
  {
    date: "2025-02-15",
    body: "We've made significant improvements to enhance your GeneSetR experience:",
    items: [
      "Fixed a severe bug that was causing memory leaks and freezing during heatmap plotting, ensuring smoother and more stable performance.",
      "Enhanced application responsiveness across different screen sizes for better accessibility on various devices.",
      "Improved user interface with comprehensive guidelines for each module, making navigation and usage more intuitive.",
    ],
  },
  { date: "2025-02-14", body: "A major bug leading to memory leak and crashes has been fixed." },
  { date: "2025-02-07", body: "We have added three new datasets to GeneSetR. And some small bugs are fixed." },
  { date: "2025-01-20", body: "5 more datasets are added to GeneSetR. Several bugs are fixed." },
  {
    date: "2025-01-14",
    body: "We have added several new datasets to GeneSetR. And several other ones will be coming very soon.",
  },
  {
    date: "2025-01-10",
    body: "Several bugs are fixed. Now, left settings menu can be scrolled independently from the main view.",
  },
  {
    date: "2024-11-25",
    body: "Now in gene signature module it is possible to search online gene signatures from the MSigDB, and add your own gene signature to our gene signature database.",
  },
  { date: "2024-11-14", body: "Genelist module is updated. Now it is easier to manage your gene lists." },
  {
    date: "2024-06-15",
    body: "We have updated Heat Map component. Now the texts are more readable, row names are more visible, and zooming is easier.",
  },
  {
    date: "2024-03-11",
    body: "We have done several improvements and fixed various bugs. For instance, now it is possible to perform Geneset Enrichment Analyses on the Gene-Regulation module too.",
  },
  {
    date: "2024-01-23",
    body: "We're pleased to introduce a new update to our GeneSetR application, including a module for comparing gene lists. This new feature allows users to identify intersections and perform geneset enrichment analyses on these overlaps with greater ease. Additionally, we've made several improvements to enhance the user experience, including the ability to generate gene lists from analysis results across different modules. This update aims to provide a more streamlined and efficient workflow for our users.",
  },
  {
    date: "2024-01-16",
    content: (
      <>
        <p>
          We are thrilled to introduce our latest addition to GeneSetR: <Em>the Expression Analyzer</Em> module. This
          powerful feature enables swift and comprehensive analysis of your datasets. With the Expression Analyzer
          module, you can effortlessly delve into various aspects of your selected gene of interest:
        </p>
        <ul>
          <li>Which genes are up or down regulated upon knockdown of the gene?</li>
          <li>Which perturbations show similar effects to perturbation of the gene?</li>
          <li>Perturbation of which genes up or down regulate the gene of interest?</li>
          <li>
            Expression of which genes show similar pattern to the expression of the gene of interest upon perturbation
            of genome?
          </li>
        </ul>
        <p>
          <Em>Using TFAtlas dataset:</Em>
        </p>
        <ul>
          <li>Which transcription factors regulate the expression of the gene of interest?</li>
          <li>What are the downstream targets of a selected transcription factor?</li>
        </ul>
        <p>
          <Em>You can perform even more interesting analyses!</Em> For instance, you can assess correlation of
          perturbations by limiting correlation analyses to a subset of genes. This would answer the question of which
          perturbations lead to similar response in terms of a pathway or process of interest.
        </p>
      </>
    ),
  },
  {
    date: "2024-01-05",
    body: "Fixed several bugs:",
    items: [
      "The copy function in geneset enrichment analyses was not working on certain browsers.",
      "Enrichment results were not getting updated in heatmap, when a new cluster was selected.",
      "Heatmap width was not set properly, when number of genes were low.",
    ],
  },
  {
    date: "2023-10-15",
    body: "Added data from Transcription factor atlas. This dataset contains data from the recently published study of Joung et al. where they overexpressed almost all annotated human TF splice isoforms (more than 3,500) in human embryonic stem cells and performed single cell RNA-Sequencing. Using this dataset, you can identify transcription factors that regulate your gene of interest or genes that are regulated by your gene of interest. You can cluster your gene list based on this dataset which would lead to a clustering based on regulation of your genes through transcription factor initiated signaling.",
  },
  {
    date: "2023-09-25",
    body: "We are thrilled to announce that GeneSetR version 1.0.0 is officially live! This marks a significant milestone in our journey to provide a comprehensive and user-friendly tool for Perturb-Seq data analysis.",
  },
];

const AboutPage = () => {
  const API_BASE_URL = SERVER_ADDRESS;
  const swaggerUrl = `${API_BASE_URL}/docs`;
  const redocUrl = `${API_BASE_URL}/redoc`;
  const openapiUrl = `${API_BASE_URL}/openapi.json`;

  const [selected, setSelected] = useState(0);
  const tab = HELP_TABS[selected];

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <section className={styles.section}>
          <h1>Help</h1>
          <p className={styles.lead}>
            A short silent demonstration of each module. Every analysis page also has a “How to read this” button next
            to its result.
          </p>
          <div className={styles.tabs} role="tablist" aria-label="Help Section">
            {HELP_TABS.map((item, index) => (
              <button
                key={item.label}
                type="button"
                role="tab"
                aria-selected={index === selected}
                className={`${styles.tab} ${index === selected ? styles.tabActive : ""}`}
                onClick={() => setSelected(index)}
              >
                {item.label}
              </button>
            ))}
          </div>
          {tab.video ? (
            <VideoHelpPage key={tab.label} videoFile={tab.video} />
          ) : (
            <div className={styles.card}>
              <h2>Programmatic API</h2>
              <p>
                GeneSetR exposes a REST API for programmatic access. Interactive documentation is available via Swagger
                UI and ReDoc.
              </p>
              <p>
                To request an API key, email <a href="mailto:omerfk@uio.no">omerfk@uio.no</a> and briefly describe your
                use case (endpoints needed, expected request volume, and whether it is academic or commercial).
              </p>
              <ul>
                <li>
                  <a href={swaggerUrl} target="_blank" rel="noreferrer">
                    Swagger UI
                  </a>
                </li>
                <li>
                  <a href={redocUrl} target="_blank" rel="noreferrer">
                    ReDoc
                  </a>
                </li>
                <li>
                  <a href={openapiUrl} target="_blank" rel="noreferrer">
                    OpenAPI JSON
                  </a>
                </li>
              </ul>
              <p>
                If API keys are enabled on the server, include <code>X-API-Key</code> in your requests.
              </p>
              <pre className={styles.codeBlock}>
                {`curl -H "X-API-Key: <your-key>" "${API_BASE_URL}/api/v1/datasets"`}
              </pre>
            </div>
          )}
        </section>

        <section className={styles.section}>
          <h1>Datasets</h1>
          <p className={styles.lead}>
            The list of datasets, with cell line, perturbation type, size, citation and licence, is on the{" "}
            <Link to={ROUTES.DATASETS}>Datasets page</Link>. It is generated from the same registry the analyses use,
            so it is always up to date.
          </p>
        </section>

        <section className={styles.section}>
          <h1>Updates</h1>
          <ol className={styles.timeline}>
            {UPDATES.map((update) => (
              <li key={update.date} className={styles.update}>
                <div className={styles.updateDate}>{update.date}</div>
                <div className={styles.updateBody}>
                  {update.title && <h3>{update.title}</h3>}
                  {update.body && <p>{update.body}</p>}
                  {update.items && (
                    <ul>
                      {update.items.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  )}
                  {update.content}
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className={styles.section}>
          <h1>Contact us</h1>
          <div className={`${styles.card} ${styles.contact}`}>
            <p>
              We welcome your input and collaboration! If you encounter any issues, have suggestions for new datasets,
              innovative ideas, or are interested in contributing to the development of GeneSetR, please don't hesitate
              to <a href="mailto:omerfk@ibv.uio.no">reach out to us</a>. Your feedback and contributions are invaluable
              in helping us improve and grow GeneSetR.
            </p>
            <div className={styles.names}>
              Dr. Omer Kuzu
              <span>&amp;</span>
              Prof. Fahri Saatcioglu
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default AboutPage;
