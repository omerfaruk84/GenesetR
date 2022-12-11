import React from 'react';
import { Accordion, Heading, Spacer } from '@oliasoft-open-source/react-ui-library';
import styles from './settings.module.scss';

const Settings = ({
  expended,
  settingsName,
  settings,
  isAccordion,
}) => {
  console.log(expended);
  return (
    <div className={styles.settingsSection}>
      {
        isAccordion ? (
          <Accordion
            managed
            bordered
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
      <Spacer />
    </div>
  );
}

export { Settings };
