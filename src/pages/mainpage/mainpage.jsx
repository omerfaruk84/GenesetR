import React from "react";
import { Link } from "react-router-dom";
import { FaGithub } from "react-icons/fa";
import styles from "./mainpage.module.scss";
import V2ReleasePopup from "../../components/v2-release-popup";
import { GeneSearch } from "../../components/gene-search";
import { NAV_GROUPS } from "../../components/top-bar/navigation";
import { startTour } from "../../components/tour";

const MainPage = () => {
  return (
    <>
      <V2ReleasePopup />
      <div className={styles.page}>
        <header className={styles.hero}>
          <h1>GeneSetR</h1>
          <p className={styles.lead}>
            Capitalizing on the power of Genome-wide Perturb-Seq (GWPS) data,
            GeneSetR provides a novel platform for in-depth analysis of user
            defined gene lists. GeneSetR is a user-friendly tool to interpret
            and cluster gene lists, helping researchers to navigate the GWPS
            dataset that recently became available. The access to GeneSetR and
            the data it generates are free for all uses, including commercial
            purposes.
          </p>

          <div className={styles.search} data-tour="home-search">
            <GeneSearch size="lg" placeholder="Explore a gene across all datasets, e.g. ATF4" />
          </div>
          <button type="button" className={styles.tourButton} onClick={startTour}>
            New here? Take the 1-minute tour
          </button>
        </header>

        <div className={styles.entryGrid}>
          {NAV_GROUPS.map((group) => (
            <section key={group.id} className={styles.entryCard}>
              <h2>{group.title}</h2>
              <p>{group.question}</p>
              <ul>
                {group.items
                  .filter((item) => !item.advanced)
                  .map((item) => (
                    <li key={item.name}>
                      <Link to={item.to} title={item.about}>
                        {item.name}
                      </Link>
                    </li>
                  ))}
              </ul>
            </section>
          ))}
        </div>

        <footer className={styles.footer}>
          <div id="refer" className={styles.cite}>
            <div className={styles.footerTitle}>To acknowledge GenesetR, please cite</div>
            <a
              href="https://www.biorxiv.org/content/10.1101/2023.09.18.558211v1"
              id="citation-link"
              target="_blank"
              rel="noreferrer"
            >
              Kuzu OF, Saatcioglu F. <i>GeneSetR: A web server for gene set analysis based on genome-wide Perturb-Seq data</i>
            </a>
          </div>

          <div className={styles.logos}>
            <a target="_blank" rel="noopener noreferrer" href="https://www.uio.no/" className={styles.logo}>
              <img alt="University of Oslo" src="/images/uio-logo2.png" />
            </a>
            <a target="_blank" rel="noopener noreferrer" href="https://saatcioglulab.org/" className={styles.logo}>
              <img alt="Saatcioglu Lab" src="/images/fslab2.png" />
            </a>
          </div>

          <div className={styles.github}>
            <a target="_blank" rel="noopener noreferrer" href="https://github.com/omerfaruk84/GenesetR/issues">
              <FaGithub size={18} aria-hidden="true" /> Click here to raise an issue on GitHub
            </a>
            <span className={styles.githubNote}>
              Would you like to contribute? Visit our{" "}
              <a target="_blank" rel="noopener noreferrer" href="https://github.com/omerfaruk84/GenesetR">
                GitHub page
              </a>
              .
            </span>
          </div>
        </footer>
      </div>
    </>
  );
};

export { MainPage };
