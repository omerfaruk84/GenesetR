#!/usr/bin/env python3
"""
Gene Perturbation Signature Score Calculator

This script calculates gene signature scores (e.g., Hallmark pathways from MSigDB)
for all perturbations across cell lines. Results are saved to a parquet file
for fast retrieval by the backend API.

Usage:
    python calculate_signature_scores.py --data-dir /path/to/perturbation/data --output /path/to/output.parquet

The script expects perturbation data in a format where:
- Rows are genes (gene expression changes)
- Columns are perturbations (CRISPR knockdowns)
- Values are z-scores representing the effect of each perturbation on each gene
"""

import argparse
import json
import logging
import os
import sys
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import numpy as np
import pandas as pd
import pyarrow as pa
import pyarrow.parquet as pq

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


# Hallmark gene sets from MSigDB (subset - full list should be loaded from GMT file)
# These are the 50 Hallmark gene sets
HALLMARK_GENE_SETS = {
    "HALLMARK_ADIPOGENESIS": ["ABCA1", "ABCB8", "ACAA2", "ACADL", "ACADM", "ACADS", "ACLY", "ACO2", "ACOX1", "ACSF2", "ACSL1", "AGPAT3", "AK2", "ALDH2", "ALDOA", "APOE", "APOOL", "ATIC", "ATP5F1A", "ATP5F1B"],
    "HALLMARK_ALLOGRAFT_REJECTION": ["AARS1", "ABCE1", "ABI1", "ACHE", "ACVR1B", "AKT1", "ANXA4", "APBB1", "B2M", "BCAT1", "BCL10", "BID", "BTG1", "C2", "CAPG", "CASP1", "CASP3", "CASP4", "CASP7", "CASP8"],
    "HALLMARK_ANDROGEN_RESPONSE": ["ABCC4", "ABHD2", "ACSL3", "ACTN1", "ADAMTS1", "ADRM1", "ALDH1A3", "ANKH", "APPBP2", "AR", "ARID5B", "B2M", "B4GALT1", "BIK", "BMPR1B", "CAMKK2", "CDC14B", "CENPN", "CHMP5", "CLSTN1"],
    "HALLMARK_ANGIOGENESIS": ["APOH", "CCND2", "COL3A1", "COL5A2", "CXCL6", "FGFR1", "FSTL1", "JAG1", "JAG2", "LPL", "MSX1", "NRP1", "NRP2", "OLR1", "PF4", "PGLYRP1", "PRG2", "PTK2", "RAMP1", "S100A4"],
    "HALLMARK_APICAL_JUNCTION": ["ACTA1", "ACTB", "ACTC1", "ACTG1", "ACTG2", "ACTN1", "ACTN2", "ACTN3", "ACTN4", "ACVRL1", "ADAM10", "ADAM15", "ADAM17", "ADAM9", "AFDN", "APC", "APC2", "ARHGAP17", "ARHGAP26", "ARHGEF2"],
    "HALLMARK_APICAL_SURFACE": ["ADAM10", "ADIPOR2", "AFAP1L2", "AQP2", "ATP6V0A4", "ATP6V1B1", "BRCA1", "CD160", "CD24", "CDH6", "CEACAM5", "CROCC", "CTSE", "CYBA", "EFNA5", "EHHADH", "EPCAM", "FLOT2", "FOLH1", "GATA3"],
    "HALLMARK_APOPTOSIS": ["ADD1", "AIFM3", "ANKH", "ANXA1", "APP", "ATF3", "AVPR1A", "BAK1", "BAX", "BCL10", "BCL2L1", "BCL2L11", "BID", "BIK", "BIRC3", "BMF", "BMP2", "BNIP3L", "BTG2", "BTG3"],
    "HALLMARK_BILE_ACID_METABOLISM": ["ABCA1", "ABCA2", "ABCB11", "ABCB4", "ABCG5", "ABCG8", "ACAA1", "ACOX1", "ACOX2", "ACSL1", "ADH4", "ADH6", "AKR1C4", "AKR1D1", "ALDH1A1", "ALDH5A1", "AMACR", "APOA1", "APOA2", "APOB"],
    "HALLMARK_CHOLESTEROL_HOMEOSTASIS": ["ABCA2", "ACAT2", "ACSS2", "ACTG1", "ADH4", "ALDOC", "ALG7", "ANTXR2", "APOC3", "ATIC", "ATXN2", "BACE1", "CASP3", "CCT5", "CD9", "CFD", "CHKA", "CYP51A1", "DHCR24", "DHCR7"],
    "HALLMARK_COAGULATION": ["A2M", "ACOX2", "ANO6", "APOA1", "APOB", "APOC3", "APOH", "C1QA", "C1S", "C4BPA", "C5", "C8A", "C8B", "C8G", "C9", "CD55", "CD9", "CFD", "CPB2", "CTSE"],
    "HALLMARK_COMPLEMENT": ["A2M", "ADH5", "APCS", "APOA1", "APOA4", "APOC3", "APOH", "C1QA", "C1QB", "C1QC", "C1R", "C1S", "C2", "C3", "C4A", "C4BPA", "C5", "C6", "C7", "C8A"],
    "HALLMARK_DNA_REPAIR": ["ACTL6A", "APEX1", "APEX2", "ATAD5", "ATM", "ATR", "ATRIP", "ATRX", "BARD1", "BLM", "BRCA1", "BRCA2", "BRIP1", "CCNO", "CDK7", "CDKN1A", "CHEK1", "CHEK2", "CIB1", "CLK2"],
    "HALLMARK_E2F_TARGETS": ["ASF1A", "ASF1B", "ATAD2", "AURKA", "AURKB", "BIRC5", "BLM", "BRCA1", "BRIP1", "BUB1", "BUB1B", "CASP3", "CBX5", "CCNA2", "CCNB1", "CCNB2", "CCND1", "CCNE1", "CCNE2", "CDC20"],
    "HALLMARK_EPITHELIAL_MESENCHYMAL_TRANSITION": ["ABI3BP", "ACTA2", "ADAM12", "ANPEP", "APLP1", "AREG", "BASP1", "BDNF", "BGN", "BMP1", "CADM1", "CALD1", "CALU", "CAP2", "CAPG", "CD44", "CD59", "CDH11", "CDH2", "CDH6"],
    "HALLMARK_ESTROGEN_RESPONSE_EARLY": ["ABAT", "ABHD2", "ADD3", "ADGRD1", "ADGRF1", "AFF1", "AGR2", "AK1", "ALDH3B2", "AMIGO2", "AMPH", "ANLN", "AP1G1", "AP1S2", "APP", "AREG", "ASS1", "ATP6V1A", "AXIN1", "B3GALNT1"],
    "HALLMARK_ESTROGEN_RESPONSE_LATE": ["ABAT", "ABCA3", "ABHD2", "ACOX2", "ADD3", "ADGRD1", "ADGRF1", "ADH1B", "AGR2", "AGXT", "ALDH1A1", "ALDH3B2", "AMPH", "ANLN", "ANPEP", "AP1G1", "AP1S2", "AREG", "ASAH1", "ASS1"],
    "HALLMARK_FATTY_ACID_METABOLISM": ["AADAT", "AADAC", "AASS", "ABCD1", "ABCD2", "ABCG2", "ABHD5", "ACAA2", "ACADL", "ACADM", "ACADS", "ACADSB", "ACAT1", "ACAT2", "ACLY", "ACO2", "ACOT9", "ACOX1", "ACOX2", "ACSL1"],
    "HALLMARK_G2M_CHECKPOINT": ["ANLN", "ANP32E", "ATAD2", "AURKA", "AURKB", "BEX2", "BIRC5", "BLM", "BRCA1", "BUB1", "BUB1B", "BUB3", "CASP3", "CBX5", "CCNA2", "CCNB1", "CCNB2", "CCNF", "CDC20", "CDC25B"],
    "HALLMARK_GLYCOLYSIS": ["ABCB6", "ACSS2", "ADH4", "ALDOA", "ALDOB", "ALDOC", "ANG", "AQP1", "B3GAT1", "B4GALT1", "B4GALT2", "BPGM", "BTG2", "CASP6", "CDK1", "CENPA", "CITED2", "CLN6", "CLOCK", "CYB5A"],
    "HALLMARK_HEDGEHOG_SIGNALING": ["ACSL4", "ADAM17", "ADGRG1", "AKT1", "ARAP3", "ARID2", "BCL2", "BMPER", "BOC", "C3ORF58", "CADPS", "CDON", "CELSR1", "CELSR2", "CRB2", "CSNK1A1", "CSNK1G3", "CTNNB1", "CTSL", "CXCL12"],
    "HALLMARK_HEME_METABOLISM": ["ABCB6", "ABCG2", "ACSL5", "ADCY6", "ADRA2A", "AHSP", "ALAS2", "ANK1", "APOA2", "ATP1A1", "ATP1B1", "ATP5F1E", "BACE2", "BCL2L1", "BCLL1A", "BLVRB", "BNIP3L", "BPGM", "CA1", "CA2"],
    "HALLMARK_HYPOXIA": ["ACKR3", "ADM", "ADPGK", "ADORA2B", "AKAP12", "AK4", "ALDOA", "ALDOB", "ALDOC", "AMPD3", "ANGPTL4", "ANKZF1", "ANXA2", "ATF3", "ATP7A", "B3GALNT1", "B4GALNT2", "BCAN", "BCL2", "BGN"],
    "HALLMARK_IL2_STAT5_SIGNALING": ["AHNAK", "AHR", "ALCAM", "ANXA4", "ARG2", "ASNS", "ATF5", "BATF", "BCL2", "BCL2L1", "BCL6", "BHLHE40", "BTLA", "CAPN3", "CASP3", "CASP8", "CCL22", "CCND2", "CCND3", "CCR4"],
    "HALLMARK_IL6_JAK_STAT3_SIGNALING": ["A2M", "ACVR1B", "ACVRL1", "AKT1", "BAK1", "BCL2L1", "BCL3", "BCL6", "CASP3", "CBL", "CBLB", "CCL7", "CCR1", "CD14", "CD36", "CD44", "CD9", "CDKN1A", "CFB", "CLK1"],
    "HALLMARK_INFLAMMATORY_RESPONSE": ["ABCA1", "ACHE", "ACVR1B", "ACVR2A", "ADGRE1", "ADM", "ADPGK", "AHR", "AIMP1", "AK4", "ANPEP", "AREG", "ATP2B1", "B4GALT1", "B4GALT5", "BCL10", "BCL2A1", "BCL3", "BCL6", "BEST1"],
    "HALLMARK_INTERFERON_ALPHA_RESPONSE": ["ADAR", "B2M", "BATF2", "BST2", "BTG1", "C1S", "CASP1", "CASP8", "CCRL2", "CD47", "CD74", "CMPK2", "CMTR1", "CNP", "CSF1", "CXCL10", "CXCL11", "DDX60", "DHX58", "EIF2AK2"],
    "HALLMARK_INTERFERON_GAMMA_RESPONSE": ["ADAR", "APOL6", "ARID5B", "ARL4A", "AUTS2", "B2M", "BANK1", "BATF2", "BPGM", "BST2", "BTG1", "C1R", "C1S", "CASP1", "CASP3", "CASP4", "CASP7", "CASP8", "CCL2", "CCL5"],
    "HALLMARK_KRAS_SIGNALING_DN": ["ABCB1", "ACKR3", "ACY1", "ADAMDEC1", "ADPRM", "AFF1", "AKAP12", "AKR7A3", "ALDH1A2", "ALDH1A3", "AMACR", "ANGPTL4", "ANPEP", "ANTXR1", "AQP3", "AQP9", "ARF4", "ARMCX2", "ASAH1", "ASB4"],
    "HALLMARK_KRAS_SIGNALING_UP": ["ABCB1", "ABCG1", "ABL2", "ACE", "ADAM17", "ADAM8", "AHR", "AKAP12", "ALOX5AP", "ANGPTL4", "ANXA10", "AP1S2", "APLP2", "APOBEC3G", "ARF4", "ARPC1B", "ARV1", "ATG10", "BCL11A", "BCL2A1"],
    "HALLMARK_MITOTIC_SPINDLE": ["ACTR1A", "ACTR1B", "AKAP9", "ALS2", "ANKRD40", "ANP32E", "ANXA11", "APP", "ARCN1", "ARHGAP17", "ARHGAP19", "ARHGAP33", "ARHGEF2", "ARHGEF39", "ARL8A", "ASPM", "ATG9A", "AURKA", "AURKB", "BCAP31"],
    "HALLMARK_MTORC1_SIGNALING": ["ABCF2", "ACACA", "ACLY", "ACSL3", "ACSS2", "ACTR2", "ACTR3", "AK4", "ALDOA", "BCAT1", "BHLHE40", "BNIP3", "CACYBP", "CANX", "CARS1", "CCT5", "CCNF", "CDC25A", "CDK4", "CDKN1A"],
    "HALLMARK_MYC_TARGETS_V1": ["ABCE1", "ACP1", "AIMP2", "AP3S1", "APEX1", "BUB3", "BYSL", "C1QBP", "CAD", "CANX", "CBX3", "CCT2", "CCT3", "CCT4", "CCT5", "CCT7", "CDC20", "CDC45", "CDK4", "CLNS1A"],
    "HALLMARK_MYC_TARGETS_V2": ["BOP1", "BYSL", "CBX3", "CDK4", "DUSP2", "EXOSC5", "FARSA", "FARSB", "GLRX3", "GNL3", "GRWD1", "HSPD1", "IMP4", "IPO4", "LAS1L", "MPHOSPH10", "MRPL12", "MRTO4", "MYBBP1A", "NAT10"],
    "HALLMARK_MYOGENESIS": ["ABLIM1", "ACTA1", "ACTA2", "ACTC1", "ACTN2", "ACTN3", "ACVR1", "ACVR2A", "ADAM12", "ADD1", "ADIPOQ", "ADRB2", "ADSSL1", "AGRN", "AHNAK", "AKAP12", "AKAP2", "AKT2", "ALCAM", "ALDOA"],
    "HALLMARK_NOTCH_SIGNALING": ["APH1A", "ARRB1", "CCND1", "CCND2", "CD44", "CTBP2", "DLL1", "DLL4", "DTX1", "FBXW7", "FZD7", "HEYL", "HEY1", "HEY2", "HES1", "HES5", "HES7", "JAG1", "JAG2", "KAT2A"],
    "HALLMARK_OXIDATIVE_PHOSPHORYLATION": ["ABCB7", "ACAA2", "ACADM", "ACADSB", "ACAT1", "ACO2", "ACSL1", "AFG3L2", "AIFM1", "ALDH4A1", "ALDH5A1", "ALDH6A1", "ATP1B1", "ATP5F1A", "ATP5F1B", "ATP5F1C", "ATP5F1D", "ATP5F1E", "ATP5MC1", "ATP5MC2"],
    "HALLMARK_P53_PATHWAY": ["ABAT", "ABHD4", "ABL1", "ACTA2", "ACTG1", "AEN", "AIFM2", "AKT1", "ALDH4A1", "ANKRA2", "ANXA1", "ANXA4", "APAF1", "ARID3A", "ASNS", "ATF3", "ATM", "ATRX", "BAK1", "BAX"],
    "HALLMARK_PANCREAS_BETA_CELLS": ["ABCC8", "ADCY1", "ADCY6", "ADCY9", "ADCYAP1", "ADIPOR1", "ADIPOR2", "ADM", "ADRA2A", "AGT", "AHSG", "AKT1", "AKT2", "ALB", "ALDOA", "ANXA4", "ARID5B", "ARX", "ATF3", "ATP1A1"],
    "HALLMARK_PEROXISOME": ["ABCD1", "ABCD2", "ABCD3", "ACAA1", "ACADL", "ACADSB", "ACAT1", "ACBD5", "ACOT1", "ACOT2", "ACOT4", "ACOT8", "ACOX1", "ACOX2", "ACOX3", "ACSL1", "ACSL4", "AGPS", "AMACR", "BAAT"],
    "HALLMARK_PI3K_AKT_MTOR_SIGNALING": ["AK1", "AKT1", "AKT2", "ARHGDIA", "ATF4", "ATP5MC2", "ATP5MC3", "ATP5PO", "ATP6V0B", "ATP6V1C1", "BAD", "BPGM", "BTG1", "CAD", "CALB2", "CALM1", "CCNE1", "CDK4", "CDKN1A", "CFLAR"],
    "HALLMARK_PROTEIN_SECRETION": ["ABCC1", "ACTR1A", "ADAMTS1", "ADAMTS9", "ADM", "AKAP1", "AKR1A1", "AP2M1", "ARCN1", "ARF1", "ARF4", "ARF6", "ARFGAP1", "ARFGAP3", "ARL1", "ARL6IP1", "ARL6IP5", "ASAP2", "ATG9A", "B3GNT2"],
    "HALLMARK_REACTIVE_OXYGEN_SPECIES_PATHWAY": ["ABCC1", "ATOX1", "BNIP3", "CAT", "CDKN2D", "CFLAR", "CYB5B", "CYBB", "EIF2AK3", "ERCC2", "FES", "FTL", "G6PD", "GCLC", "GCLM", "GLRX", "GLRX2", "GPX1", "GPX3", "GSR"],
    "HALLMARK_SPERMATOGENESIS": ["ACR", "ACRV1", "ADAM18", "ADAM2", "ADAM29", "ADAM32", "AKAP4", "ARID4A", "ARID4B", "ARL6IP1", "ATG5", "ATP1A4", "BBIP1", "BRCA2", "BTRC", "C11ORF63", "CAPN11", "CAPZA3", "CATSPER1", "CATSPER2"],
    "HALLMARK_TGF_BETA_SIGNALING": ["ACVR1", "ACVR1B", "ACVR1C", "APC", "ARID4B", "BCAR3", "BMP2", "BMPR1A", "BMPR2", "CDKN1C", "CDK9", "CREBBP", "DAB2", "ENG", "EP300", "FKBP1A", "FNTA", "FSTL3", "HDAC1", "HIPK2"],
    "HALLMARK_TNFA_SIGNALING_VIA_NFKB": ["ABCA1", "ACKR3", "AREG", "ATF3", "ATF4", "ATP2B1", "B4GALT1", "B4GALT5", "BCL2A1", "BCL3", "BCL6", "BHLHE40", "BIRC2", "BIRC3", "BMP2", "BTG1", "BTG2", "BTG3", "CCL2", "CCL20"],
    "HALLMARK_UNFOLDED_PROTEIN_RESPONSE": ["ADD1", "ARCN1", "ARFGAP1", "ATF3", "ATF4", "ATF6", "ATP2A2", "BAG3", "BAX", "CALR", "CANX", "CARS1", "CEBPB", "CEBPG", "CLU", "CPEB4", "CREB3L2", "CTDSP2", "DDIT3", "DDIT4"],
    "HALLMARK_UV_RESPONSE_DN": ["ABAT", "ACTB", "ACTG1", "ACTN1", "ACVR1B", "ADD1", "AEBP1", "AGPAT4", "AHNAK", "AHNAK2", "AIFM1", "AKAP12", "AKAP13", "AKT1", "ALDH2", "ALDH6A1", "ANK2", "ANKRD28", "ANXA4", "APOD"],
    "HALLMARK_UV_RESPONSE_UP": ["ACOX1", "AKT2", "ALDH3A2", "AQP3", "ARHGAP1", "ATF3", "ATF4", "BHLHE40", "BTG1", "BTG2", "BTG3", "CDKN1A", "CDKN1B", "CDKN2B", "CITED2", "CNOT4", "CNOT6", "CPEB1", "CTDSP1", "CYP1A1"],
    "HALLMARK_WNT_BETA_CATENIN_SIGNALING": ["ADAM17", "AXIN1", "AXIN2", "CCND1", "CCND2", "CUL1", "DKK1", "DKK4", "DLL1", "DVL2", "FRAT1", "FZD1", "FZD5", "FZD7", "FZD8", "GNAI1", "HDAC11", "HDAC2", "HDAC5", "HEY1"],
    "HALLMARK_XENOBIOTIC_METABOLISM": ["ABCB1", "ABCC2", "ABCC3", "ABHD6", "ADH1A", "ADH1B", "ADH1C", "ADH4", "ADH6", "ADH7", "ADHFE1", "ADPGK", "AHR", "AKR1A1", "AKR1B1", "AKR1C1", "AKR1C2", "AKR1C3", "AKR7A2", "AKR7A3"],
}


def load_hallmark_gmt(gmt_file: Optional[str] = None) -> Dict[str, List[str]]:
    """
    Load Hallmark gene sets from a GMT file or use built-in sets.

    Args:
        gmt_file: Path to GMT file. If None, uses built-in Hallmark sets.

    Returns:
        Dictionary mapping gene set names to lists of genes.
    """
    if gmt_file is None:
        logger.info("Using built-in Hallmark gene sets")
        return HALLMARK_GENE_SETS

    gene_sets = {}
    with open(gmt_file, 'r') as f:
        for line in f:
            parts = line.strip().split('\t')
            if len(parts) >= 3:
                name = parts[0]
                # parts[1] is the description, parts[2:] are genes
                genes = [g.upper() for g in parts[2:] if g]
                gene_sets[name] = genes

    logger.info(f"Loaded {len(gene_sets)} gene sets from {gmt_file}")
    return gene_sets


def calculate_signature_score(
    perturbation_data: pd.DataFrame,
    gene_set: List[str],
    method: str = "mean"
) -> pd.Series:
    """
    Calculate signature score for a gene set across all perturbations.

    Args:
        perturbation_data: DataFrame with genes as rows, perturbations as columns
        gene_set: List of genes in the signature
        method: Scoring method - "mean", "median", or "ssgsea"

    Returns:
        Series with signature score for each perturbation
    """
    # Find genes that are in both the gene set and the data
    available_genes = [g for g in gene_set if g in perturbation_data.index]

    if len(available_genes) == 0:
        logger.warning(f"No genes from gene set found in data")
        return pd.Series(0, index=perturbation_data.columns)

    # Get the subset of data for these genes
    subset = perturbation_data.loc[available_genes]

    if method == "mean":
        return subset.mean(axis=0)
    elif method == "median":
        return subset.median(axis=0)
    elif method == "ssgsea":
        # Simplified ssGSEA-like scoring
        # Rank genes, then calculate enrichment
        ranks = perturbation_data.rank(axis=0, ascending=False)
        gene_ranks = ranks.loc[available_genes]
        n_genes = len(perturbation_data)
        # Normalize by total genes
        score = (n_genes - gene_ranks.mean(axis=0)) / n_genes
        return score
    else:
        raise ValueError(f"Unknown method: {method}")


def load_perturbation_data(data_file: str) -> pd.DataFrame:
    """
    Load perturbation z-score data from various formats.

    Args:
        data_file: Path to data file (parquet, csv, or h5)

    Returns:
        DataFrame with genes as rows, perturbations as columns
    """
    suffix = Path(data_file).suffix.lower()

    if suffix == '.parquet':
        df = pd.read_parquet(data_file)
    elif suffix == '.csv':
        df = pd.read_csv(data_file, index_col=0)
    elif suffix in ['.h5', '.hdf5']:
        df = pd.read_hdf(data_file)
    else:
        raise ValueError(f"Unsupported file format: {suffix}")

    # Ensure gene names are uppercase
    df.index = df.index.str.upper()

    logger.info(f"Loaded data: {df.shape[0]} genes x {df.shape[1]} perturbations")
    return df


def calculate_all_signatures(
    perturbation_data: pd.DataFrame,
    gene_sets: Dict[str, List[str]],
    method: str = "mean"
) -> pd.DataFrame:
    """
    Calculate signature scores for all gene sets.

    Args:
        perturbation_data: DataFrame with genes as rows, perturbations as columns
        gene_sets: Dictionary of gene set names to gene lists
        method: Scoring method

    Returns:
        DataFrame with perturbations as rows, gene sets as columns
    """
    results = {}

    for name, genes in gene_sets.items():
        logger.info(f"Calculating scores for {name} ({len(genes)} genes)")
        scores = calculate_signature_score(perturbation_data, genes, method)
        results[name] = scores

    # Combine into DataFrame
    result_df = pd.DataFrame(results)

    # Clean up perturbation names (remove suffixes like _1, _2)
    result_df.index = [p.split('_')[0] if '_' in p else p for p in result_df.index]

    return result_df


def save_results(
    results: pd.DataFrame,
    output_file: str,
    cell_line: str,
    metadata: Optional[Dict] = None
):
    """
    Save results to parquet file with metadata.

    Args:
        results: DataFrame of signature scores
        output_file: Output parquet file path
        cell_line: Name of cell line
        metadata: Additional metadata to include
    """
    # Add cell line as a column
    results = results.copy()
    results['cell_line'] = cell_line

    # Create parquet table with metadata
    table = pa.Table.from_pandas(results)

    # Add custom metadata
    custom_meta = {
        'cell_line': cell_line,
        'n_signatures': str(len([c for c in results.columns if c != 'cell_line'])),
        'n_perturbations': str(len(results)),
        'created_by': 'calculate_signature_scores.py'
    }
    if metadata:
        custom_meta.update({k: str(v) for k, v in metadata.items()})

    existing_meta = table.schema.metadata or {}
    combined_meta = {**existing_meta, **{k.encode(): v.encode() for k, v in custom_meta.items()}}
    table = table.replace_schema_metadata(combined_meta)

    # Write to parquet
    pq.write_table(table, output_file, compression='snappy')
    logger.info(f"Saved results to {output_file}")


def process_cell_line(
    data_file: str,
    cell_line: str,
    gene_sets: Dict[str, List[str]],
    output_dir: str,
    method: str = "mean"
) -> pd.DataFrame:
    """
    Process a single cell line and save results.

    Args:
        data_file: Path to perturbation data file
        cell_line: Name of cell line
        gene_sets: Dictionary of gene sets
        output_dir: Output directory
        method: Scoring method

    Returns:
        DataFrame of results
    """
    # Load data
    data = load_perturbation_data(data_file)

    # Calculate signatures
    results = calculate_all_signatures(data, gene_sets, method)

    # Save results
    output_file = os.path.join(output_dir, f"signature_scores_{cell_line}.parquet")
    save_results(results, output_file, cell_line, {'method': method})

    return results


def combine_cell_lines(
    output_dir: str,
    combined_output: str
):
    """
    Combine results from multiple cell lines into a single file.

    Args:
        output_dir: Directory containing individual cell line results
        combined_output: Path to combined output file
    """
    dfs = []

    for file in Path(output_dir).glob("signature_scores_*.parquet"):
        df = pd.read_parquet(file)
        dfs.append(df)

    if not dfs:
        logger.warning("No results found to combine")
        return

    combined = pd.concat(dfs, ignore_index=False)

    # Save combined results
    table = pa.Table.from_pandas(combined)
    pq.write_table(table, combined_output, compression='snappy')
    logger.info(f"Combined {len(dfs)} cell lines into {combined_output}")


def create_demo_data(output_dir: str):
    """
    Create demo perturbation data for testing.

    Args:
        output_dir: Directory to save demo data
    """
    np.random.seed(42)

    # Create demo gene list
    all_genes = set()
    for genes in HALLMARK_GENE_SETS.values():
        all_genes.update(genes)
    all_genes = sorted(list(all_genes))[:500]  # Take first 500 unique genes

    # Create demo perturbations
    perturbations = [f"GENE{i}" for i in range(100)]

    # Generate random z-scores
    data = pd.DataFrame(
        np.random.randn(len(all_genes), len(perturbations)),
        index=all_genes,
        columns=perturbations
    )

    # Add some structure - make certain perturbations affect certain pathways
    for i, (pathway, genes) in enumerate(list(HALLMARK_GENE_SETS.items())[:10]):
        pert_idx = i * 10  # Each pathway affects different perturbations
        available_genes = [g for g in genes if g in data.index]
        if available_genes:
            data.loc[available_genes, perturbations[pert_idx:pert_idx+5]] += 2.0  # Upregulate
            data.loc[available_genes, perturbations[pert_idx+5:pert_idx+10]] -= 2.0  # Downregulate

    # Save demo data
    demo_file = os.path.join(output_dir, "demo_perturbation_data.parquet")
    data.to_parquet(demo_file)
    logger.info(f"Created demo data at {demo_file}")

    return demo_file


def main():
    parser = argparse.ArgumentParser(
        description="Calculate gene signature scores for perturbation data"
    )
    parser.add_argument(
        "--data-file",
        type=str,
        help="Path to perturbation data file (parquet/csv/h5)"
    )
    parser.add_argument(
        "--data-dir",
        type=str,
        help="Directory containing perturbation data files for multiple cell lines"
    )
    parser.add_argument(
        "--cell-line",
        type=str,
        default="unknown",
        help="Cell line name (used when processing single file)"
    )
    parser.add_argument(
        "--gmt-file",
        type=str,
        default=None,
        help="Path to GMT file with gene sets (uses built-in Hallmark if not provided)"
    )
    parser.add_argument(
        "--output",
        type=str,
        default="signature_scores.parquet",
        help="Output parquet file path"
    )
    parser.add_argument(
        "--output-dir",
        type=str,
        default="./output",
        help="Output directory for results"
    )
    parser.add_argument(
        "--method",
        type=str,
        choices=["mean", "median", "ssgsea"],
        default="mean",
        help="Scoring method"
    )
    parser.add_argument(
        "--demo",
        action="store_true",
        help="Create and process demo data"
    )

    args = parser.parse_args()

    # Create output directory
    os.makedirs(args.output_dir, exist_ok=True)

    # Load gene sets
    gene_sets = load_hallmark_gmt(args.gmt_file)

    if args.demo:
        # Create and process demo data
        demo_file = create_demo_data(args.output_dir)
        results = process_cell_line(
            demo_file, "DEMO", gene_sets, args.output_dir, args.method
        )
        print("\nDemo signature scores (first 10 perturbations, first 5 signatures):")
        print(results.iloc[:10, :5])
        return

    if args.data_file:
        # Process single file
        results = process_cell_line(
            args.data_file, args.cell_line, gene_sets, args.output_dir, args.method
        )
    elif args.data_dir:
        # Process all files in directory
        for file in Path(args.data_dir).glob("*.parquet"):
            cell_line = file.stem.replace("_perturbation_data", "")
            process_cell_line(
                str(file), cell_line, gene_sets, args.output_dir, args.method
            )

        # Combine results
        combine_cell_lines(args.output_dir, args.output)
    else:
        parser.error("Either --data-file or --data-dir must be provided")


if __name__ == "__main__":
    main()
