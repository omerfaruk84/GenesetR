import { InputGroup, Modal } from "@oliasoft-open-source/react-ui-library";
import { Genelist } from "../genelist";

import React, { useState } from "react";

const GenelistAdd = ({
  visible = true,
  genes = "",
  title = "New Gene List",
  setNewListVisible = () => {},
}) => {
  return (
    <>
      <Modal visible={true} centered={true}>
        <InputGroup width={400}>
          <Genelist
            textTooltip={"Included genes"}
            listTitle={title ? title : "New Gene List"}
            setPerturbationList={() => {}}
            isPerturbationList={false}
            exampleVisible={false}
            setVisible={setNewListVisible}
            closeButton={true}
            showSaveListCheckBox={false}
            returnLists={() => {}}
            genes={genes ? genes : ""}
            showAddList={true}
            showSavedGeneLists={false}
          />
        </InputGroup>
      </Modal>
    </>
  );
};

export default GenelistAdd;
