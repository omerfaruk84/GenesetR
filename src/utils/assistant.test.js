/**
 * @jest-environment node
 */
import {
  EXAMPLE_QUESTIONS,
  MAX_CHARS,
  MAX_MESSAGES,
  MAX_QUESTIONS,
  askErrorMessage,
  conversationPayload,
  mcpAddress,
  questionProblem,
  questionsAsked,
  sourceInput,
  sourceLink,
} from "./assistant";

const turn = (role, content) => ({ role, content });
const conversation = (questions) =>
  Array.from({ length: questions }).flatMap((_, index) => [turn("user", `question ${index}`), turn("assistant", `answer ${index}`)]);

describe("limits of a conversation", () => {
  it("ten questions fit in the twenty messages of the API", () => {
    expect(MAX_MESSAGES).toBe(20);
    expect(MAX_QUESTIONS).toBe(10);
    expect(MAX_CHARS).toBe(4000);
    expect(EXAMPLE_QUESTIONS.every((question) => !questionProblem(question))).toBe(true);
  });

  it("refuses an empty, a too long and an eleventh question", () => {
    expect(questionProblem("  ")).toBe("Type a question.");
    expect(questionProblem("x".repeat(MAX_CHARS))).toBe("");
    expect(questionProblem("x".repeat(MAX_CHARS + 1))).toContain("at most 4,000 characters");
    expect(questionProblem("one more", conversation(9))).toBe("");
    expect(questionProblem("one more", conversation(10))).toContain("Start a new one");
  });

  it("counts the questions asked", () => {
    expect(questionsAsked(conversation(3))).toBe(3);
    expect(questionsAsked([])).toBe(0);
  });

  it("sends roles and text only, the question last, long answers cut", () => {
    const messages = [turn("user", "What does KEAP1 do?"), { role: "assistant", content: "a".repeat(5000), sources: [{ tool: "x" }], model: "m" }];
    const payload = conversationPayload(messages, "  And NFE2L2? ");
    expect(payload).toHaveLength(3);
    expect(payload.every((message) => Object.keys(message).join() === "role,content")).toBe(true);
    expect(payload[1].content).toHaveLength(MAX_CHARS);
    expect(payload[2]).toEqual({ role: "user", content: "And NFE2L2?" });
    expect(conversationPayload([], "First")).toEqual([{ role: "user", content: "First" }]);
  });
});

describe("messages for a failed question", () => {
  it("429 says when to come back", () => {
    expect(askErrorMessage({ status: 429, retryAfter: 3600 })).toBe("Too many questions were asked from your address. Try again in about 60 minutes.");
    expect(askErrorMessage({ status: 429, retryAfter: 30 })).toContain("about 1 minute.");
    expect(askErrorMessage({ status: 429 })).toContain("Try again later.");
  });

  it("503 and 400 show the message of the API", () => {
    expect(askErrorMessage({ status: 503, message: "The assistant is busy. Try again in a minute." })).toBe("The assistant is busy. Try again in a minute.");
    expect(askErrorMessage({ status: 503 })).toContain("not available");
    expect(askErrorMessage({ status: 400, message: "A message can have at most 4000 characters" })).toBe("A message can have at most 4000 characters");
  });

  it("other failures do not show server text", () => {
    expect(askErrorMessage({ status: 500, message: "Traceback ..." })).not.toContain("Traceback");
    expect(askErrorMessage({ status: 0 })).toContain("could not be reached");
    expect(askErrorMessage()).toContain("could not be reached");
  });
});

describe("what a look-up read", () => {
  it("names genes, datasets, pathways and pairs", () => {
    expect(sourceInput({ tool: "consensus_effects", input: { gene: "keap1", top_n: 15 } })).toBe("KEAP1");
    expect(sourceInput({ tool: "knockdown_profile", input: { gene: "ATF4", dataset: "K562gwps" } })).toBe("ATF4 in K562gwps");
    expect(sourceInput({ tool: "pathway_perturbations", input: { pathway: "interferon alpha", library: "hallmark" } })).toBe("“interferon alpha”, Hallmark");
    expect(sourceInput({ tool: "genetic_interaction", input: { gene_a: "CBL", gene_b: "CNN1" } })).toBe("CBL + CNN1");
    expect(sourceInput({ tool: "genetic_interaction", input: { gene_a: "CBL" } })).toBe("pairs of CBL");
    expect(sourceInput({ tool: "data_overview", input: {} })).toBe("");
    expect(sourceInput({ tool: "data_overview" })).toBe("");
  });

  it("shortens long lists and accepts text for a list", () => {
    expect(sourceInput({ tool: "signature_perturbations", input: { up: ["A", "B"], down: "C;D" } })).toBe("up: A, B; down: C, D");
    expect(sourceInput({ tool: "gene_set_enrichment", input: { genes: ["G1", "G2", "G3", "G4", "G5", "G6", "G7", "G8"] } })).toBe("G1, G2, G3, G4, G5, G6 and 2 more");
    expect(sourceInput({ tool: "common_effects", input: { perturbations: ["PSMA1", "PSMB2"] } })).toBe("PSMA1, PSMB2");
  });

  it("shows an input it does not know instead of hiding it", () => {
    expect(sourceInput({ tool: "new_tool", input: { gene: "ATF4", depth: 2 } })).toBe("ATF4; depth: 2");
  });
});

describe("the page that shows the same data", () => {
  it("integrated analysis for consensus look-ups", () => {
    expect(sourceLink({ tool: "consensus_effects", input: { gene: "keap1" }, ok: true }).to).toBe("/integrated?mode=gene&symbol=KEAP1");
    expect(sourceLink({ tool: "knockdown_profile", input: { gene: "ATF4", dataset: "K562gwps" }, ok: true }).to).toBe("/integrated?mode=gene&symbol=ATF4");
    expect(sourceLink({ tool: "consensus_regulators", input: { gene: "SQLE" }, ok: true }).to).toBe("/integrated?mode=gene&symbol=SQLE&view=measured");
    expect(sourceLink({ tool: "signature_perturbations", input: { up: ["A", "B"], down: ["C"] }, ok: true }).to).toBe("/integrated?mode=signature&up=A,B&down=C&run=1");
    expect(sourceLink({ tool: "common_effects", input: { perturbations: ["PSMA1", "PSMB2"] }, ok: true }).to).toBe("/integrated?mode=set&genes=PSMA1,PSMB2&run=1");
  });

  it("function atlas for functions and pathways", () => {
    expect(sourceLink({ tool: "gene_function", input: { gene: "C1orf159" }, ok: true }).to).toBe("/atlas?gene=C1ORF159");
    expect(sourceLink({ tool: "pathway_perturbations", input: { pathway: "interferon alpha" }, ok: true }).to).toBe("/atlas?tab=pathways");
    expect(sourceLink({ tool: "pathway_perturbations", input: { pathway: "interferon", library: "hallmark" }, ok: true }).to).toBe("/atlas?tab=pathways&library=hallmark");
    expect(sourceLink({ tool: "perturbation_pathways", input: { gene: "SCAP" }, ok: true }).to).toBe("/atlas?tab=pathways&by=gene&pert=SCAP");
  });

  it("genetic interactions for a pair or for one gene", () => {
    expect(sourceLink({ tool: "genetic_interaction", input: { gene_a: "CBL", gene_b: "CNN1" }, ok: true })).toEqual({
      to: "/interactions?a=CBL&b=CNN1",
      label: "Genetic interactions: CBL + CNN1",
    });
    expect(sourceLink({ tool: "genetic_interaction", input: { gene_a: "CBL" }, ok: true }).to).toBe("/interactions?q=CBL");
  });

  it("TF regulators: the page for a signature, the gene page for one gene", () => {
    expect(sourceLink({ tool: "tf_regulators", input: { up: ["A", "B", "C"] }, ok: true }).to).toBe("/tf-regulators?up=A,B,C&run=1");
    expect(sourceLink({ tool: "tf_regulators", input: { gene: "LDHA" }, ok: true }).to).toBe("/gene?symbol=LDHA");
    expect(sourceLink({ tool: "tf_regulators", input: { up: ["A"] }, ok: true })).toBeNull();
  });

  it("no link for a failed look-up, for missing input or where no page shows the data", () => {
    expect(sourceLink({ tool: "consensus_effects", input: { gene: "NOPE" }, ok: false, error: "not perturbed" })).toBeNull();
    expect(sourceLink({ tool: "consensus_effects", input: {}, ok: true })).toBeNull();
    expect(sourceLink({ tool: "gene_set_enrichment", input: { genes: ["A", "B", "C"] }, ok: true })).toBeNull();
    expect(sourceLink({ tool: "predict_effect", input: { gene: "ATF4", dataset: "HCT116gwps" }, ok: true })).toBeNull();
    expect(sourceLink({ tool: "data_overview", input: {}, ok: true }).to).toBe("/datasets");
    expect(sourceLink(null)).toBeNull();
  });
});

describe("MCP endpoint", () => {
  it("is next to the API", () => {
    expect(mcpAddress("https://genesetr.uio.no/api")).toBe("https://genesetr.uio.no/api/mcp");
    expect(mcpAddress("http://localhost:8443/")).toBe("http://localhost:8443/mcp");
  });
});
