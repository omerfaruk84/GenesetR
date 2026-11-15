// Ask GeneSetR (/ask). The assistant is mocked: the status says "enabled" and the answers are
// hand-written (fixtures/assistant_*.json, see the assistant block of mockApi.js).
const { test, expect } = require("@playwright/test");
const { mockApi, watchErrors } = require("./mockApi");
const { returningVisitor, useTheme, expectNoSidewaysScroll } = require("./pageChecks");

test.beforeEach(async ({ page }) => {
  await returningVisitor(page);
});

const STATUS = /\/api\/v1\/assistant\/status$/;
const ASK = /\/api\/v1\/assistant$/;

/** The bodies of the questions sent to the API. */
const watchQuestions = (page) => {
  const bodies = [];
  page.on("request", (request) => {
    if (request.method() === "POST" && ASK.test(new URL(request.url()).pathname)) bodies.push(JSON.parse(request.postData() || "{}"));
  });
  return bodies;
};

const ask = async (page, question) => {
  await page.getByRole("textbox", { name: "Your question" }).fill(question);
  await page.getByRole("button", { name: "Ask", exact: true }).click();
};

test("switched off: the page says so and points to the pages and to the MCP endpoint", async ({ page }) => {
  await mockApi(page);
  await page.route(STATUS, (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: { "access-control-allow-origin": "*" },
      body: JSON.stringify({ enabled: false, reason: "The assistant is switched off on this server." }),
    })
  );
  const errors = watchErrors(page);
  await page.goto("/ask");
  await expect(page.getByRole("heading", { name: "Ask GeneSetR", level: 1 })).toBeVisible();
  const off = page.getByTestId("ask-disabled");
  await expect(off).toContainText("The assistant is switched off on this server.");
  await expect(off).toContainText("have to switch on");
  await expect(off.getByRole("link", { name: "Integrated analysis" })).toHaveAttribute("href", "/integrated");
  await expect(off.getByRole("link", { name: "Function atlas" })).toHaveAttribute("href", "/atlas");
  await expect(off.getByRole("link", { name: "Genetic interactions" })).toHaveAttribute("href", "/interactions");
  await expect(page.getByTestId("ask-mcp")).toHaveText(/^https?:\/\/.+\/mcp$/);
  // nothing to type into, nothing to click
  await expect(page.getByRole("textbox", { name: "Your question" })).toHaveCount(0);
  await expect(page.getByTestId("ask-examples")).toHaveCount(0);
  expect(await errors()).toEqual([]);
});

test("a server that does not answer, or gives no reason, counts as switched off", async ({ page }) => {
  await mockApi(page);
  await page.route(STATUS, (route) => route.abort());
  await page.goto("/ask");
  await expect(page.getByTestId("ask-disabled")).toContainText("The server could not be reached");
  await expect(page.getByRole("textbox", { name: "Your question" })).toHaveCount(0);

  await page.unroute(STATUS);
  await page.route(STATUS, (route) =>
    route.fulfill({ status: 200, contentType: "application/json", headers: { "access-control-allow-origin": "*" }, body: JSON.stringify({ enabled: false }) })
  );
  await page.reload();
  await expect(page.getByTestId("ask-disabled")).toContainText("The assistant is not switched on on this server.");
});

test("a question and its answer: who wrote it, the Markdown, the data used and the links", async ({ page }) => {
  await mockApi(page);
  // the answer takes a moment, so that the waiting text can be seen
  await page.route(ASK, async (route) => {
    if (route.request().method() === "POST") await new Promise((resolve) => setTimeout(resolve, 700));
    await route.fallback();
  });
  const questions = watchQuestions(page);
  const errors = watchErrors(page);
  await page.goto("/ask");
  await expect(page.getByTestId("ask-examples").getByRole("button")).toHaveCount(5);
  await expect(page.getByTestId("ask-tools")).toContainText("What the assistant can look up (13)");

  await ask(page, "What does loss of KEAP1 do across cell types?");
  await expect(page.getByTestId("ask-waiting")).toHaveText("Reading GeneSetR's tables. An answer can take a minute.");
  await expect(page.getByTestId("ask-question")).toHaveText(/What does loss of KEAP1 do across cell types\?$/);
  await expect(page.getByRole("button", { name: "Reading…" })).toBeDisabled();

  const answer = page.getByTestId("ask-answer");
  await expect(answer).toBeVisible();
  await expect(page.getByTestId("ask-waiting")).toHaveCount(0);
  await expect(page.getByTestId("ask-byline")).toHaveText(
    "Written by an AI model (claude-opus-5-5) from GeneSetR's tables. It can be wrong: check the numbers on the linked pages."
  );
  expect(questions).toEqual([{ messages: [{ role: "user", content: "What does loss of KEAP1 do across cell types?" }] }]);

  // Markdown: bold, a table with right-aligned numbers, a list, italics, code, a link
  const text = page.getByTestId("ask-answer-text");
  await expect(text.locator("p strong").first()).toHaveText("Loss of KEAP1 switches on the NRF2 programme");
  await expect(text.locator("table thead th")).toHaveText(["Gene", "Meta z", "q", "Contexts"]);
  await expect(text.locator("table tbody tr")).toHaveCount(3);
  await expect(text.locator("table tbody tr").first().locator("td")).toHaveText(["NQO1", "38.2", "1e-300", "4"]);
  await expect(text.locator("table tbody td").nth(1)).toHaveCSS("text-align", "right");
  await expect(text.locator("ul > li")).toHaveCount(3);
  await expect(text.locator("ul em")).toHaveText("reproducible");
  await expect(text.locator("ul code")).toHaveText("Reactive Oxygen Species Pathway");
  const link = text.getByRole("link", { name: "UniProt" });
  await expect(link).toHaveAttribute("href", "https://www.uniprot.org/uniprotkb/Q14145/entry");
  await expect(link).toHaveAttribute("target", "_blank");
  await expect(link).toHaveAttribute("rel", /noopener/);
  await expect(text).not.toContainText("**");
  await expect(text).not.toContainText("|");

  // data used: one line per look-up, a link where a page shows the same data
  const sources = page.getByTestId("ask-source");
  await expect(sources).toHaveCount(4);
  await expect(sources.nth(0)).toContainText("What a knock-down does, across datasets");
  await expect(sources.nth(0)).toContainText("KEAP1");
  await expect(sources.nth(0).getByRole("link")).toHaveAttribute("href", "/integrated?mode=gene&symbol=KEAP1");
  await expect(sources.nth(1)).toContainText("KEAP1, Hallmark");
  await expect(sources.nth(1).getByRole("link")).toHaveAttribute("href", "/atlas?tab=pathways&by=gene&pert=KEAP1&library=hallmark");
  // a failed look-up is marked and has no link
  await expect(sources.nth(2)).toContainText("One knock-down in one dataset");
  await expect(sources.nth(2)).toContainText("KEAP1 in K562");
  await expect(sources.nth(2).getByTestId("ask-source-failed")).toHaveText("Look-up failed: Unknown dataset");
  await expect(sources.nth(2).getByRole("link")).toHaveCount(0);
  await expect(page.getByTestId("ask-source-failed")).toHaveCount(1);
  // no page shows an enrichment; the long list is shortened
  await expect(sources.nth(3)).toContainText("NQO1, TXNRD1, SLC7A11, GCLM, SRXN1, HMOX1 and 2 more");
  await expect(sources.nth(3).getByRole("link")).toHaveCount(0);
  await expect(page.getByTestId("ask-note")).toHaveCount(0);

  // the link leads to the page with the same data
  await sources.nth(0).getByRole("link").click();
  await expect(page).toHaveURL(/\/integrated\?mode=gene&symbol=KEAP1$/);
  expect(await errors()).toEqual([]);
});

test("a follow-up question sends the conversation; the note is shown; HTML and unsafe links stay text", async ({ page }) => {
  await mockApi(page);
  const questions = watchQuestions(page);
  const errors = watchErrors(page);
  await page.goto("/ask");
  await ask(page, "What does loss of KEAP1 do?");
  await expect(page.getByTestId("ask-answer")).toHaveCount(1);
  await expect(page.getByRole("textbox", { name: "Your question" })).toHaveAttribute("placeholder", "Ask a follow-up question");
  await page.getByRole("textbox", { name: "Your question" }).fill("Do CBL and CNN1 interact?");
  await page.getByRole("textbox", { name: "Your question" }).press("Enter");
  await expect(page.getByTestId("ask-answer")).toHaveCount(2);
  await expect(page.getByTestId("ask-question")).toHaveCount(2);

  // the whole conversation goes to the API: question, answer (text only), question
  expect(questions).toHaveLength(2);
  expect(questions[1].messages.map((message) => message.role)).toEqual(["user", "assistant", "user"]);
  expect(Object.keys(questions[1].messages[1])).toEqual(["role", "content"]);
  expect(questions[1].messages[1].content).toContain("**Loss of KEAP1 switches on the NRF2 programme**");
  expect(questions[1].messages[2].content).toBe("Do CBL and CNN1 interact?");

  const second = page.getByTestId("ask-answer").nth(1);
  await expect(second.getByTestId("ask-note")).toHaveText("Stopped after 8 rounds of look-ups; the answer may be incomplete.");
  // a numbered list with a nested list
  const text = second.getByTestId("ask-answer-text");
  await expect(text.locator("ol > li")).toHaveCount(2);
  await expect(text.locator("ol > li").nth(1).locator("ul > li")).toHaveText(["HBZ (interaction z 50.1)", "HBA2 (interaction z 58.4)"]);
  // HTML of the answer is text, a javascript: address is no link
  await expect(text).toContainText('<img src=x onerror="window.__pwned = true">');
  await expect(text.locator("img")).toHaveCount(0);
  await expect(text).toContainText("A link that must not work");
  await expect(text.getByRole("link")).toHaveCount(0);
  expect(await page.evaluate(() => window.__pwned)).toBeUndefined();

  // every look-up has its page
  const links = second.getByTestId("ask-source").getByRole("link");
  await expect(links).toHaveCount(5);
  expect(await links.evaluateAll((nodes) => nodes.map((node) => node.getAttribute("href")))).toEqual([
    "/interactions?a=CBL&b=CNN1",
    "/atlas?gene=CNN1",
    "/atlas?tab=pathways&library=hallmark",
    "/integrated?mode=gene&symbol=HBZ&view=measured",
    "/gene?symbol=HBZ",
  ]);
  await expect(second.getByTestId("ask-source").first()).toContainText("Genetic interaction of two genes");
  await expect(second.getByTestId("ask-source").first()).toContainText("CBL + CNN1");
  await links.first().click();
  await expect(page).toHaveURL(/\/interactions\?a=CBL&b=CNN1$/);
  await expect(page.getByTestId("interaction-reading")).toContainText("Switching on CBL and CNN1 together");
  expect(await errors()).toEqual([]);
});

test("too many questions (429) and not available (503): the message is shown and the question is kept", async ({ page }) => {
  await mockApi(page);
  const errors = watchErrors(page);
  await page.goto("/ask");
  await ask(page, "Is there a rate limit?");
  await expect(page.getByTestId("ask-error")).toHaveText("Too many questions were asked from your address. Try again in about 60 minutes.");
  // the question is back in the box and not part of the conversation
  await expect(page.getByRole("textbox", { name: "Your question" })).toHaveValue("Is there a rate limit?");
  await expect(page.getByTestId("ask-question")).toHaveCount(0);
  await expect(page.getByTestId("ask-answer")).toHaveCount(0);

  await ask(page, "What if the model is unavailable?");
  await expect(page.getByTestId("ask-error")).toHaveText("The assistant is busy. Try again in a minute.");
  await expect(page.getByRole("textbox", { name: "Your question" })).toHaveValue("What if the model is unavailable?");

  // the next question works, and the error goes away
  await ask(page, "What does loss of KEAP1 do?");
  await expect(page.getByTestId("ask-answer")).toHaveCount(1);
  await expect(page.getByTestId("ask-error")).toHaveCount(0);

  // a server error does not show server text
  await page.route(ASK, (route) =>
    route.request().method() === "POST"
      ? route.fulfill({
          status: 500,
          contentType: "application/json",
          headers: { "access-control-allow-origin": "*" },
          body: JSON.stringify({ error: { code: "INTERNAL_ERROR", message: "Traceback (most recent call last)", details: {} } }),
        })
      : route.fallback()
  );
  await ask(page, "And now?");
  await expect(page.getByTestId("ask-error")).toContainText("error on the server");
  await expect(page.getByTestId("ask-error")).not.toContainText("Traceback");
  expect(await errors()).toEqual([]);
});

test("an example question is asked with one click; a new conversation starts empty", async ({ page }) => {
  await mockApi(page);
  const questions = watchQuestions(page);
  const errors = watchErrors(page);
  await page.goto("/ask");
  await expect(page.getByTestId("ask-new")).toHaveCount(0);
  await page.getByRole("button", { name: "Do CBL and CNN1 interact?" }).click();
  await expect(page.getByTestId("ask-answer")).toHaveCount(1);
  expect(questions[0].messages).toEqual([{ role: "user", content: "Do CBL and CNN1 interact?" }]);
  await expect(page.getByTestId("ask-examples")).toHaveCount(0);

  await page.getByTestId("ask-new").click();
  await expect(page.getByTestId("ask-answer")).toHaveCount(0);
  await expect(page.getByTestId("ask-question")).toHaveCount(0);
  await expect(page.getByTestId("ask-examples")).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Your question" })).toBeFocused();
  // the next question starts from nothing
  await ask(page, "What might C1orf159 do?");
  await expect(page.getByTestId("ask-answer")).toHaveCount(1);
  expect(questions[1].messages).toHaveLength(1);

  // a reload forgets the conversation
  await page.reload();
  await expect(page.getByTestId("ask-examples")).toBeVisible();
  await expect(page.getByTestId("ask-answer")).toHaveCount(0);
  expect(await errors()).toEqual([]);
});

test("limits: 4,000 characters per question and ten questions per conversation", async ({ page }) => {
  test.setTimeout(120000);
  await mockApi(page);
  const questions = watchQuestions(page);
  const errors = watchErrors(page);
  await page.goto("/ask");
  const box = page.getByRole("textbox", { name: "Your question" });
  // an empty question cannot be sent
  await expect(page.getByRole("button", { name: "Ask", exact: true })).toBeDisabled();
  await box.fill("x".repeat(4100));
  expect((await box.inputValue()).length).toBe(4000);
  await expect(page.getByText("4,000 of 4,000 characters")).toBeVisible();

  for (let number = 1; number <= 10; number += 1) {
    await ask(page, `Question ${number} about KEAP1`);
    await expect(page.getByTestId("ask-answer")).toHaveCount(number);
  }
  await expect(page.getByTestId("ask-full")).toContainText("This conversation has reached its 10 questions.");
  await expect(page.getByRole("textbox", { name: "Your question" })).toHaveCount(0);
  // the last request has 19 messages, within the 20 the API accepts
  expect(questions).toHaveLength(10);
  expect(questions[9].messages).toHaveLength(19);
  await page.getByTestId("ask-new").click();
  await expect(page.getByRole("textbox", { name: "Your question" })).toBeVisible();
  expect(await errors()).toEqual([]);
});

test("the navigation leads to the page", async ({ page }) => {
  await mockApi(page);
  await page.goto("/datasets");
  await page.getByRole("button", { name: /Explore a gene$/ }).first().click();
  await page.getByRole("menuitem", { name: /Ask GeneSetR/ }).click();
  await expect(page).toHaveURL(/\/ask$/);
  await expect(page.getByRole("heading", { name: "Ask GeneSetR", level: 1 })).toBeVisible();
  // the group of the page is marked as the current one, and the menu has closed
  await expect(page.getByRole("menuitem", { name: /Ask GeneSetR/ })).toHaveCount(0);
});

for (const [width, height] of [
  [375, 812],
  [768, 1024],
]) {
  for (const theme of ["light", "dark"]) {
    test(`nothing scrolls sideways at ${width} px (${theme} theme)`, async ({ page }) => {
      await mockApi(page);
      const errors = watchErrors(page);
      await page.setViewportSize({ width, height });
      await useTheme(page, theme);
      await page.goto("/ask");
      await expect(page.getByTestId("ask-examples")).toBeVisible();
      if (theme === "dark") await expect(page.locator("html")).toHaveAttribute("data-gs-theme", "dark");
      await expectNoSidewaysScroll(page, width, "empty");
      await ask(page, "What does loss of KEAP1 do across cell types?");
      await expect(page.getByTestId("ask-answer")).toHaveCount(1);
      await ask(page, "Do CBL and CNN1 interact? ".repeat(8));
      await expect(page.getByTestId("ask-answer")).toHaveCount(2);
      await expectNoSidewaysScroll(page, width, "two answers");
      const box = await page.getByRole("button", { name: "Ask", exact: true }).boundingBox();
      expect(box.x + box.width).toBeLessThanOrEqual(width);
      expect(await errors()).toEqual([]);
    });
  }
}
