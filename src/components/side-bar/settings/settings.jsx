import React from 'react';
import { Accordion, Heading } from '@oliasoft-open-source/react-ui-library';
import styles from './settings.module.scss';

const Settings = ({
  expended,
  settingsName,
  settings,
  isAccordion,
}) => {

  return (
    <div className={styles.settingsSection}>
      {
        isAccordion ? (
          <Accordion
            managed
            expanded={expended}
            heading={<Heading>{settingsName}</Heading>}
            padding
          >
            {settings}
          </Accordion>
        ) : (
          <>
            <Heading>{settingsName}</Heading>
            {settings}
          </>
        )
      }
    </div>
  );
}

export { Settings };
