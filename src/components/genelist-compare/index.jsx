import React, { useEffect, useContext, useState } from "react";
import styles from "./genelist-compare-page.module.scss";
import { Flex, Spacer } from "@oliasoft-open-source/react-ui-library";
import { connect } from "react-redux";
import { lab } from "d3-color";
import UpSetJS, {
  VennDiagram,
  extractCombinations,
} from "@upsetjs/react";
import { useMemo } from "react";
import { GeneSetEnrichmentTable } from "../enrichment";
import { Accordion, AccordionSummary, AccordionDetails } from "@mui/material";
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

// Add module description for Gene List Comparison
const moduleDescription = {
  title: "Genelist Module", 
  description: "This module facilitates comparison of gene lists generated from various analyses. It identifies intersections between gene sets and performs gene set enrichment analysis on overlapping areas to enhance research efficiency.",
  features: [
    "Gene list comparison to identify intersections and unique genes",
    "Venn diagrams for up to 5 gene sets",
    "UpSetJS visualization for comparisons involving more than 5 sets", 
    "Gene Set Enrichment Analysis (GSEA) on intersecting gene groups",
    "Local storage of gene lists for immediate access in future sessions",
  ]
};

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
  const [expanded, setExpanded] = useState(false);
  const [genelists, setGeneLists] = useState([]);
  
  // Function to sanitize gene names that start with + or -
  const sanitizeGeneName = (geneName) => {
    if (!geneName || typeof geneName !== 'string') return geneName;
    
    // If gene name starts with + or -, prefix with an underscore to make it safe
    if (geneName.startsWith('+') || geneName.startsWith('-')) {
      return '_' + geneName;
    }
    return geneName;
  };

  // Function to restore original gene names for display
  const restoreGeneName = (sanitizedName) => {
    if (!sanitizedName || typeof sanitizedName !== 'string') return sanitizedName;
    
    // If name starts with underscore followed by + or -, remove the underscore
    if (sanitizedName.startsWith('_+') || sanitizedName.startsWith('_-')) {
      return sanitizedName.substring(1);
    }
    return sanitizedName;
  };

  const genesets = useMemo(() => {
    if (genelists && genelists?.elems && genelists?.elems.length > 2) {
      // Create a hash of the gene names to use as a unique identifier
      const geneNames = genelists?.elems?.map((x) => restoreGeneName(x.name)).join(",");
      const geneHash = geneNames.split(',').length + '_' + geneNames.substring(0, 20).replace(/[^a-zA-Z0-9]/g, '');
      
      return { 
        [`Selected Genes_${geneHash}`]: geneNames
      };
    }
    return {};
  }, [genelists]);

  useEffect(() => {
    if (genelistcompareSettings?.genelists) {
      let geneMap = {};
      let genelists = genelistcompareSettings.genelists;
      genelists.forEach((genelist) => {
        if (genelist.checked) {
          genelist.genes.forEach((gene) => {
            if (gene) {
              // Sanitize gene name to prevent issues with + or - prefixes
              const sanitizedGene = sanitizeGeneName(gene);
              if (!geneMap[sanitizedGene]) {
                geneMap[sanitizedGene] = [];
              }
              geneMap[sanitizedGene].push(genelist.name);
            }
          });
        }
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
  const { sets, combinations } = useMemo(() => {
    const colors = [
      "#1f77b4",
      "#ff7f0e", 
      "#2ca02c",
      "#d62728",
      "#9467bd",
      "#8c564b",
      "#e377c2",
      "#7f7f7f",
      "#bcbd22",
      "#17becf"
    ];

    const SetCombinationType = ["intersection", "union", "difference"];
    const combinationType = genelistcompareSettings?.mode !== undefined 
      ? SetCombinationType[genelistcompareSettings.mode] 
      : SetCombinationType[0]; // default to "intersection"
    
    // Early return if elems is empty
    if (!elems || elems.length === 0) {
      return { sets: [], combinations: [] };
    }
    
    let { sets, combinations } = extractCombinations(elems, {
      type: combinationType,
      setOrder: ["cardinality", "name"],
      //combinationOrder?: SortCombinationOrder | SortCombinationOrders;
    });

    sets =
      genelistcompareSettings?.theme === "Colorful"
        ? sets.map((s, i) => ({ ...s, color: colors[i] }))
        : sets;

    return {
      sets: sets,
      combinations: combinations || [], // Ensure combinations is always an array
    };
  }, [elems, genelistcompareSettings?.mode, genelistcompareSettings?.theme]);

  // Auto-collapse accordion when gene lists are present
  useEffect(() => {
    if (sets.length > 0) {
      setExpanded(false);
    }
  }, [sets.length]);

  const [selection, setSelection] = React.useState();
  const [selectedOnes, setselectedOnes] = React.useState();
  
  // Add debugging to track state changes
  useEffect(() => {
    console.log('selectedOnes changed:', selectedOnes);
  }, [selectedOnes]);
  
  useEffect(() => {
    console.log('genelists changed:', genelists);
  }, [genelists]);

  // Effect to update Venn diagram font sizes when settings change
  useEffect(() => {
    if (genelistcompareSettings?.showvenn && sets.length > 0) {
      // Small delay to ensure SVG is fully rendered
      const timer = setTimeout(() => {
        const vennContainer = document.querySelector('.venndiagram svg');
        if (vennContainer) {
          const fontSize = (genelistcompareSettings?.venndiagramfontsize || 16) + "px";
          
          // Update combination numbers (inside circles)
          const valueTexts = vennContainer.querySelectorAll('.valueTextStyle-venndiagram');
          valueTexts.forEach(text => {
            text.style.fontSize = fontSize;
          });
          
          // Update set labels (outside circles)
          const setTexts = vennContainer.querySelectorAll('.setTextStyle-venndiagram');
          setTexts.forEach(text => {
            text.style.fontSize = fontSize;
          });
          
          // Keep export buttons at original size
          const exportTexts = vennContainer.querySelectorAll('.exportTextStyle-venndiagram');
          exportTexts.forEach(text => {
            text.style.fontSize = '10px';
          });
        }
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [genelistcompareSettings?.venndiagramfontsize, genelistcompareSettings?.showvenn, sets.length]);
  
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
  }
  
  // Enhanced click handler to ensure proper state updates
  const handleSelection = (selection) => {
    console.log('Selection clicked:', selection);
    setselectedOnes(selection);
  };
  
  useEffect(() => {
    setGeneLists(selectedOnes);
  }, [selectedOnes]);

  Object.assign(combinations ?? {});

  //console.log(combinations);

  //document.getElementById("venndiagram")?.setAttribute("viewBox", "-100 -100");

  return (
    <div id="maincontainer" className={styles.mainView}>
      {/* Module Description */}
      <Accordion 
        expanded={expanded}
        onChange={(event, isExpanded) => setExpanded(isExpanded)}
        sx={{
          marginBottom: '14px',
          backgroundColor: '#f8f9fa', 
          border: '1px solid #e9ecef',
          borderRadius: '8px',
          '&:before': {
            display: 'none',
          },
          '& .MuiAccordionSummary-root': {
            minHeight: '30px',
            height: '30px',
          },
          '& .MuiAccordionSummary-root.Mui-expanded': {
            minHeight: '30px',
            height: '30px',
          }
        }}
      >
        <AccordionSummary 
          expandIcon={<ExpandMoreIcon />}
          sx={{ 
            backgroundColor: '#f5f5f5',
            borderBottom: '1px solid #e0e0e0',
            minHeight: '30px',
            '&.Mui-expanded': {
              minHeight: '30px'
            }
          }}
        >
          <h3 style={{ margin: 0, color: '#495057', fontSize: '16px' }}>{moduleDescription.title}</h3>
        </AccordionSummary>
        <AccordionDetails sx={{ backgroundColor: '#fafafa', padding: '16px' }}>
          <div style={{ marginBottom: '0px' }}>
            <p style={{ marginBottom: '16px', lineHeight: '1.6' }}>{moduleDescription.description}</p>
            <h4 style={{ marginBottom: '12px', color: '#424242' }}>Key Features:</h4>
            <ul style={{ marginBottom: '16px', paddingLeft: '20px' }}>
              {moduleDescription.features.map((feature, index) => (
                <li key={index} style={{ marginBottom: '4px' }}>{feature}</li>
              ))}
            </ul>

            {sets.length === 0 && (
            <div style={{ 
              padding: '12px', 
              backgroundColor: '#e3f2fd', 
              borderLeft: '4px solid #1976d2',
              borderRadius: '4px',
              color: '#1565c0'
            }}>
              💡 To start, please add gene lists from the left menu and select which ones to compare.
            </div>
            )}
          </div>
        </AccordionDetails>
      </Accordion>

      <Flex direction={"column"} width={"100%"} justifyContent={"flex-start"}>
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
            fontFamily: genelistcompareSettings?.fontfamily || "Arial, sans-serif",
            fontWeight: genelistcompareSettings?.fontweight || "normal",
            fontStyle: genelistcompareSettings?.fontstyle || "normal",
          }}
        >
          <SelectionContext.Provider value={{ selection, setSelection }}>
            {sets.length > 0 ? (
              <>
                {genelistcompareSettings?.showcomparison && (
                  <>
                    <div className="upsetjs">
                      <UpSetSelection
                                                                   
                        sets={sets}
                        onClick={handleSelection}
                        combinations={combinations.filter((x) => {
                          return (
                            x.elems.length > (genelistcompareSettings?.minsetmember || 0)
                          );
                        })}
                        width={Math.min(
                          document.getElementById("maincontainer")?.offsetWidth -
                            50,
                          sets ? sets.length * 120 + 150 : 300
                        )}
                        height={350}
                        
                        barPadding={genelistcompareSettings?.barpadding || 0}
                        theme={genelistcompareSettings?.theme?.toLowerCase()}
                        dotPadding={genelistcompareSettings?.dotpadding || 0}
                        widthRatios={genelistcompareSettings?.widthRatios}
                        heightRatios={[genelistcompareSettings?.setheightratio || 1]}
                        fontSizes={{
                          chartLabel:
                            (genelistcompareSettings?.chartfontsize || 12) + "px",
                          setLabel: (genelistcompareSettings?.setlabelfontsize || genelistcompareSettings?.labelfontsize || 12) + "px",
                          axisTick: (genelistcompareSettings?.chartfontsize || 12) + "px",
                          barLabel: (genelistcompareSettings?.chartfontsize || 12) + "px",
                        }}
                        fontFamily={genelistcompareSettings?.fontfamily || "Arial, sans-serif"}
                        fontWeight={genelistcompareSettings?.fontweight || "normal"}
                        fontStyle={genelistcompareSettings?.fontstyle || "normal"}
                      />
                    </div>
                      {/* barLabelOffset={genelistcompareSettings.dotpadding}
                      fontSizes={genelistcompareSettings.chartfontsize}
                      setNameAxisOffset={genelistcompareSettings.settolabel}

                      minsetmember
                      labelfontsize */}
                  </>
                )}
                {genelistcompareSettings?.showvenn && (
                  <>
                    <Spacer height={30} />
                    <div 
                      className="venndiagram"
                      style={{
                        '--venn-font-size': (genelistcompareSettings?.venndiagramfontsize || 16) + "px",
                      }}
                    >
                      <VennDiagramSelection
                        onClick={handleSelection}
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
                        fontFamily={genelistcompareSettings?.fontfamily || "Arial, sans-serif"}
                        fontWeight={genelistcompareSettings?.fontweight || "normal"}
                        fontStyle={genelistcompareSettings?.fontstyle || "normal"}
                        fontSizes={{
                          setLabel: (genelistcompareSettings?.venndiagramfontsize || 16) + "px",
                          combinationLabel: (genelistcompareSettings?.venndiagramfontsize || 16) + "px",
                          combinationSize: (genelistcompareSettings?.venndiagramfontsize || 16) + "px",
                        }}
                        combinationFontSize={(genelistcompareSettings?.venndiagramfontsize || 16) + "px"}
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
            <GeneSetEnrichmentTable genesets={genesets} />
          </>
        ) : (
          genelists &&
          genelists?.elems &&
          genelists?.elems.length > 0 && (
            <div style={{ marginLeft: "40%" }}>
              {"Genes: " + genelists?.elems?.map((x) => restoreGeneName(x.name)).join(", ")}
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
