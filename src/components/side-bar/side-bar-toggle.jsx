import React, { useState } from 'react';
import cx from 'classnames';
import { AiOutlineArrowRight, AiOutlineClose } from 'react-icons/ai';
import styles from './sidebar.module.scss';

const SideBarToggle = () => {
  const [open, setOpen] = useState(true);

  return (
    <div className={cx(styles.sideBar, open ? styles.openSidebar : styles.closeSideBar)}>
      <button
        onClick={() => setOpen(!open)}
        className={open ? styles.closeButton : styles.openButton}
      >
        <div>
          {open ?
            <AiOutlineClose/>
            : <AiOutlineArrowRight />
          }
        </div>
      </button>
    </div>
  );
};

export { SideBarToggle };