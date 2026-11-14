/**
 * Links to external resources for a human gene.
 * `info` (optional) holds database ids from mygene.info; without it the links
 * fall back to a search by symbol.
 */
export const geneLinks = (symbol, info = null) => {
  const s = encodeURIComponent(symbol);
  return [
    {
      label: "NCBI Gene",
      href: info?.entrez
        ? `https://www.ncbi.nlm.nih.gov/gene/${info.entrez}`
        : `https://www.ncbi.nlm.nih.gov/gene/?term=${s}%5Bsym%5D+AND+human%5Borgn%5D`,
    },
    { label: "GeneCards", href: `https://www.genecards.org/cgi-bin/carddisp.pl?gene=${s}` },
    {
      label: "UniProt",
      href: info?.uniprot
        ? `https://www.uniprot.org/uniprotkb/${info.uniprot}`
        : `https://www.uniprot.org/uniprotkb?query=gene_exact:${s}+AND+organism_id:9606`,
    },
    {
      label: "Ensembl",
      href: `https://www.ensembl.org/Homo_sapiens/Gene/Summary?g=${info?.ensembl || s}`,
    },
    { label: "DepMap", href: `https://depmap.org/portal/gene/${s}` },
    { label: "STRING", href: `https://string-db.org/cgi/network?identifiers=${s}&species=9606` },
    { label: "Reactome", href: `https://reactome.org/content/query?q=${s}&species=Homo+sapiens` },
    { label: "Harmonizome", href: `https://maayanlab.cloud/Harmonizome/gene/${s}` },
    { label: "Protein Atlas", href: `https://www.proteinatlas.org/search/${s}` },
  ];
};

/** "ATF4_2" (a guide label) -> "ATF4" */
export const baseSymbol = (label) => String(label || "").split("_")[0].toUpperCase();

/** In-app address of the gene page. */
export const genePagePath = (symbol) => `/gene?symbol=${encodeURIComponent(baseSymbol(symbol))}`;
