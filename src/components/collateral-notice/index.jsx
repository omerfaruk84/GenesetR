import React, { useEffect, useState } from "react";
import { fetchCollateral } from "../../store/api/integrated";
import { shownSuspects, suspectText } from "../../utils/collateral";
import { Notice } from "../ui";

/**
 * Warning above the results of a knock-down when its guides also lower a second gene that could
 * explain the profile (a promoter neighbour, or a gene whose own knock-down looks the same).
 * Renders nothing while loading, when the check finds no suspect or when the request fails.
 */
export const CollateralNotice = ({ symbol, limit = 3, className, style }) => {
  const [report, setReport] = useState(null);

  useEffect(() => {
    setReport(null);
    if (!symbol) return undefined;
    const controller = new AbortController();
    fetchCollateral(symbol, { signal: controller.signal })
      .then((data) => setReport(data))
      .catch(() => {});
    return () => controller.abort();
  }, [symbol]);

  const suspects = shownSuspects(report, limit);
  if (suspects.length === 0) return null;
  const more = report.suspects.length - suspects.length;
  return (
    <Notice kind="warning" title="Possible collateral knock-down." className={className} style={style}>
      <span data-testid="collateral-notice">
        The guides against {symbol} also lower a second gene whose loss could explain this profile:{" "}
        {suspects.map((suspect, index) => (
          <React.Fragment key={suspect.gene}>
            {index > 0 && "; "}
            {suspectText(suspect)}
          </React.Fragment>
        ))}
        {more > 0 && `; and ${more} more`}. The effects below may belong to that gene. Confirm with an independent guide or
        siRNA before following up.
      </span>
    </Notice>
  );
};

export default CollateralNotice;
