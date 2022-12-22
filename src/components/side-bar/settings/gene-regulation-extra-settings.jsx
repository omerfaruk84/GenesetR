import React from 'react';
import { Button, Spacer } from '@oliasoft-open-source/react-ui-library';

const GeneRegulationExtraSettings = () => {
  return (
    <>
      <Button
        label="Find expressional alterations upon KD of SLC39A10"
        width="100%"
      />
      <Spacer height={15} />
      <Button
        label="Find perturbations that regulate SLC39A10"
        width="100%"
      />
      <Spacer height={15} />
      <Button
        label="Find perturbations that correlate with KD of SLC39A10"
        width="100%"
      />
      <Spacer height={15} />
      <Button
        label="Find genes that correlate with SLC39A10 upon various perturbations"
        width="100%"
      />
    </>
  );
};

export { GeneRegulationExtraSettings };
