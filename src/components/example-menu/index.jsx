import React, { useState } from "react";
import { Divider, Menu, MenuItem } from "@mui/material";
import { EXAMPLE_GENE_SETS, EXAMPLE_SIGNATURES } from "../../utils/examples";

const triggerStyle = {
  height: 24,
  padding: "0 10px",
  border: "1px solid #2e9e5b",
  borderRadius: 4,
  background: "#2e9e5b",
  color: "#fff",
  fontFamily: "inherit",
  fontSize: 12,
  fontWeight: 600,
  cursor: "pointer",
};

const aboutStyle = { display: "block", color: "#5d6877", fontSize: 11.5, whiteSpace: "normal", maxWidth: 300 };

/**
 * "Example" button of a gene list box: curated gene sets (or signature
 * formulas) that give an interpretable result.
 *
 *   kind      "list" | "signature" | "drugs" (no curated sets, only the random sample)
 *   onPick    called with the text to put in the box
 *   onRandom  optional: load random genes of the selected dataset instead
 */
const ExampleMenu = ({ kind = "list", onPick, onRandom }) => {
  const [anchor, setAnchor] = useState(null);
  const close = () => setAnchor(null);
  const examples =
    kind === "drugs"
      ? []
      : kind === "signature"
        ? EXAMPLE_SIGNATURES.map((e) => ({ ...e, text: e.formula }))
        : EXAMPLE_GENE_SETS.map((e) => ({ ...e, text: e.genes.join("\n") }));

  return (
    <>
      <button
        type="button"
        style={triggerStyle}
        aria-haspopup="menu"
        aria-expanded={!!anchor}
        data-tour="example"
        onClick={(event) => setAnchor(event.currentTarget)}
        title="Load an example that gives a clear result"
      >
        Example
      </button>
      <Menu anchorEl={anchor} open={!!anchor} onClose={close}>
        {examples.map((example) => (
          <MenuItem
            key={example.id}
            dense
            onClick={() => {
              close();
              onPick(example.text);
            }}
          >
            <span>
              <strong>{example.name}</strong>
              <span style={aboutStyle}>{example.about}</span>
            </span>
          </MenuItem>
        ))}
        {onRandom && examples.length > 0 && <Divider />}
        {onRandom && (
          <MenuItem
            dense
            onClick={() => {
              close();
              onRandom();
            }}
          >
            <span>
              <strong>{kind === "drugs" ? "Random drugs" : "Random genes"}</strong>
              <span style={aboutStyle}>A random sample from the selected dataset</span>
            </span>
          </MenuItem>
        )}
      </Menu>
    </>
  );
};

export { ExampleMenu };
