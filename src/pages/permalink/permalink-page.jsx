import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ROUTES } from "../../common/routes";
import { readPermalink } from "../../store/api/permalinks";
import { applySnapshot, hasUrlState } from "../../store/urlState";

const boxStyle = {
  maxWidth: 560,
  margin: "120px auto 0",
  padding: "20px 24px",
  border: "1px solid var(--gs-border)",
  borderRadius: 8,
  background: "var(--gs-surface-alt)",
  color: "var(--gs-text)",
  textAlign: "center",
  lineHeight: 1.5,
};

/**
 * Opens a shared analysis (/r?id=...): loads the stored settings, then goes to
 * the page they belong to and starts the analysis there.
 */
const PermalinkPage = () => {
  const [params] = useSearchParams();
  const id = params.get("id") || "";
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const datasetsReady = useSelector((state) => (state.settings?.core?.datasetList || []).length > 0);
  const datasetsFailed = useSelector((state) => !!state.settings?.core?.datasetsError);
  const [link, setLink] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) {
      setError("This link has no id.");
      return;
    }
    let cancelled = false;
    readPermalink(id)
      .then((data) => !cancelled && setLink(data))
      .catch((err) =>
        !cancelled &&
        setError(err.notFound ? "This shared link does not exist (any more)." : err.message)
      );
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    if (!link || !(datasetsReady || datasetsFailed)) return;
    if (!hasUrlState(link.route)) {
      setError("This link points to a page that no longer exists.");
      return;
    }
    dispatch(applySnapshot(link.state));
    navigate({ pathname: link.route, search: "?run=1" }, { replace: true });
  }, [link, datasetsReady, datasetsFailed, dispatch, navigate]);

  return (
    <div style={boxStyle} role={error ? "alert" : "status"}>
      {error ? (
        <>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>The shared analysis could not be opened</div>
          <div>{error}</div>
          <div style={{ marginTop: 12 }}>
            <Link to={ROUTES.HOME}>Go to the start page</Link>
          </div>
        </>
      ) : (
        "Opening the shared analysis…"
      )}
    </div>
  );
};

export { PermalinkPage };
