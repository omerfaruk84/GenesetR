import React, { useEffect, useContext, useState } from "react";
import styles from "./genelist-compare-page.module.scss";
import { Flex, Spacer, Spinner } from "@oliasoft-open-source/react-ui-library";
import { connect } from "react-redux";
import { lab } from "d3-color";
import UpSetJS, {
  VennDiagram,
  extractCombinations,
  ISetLike,
} from "@upsetjs/react";
import { useMemo } from "react";
import { GeneSetEnrichmentTable } from "../enrichment";
// Create a context to manage selection state
const SelectionContext = React.createContext();
const UpSetSelection = (props) => {
  const { selection, setSelection } = useContext(SelectionContext);

  return (
    <UpSetJS
      {...props}
      id={"upsetcompare"}
      selection={selection}
      onHover={setSelection}
    />
  );
};

const VennDiagramSelection = (props) => {
  const { selection, setSelection } = useContext(SelectionContext);

  return (
    <VennDiagram
      {...props}
      id={"venndiagram"}
      selection={selection}
      onHover={setSelection}
    />
  );
};

const GenelistCompare = ({ genelistcompareSettings }) => {
  const [genelists, setGeneLists] = useState([]);

  useEffect(() => {
    if (genelistcompareSettings.genelists) {
      let geneMap = {};
      let genelists = genelistcompareSettings.genelists;
      genelists.forEach((genelist) => {
        genelist.genes.forEach((gene) => {
          if (gene) {
            if (!geneMap[gene]) {
              geneMap[gene] = [];
            }
            geneMap[gene].push(genelist.name);
          }
        });
      });

      let elems = Object.keys(geneMap).map((gene) => ({
        name: gene,
        sets: geneMap[gene],
      }));

      setElements(elems);
      setGeneLists(undefined);
    }
  }, [genelistcompareSettings?.genelists]);

  const [elems, setElements] = useState([]);
  const SetCombinationType = [
    "intersection",
    "union",
    "composite",
    "distinctIntersection",
  ];
  const colors = [
    "#66c2a5",
    "#fc8d62",
    "#8da0cb",
    "#e78ac3",
    "#a6d854",
    "#ffd92f",
    "#e5c494",
  ];

  const { sets, combinations } = useMemo(() => {
    let { sets, combinations } = extractCombinations(elems, {
      type: SetCombinationType[genelistcompareSettings?.mode],
      setOrder: ["cardinality", "name"],
      //combinationOrder?: SortCombinationOrder | SortCombinationOrders;
    });

    sets =
      genelistcompareSettings?.theme === "Colorful"
        ? sets.map((s, i) => ({ ...s, color: colors[i] }))
        : sets;

    return {
      sets: sets,
      combinations: combinations,
    };
  }, [elems, genelistcompareSettings.mode, genelistcompareSettings?.theme]);

  const [selection, setSelection] = React.useState();
  const [selectedOnes, setselectedOnes] = React.useState();
  function mergeColors(colors) {
    if (colors.length === 0) {
      return undefined;
    }
    if (colors.length === 1) {
      return colors[0];
    }
    const cc = colors.reduce(
      (acc, d) => {
        const c = lab(d || "transparent");
        return {
          l: acc.l + c.l,
          a: acc.a + c.a,
          b: acc.b + c.b,
        };
      },
      { l: 0, a: 0, b: 0 }
    );
    return lab(
      cc.l / colors.length,
      cc.a / colors.length,
      cc.b / colors.length
    ).toString();
    // return null;
  }
  useEffect(() => {
    setGeneLists(selectedOnes);
  }, [selectedOnes]);

  Object.assign(combinations ?? {});

  //console.log(combinations);

  //document.getElementById("venndiagram")?.setAttribute("viewBox", "-100 -100");

  return (
    <div id="maincontainer" className={styles.mainView}>
      <Flex direction={"row"} width={"100%"} justifyContent={"flex-start"}>
        <div
          style={{
            width: "100%",
            display: "flex",
            justifyItems: "center",
            justifyContent: "space-around",
            marginBottom: "20px",
            alignItems: "center",
            flexWrap: "wrap",

            background:
              genelistcompareSettings?.theme === "Dark" ? "black" : "white",
          }}
        >
          <SelectionContext.Provider value={{ selection, setSelection }}>
            {sets.length > 0 ? (
              <>
                {genelistcompareSettings.showcomparison && (
                  <>
                    <UpSetSelection
                      sets={sets}
                      onClick={setselectedOnes}
                      combinations={combinations.filter((x) => {
                        return (
                          x.elems.length > genelistcompareSettings.minsetmember
                        );
                      })}
                      width={Math.min(
                        document.getElementById("maincontainer")?.offsetWidth -
                          50,
                        sets ? sets.length * 120 + 150 : 300
                      )}
                      height={350}
                      barPadding={genelistcompareSettings.barpadding}
                      theme={genelistcompareSettings?.theme?.toLowerCase()}
                      dotPadding={genelistcompareSettings?.dotpadding}
                      widthRatios={genelistcompareSettings?.widthRatios}
                      heightRatios={[genelistcompareSettings.setheightratio]}
                      fontSizes={{
                        chartLabel:
                          genelistcompareSettings.chartfontsize + "px",
                        setLabel: genelistcompareSettings.labelfontsize + "px",
                        axisTick: genelistcompareSettings.chartfontsize + "px",
                        barLabel: genelistcompareSettings.chartfontsize + "px",
                      }}
                      //barLabelOffset={genelistcompareSettings.dotpadding}
                      //fontSizes={genelistcompareSettings.chartfontsize}
                      //setNameAxisOffset={genelistcompareSettings.settolabel}

                      //minsetmember
                      //labelfontsize
                    />
                  </>
                )}
                {genelistcompareSettings.showvenn && (
                  <>
                    <Spacer height={30} />
                    <div>
                      <VennDiagramSelection
                        onClick={setselectedOnes}
                        sets={sets}
                        combinations={
                          genelistcompareSettings?.theme === "Colorful"
                            ? { mergeColors }
                            : undefined
                        }
                        width={Math.min(
                          document.getElementById("maincontainer")
                            ?.offsetWidth - 50,
                          sets ? sets.length * 120 + 150 : 300
                        )}
                        height={250}
                        settings={genelistcompareSettings}
                        theme={genelistcompareSettings?.theme?.toLowerCase()}
                      />
                    </div>
                  </>
                )}

                <Spacer height={20} />
              </>
            ) : (
              //<Flex justifyContent={"flex-end"}>
              <div className={styles.skeleton}>
                <Skeleton />
              </div>
              //</Flex>
            )}
          </SelectionContext.Provider>
        </div>

        {genelists && genelists?.elems && genelists?.elems.length > 2 ? (
          <>
            <GeneSetEnrichmentTable
              genesets={{ Genes: genelists?.elems?.map((x) => x.name).join() }}
            />
          </>
        ) : (
          genelists &&
          genelists?.elems &&
          genelists?.elems.length > 0 && (
            <div style={{ marginLeft: "40%" }}>
              {"Genes: " + genelists?.elems?.map((x) => x.name).join()}
            </div>
          )
        )}
      </Flex>
    </div>
  );
};

const mapStateToProps = ({ settings, calcResults }) => ({
  calcResults,
  coreSettings: settings?.core ?? {},
  genelistcompareSettings: settings?.genelistcompare ?? {},
});

const MainContainer = connect(mapStateToProps)(GenelistCompare);

export { MainContainer as GenelistCompare };

export default function Skeleton() {
  const BG = "#A6A8AB";
  const EMPTY = "#E1E2E3";

  const wi = 20;
  const padding = 10;

  const sWidth = 75;
  const sY = 110;

  const cHeight = 100;
  const csX = 85;

  const cOffsets = [10, 20, 35, 60, 65, 80, 90];
  const sOffsets = [50, 30, 15];
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <svg
        viewBox="0 0 300 200"
        style={{
          maxWidth: "80vw",
          maxHeight: "80vh",
          flexGrow: 1,
          background: "#F4F4F4",
        }}
      >
        {cOffsets.map((offset, i) => (
          <rect
            key={i}
            x={csX + i * (wi + padding)}
            y={offset}
            width={wi}
            height={cHeight - offset}
            fill={BG}
          />
        ))}
        {sOffsets.map((offset, i) => (
          <rect
            key={i}
            x={offset}
            y={sY + i * (wi + padding)}
            width={sWidth - offset}
            height={wi}
            fill={BG}
          />
        ))}

        {cOffsets.map((_, i) =>
          sOffsets.map((_, j) => {
            const filled =
              j === 2 - i ||
              (i === 3 && j > 0) ||
              (i === 4 && j !== 1) ||
              (i === 5 && j < 2) ||
              i === 6;
            return (
              <circle
                key={`${i}x${j}`}
                cx={csX + i * (wi + padding) + wi / 2}
                cy={sY + j * (wi + padding) + wi / 2}
                r={wi / 2}
                fill={filled ? BG : EMPTY}
              />
            );
          })
        )}
        <rect x="182" y="150" width="6" height="30" fill={BG} />
        <rect x="212" y="120" width="6" height="60" fill={BG} />
        <rect x="242" y="120" width="6" height="30" fill={BG} />
        <rect x="272" y="120" width="6" height="60" fill={BG} />
      </svg>
    </div>
  );
}
