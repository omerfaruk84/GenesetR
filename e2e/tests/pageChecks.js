// Checks shared by the specs of the Genetic interactions and Ask GeneSetR pages.
const fs = require("fs");
const { expect } = require("@playwright/test");

/** The release note opens on a first visit; the tests start as a returning visitor. */
const returningVisitor = async (page) => {
  await page.addInitScript(() => {
    try {
      window.localStorage.setItem("genesetr.v2.releasePopup.dismissed.v1", "1");
    } catch (error) {
      // storage not available: the pages still work
    }
  });
};

/** Start the pages in the light or the dark theme. */
const useTheme = async (page, theme) => {
  await page.addInitScript((value) => {
    try {
      window.localStorage.setItem("genesetr_theme", value);
    } catch (error) {
      // storage not available: the light theme is tested
    }
  }, theme);
};

const downloadFrom = async (page, button) => {
  const [file] = await Promise.all([page.waitForEvent("download"), button.click()]);
  return file;
};

/**
 * Click CSV, TSV and Excel of the export buttons inside `scope` and check the
 * three files. Returns the lines of the CSV.
 */
const expectTableExports = async (page, scope, name) => {
  const button = (label) => scope.getByRole("button", { name: label, exact: true }).first();
  const csv = await downloadFrom(page, button("CSV"));
  expect(csv.suggestedFilename()).toMatch(new RegExp(`^${name}-[\\d-]+\\.csv$`));
  const lines = fs.readFileSync(await csv.path(), "utf-8").replace(/^﻿/, "").trim().split(/\r?\n/);
  expect(lines.length).toBeGreaterThan(1);
  const tsv = await downloadFrom(page, button("TSV"));
  expect(tsv.suggestedFilename()).toMatch(new RegExp(`^${name}-[\\d-]+\\.tsv$`));
  expect(fs.readFileSync(await tsv.path(), "utf-8").trim().split(/\r?\n/)).toHaveLength(lines.length);
  const xlsx = await downloadFrom(page, button("Excel"));
  expect(xlsx.suggestedFilename()).toMatch(new RegExp(`^${name}-[\\d-]+\\.xlsx$`));
  // an .xlsx file is a zip archive
  expect(fs.readFileSync(await xlsx.path()).subarray(0, 2).toString()).toBe("PK");
  return lines;
};

/**
 * Runs in the page. Width of the page against the width of its content, and
 * the elements that stick out of the screen without being inside a frame that
 * scrolls sideways.
 */
const sidewaysOverflow = () => {
  const width = document.documentElement.clientWidth;
  const scrolls = (node) => {
    const style = getComputedStyle(node);
    return /auto|scroll|hidden/.test(style.overflowX) && node.scrollWidth > node.clientWidth + 1;
  };
  let shell = document.querySelector("h1");
  while (shell && !/auto|scroll/.test(getComputedStyle(shell).overflowY)) shell = shell.parentElement;
  const inFrame = (node) => {
    for (let parent = node.parentElement; parent && parent !== shell && parent !== document.body; parent = parent.parentElement) {
      if (scrolls(parent)) return true;
    }
    return false;
  };
  const sticking = [];
  (shell || document.body).querySelectorAll("*").forEach((node) => {
    const box = node.getBoundingClientRect();
    if (box.width > 0 && box.height > 0 && box.right > width + 1 && !inFrame(node)) {
      sticking.push(`${node.tagName.toLowerCase()}.${String(node.className).slice(0, 40)} (right edge ${Math.round(box.right)})`);
    }
  });
  return {
    width,
    document: document.documentElement.scrollWidth,
    shell: shell ? shell.scrollWidth - shell.clientWidth : 0,
    sticking: sticking.slice(0, 8),
  };
};

/** The page does not scroll sideways and nothing sticks out of the screen. */
const expectNoSidewaysScroll = async (page, width, what = "") => {
  const measured = await page.evaluate(sidewaysOverflow);
  expect(measured, what).toMatchObject({ document: measured.width, shell: 0, sticking: [] });
  expect(measured.width, what).toBeLessThanOrEqual(width);
};

module.exports = { returningVisitor, useTheme, downloadFrom, expectTableExports, expectNoSidewaysScroll };
