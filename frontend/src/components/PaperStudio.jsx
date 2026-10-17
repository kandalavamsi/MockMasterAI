import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { generatePaper } from "../api/client.js";
import { normalizeMathDelimiters } from "../utils/markdown.js";

const SUBJECTS = ["Physics", "Chemistry", "Mathematics"];
const BANK_SECTIONS = ["Quantitative Aptitude", "Reasoning", "English"];
const RAILWAY_STAGES = ["CBT-1", "CBT-2"];

function Field({ id, label, children, hint }) {
  return (
    <div className="form-field">
      <label htmlFor={id}>{label}</label>
      {children}
      {hint && <small>{hint}</small>}
    </div>
  );
}

function SelectField({ id, label, value, options, onChange, hint }) {
  return (
    <Field id={id} label={label} hint={hint}>
      <select id={id} value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    </Field>
  );
}

export default function PaperStudio({ exams, loadError, onRetry }) {
  const categories = exams ? Object.keys(exams.exams) : [];
  const [category, setCategory] = useState("");
  const [difficulty, setDifficulty] = useState("Medium");
  const [className, setClassName] = useState("");
  const [subject, setSubject] = useState("Physics");
  const [railwayExam, setRailwayExam] = useState("");
  const [railwayStage, setRailwayStage] = useState("CBT-1");
  const [bankExam, setBankExam] = useState("");
  const [bankLevel, setBankLevel] = useState("Prelims");
  const [bankSection, setBankSection] = useState("");
  const [paper, setPaper] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState("");
  const [copyMessage, setCopyMessage] = useState("");

  const profile = exams?.exams[category];
  const difficulties = profile?.allowed_difficulties ?? exams?.difficulties ?? [];

  function updateCategory(nextCategory) {
    setCategory(nextCategory);
    const nextDifficulties = exams?.exams[nextCategory]?.allowed_difficulties ?? [];
    setDifficulty(nextDifficulties.includes("Medium") ? "Medium" : nextDifficulties[0] ?? "Medium");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setCopyMessage("");

    const payload = {
      examCategory: category,
      difficulty,
    };
    if (category === "School") {
      payload.cls = className.trim();
      payload.subject = subject.trim();
    } else if (category === "Railway") {
      payload.railwayExam = railwayExam;
      payload.railwayStage = railwayStage;
    } else if (category === "Bank") {
      payload.bankExam = bankExam;
      payload.bankLevel = bankLevel;
      if (bankSection) payload.bankSection = bankSection;
    } else if (category === "JEE Mains" || category === "IIT Advanced") {
      payload.subject = subject;
    }

    setIsGenerating(true);
    try {
      const response = await generatePaper(payload);
      setPaper({
        title: `${category} Question Paper`,
        difficulty: response.difficulty,
        content: response.paper,
      });
    } catch (generationError) {
      setError(generationError.message);
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(paper.content);
      setCopyMessage("Paper copied to clipboard.");
    } catch {
      setCopyMessage("Clipboard access was blocked. Select and copy the paper text instead.");
    }
  }

  return (
    <div className="paper-page page-width">
      <div className="paper-page-heading">
        <div>
          <span className="eyebrow">QUESTION PAPER WORKSPACE</span>
          <h1>Paper Studio</h1>
          <p>Configure your exam and generate a clean, printable question paper.</p>
        </div>
        <span className="paper-step"><span>01</span> CONFIGURE <i /> <span>02</span> GENERATE</span>
      </div>

      {!exams ? (
        loadError ? (
          <div className="error-banner" role="alert">
            <div>
              <strong>Can’t load exam configuration</strong>
              <p>{loadError}</p>
            </div>
            <button className="button button-secondary" onClick={onRetry}>Try again</button>
          </div>
        ) : (
          <div className="loading-panel" role="status">
            <span className="spinner" />
            Loading exam configuration…
          </div>
        )
      ) : (
        <div className="paper-layout">
          <aside className="paper-config-panel">
            <div className="panel-title">
              <span className="panel-icon">✳</span>
              <div><h2>Paper setup</h2><p>Choose the format for your paper.</p></div>
            </div>
            <form onSubmit={handleSubmit}>
              <Field id="paper-category" label="Exam track">
                <select
                  id="paper-category"
                  value={category}
                  required
                  onChange={(event) => updateCategory(event.target.value)}
                >
                  <option value="" disabled>Select an exam</option>
                  {categories.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </Field>

              {category === "School" && (
                <>
                  <Field id="paper-class" label="Class / grade">
                    <input
                      id="paper-class"
                      value={className}
                      onChange={(event) => setClassName(event.target.value)}
                      placeholder="e.g. Class 10"
                      maxLength={50}
                      required
                    />
                  </Field>
                  <Field id="paper-subject" label="Subject">
                    <input
                      id="paper-subject"
                      value={subject}
                      onChange={(event) => setSubject(event.target.value)}
                      placeholder="e.g. Science"
                      maxLength={100}
                      required
                    />
                  </Field>
                </>
              )}

              {category === "Railway" && (
                <>
                  <SelectField
                    id="railway-exam"
                    label="Railway examination"
                    value={railwayExam}
                    onChange={setRailwayExam}
                    options={(profile.sub_exams ?? []).map((item) => ({ value: item, label: item }))}
                  />
                  <SelectField
                    id="railway-stage"
                    label="Exam stage"
                    value={railwayStage}
                    onChange={setRailwayStage}
                    options={RAILWAY_STAGES.map((item) => ({ value: item, label: item }))}
                  />
                </>
              )}

              {category === "Bank" && (
                <>
                  <SelectField
                    id="bank-exam"
                    label="Bank examination"
                    value={bankExam}
                    onChange={setBankExam}
                    options={(profile.sub_exams ?? []).map((item) => ({ value: item, label: item }))}
                  />
                  <SelectField
                    id="bank-level"
                    label="Exam level"
                    value={bankLevel}
                    onChange={setBankLevel}
                    options={["Prelims", "Mains"].map((item) => ({ value: item, label: item }))}
                  />
                  <SelectField
                    id="bank-section"
                    label="Focus section"
                    value={bankSection}
                    onChange={setBankSection}
                    options={[
                      { value: "", label: "All sections" },
                      ...BANK_SECTIONS.map((item) => ({ value: item, label: item })),
                    ]}
                    hint="Optional — leave on All sections for a comprehensive paper."
                  />
                </>
              )}

              {(category === "JEE Mains" || category === "IIT Advanced") && (
                <SelectField
                  id="engineering-subject"
                  label="Subject"
                  value={subject}
                  onChange={setSubject}
                  options={SUBJECTS.map((item) => ({ value: item, label: item }))}
                />
              )}

              {category && (
                <SelectField
                  id="paper-difficulty"
                  label="Difficulty"
                  value={difficulty}
                  onChange={setDifficulty}
                  options={difficulties.map((item) => ({ value: item, label: item }))}
                />
              )}

              <div className="marking-note">
                <span className="note-check">✓</span>
                <span>Paper output excludes answer keys, ready to share or print.</span>
              </div>

              {error && <div className="paper-error" role="alert">{error}</div>}
              <button
                className="button button-primary generate-button"
                type="submit"
                disabled={isGenerating || !category}
              >
                {isGenerating ? <><span className="button-spinner" /> Generating paper…</> : <>Generate question paper <span aria-hidden="true">↗</span></>}
              </button>
              {isGenerating && <p className="wait-hint">This can take a little while. Keep this page open.</p>}
            </form>
          </aside>

          <section className="paper-result" aria-live="polite">
            {paper ? (
              <>
                <div className="paper-result-toolbar">
                  <div>
                    <span className="eyebrow">YOUR GENERATED PAPER</span>
                    <h2>{paper.title}</h2>
                    <span className="paper-difficulty">{paper.difficulty} difficulty</span>
                  </div>
                  <div className="paper-actions">
                    <button className="paper-action" onClick={handleCopy} aria-label="Copy paper text">Copy</button>
                    <button className="paper-action print-action" onClick={() => window.print()}>Print / PDF</button>
                  </div>
                </div>
                {copyMessage && <p className="copy-feedback" role="status">{copyMessage}</p>}
                <article className="paper-document">
                  <div className="print-document-heading">
                    <span>MOCKMASTER AI · QUESTION PAPER</span>
                    <h2>{paper.title}</h2>
                    <p>Difficulty: {paper.difficulty}</p>
                  </div>
                  <div className="paper-content">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm, remarkMath]}
                      rehypePlugins={[[rehypeKatex, { throwOnError: false, strict: "ignore" }]]}
                    >
                      {normalizeMathDelimiters(paper.content)}
                    </ReactMarkdown>
                  </div>
                </article>
              </>
            ) : (
              <div className="paper-empty">
                <div className="empty-document" aria-hidden="true">
                  <span /><span /><span /><span /><b>?</b>
                </div>
                <h2>Your paper will appear here</h2>
                <p>Choose an exam track and customize the details. Your generated paper will be ready to review, copy, or print.</p>
                <div className="empty-features">
                  <span><i>✓</i> Exam-focused format</span>
                  <span><i>✓</i> Print-friendly layout</span>
                  <span><i>✓</i> No answer key included</span>
                </div>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
