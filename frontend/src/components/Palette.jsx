export default function Palette({ questions, answers, flagged, currentIndex, onSelect }) {
  return (
    <aside className="question-palette">
      <h2>Question palette</h2>
      <p>Choose a question to jump to it.</p>
      <div className="palette-grid">
        {questions.map((_, index) => {
          const answered = answers[index] !== undefined;
          const isFlagged = flagged.has(index);
          const classes = [
            "palette-number",
            answered ? "palette-answered" : "",
            isFlagged ? "palette-flagged" : "",
            index === currentIndex ? "palette-current" : "",
          ].filter(Boolean).join(" ");

          return (
            <button
              className={classes}
              key={index}
              onClick={() => onSelect(index)}
              aria-label={`Question ${index + 1}${answered ? ", answered" : ", unanswered"}${isFlagged ? ", flagged for review" : ""}${index === currentIndex ? ", current question" : ""}`}
              aria-current={index === currentIndex ? "step" : undefined}
            >
              {index + 1}
              {isFlagged && <span className="palette-flag-dot" />}
            </button>
          );
        })}
      </div>
      <div className="palette-legend">
        <span><i className="legend-answered" /> Answered</span>
        <span><i className="legend-unanswered" /> Unanswered</span>
        <span><i className="legend-flagged" /> Flagged</span>
      </div>
      <div className="palette-summary">
        <span>Answered <strong>{Object.keys(answers).length}</strong> / {questions.length}</span>
        <span>Flagged <strong>{flagged.size}</strong></span>
      </div>
    </aside>
  );
}
