const EXAM_PRESENTATION = {
  School: {
    icon: "01",
    detail: "Build curriculum-focused papers for class and subject.",
    tag: "ACADEMIC",
  },
  Railway: {
    icon: "02",
    detail: "Practice RRB exams with negative marking built in.",
    tag: "COMPETITIVE",
  },
  Bank: {
    icon: "03",
    detail: "Prepare for banking prelims and section-based practice.",
    tag: "COMPETITIVE",
  },
  "JEE Mains": {
    icon: "04",
    detail: "Take focused engineering entrance practice tests.",
    tag: "ENGINEERING",
  },
  "IIT Advanced": {
    icon: "05",
    detail: "Challenge yourself with advanced problem sets.",
    tag: "ENGINEERING",
  },
  General: {
    icon: "06",
    detail: "Create a flexible test for other competitive exams.",
    tag: "GENERAL",
  },
};

export default function Dashboard({ exams, error, onRetry, onNavigate }) {
  const examList = exams
    ? Object.entries(exams.exams).map(([name, config]) => ({
        name,
        ...config,
        ...(EXAM_PRESENTATION[name] ?? {
          icon: "00",
          detail: "Create a custom exam practice session.",
          tag: "EXAM",
        }),
      }))
    : [];

  return (
    <div className="dashboard page-width">
      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow"><span className="eyebrow-line" /> YOUR NEXT SESSION STARTS HERE</span>
          <h1>Prepare with purpose.<br /><span>Perform with confidence.</span></h1>
          <p>
            Generate exam-ready papers or build a timed mock test tailored to
            your goals.
          </p>
          <div className="hero-actions">
            <button className="button button-primary" onClick={() => onNavigate("cbt")}>
              Start a mock test <span aria-hidden="true">↗</span>
            </button>
            <button className="button button-secondary" onClick={() => onNavigate("paper")}>
              Create a question paper
            </button>
          </div>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="art-orbit orbit-one" />
          <div className="art-orbit orbit-two" />
          <div className="art-sheet">
            <div className="sheet-heading">
              <span className="sheet-icon">✳</span>
              <span>YOUR PRACTICE PLAN</span>
              <span className="sheet-menu">•••</span>
            </div>
            <div className="sheet-title">Small steps.<br />Strong results.</div>
            <div className="sheet-progress-label"><span>Weekly progress</span><strong>72%</strong></div>
            <div className="progress-track"><span /></div>
            <div className="sheet-footer"><span className="mini-check">✓</span> Keep your streak going</div>
          </div>
          <div className="art-bubble bubble-top">+4 <small>correct</small></div>
          <div className="art-bubble bubble-bottom">01 <small>focused session</small></div>
        </div>
      </section>

      <section className="exam-section" aria-labelledby="exam-heading">
        <div className="section-heading">
          <div>
            <span className="eyebrow">BUILT AROUND YOUR GOAL</span>
            <h2 id="exam-heading">Choose your exam</h2>
          </div>
          <span className="section-note">Pick a track to get started</span>
        </div>

        {error ? (
          <div className="error-banner" role="alert">
            <div>
              <strong>Can’t load exam options</strong>
              <p>{error}</p>
            </div>
            <button className="button button-secondary" onClick={onRetry}>Try again</button>
          </div>
        ) : !exams ? (
          <div className="loading-panel" role="status">
            <span className="spinner" />
            Loading exam options…
          </div>
        ) : (
          <div className="exam-grid">
            {examList.map((exam) => (
              <article className="exam-card" key={exam.name}>
                <div className="exam-card-top">
                  <span className="exam-icon">{exam.icon}</span>
                  <span className="exam-tag">{exam.tag}</span>
                </div>
                <h3>{exam.name}</h3>
                <p>{exam.detail}</p>
                <div className="exam-meta">
                  <span>{exam.default_questions} questions</span>
                  <span>{exam.default_time_limit} min default</span>
                </div>
                <div className="exam-card-actions">
                  <button onClick={() => onNavigate("cbt")}>Practice test <span aria-hidden="true">→</span></button>
                  <button
                    className="paper-link"
                    onClick={() => onNavigate("paper")}
                    aria-label={`Create a ${exam.name} question paper`}
                  >
                    Paper
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
      <footer className="dashboard-footer">
        <span>Built for better practice, one question at a time.</span>
        {exams && <span>{Object.keys(exams.exams).length} exam tracks available</span>}
      </footer>
    </div>
  );
}
