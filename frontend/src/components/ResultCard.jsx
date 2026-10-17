import { useState } from "react";
import { formatMarks } from "../utils/scoring.js";

function formatDuration(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}m ${String(seconds).padStart(2, "0")}s`;
}

export default function ResultCard({ test, result, onNewTest, onBackToDashboard }) {
  const [showReview, setShowReview] = useState(true);
  const { score } = result;

  return (
    <div className="cbt-page page-width result-page">
      <header className="result-heading">
        <span className="eyebrow">TEST COMPLETE</span>
        <h1>{result.timedOut ? "Time is up." : "Nice work. Session complete."}</h1>
        <p>{test.exam_type} · {test.subject}{test.topic && test.topic !== "General" ? ` · ${test.topic}` : ""}</p>
        {result.timedOut && <div className="timeout-note" role="status">Your time expired. The test was submitted automatically.</div>}
      </header>

      <section className="score-overview">
        <div className="score-main">
          <span>YOUR SCORE</span>
          <strong>{formatMarks(score.score)}<small> / {formatMarks(score.maxScore)}</small></strong>
          <p>{score.accuracy}% accuracy on attempted questions</p>
        </div>
        <div className="score-stats">
          <div className="stat-correct"><span>Correct</span><strong>{score.correct}</strong></div>
          <div className="stat-incorrect"><span>Incorrect</span><strong>{score.incorrect}</strong></div>
          <div className="stat-unanswered"><span>Unanswered</span><strong>{score.unanswered}</strong></div>
          <div className="stat-duration"><span>Time used</span><strong>{formatDuration(result.elapsedSeconds)}</strong></div>
        </div>
      </section>

      <section className="result-actions">
        <div className="result-marking">Scoring used: <strong>+{formatMarks(test.marking_scheme.correct)}</strong> correct <i /> <strong>−{formatMarks(test.marking_scheme.negative)}</strong> incorrect · unanswered receive zero</div>
        <div>
          <button className="button button-secondary" onClick={onBackToDashboard}>Dashboard</button>
          <button className="button button-primary" onClick={onNewTest}>Create another test <span aria-hidden="true">↗</span></button>
        </div>
      </section>

      <section className="review-section">
        <button className="review-heading" onClick={() => setShowReview((open) => !open)} aria-expanded={showReview}>
          <span><span className="eyebrow">LEARN FROM EVERY QUESTION</span><strong>Answer review</strong></span>
          <span className="review-toggle">{showReview ? "Hide review ↑" : "Show review ↓"}</span>
        </button>
        {showReview && (
          <div className="review-list">
            {test.questions.map((question, index) => {
              const selectedIndex = result.answers[index];
              const isCorrect = selectedIndex === question.answer_index;
              const isUnanswered = selectedIndex === undefined;
              const status = isUnanswered ? "Not answered" : isCorrect ? "Correct" : "Incorrect";

              return (
                <article className={`review-card${isCorrect ? " review-correct" : isUnanswered ? " review-unanswered" : " review-incorrect"}`} key={index}>
                  <header><span>QUESTION {index + 1}</span><strong>{status}</strong></header>
                  <p className="review-question">{question.question}</p>
                  <p className="review-answer">Your answer: <strong>{isUnanswered ? "Not answered" : question.options[selectedIndex]}</strong></p>
                  <p className="correct-answer">Correct answer: <strong>{question.options[question.answer_index]}</strong></p>
                  {question.explanation && <p className="review-explanation"><span>Explanation</span>{question.explanation}</p>}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
