import React, { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { FaBars, FaChevronDown, FaTimes } from "react-icons/fa";
import { ROUTES, isActiveTab } from "../../common/routes";
import { GeneSearch } from "../gene-search";
import { ThemeToggle } from "../theme-toggle";
import { WorkspacePanel } from "../workspace-panel";
import { NAV_GROUPS, NAV_LINKS } from "./navigation";
import styles from "./top-bar.module.scss";

const APP_VERSION = "V2.0.0";

const groupIsActive = (group, pathname) => group.items.some((item) => !item.secondary && isActiveTab(pathname, item.to));

/** One entry of a group: name plus a one-line description. */
const GroupItem = ({ item, pathname, onNavigate }) => (
  <Link
    to={item.to}
    role="menuitem"
    className={`${styles.item} ${isActiveTab(pathname, item.to) ? styles.itemActive : ""}`}
    onClick={onNavigate}
  >
    <span className={styles.itemName}>{item.name}</span>
    <span className={styles.itemAbout}>{item.about}</span>
  </Link>
);

const GroupItems = ({ group, pathname, onNavigate }) => {
  const main = group.items.filter((item) => !item.advanced);
  const advanced = group.items.filter((item) => item.advanced);
  return (
    <>
      {main.map((item) => (
        <GroupItem key={item.name} item={item} pathname={pathname} onNavigate={onNavigate} />
      ))}
      {advanced.length > 0 && (
        <>
          <div className={styles.advancedLabel}>Advanced</div>
          {advanced.map((item) => (
            <GroupItem key={item.name} item={item} pathname={pathname} onNavigate={onNavigate} />
          ))}
        </>
      )}
    </>
  );
};

/**
 * Top navigation, organised by question (see navigation.js). Wide screens get
 * one drop-down per question; narrow screens get a single menu with all of them.
 */
const TopBar = () => {
  const { pathname } = useLocation();
  const [openGroup, setOpenGroup] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const barRef = useRef(null);

  // Any navigation closes the menus
  useEffect(() => {
    setOpenGroup(null);
    setDrawerOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!openGroup) return undefined;
    const onPointerDown = (event) => {
      if (barRef.current && !barRef.current.contains(event.target)) setOpenGroup(null);
    };
    const onKeyDown = (event) => {
      if (event.key === "Escape") setOpenGroup(null);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [openGroup]);

  const closeAll = () => {
    setOpenGroup(null);
    setDrawerOpen(false);
  };

  return (
    <header className={styles.topBar} ref={barRef}>
      <Link to={ROUTES.HOME} className={styles.brand} aria-label="GeneSetR start page">
        <img alt="GeneSetR" src="/images/logo.png" />
        <span className={styles.version}>{APP_VERSION}</span>
      </Link>

      <nav className={styles.groups} aria-label="Main" data-tour="nav">
        {NAV_GROUPS.map((group) => {
          const open = openGroup === group.id;
          return (
            <div key={group.id} className={styles.group}>
              <button
                type="button"
                className={`${styles.groupButton} ${groupIsActive(group, pathname) ? styles.groupActive : ""} ${open ? styles.groupOpen : ""}`}
                aria-haspopup="menu"
                aria-expanded={open}
                onClick={() => setOpenGroup(open ? null : group.id)}
              >
                {group.title}
                <FaChevronDown size={10} aria-hidden="true" />
              </button>
              {open && (
                <div className={styles.panel} role="menu" aria-label={group.title}>
                  <div className={styles.question}>{group.question}</div>
                  <GroupItems group={group} pathname={pathname} onNavigate={closeAll} />
                </div>
              )}
            </div>
          );
        })}
        {NAV_LINKS.map((link) => (
          <Link
            key={link.name}
            to={link.to}
            className={`${styles.groupButton} ${isActiveTab(pathname, link.to) ? styles.groupActive : ""}`}
          >
            {link.name}
          </Link>
        ))}
      </nav>

      <div className={styles.right}>
        {pathname !== ROUTES.GENE && pathname !== ROUTES.HOME && (
          <div className={styles.search}>
            <GeneSearch placeholder="Search a gene" />
          </div>
        )}
        <WorkspacePanel />
        <ThemeToggle />
        <button
          type="button"
          className={styles.menuButton}
          aria-label="Open the menu"
          aria-expanded={drawerOpen}
          onClick={() => setDrawerOpen(true)}
        >
          <FaBars size={20} />
        </button>
      </div>

      {drawerOpen && (
        <div className={styles.drawerOverlay} onClick={() => setDrawerOpen(false)}>
          <nav className={styles.drawer} aria-label="Main" onClick={(event) => event.stopPropagation()}>
            <button type="button" className={styles.drawerClose} aria-label="Close the menu" onClick={() => setDrawerOpen(false)}>
              <FaTimes />
            </button>
            <Link to={ROUTES.HOME} className={styles.drawerLink} onClick={closeAll}>
              Home
            </Link>
            {NAV_GROUPS.map((group) => (
              <div key={group.id} className={styles.drawerGroup}>
                <div className={styles.drawerTitle}>{group.title}</div>
                <GroupItems group={group} pathname={pathname} onNavigate={closeAll} />
              </div>
            ))}
            {NAV_LINKS.map((link) => (
              <Link key={link.name} to={link.to} className={styles.drawerLink} onClick={closeAll}>
                {link.name}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
};

export { TopBar };
