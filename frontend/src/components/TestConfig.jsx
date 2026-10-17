import { useEffect, useState } from "react";

export default function TestConfig({ exams, onStart, history, historyError, onClearHistory }) {
  const examNames = exams ? Object.keys(exams.exams) : [];
  const [examType, setExamType] = useState("");
  const [subject, setSubject] = useState("");
  const [topic, setTopic] = useState("");
  const [difficulty, setDifficulty] = useState("Medium");
  const [timeLimit, setTimeLimit] = useState(30);
  const [questionCount, setQuestionCount] = useState(15);
  const [validationError, setValidationError] = useState("");

  const selectedProfile = exams?.exams[examType];
  const difficultyOptions =
    selectedProfile?.allowed_difficulties ?? exams?.difficulties ?? [];

  useEffect(() => {
    if (!examNames.length) return;

    const selected = examNames.includes(examType) ? examType : examNames[0];
    const profile = exams.exams[selected];
    setExamType(selected);
    setDifficulty(
      profile.allowed_difficulties.includes("Medium")
        ? "Medium"
        : profile.allowed_difficulties[0],
    );
    setTimeLimit(profile.default_time_limit);
    setQuestionCount(profile.default_questions);
  }, [exams]);

  function handleExamChange(value) {
    const profile = exams.exams[value];
    setExamType(value);
    setDifficulty(
      profile.allowed_difficulties.includes("Medium")
        ? "Medium"
        : profile.allowed_difficulties[0],
    );
    setTimeLimit(profile.default_time_limit);
    setQuestionCount(profile.default_questions);
  }

  function handleSubmit(event) {
    event.preventDefault();
    if (subject.trim().length < 2) {
      setValidationError("Enter a subject with at least 2 non-space characters.");
      return;
    }
    setValidationError("");
    onStart({
      exam_type: examType,
      subject: subject.trim(),
      topic: topic.trim() || null,
      difficulty,
      time_limit: Number(timeLimit),
      questions: Number(questionCount),
    });
  }

  return (
    <div className="cbt-page page-width">
      <header className="cbt-page-heading">
        <div>
          <span className="eyebrow">COMPUTER-BASED PRACTICE</span>
          <h1>Mock Test</h1>
          <p>Set your target, take the test, then review every answer.</p>
        </div>
        <div className="cbt-step"><span>01</span> SET UP <i /> <span>02</span> TAKE TEST <i /> <span>03</span> REVIEW</div>
      </header>

      {!exams ? (
        loadError ? (
          <div className="error-banner" role="alert">
            <div><strong>Can’t load exam configuration</strong><p>{loadError}</p></div>
            <button className="button button-secondary" onClick={onRetry}>Try again</button>
          </div>
        ) : (
          <div className="loading-panel" role="status">
            <span className="spinner" />
            Loading exam configuration…
          </div>
        )
      ) : (
        <div className="cbt-config-layout">
          <section className="cbt-config-card">
            <div className="panel-title">
              <span className="panel-icon">◈</span>
              <div><h2>Configure your test</h2><p>Choose a track and build a focused practice session.</p></div>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="cbt-form-grid">
                <div className="form-field">
                  <label htmlFor="cbt-exam">Exam track</label>
                  <select id="cbt-exam" value={examType} onChange={(event) => handleExamChange(event.target.value)} required>
                    {examNames.map((exam) => <option key={exam} value={exam}>{exam}</option>)}
                  </select>
                </div>
                <div className="form-field">
                  <label htmlFor="cbt-subject">Subject</label>
                  <input
                    id="cbt-subject"
                    value={subject}
                    onChange={(event) => setSubject(event.target.value)}
                    placeholder="e.g. Mathematics"
                    minLength={2}
                    maxLength={100}
                    required
                  />
                </div>
                <div className="form-field">
                  <label htmlFor="cbt-topic">Topic <span className="optional-label">OPTIONAL</span></label>
                  <input
                    id="cbt-topic"
                    value={topic}
                    onChange={(event) => setTopic(event.target.value)}
                    placeholder="e.g. Time and Work"
                    maxLength={150}
                  />
                </div>
                <div className="form-field">
                  <label htmlFor="cbt-difficulty">Difficulty</label>
                  <select id="cbt-difficulty" value={difficulty} onChange={(event) => setDifficulty(event.target.value)}>
                    {difficultyOptions.map((item) => <option key={item} value={item}>{item}</option>)}
                  </select>
                </div>
                <div className="form-field">
                  <label htmlFor="cbt-questions">Number of questions <span className="field-range">1–40</span></label>
                  <input
                    id="cbt-questions"
                    type="number"
                    min="1"
                    max="40"
                    value={questionCount}
                    onChange={(event) => setQuestionCount(event.target.value)}
                    required
                  />
                </div>
                <div className="form-field">
                  <label htmlFor="cbt-time">Time limit <span className="field-range">1–180 min</span></label>
                  <input
                    id="cbt-time"
                    type="number"
                    min="1"
                    max="180"
                    value={timeLimit}
                    onChange={(event) => setTimeLimit(event.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="test-rules">
                <span className="rules-icon">i</span>
                <span>Scoring: <strong>+{selectedProfile?.marking.correct}</strong> correct, <strong>−{selectedProfile?.marking.negative}</strong> incorrect. Unanswered questions receive zero marks.</span>
              </div>
              {validationError && <p className="cbt-validation-error" role="alert">{validationError}</p>}
              <button className="button button-primary start-test-button" type="submit" disabled={!examType}>
                Generate my test <span aria-hidden="true">↗</span>
              </button>
              <p className="generation-note">Questions are AI-generated and may take a minute to prepare.</p>
            </form>
          </section>

          <aside className="cbt-side-card">
            <span className="side-card-icon">◷</span>
            <h2>Test day, on your terms</h2>
            <p>Your timer starts when the questions are ready. Move between questions freely and submit when you’re done.</p>
            <div className="side-card-rule" />
            <div className="side-tip"><span>01</span><p><strong>Answer at your pace</strong><br />Your selections save as you go.</p></div>
            <div className="side-tip"><span>02</span><p><strong>Mark for review</strong><br />Flag questions to revisit before submitting.</p></div>
            <div className="side-tip"><span>03</span><p><strong>Learn from results</strong><br />Review correct answers and explanations after.</p></div>
          </aside>
        </div>
      )}

      <section className="history-section">
        <div className="history-heading">
          <div><span className="eyebrow">YOUR PRACTICE</span><h2>Recent test history</h2></div>
          {history.length > 0 && <button className="text-button" onClick={onClearHistory}>Clear history</button>}
        </div>
        {historyError ? (
          <div className="history-error" role="alert">{historyError}</div>
        ) : history.length === 0 ? (
          <div className="history-empty">Your completed mock tests will be saved here on this device.</div>
        ) : (
          <div className="history-list">
            {history.slice(0, 5).map((item) => (
              <article className="history-item" key={item.id}>
                <div className="history-icon">✓</div>
                <div className="history-description">
                  <strong>{item.examType} · {item.subject}</strong>
                  <span>{item.questionCount} questions{item.topic ? ` · ${item.topic}` : ""} · {new Date(item.completedAt).toLocaleString()}</span>
                </div>
                <div className="history-score"><strong>{item.score} <small>/ {item.maxScore}</small></strong><span>{item.correct} correct</span></div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
