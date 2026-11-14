import { useEffect, useRef } from "react";
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

  useEffect(() => {
    if (readFor.current === pathname) return;
    if (!hasUrlState(pathname)) {
      readFor.current = pathname;
      return;
    }
    const params = new URLSearchParams(search);
    const snapshot = queryToSnapshot(search, pathname);
    // The dataset can only be selected once the dataset list has arrived
    if (snapshot?.core?.ds && !datasetsReady) return;
    if (snapshot) dispatch(applySnapshot(snapshot));
    readFor.current = pathname;
    if (params.get("run") === "1") {
      // Let the page mount with the new settings before the analysis starts
      setTimeout(() => dispatch(runCalculation(pathname)), 50);
    }
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
  }, [settings, pathname, search, navigate]);

  return null;
};

export { UrlStateSync };
