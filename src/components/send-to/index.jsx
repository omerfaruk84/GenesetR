import React, { useState } from "react";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { Divider, Menu, MenuItem } from "@mui/material";
import { toast } from "@oliasoft-open-source/react-ui-library";
import { FaShare } from "react-icons/fa";
import { copyText } from "../../utils/apiSnippets";
import { SEND_TARGETS, sendGenesTo, toGeneArray } from "../../utils/sendTo";
import { saveGeneList } from "../../utils/workspace";

const notify = (type, content, details) => toast({ message: { type, icon: true, content, details }, autoClose: 2500 });

const triggerStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  height: 28,
  padding: "0 10px",
  border: "1px solid #c4c9d0",
  borderRadius: 4,
  background: "#fff",
  color: "#2b3440",
  fontFamily: "inherit",
  fontSize: 12.5,
  fontWeight: 500,
  whiteSpace: "nowrap",
  cursor: "pointer",
};

/**
 * "Send to…" for any gene list: open it in another module, save it to the
 * workspace, or copy it.
 *
 *   genes      array of symbols, free text, or a function returning either
 *              (called when the menu opens, for selections that change)
 *   datasetId  optional dataset to switch to in the target module
 *   label      button text
 *   exclude    target ids to leave out (e.g. the module the list is shown in)
 */
const SendToMenu = ({ genes, datasetId, label = "Send to…", exclude = [], style, className, defaultName = "" }) => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [anchor, setAnchor] = useState(null);
  const [list, setList] = useState([]);

  const open = (event) => {
    const value = typeof genes === "function" ? genes() : genes;
    const resolved = toGeneArray(value);
    if (resolved.length === 0) {
      notify("Warning", "There are no genes to send yet");
      return;
    }
    setList(resolved);
    setAnchor(event.currentTarget);
  };
  const close = () => setAnchor(null);

  const send = (target) => {
    close();
    const path = dispatch(sendGenesTo(target.id, list, { datasetId }));
    if (path) navigate(path);
  };

  const save = async () => {
    close();
    const name = window.prompt(`Name for this list of ${list.length} genes:`, defaultName);
    if (name === null) return;
    try {
      await saveGeneList(name, list);
      notify("Success", "Saved to your gene lists", `"${name.trim()}" is now available in every gene list box and in the workspace.`);
    } catch (error) {
      notify("Error", "The list was not saved", error.message);
    }
  };

  const copy = async () => {
    close();
    const ok = await copyText(list.join("\n"));
    notify(ok ? "Success" : "Error", ok ? `${list.length} genes copied` : "The genes could not be copied");
  };

  const targets = SEND_TARGETS.filter((target) => !exclude.includes(target.id));

  return (
    <>
      <button
        type="button"
        className={className}
        style={className ? style : { ...triggerStyle, ...style }}
        aria-haspopup="menu"
        aria-expanded={!!anchor}
        onClick={open}
        title="Open these genes in another module, save or copy them"
      >
        <FaShare size={11} aria-hidden="true" /> {label}
      </button>
      <Menu anchorEl={anchor} open={!!anchor} onClose={close}>
        <MenuItem disabled dense>
          {list.length} gene{list.length === 1 ? "" : "s"}
        </MenuItem>
        {targets.map((target) => {
          const tooFew = list.length < target.min;
          const single = target.kind === "gene";
          return (
            <MenuItem key={target.id} dense disabled={tooFew} onClick={() => send(target)}>
              {target.label}
              {tooFew && ` (needs ${target.min}+)`}
              {single && list.length > 1 && ` (${list[0]} only)`}
            </MenuItem>
          );
        })}
        <Divider />
        <MenuItem dense onClick={save}>
          Save to my gene lists…
        </MenuItem>
        <MenuItem dense onClick={copy}>
          Copy genes
        </MenuItem>
      </Menu>
    </>
  );
};

export { SendToMenu };
