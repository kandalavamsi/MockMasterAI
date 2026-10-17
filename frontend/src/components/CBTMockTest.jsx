import { useEffect, useRef, useState } from "react";
import { createMockTestJob, getMockTestJob } from "../api/client.js";
import CBTSimulator from "./CBTSimulator.jsx";
import ResultCard from "./ResultCard.jsx";
import TestConfig from "./TestConfig.jsx";
import { clearMockTestHistory, getMockTestHistory, saveMockTestResult } from "../utils/storage.js";

const POLL_INTERVAL_MS = 1800;

function wait(milliseconds) {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

export default function CBTMockTest({ exams, loadError, onRetry, onNavigate }) {
  const [phase, setPhase] = useState("setup");
  const [testConfig, setTestConfig] = useState(null);
  const [test, setTest] = useState(null);
  const [result, setResult] = useState(null);
  const [generationError, setGenerationError] = useState("");
  const [history, setHistory] = useState([]);
  const [historyError, setHistoryError] = useState("");
  const mounted = useRef(true);
  const generationId = useRef(0);

  useEffect(() => {
    mounted.current = true;
    try {
      setHistory(getMockTestHistory());
    } catch (error) {
      setHistoryError(error.message);
    }
    return () => {
      mounted.current = false;
      generationId.current += 1;
    };
  }, []);

  async function startTest(config) {
    const currentGeneration = ++generationId.current;
    setTestConfig(config);
    setGenerationError("");
    setTest(null);
    setResult(null);
    setPhase("generating");

    try {
      const job = await createMockTestJob(config);
      if (!job.job_id) throw new Error("The backend did not return a generation job ID.");

      while (mounted.current && currentGeneration === generationId.current) {
        await wait(POLL_INTERVAL_MS);
        if (!mounted.current || currentGeneration !== generationId.current) return;

        const status = await getMockTestJob(job.job_id);
        if (status.status === "failed") {
          throw new Error(status.error || "The backend could not generate this test.");
        }
        if (status.status === "completed") {
          if (!status.data || !Array.isArray(status.data.questions) || status.data.questions.length === 0) {
            throw new Error("The backend completed the job without returning any questions.");
          }
          if (mounted.current && currentGeneration === generationId.current) {
            setTest(status.data);
            setPhase("taking");
          }
          return;
        }
        if (status.status !== "queued" && status.status !== "processing") {
          throw new Error(`The backend returned an unexpected job status: ${status.status}`);
        }
      }
    } catch (error) {
      if (mounted.current && currentGeneration === generationId.current) {
        setGenerationError(error.message);
        setPhase("setup");
      }
    }
  }

  function completeTest(completedResult) {
    const completedAt = new Date().toISOString();
    const historyItem = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      examType: test.exam_type,
      subject: test.subject,
      topic: test.topic && test.topic !== "General" ? test.topic : "",
      questionCount: test.questions.length,
      score: completedResult.score.score,
      maxScore: completedResult.score.maxScore,
      correct: completedResult.score.correct,
      completedAt,
    };

    setResult(completedResult);
    setPhase("result");
    try {
      setHistory(saveMockTestResult(historyItem));
      setHistoryError("");
    } catch (error) {
      setHistoryError(error.message);
    }
  }

  function resetToSetup() {
    generationId.current += 1;
    setGenerationError("");
    setResult(null);
    setTest(null);
    setPhase("setup");
  }

  function handleClearHistory() {
    try {
      clearMockTestHistory();
      setHistory([]);
      setHistoryError("");
    } catch (error) {
      setHistoryError(error.message);
    }
  }

  if (phase === "taking" && test) {
    return <CBTSimulator test={test} onComplete={completeTest} onExit={resetToSetup} />;
  }

  if (phase === "result" && test && result) {
    return (
      <ResultCard
        test={test}
        result={result}
        onNewTest={resetToSetup}
        onBackToDashboard={() => onNavigate("dashboard")}
      />
    );
  }

  if (phase === "generating") {
    return (
      <div className="cbt-page page-width">
        <section className="generation-card" role="status" aria-live="polite">
          <div className="generation-animation"><span /><span /><span /><b>✳</b></div>
          <span className="eyebrow">BUILDING YOUR PRACTICE SESSION</span>
          <h1>Preparing your questions</h1>
          <p>Our question setter is creating a {testConfig.difficulty.toLowerCase()} {testConfig.exam_type} test for {testConfig.subject}.</p>
          {testConfig.topic && <span className="generation-topic">FOCUS: {testConfig.topic}</span>}
          <div className="generation-progress"><span /></div>
          <small>Generation can take a minute or two. You can keep this page open while the test is prepared.</small>
        </section>
      </div>
    );
  }

  return (
    <>
      {generationError && (
        <div className="cbt-page page-width">
          <div className="error-banner cbt-generation-error" role="alert">
            <div><strong>Could not generate the test</strong><p>{generationError}</p></div>
            <button className="button button-secondary" onClick={() => setGenerationError("")}>Dismiss</button>
          </div>
        </div>
      )}
      <TestConfig
        exams={exams}
        loadError={loadError}
        onRetry={onRetry}
        onStart={startTest}
        history={history}
        historyError={historyError}
        onClearHistory={handleClearHistory}
      />
    </>
  );
}
