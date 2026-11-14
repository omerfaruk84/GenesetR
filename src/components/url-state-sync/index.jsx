import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useLocation, useNavigate } from "react-router-dom";
import { runCalculation } from "../../store/results";
import { applySnapshot, hasUrlState, queryToSnapshot, snapshotToQuery, takeSnapshot } from "../../store/urlState";

const WRITE_DELAY_MS = 400;

/**
 * Keeps the address bar and the settings of the current analysis page in step
 * (see store/urlState.js). Renders nothing.
 *
 *  - On arriving at a page with settings in its address, they are loaded into
 *    the store; `run=1` then starts the analysis (used by shared links).
 *  - Afterwards every settings change is written back to the address
 *    (replacing the history entry, so Back still leaves the page).
 */
const UrlStateSync = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const settings = useSelector((state) => state.settings);
  const datasetsReady = (settings?.core?.datasetList || []).length > 0;
  const { pathname, search } = location;
  // Page whose address has already been read; nothing is written before that
  const readFor = useRef(null);
  // Bumped when the address has been read, so the write effect runs once more
  const [readCount, setReadCount] = useState(0);

  useEffect(() => {
    if (readFor.current === pathname) return;
    if (!hasUrlState(pathname)) {
      readFor.current = pathname;
      return undefined;
    }
    const params = new URLSearchParams(search);
    const snapshot = queryToSnapshot(search, pathname);
    // The dataset can only be selected once the dataset list has arrived
    if (snapshot?.core?.ds && !datasetsReady) return undefined;
    const finish = () => {
      if (snapshot) dispatch(applySnapshot(snapshot));
      readFor.current = pathname;
      setReadCount((count) => count + 1);
      if (params.get("run") === "1") {
        // Let the page mount with the new settings before the analysis starts
        setTimeout(() => dispatch(runCalculation(pathname)), 50);
      }
    };
    if (!snapshot) {
      finish();
      return undefined;
    }
    // Applied after the mount effects of the page: the sidebar gene lists write
    // their normalised default text to the store when they mount, which would
    // otherwise replace a list that came with the address.
    const timer = setTimeout(finish, 0);
    return () => clearTimeout(timer);
  }, [pathname, search, datasetsReady, dispatch]);

  useEffect(() => {
    if (readFor.current !== pathname || !hasUrlState(pathname)) return undefined;
    const timer = setTimeout(() => {
      const query = snapshotToQuery(takeSnapshot(settings, pathname));
      if (query !== search.replace(/^\?/, "")) {
        navigate({ pathname, search: query ? `?${query}` : "" }, { replace: true });
      }
    }, WRITE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [settings, pathname, search, navigate, readCount]);

  return null;
};

export { UrlStateSync };
