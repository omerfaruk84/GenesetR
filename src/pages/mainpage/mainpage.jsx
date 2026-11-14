import React from "react";
import { Spacer } from "@oliasoft-open-source/react-ui-library";
import styles from "./mainpage.module.scss";
import { Link } from "react-router-dom";
import V2ReleasePopup from "../../components/v2-release-popup";
import { GeneSearch } from "../../components/gene-search";
import { NAV_GROUPS } from "../../components/top-bar/navigation";

const MainPage = () => {
  return (
    <>
      <V2ReleasePopup />
      <div className={styles.parentOfMainView}>
        {/* 
        {!consent && (
          <div id="cookieConsentContainer" className={styles.consentContainer}>
            <p className={styles.consentTitle}>We value your privacy</p>
            <div className={styles.consentGroup}>
              <div>
                <p>
                  The only cookie that we use is to track user statistics.
                  <br />
                  We do not collect any personal data.
                </p>
              </div>
              <div>
                <button
                  id="rejectCookieConsent"
                  onClick={closeConsent}
                  className={styles.consentBtnR}
                >
                  REJECT
                </button>
                <button
                  id="acceptCookieConsent"
                  onClick={handleConsent}
                  className={styles.consentBtn}
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        )}
        */}

        <div className={styles.mainView}>
          <h1 style={{ fontFamily: "Droid Sans", fontSize: "30px" }}>
            GeneSetR
          </h1>

          <p className={styles.infoSection}>
            Capitalizing on the power of Genome-wide Perturb-Seq (GWPS) data,
            GeneSetR provides a novel platform for in-depth analysis of user
            defined gene lists. GeneSetR is a user-friendly tool to interpret
            and cluster gene lists, helping researchers to navigate the GWPS
            dataset that recently became available. The access to GeneSetR and
            the data it generates are free for all uses, including commercial
            purposes.
          </p>

          <div style={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "center", margin: "6px 0 22px" }}>
            <GeneSearch size="lg" placeholder="Explore a gene across all datasets, e.g. ATF4" />
          </div>

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

          <Spacer height={45} />
          <div
            id="refer"
            style={{
              width: "60%",
              maxWidth: "880px",
              fontSize: "1.2em",
              justifyContent: "start",
              flexDirection: "column",
              display: "flex",
            }}
          >
            <div>
              <b>To acknowledge GenesetR, please cite:</b> <br />
            </div>
            <div style={{ marginLeft: "20px" }}>
              <i>
                <a
                  style={{
                    color: "black",
                    outline: "0",
                    textDecoration: "none",
                    fontSize: "0.9em",
                  }}
                  href="https://www.biorxiv.org/content/10.1101/2023.09.18.558211v1"
                  id="citation-link"
                  target="_blank"
                  rel="noreferrer"
                >
                  Kuzu OF, Saatcioglu F.
                  <br />
                  GeneSetR: A web server for gene set analysis based on
                  genome-wide Perturb-Seq data
                  <br />
                </a>
              </i>
              <br />
              <br />
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "center" }}>
            <div
              style={{
                width: "60%",
                maxWidth: "750px",
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                alignItems: "center",
                justifySelf: "center",
              }}
            >
              <a
                target="_blank"
                rel="noopener noreferrer"
                href="https://www.uio.no/"
              >
                <img
                  style={{
                    marginLeft: "10%",
                    maxWidth: "90%",
                    height: "auto",
                    objectFit: "contain",
                  }}
                  alt="University of Oslo"
                  src="/images/uio-logo2.png"
                />
              </a>

              <a
                target="_blank"
                rel="noopener noreferrer"
                href="https://saatcioglulab.org/"
              >
                <img
                  style={{
                    marginLeft: "10%",
                    maxWidth: "100%",
                    maxHeight: "45px",
                    height: "auto",
                    objectFit: "contain",
                  }}
                  alt="Saatcioglu Lab"
                  src="/images/fslab2.png"
                />
              </a>
            </div>
          </div>

          <div
            style={{
              width: "100%",
              maxWidth: "880px",
              justifyContent: "start",
              display: "flex",
              alignItems: "center",
            }}
          >
            <a
              target="_blank"
              rel="noopener noreferrer"
              href="https://github.com/omerfaruk84/GenesetR/issues"
            >
              <img
                style={{ height: "30px", marginLeft: "28%" }}
                src="https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png"
                alt="GitHub Logo"
              />
            </a>
            <a
              style={{ fontSize: "1em" }}
              target="_blank"
              rel="noopener noreferrer"
              href="https://github.com/omerfaruk84/GenesetR/issues"
            >
              <span style={{ marginLeft: "10px" }}>
                Click here to raise an issue on GitHub
              </span>
            </a>

            <span style={{ fontSize: "1em", marginLeft: "3%" }}>
              <span style={{ color: "black" }}>
                Would you like to contribute?
              </span>{" "}
              <span> Visit our </span>
              <a
                target="_blank"
                rel="noopener noreferrer"
                href="https://github.com/omerfaruk84/GenesetR"
              >
                <img
                  style={{ width: "45px" }}
                  src="https://github.githubassets.com/images/modules/logos_page/GitHub-Logo.png"
                  alt="GitHub Logo"
                />
              </a>
              <span style={{ marginLeft: "3px" }}>page.</span>
            </span>
          </div>
        </div>
      </div>
    </>
  );
};

export { MainPage };
