import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ROUTES } from "../../common/routes";
import { Markdown } from "../../components/markdown";
import { Notice } from "../../components/ui";
import { askAssistant, fetchAssistantStatus } from "../../store/api/assistant";
import { SERVER_ADDRESS } from "../../store/api/config";
import {
  EXAMPLE_QUESTIONS,
  MAX_CHARS,
  MAX_QUESTIONS,
  askErrorMessage,
  conversationPayload,
  mcpAddress,
  questionProblem,
  questionsAsked,
  sourceInput,
  sourceLink,
} from "../../utils/assistant";
import styles from "./ask-page.module.scss";

const COUNTER_FROM = MAX_CHARS - 500;

/** "Data used": one line per look-up of an answer, with the page that shows the same data. */
const Sources = ({ sources }) => {
  if (!sources || sources.length === 0) {
    return (
      <p className={styles.noSources} data-testid="ask-no-sources">
        No table was read for this answer: it does not rest on GeneSetR's data.
      </p>
    );
  }
  return (
    <div className={styles.sources} data-testid="ask-sources">
      <h3>Data used</h3>
      <ol>
        {sources.map((source, index) => {
          const input = sourceInput(source);
          const link = sourceLink(source);
          return (
            <li key={index} data-testid="ask-source" className={source.ok === false ? styles.sourceFailed : undefined}>
              <span className={styles.sourceTitle}>{source.title || source.tool}</span>
              {input && <span className={styles.sourceInput}>{input}</span>}
              {source.ok === false && (
                <span className={styles.failed} data-testid="ask-source-failed">
                  Look-up failed{source.error ? `: ${source.error}` : ""}
                </span>
              )}
              {link && (
                <Link className={styles.sourceLink} to={link.to} title="The same data on a page of GeneSetR">
                  {link.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
};

/** One answer: who wrote it, the text, the note of the server and the look-ups. */
const Answer = ({ message }) => (
  <article className={styles.answer} data-testid="ask-answer" aria-label="Answer">
    <div className={styles.byline} data-testid="ask-byline">
      Written by an AI model{message.model ? <> (<code>{message.model}</code>)</> : ""} from GeneSetR's tables. It can be wrong: check the
      numbers on the linked pages.
    </div>
    <Markdown className={styles.markdown} text={message.content} data-testid="ask-answer-text" />
    {message.note && (
      <Notice kind="warning" className={styles.note}>
        <span data-testid="ask-note">{message.note}</span>
      </Notice>
    )}
    <Sources sources={message.sources} />
  </article>
);

/** What to do when the assistant is not switched on. */
const Disabled = ({ status }) => (
  <div data-testid="ask-disabled">
    <Notice kind="info">
      <strong>
        {status.unreachable
          ? "The server could not be reached, so the assistant cannot be used right now."
          : status.reason || "The assistant is not switched on on this server."}
      </strong>{" "}
      Questions in plain words need an AI model, which the people who run this server have to switch on.
    </Notice>
    <div className={styles.elsewhere}>
      <h2>The same data without the assistant</h2>
      <ul>
        <li>
          <Link to={ROUTES.INTEGRATED}>Integrated analysis</Link>: what a knock-down does and what controls a gene, over all
          datasets.
        </li>
        <li>
          <Link to={ROUTES.ATLAS}>Function atlas</Link>: partners and predicted functions of a gene, and the knock-downs that
          move a pathway.
        </li>
        <li>
          <Link to={ROUTES.INTERACTIONS}>Genetic interactions</Link>: what two genes do together.
        </li>
      </ul>
      <h2>With an assistant of your own</h2>
      <p>
        An AI assistant that supports the Model Context Protocol (MCP) can read the same tables. Add this address as a
        connector ("Streamable HTTP"):
      </p>
      <p>
        <code className={styles.address} data-testid="ask-mcp">
          {mcpAddress(SERVER_ADDRESS)}
        </code>
      </p>
    </div>
  </div>
);

/**
 * "Ask GeneSetR": a question in plain language, answered by an AI model that
 * looks it up in GeneSetR's tables. The conversation is kept in memory only.
 */
const AskPage = () => {
  const [status, setStatus] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [pending, setPending] = useState(null); // the question that is being answered
  const [error, setError] = useState("");
  const request = useRef(null);
  const endRef = useRef(null);
  const boxRef = useRef(null);

  useEffect(() => {
    document.title = "Ask GeneSetR – GeneSetR";
    const controller = new AbortController();
    fetchAssistantStatus({ signal: controller.signal })
      .then((answer) => {
        if (!controller.signal.aborted) setStatus(answer);
      })
      .catch(() => {});
    return () => {
      controller.abort();
      if (request.current) request.current.abort();
      document.title = "GeneSetR";
    };
  }, []);

  // keep the newest message in view
  useEffect(() => {
    if ((messages.length > 0 || pending) && endRef.current?.scrollIntoView) endRef.current.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [messages, pending, error]);

  const full = messages.length + 1 > MAX_QUESTIONS * 2;
  const problem = questionProblem(text, messages);

  const ask = (value) => {
    const question = String(value || "").trim();
    if (pending || questionProblem(question, messages)) return;
    const controller = new AbortController();
    request.current = controller;
    setPending(question);
    setError("");
    setText("");
    askAssistant(conversationPayload(messages, question), { signal: controller.signal })
      .then((data) => {
        if (controller.signal.aborted) return;
        setMessages((current) => [
          ...current,
          { role: "user", content: question },
          {
            role: "assistant",
            content: String(data?.answer || "").trim() || "No answer was produced. Try a narrower question.",
            note: data?.note || "",
            sources: Array.isArray(data?.sources) ? data.sources : [],
            model: data?.model || status?.model || "",
          },
        ]);
        setPending(null);
      })
      .catch((failure) => {
        if (controller.signal.aborted) return;
        // the question goes back into the box, so that it can be asked again
        setError(askErrorMessage({ status: failure.status, message: failure.apiMessage, retryAfter: failure.retryAfter }));
        setText(question);
        setPending(null);
      });
  };

  const restart = () => {
    if (request.current) request.current.abort();
    setMessages([]);
    setPending(null);
    setError("");
    setText("");
    if (boxRef.current) boxRef.current.focus();
  };

  const onKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      ask(text);
    }
  };

  const asked = questionsAsked(messages) + (pending ? 1 : 0);
  const started = messages.length > 0 || !!pending;

  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <div className={styles.titleRow}>
          <h1>Ask GeneSetR</h1>
          {status?.enabled && started && (
            <button type="button" className={styles.button} onClick={restart} data-testid="ask-new">
              New conversation
            </button>
          )}
        </div>
        <p className={styles.lead}>
          Ask a question in plain words. An AI model looks the answer up in GeneSetR's tables (all knock-down datasets
          combined, the function atlas, the pathway atlas, the gene pairs) and lists every table it read, so that each
          statement can be checked.
        </p>

        {!status && (
          <div className={styles.status} role="status">
            Checking whether the assistant is available…
          </div>
        )}
        {status && !status.enabled && <Disabled status={status} />}
        {status?.enabled && (
          <>
            {!started && (
              <div className={styles.examples} data-testid="ask-examples">
                <span className={styles.muted}>Try:</span>
                {EXAMPLE_QUESTIONS.map((question) => (
                  <button key={question} type="button" className={styles.chip} onClick={() => ask(question)}>
                    {question}
                  </button>
                ))}
              </div>
            )}
            <div className={styles.conversation} data-testid="ask-conversation" aria-live="polite">
              {messages.map((message, index) =>
                message.role === "user" ? (
                  <div key={index} className={styles.question} data-testid="ask-question">
                    <span className={styles.who}>You asked</span>
                    {message.content}
                  </div>
                ) : (
                  <Answer key={index} message={message} />
                )
              )}
              {pending && (
                <>
                  <div className={styles.question} data-testid="ask-question">
                    <span className={styles.who}>You asked</span>
                    {pending}
                  </div>
                  <div className={styles.waiting} role="status" data-testid="ask-waiting">
                    <span className={styles.pulse} aria-hidden="true" />
                    Reading GeneSetR's tables. An answer can take a minute.
                  </div>
                </>
              )}
              {error && (
                <Notice kind="danger" className={styles.note}>
                  <span data-testid="ask-error">{error}</span>
                </Notice>
              )}
              <div ref={endRef} />
            </div>

            {full ? (
              <Notice kind="info" className={styles.note}>
                <span data-testid="ask-full">
                  This conversation has reached its {MAX_QUESTIONS} questions. Start a new conversation to go on.
                </span>
              </Notice>
            ) : (
              <form
                className={styles.form}
                onSubmit={(event) => {
                  event.preventDefault();
                  ask(text);
                }}
              >
                <textarea
                  ref={boxRef}
                  className={styles.box}
                  rows={2}
                  maxLength={MAX_CHARS}
                  aria-label="Your question"
                  placeholder={started ? "Ask a follow-up question" : "Ask about a gene, a pathway or a gene list, e.g. What does loss of KEAP1 do?"}
                  value={text}
                  onChange={(event) => setText(event.target.value)}
                  onKeyDown={onKeyDown}
                />
                <div className={styles.formRow}>
                  <span className={styles.muted}>
                    {text.length >= COUNTER_FROM
                      ? `${text.length.toLocaleString("en-US")} of ${MAX_CHARS.toLocaleString("en-US")} characters`
                      : started
                        ? `Question ${Math.min(asked + (pending ? 0 : 1), MAX_QUESTIONS)} of ${MAX_QUESTIONS}. The conversation is not saved: a reload starts a new one.`
                        : "Enter sends, Shift+Enter starts a new line."}
                  </span>
                  <button type="submit" className={styles.primary} disabled={!!pending || !!problem} title={pending ? "Wait for the answer" : problem}>
                    {pending ? "Reading…" : "Ask"}
                  </button>
                </div>
              </form>
            )}
            {Array.isArray(status.tools) && status.tools.length > 0 && (
              <details className={styles.tools} data-testid="ask-tools">
                <summary>What the assistant can look up ({status.tools.length})</summary>
                <ul>
                  {status.tools.map((tool) => (
                    <li key={tool.name}>{tool.title}</li>
                  ))}
                </ul>
              </details>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export { AskPage };
