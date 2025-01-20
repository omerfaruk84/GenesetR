import React, { useState } from "react";

import { Tabs } from "@oliasoft-open-source/react-ui-library";
import styles from "./about.module.scss";
import VideoHelpPage from "../../components/video-help";
import helpVideo0 from "../../common/videos/1.webm";
import helpVideo1 from "../../common/videos/2.webm";
import helpVideo2 from "../../common/videos/3.webm";
import helpVideo3 from "../../common/videos/4.webm";
import helpVideo4 from "../../common/videos/5.webm";
import helpVideo5 from "../../common/videos/6.webm";

const AboutPage = () => {
  const [selectedhelp, setSelctedHelp] = useState({
    label: "Correlation",
    value: 0,
  });
  return (
    <div className={styles.mainView}>
      <div className={styles.box}>
        <h1> HELP </h1>
        <div className={styles.helpBody}>
          <Tabs
            name="Help Section"
            options={[
              {
                label: "Correlation",
                value: 0,
              },
              {
                label: "DR & Clustering",
                value: 1,
              },
              {
                label: "Gene Regulation",
                value: 2,
              },
              {
                label: "HeatMap",
                value: 3,
              },
              {
                label: "Path Explorer",
                value: 4,
              },
              {
                label: "Gene Signature",
                value: 5,
              },
            ]}
            value={selectedhelp}
            onChange={(evt) => {
              const { value, label } = evt.target;
              setSelctedHelp({ value, label });
            }}
          />
          {selectedhelp.value === 0 && <VideoHelpPage videoFile={helpVideo0} />}
          {selectedhelp.value === 1 && <VideoHelpPage videoFile={helpVideo1} />}
          {selectedhelp.value === 2 && <VideoHelpPage videoFile={helpVideo2} />}
          {selectedhelp.value === 3 && <VideoHelpPage videoFile={helpVideo3} />}
          {selectedhelp.value === 4 && <VideoHelpPage videoFile={helpVideo4} />}
          {selectedhelp.value === 5 && <VideoHelpPage videoFile={helpVideo5} />}
        </div>
      </div>

      <div className={styles.box}>
        <h1> UPDATES </h1>
        <div className={styles.updateBody}>
          <span className={styles.updateDate}>NEAR FUTURE</span>
          <p>
            As we continuously strive to enhance your experience with GeneSetR,
            we are excited to ¨ share a sneak peek into some groundbreaking
            features slated for our next release:
            <br />
            <br />
            🎺 First of all, recognizing the importance of comprehensive data
            analysis, we are working to increase the range of datasets covered
            by GeneSetR.
            <br />
            🎺 We understand the critical role of speed and efficiency in data
            analysis. That's why our upcoming release will feature a heatmap
            rendering engine that leverages WEBGL technology. This advancement
            will replace the current canvas-based engine, delivering a
            substantial boost in rendering speed and performance.
            <br />
            🎺 GeneSetR will push the heatmap limits to over 1000 X 1000,
            significantly larger than the current ~300 X 300 size limit.
          </p>
          <hr
            style={{
              height: 1,
            }}
          />

          <span className={styles.updateDate}>2025-01-14</span>
          <p>
            We have added several new datasets to GeneSetR. And several other
            ones will be coming very soon.
          </p>
          <hr style={{ height: 1 }} />

          <span className={styles.updateDate}>2025-01-10</span>
          <p>
            Several bugs are fixed. Now, left settings menu can be scrolled
            independently form the main view.
          </p>
          <hr style={{ height: 1 }} />

          <span className={styles.updateDate}>2024-11-25</span>
          <p>
            Now in gene signature module it is possible to search online gene
            signatures from the MSigDB, and add your own gene signature to our
            gene signarue database.
          </p>
          <hr style={{ height: 1 }} />

          <span className={styles.updateDate}>2024-11-14</span>
          <p>
            Genelist module is updated. Now it is easier to manage your gene
            lists.
          </p>
          <hr style={{ height: 1 }} />

          <span className={styles.updateDate}>2024-06-15</span>
          <p>
            We have updated Heat Map component. Now the texts are more readable,
            row names are more visible, and zooming is easier.
          </p>
          <hr style={{ height: 1 }} />

          <span className={styles.updateDate}>2024-03-11</span>
          <p>
            We have done several improvements and fixed various bugs. For
            instance, now it is possible to perform Geneset Enrichment Analyses
            on the Gene-Regulation module too.
          </p>
          <hr style={{ height: 1 }} />

          <span className={styles.updateDate}>2024-01-23</span>
          <p>
            We're pleased to introduce a new update to our GeneSetr application,
            including a module for comparing gene lists. This new feature allows
            users to identify intersections and perform geneset enrichment
            analyses on these overlaps with greater ease. Additionally, we've
            made several improvements to enhance the user experience, including
            the ability to generate gene lists from analysis results across
            different modules. This update aims to provide a more streamlined
            and efficient workflow for our users.
          </p>
          <hr style={{ height: 1 }} />

          <span className={styles.updateDate}>2024-01-16</span>
          <p>
            We are thrilled to introduce our latest addition to GeneSetR:{" "}
            <span style={{ color: "crimson", fontWeight: "bold" }}>
              the Expression Analyzer
            </span>{" "}
            module. This powerful feature enables swift and comprehensive
            analysis of your datasets. <br />
            With the Expression Analyzer module, you can effortlessly delve into
            various aspects of your selected gene of interest:
            <br />* Which genes are up or down regulated upon knockdown of the
            gene?
            <br />* Which perturbations show similar effects to perturbation of
            the gene?
            <br />* Perturbation of which genes up or down regulate the gene of
            interest?
            <br />* Expression of which genes show similar pattern to the
            expression of the gene of interest upon perturbation of genome?
            <br />
            <br />
            <span style={{ color: "crimson", fontWeight: "bold" }}>
              Using TFAtlas dataset:
            </span>
            <br />* Which transcription factors regulate the expression of the
            gene of interest?
            <br />* What are the downstream targets of a selected transcription
            factor?
            <br />
            <br />
            <span style={{ color: "crimson", fontWeight: "bold" }}>
              You can perform even more interesting analyses!
            </span>{" "}
            For instance, you can assess correlation of perturbations by
            limitting correlation analyzes to a subset of genes. This would
            answer the question of which perturbations lead to similar response
            in terms of a pathway or process of interest.
          </p>
          <hr style={{ height: 1 }} />

          <span className={styles.updateDate}>2024-01-05</span>
          <p>
            Fixed several bugs: * The copy function in geneset enrichment
            analyses was not working on certain browsers.
            <br />* Enrichment results were not getting updated in heatmap, when
            a new cluster was selected.
            <br />* Heatmap width was not set properly, when number of genes
            were low.
          </p>
          <hr style={{ height: 1 }} />

          <span className={styles.updateDate}>2023-10-15</span>
          <p>
            Added data from Transcription factor atlas. This dataset contains
            data from the recently published study of Joung et al. where they
            overexpressed almost all annotated human TF splice isoforms (more
            than 3,500) in human embryonic stem cells and performed single cell
            RNA-Sequencing. Using this dataset, you can identify transcription
            factors that regulate your gene of interest or genes that are
            regulated by your gene of intetrest. You can custer your gene list
            based on this dataset which would lead to a clustering based on
            regulation of your genes through transcription factor initiated
            signaling.
          </p>
          <hr style={{ height: 1 }} />

          <span className={styles.updateDate}>2023-09-25</span>
          <p>
            We are thrilled to announce that GeneSetR version 1.0.0 is
            officially live! This marks a significant milestone in our journey
            to provide a comprehensive and user-friendly tool for Perturb-Seq
            data analysis.
          </p>
        </div>
      </div>

      <div className={styles.box}>
        <h1> DATASETS </h1>
        <div className={styles.tableContainer}>
          <table>
            <thead>
              <tr>
                <th>Dataset Name</th>
                <th>Publication</th>
                <th>Type</th>
                <th>Cell Line</th>
                <th>Number of Perturbations</th>
                <th>Number of Detected Genes</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>K562 Whole Genome</td>
                <td>
                  Mapping information-rich genotype-phenotype landscapes with
                  genome-scale Perturb-seq
                </td>
                <td>CRISPRi</td>
                <td>K562</td>
                <td>11,258</td>
                <td>8,248</td>
              </tr>
              <tr>
                <td>K562 Essential</td>
                <td>
                  Mapping information-rich genotype-phenotype landscapes with
                  genome-scale Perturb-seq
                </td>
                <td>CRISPRi</td>
                <td>K562</td>
                <td>2,285</td>
                <td>8,563</td>
              </tr>
              <tr>
                <td>RPE1 Essential</td>
                <td>
                  Mapping information-rich genotype-phenotype landscapes with
                  genome-scale Perturb-seq
                </td>
                <td>CRISPRi</td>
                <td>RPE1</td>
                <td>2,679</td>
                <td>8,749</td>
              </tr>
              <tr>
                <td>Transcription Factor Atlas</td>
                <td>
                  A transcription factor atlas of directed differentiation
                </td>
                <td>ORF overexpression</td>
                <td>hESCs</td>
                <td>3,367</td>
                <td>37,528</td>
              </tr>
              <tr>
                <td>Jurkat Essential</td>
                <td>
                  Decoding Heterogenous Single-cell Perturbation Responses
                </td>
                <td>CRISPRi</td>
                <td>Jurkat</td>
                <td>1,514</td>
                <td>8,811</td>
              </tr>
              <tr>
                <td>Calu-3 SARS-CoV-2 host factors</td>
                <td>
                  Systematic functional interrogation of SARS-CoV-2 host factors
                  using Perturb-seq
                </td>
                <td>CRISPRi</td>
                <td>Calu-3</td>
                <td>175</td>
                <td>11,486</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className={styles.box}>
        <h1> CONTACT US </h1>
        <div className={styles.contactBody}>
          <p>
            {" "}
            <strong>
              We welcome your input and collaboration! If you encounter any
              issues, have suggestions for new datasets, innovative ideas, or
              are interested in contributing to the development of GeneSetR,
              please don't hesitate to
              <a href="mailto:omerfk@ibv.uio.no"> reach out to us 📧</a>. Your
              feedback and contributions are invaluable in helping us improve
              and grow GeneSetR.
            </strong>
          </p>
          <div className={styles.nameAndMail}>
            <strong>
              Dr. Omer Kuzu
              <br />
              & <br />
              Prof. Fahri Saatcioglu
            </strong>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AboutPage;
