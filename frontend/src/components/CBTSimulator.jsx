import { useCallback, useMemo, useRef, useState } from "react";
import Palette from "./Palette.jsx";
import Timer from "./Timer.jsx";
import { formatMarks, scoreTest } from "../utils/scoring.js";

export default function CBTSimulator({ test, onComplete, onExit }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [flagged, setFlagged] = useState(() => new Set());
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const finished = useRef(false);
  const deadline = useMemo(
    () => Date.now() + test.time_limit * 60 * 1000,
    [test.time_limit],
  );
  const question = test.questions[currentIndex];
  const answeredCount = Object.keys(answers).length;

  const finishTest = useCallback((timedOut = false) => {
    if (finished.current) return;
    finished.current = true;
    const elapsedSeconds = Math.min(
      test.time_limit * 60,
      Math.max(0, Math.floor((Date.now() - (deadline - test.time_limit * 60 * 1000)) / 1000)),
    );
    onComplete({
      score: scoreTest(test.questions, answers, test.marking_scheme),
      answers,
      flagged: [...flagged],
      elapsedSeconds,
      timedOut,
    });
  }, [answers, deadline, flagged, onComplete, test]);

  function requestSubmit() {
    if (answeredCount < test.questions.length) {
      setConfirmSubmit(true);
    } else {
      finishTest();
    }
  }

  function requestExit() {
    if (window.confirm("Exit this test? Your answers and progress will be lost.")) {
      onExit();
    }
  }

  function confirmAndSubmit() {
    setConfirmSubmit(false);
    finishTest();
  }

  function toggleFlag() {
    setFlagged((previous) => {
      const next = new Set(previous);
      if (next.has(currentIndex)) next.delete(currentIndex);
      else next.add(currentIndex);
      return next;
    });
  }

  return (
    <div className="cbt-page page-width">
      <header className="test-topbar">
        <div className="test-identity">
          <button className="exit-test-button" onClick={requestExit} aria-label="Exit test">←</button>
          <div><strong>{test.exam_type} Practice Test</strong><span>{test.subject}{test.topic && test.topic !== "General" ? ` · ${test.topic}` : ""}</span></div>
        </div>
        <div className="test-header-meta">
          <span className="difficulty-chip">{test.difficulty}</span>
          <Timer deadline={deadline} onExpire={() => finishTest(true)} />
        </div>
      </header>

      <div className="test-layout">
        <section className="question-panel">
          <div className="question-panel-heading">
            <div><span className="question-number">QUESTION {currentIndex + 1} <i>OF</i> {test.questions.length}</span><h1>{test.subject}</h1></div>
            <button
              className={`flag-button${flagged.has(currentIndex) ? " is-flagged" : ""}`}
              onClick={toggleFlag}
              aria-pressed={flagged.has(currentIndex)}
            >
              <span aria-hidden="true">⚑</span> {flagged.has(currentIndex) ? "Flagged" : "Mark for review"}
            </button>
          </div>
          <div className="question-progress"><span style={{ width: `${((currentIndex + 1) / test.questions.length) * 100}%` }} /></div>

          <div className="question-content">
            <p className="question-text">{question.question}</p>
            <div className="answer-options" role="group" aria-label={`Answer options for question ${currentIndex + 1}`}>
              {question.options.map((option, index) => {
                const isSelected = answers[currentIndex] === index;
                return (
                  <button
                    className={`answer-option${isSelected ? " selected" : ""}`}
                    key={`${index}-${option}`}
                    aria-pressed={isSelected}
                    onClick={() => setAnswers((previous) => ({ ...previous, [currentIndex]: index }))}
                  >
                    <span className="option-letter">{String.fromCharCode(65 + index)}</span>
                    <span>{option}</span>
                    <span className="option-radio" />
                  </button>
                );
              })}
            </div>
          </div>

          <div className="question-actions">
            <button
              className="button button-secondary"
              onClick={() => setCurrentIndex((index) => Math.max(0, index - 1))}
              disabled={currentIndex === 0}
            >
              ← Previous
            </button>
            <button
              className="clear-answer-button"
              onClick={() => setAnswers((previous) => {
                const next = { ...previous };
                delete next[currentIndex];
                return next;
              })}
              disabled={answers[currentIndex] === undefined}
            >
              Clear response
            </button>
            {currentIndex < test.questions.length - 1 ? (
              <button className="button button-primary" onClick={() => setCurrentIndex((index) => index + 1)}>
                Save & next <span aria-hidden="true">→</span>
              </button>
            ) : (
              <button className="button button-primary" onClick={requestSubmit}>Submit test</button>
            )}
          </div>
        </section>

        <div className="test-sidebar">
          <Palette
            questions={test.questions}
            answers={answers}
            flagged={flagged}
            currentIndex={currentIndex}
            onSelect={setCurrentIndex}
          />
          <div className="marking-card">
            <span>SCORING</span>
            <p><strong className="positive-mark">+{formatMarks(test.marking_scheme.correct)}</strong> correct <i /> <strong className="negative-mark">−{formatMarks(test.marking_scheme.negative)}</strong> incorrect</p>
          </div>
          <button className="button button-primary submit-test-button" onClick={requestSubmit}>Submit test</button>
        </div>
      </div>

      {confirmSubmit && (
        <div className="modal-backdrop" role="presentation">
          <section className="submit-modal" role="dialog" aria-modal="true" aria-labelledby="submit-modal-title">
            <span className="modal-icon">?</span>
            <h2 id="submit-modal-title">Submit your test?</h2>
            <p>You have <strong>{test.questions.length - answeredCount} unanswered {test.questions.length - answeredCount === 1 ? "question" : "questions"}</strong>. You won’t be able to change your answers after submitting.</p>
            <div><button className="button button-secondary" onClick={() => setConfirmSubmit(false)}>Keep working</button><button className="button button-primary" onClick={confirmAndSubmit}>Submit anyway</button></div>
          </section>
        </div>
      )}
    </div>
  );
}
