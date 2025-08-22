/**
 * Utility functions for retrieving gene function information
 */

/**
 * Cleans gene symbol by removing underscores and taking the first part
 * @param {string} geneSymbol - The gene symbol to clean
 * @returns {string} - Cleaned gene symbol
 */
export const cleanGeneSymbol = (geneSymbol) => {
  if (!geneSymbol) return '';
  // Split by underscore and take the first part
  return geneSymbol.split('_')[0];
};

/**
 * Fetches gene information from Harmonizome API
 * @param {string} geneSymbol - The gene symbol to look up
 * @returns {Promise<object>} - Promise that resolves to gene information
 */
export const fetchGeneInfo = async (geneSymbol) => {
  try {
    const cleanSymbol = cleanGeneSymbol(geneSymbol);
    const response = await fetch(`https://amp.pharm.mssm.edu/Harmonizome/api/1.0/gene/${cleanSymbol}`);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const content = await response.text();
    return content;
  } catch (error) {
    console.error(`Failed to fetch gene info for ${geneSymbol}:`, error);
    return null;
  }
};

/**
 * Formats gene information for tooltip display
 * @param {string} geneSymbol - The gene symbol
 * @param {object} geneInfo - The gene information object
 * @param {object} additionalInfo - Additional information to include (cluster, probability, etc.)
 * @returns {string} - Formatted HTML string for tooltip
 */
export const formatGeneTooltip = (geneSymbol, geneInfo, additionalInfo = {}) => {
  const { cluster, clusterProb, geneType, knockdown, neighbourCount } = additionalInfo;
  
  // Compact tooltip optimized for ECharts container
  let tooltipContent = `<div style="line-height:1.0;font-weight:600;color:#1976d2;font-size:13px;margin:0 0 3px 0;padding:0;">${geneSymbol.split('_')[0]}${geneInfo?.name ? ` (${geneInfo.name})` : ''}</div>`;
  
  // Add cluster information if available
  if (cluster !== undefined) {
    tooltipContent += `<div style="font-size:11px;color:#555;margin:2px 0;padding:0;"><strong>Cluster:</strong> ${cluster >= 0 ? `Cluster ${cluster + 1}` : 'Unclustered'}`;
    if (clusterProb !== undefined) {
      tooltipContent += ` | <strong>Probability:</strong> ${(clusterProb * 100).toFixed(1)}%`;
    }
    tooltipContent += `</div>`;
  }
  
  // Add gene type information if available
  if (geneType) {
    tooltipContent += `<div style="font-size:11px;color:#555;margin:2px 0;padding:0;"><strong>Type:</strong> ${geneType}</div>`;
  }
  
  // Add knockdown information if available
  if (knockdown) {
    tooltipContent += `<div style="font-size:11px;color:#555;margin:2px 0;padding:0;"><strong>Knockdown:</strong> ${knockdown}</div>`;
  }
  
  // Add neighbour count if available
  if (neighbourCount !== undefined) {
    tooltipContent += `<div style="font-size:11px;color:#555;margin:2px 0;padding:0;"><strong>Neighbours:</strong> ${neighbourCount}</div>`;
  }
  
  // Add gene description
  if (geneInfo?.description) {
    tooltipContent += `<div style="font-size:11px;color:#444;margin:6px 0 0 0;padding:0;line-height:1.3;word-wrap:break-word;max-width:320px;">${geneInfo.description}</div>`;
  } else {
    tooltipContent += `<div style="font-size:11px;color:#999;font-style:italic;margin:6px 0 0 0;padding:0;">Gene information not available</div>`;
  }
  
  return tooltipContent;
};

/**
 * Creates a tooltip formatter function for ECharts
 * @param {object} options - Options for the formatter
 * @param {boolean} options.useCache - Whether to use localStorage cache
 * @param {function} options.parseData - Function to parse data from params
 * @returns {function} - ECharts tooltip formatter function
 */
export const createGeneTooltipFormatter = (options = {}) => {
  const { useCache = true, parseData = (params) => ({ geneSymbol: params.data[3] }) } = options;
  
  return function(params, ticket, callback) {
    const { geneSymbol, cluster, clusterProb, geneType, knockdown, neighbourCount } = parseData(params);
    
    // Check cache first
    if (useCache) {
      const cached = localStorage.getItem(geneSymbol);
      if (cached) {
        return formatGeneTooltip(geneSymbol, JSON.parse(cached), { cluster, clusterProb, geneType, knockdown, neighbourCount });
      }
    }
    
    // Fetch from API
    fetchGeneInfo(geneSymbol)
      .then(content => {
        if (content) {
          let parsedContent;
          try {
            parsedContent = typeof content === 'string' ? JSON.parse(content) : content;
          } catch (e) {
            parsedContent = { description: content };
          }
          
          // Cache the result
          if (useCache) {
            localStorage.setItem(geneSymbol, JSON.stringify(parsedContent));
          }
          
          const formattedContent = formatGeneTooltip(geneSymbol, parsedContent, { cluster, clusterProb, geneType, knockdown, neighbourCount });
          callback(ticket, formattedContent);
        } else {
          const fallbackContent = formatGeneTooltip(geneSymbol, null, { cluster, clusterProb, geneType, knockdown, neighbourCount });
          callback(ticket, fallbackContent);
        }
      })
      .catch(error => {
        console.error('Error fetching gene info:', error);
        const fallbackContent = formatGeneTooltip(geneSymbol, null, { cluster, clusterProb, geneType, knockdown, neighbourCount });
        callback(ticket, fallbackContent);
      });
    
    // Return loading message
    return `<div style="text-align: center; color: #666;">
      <div style="margin-bottom: 8px;">Loading gene information...</div>
      <div style="font-size: 12px;">${geneSymbol}</div>
    </div>`;
  };
}; 