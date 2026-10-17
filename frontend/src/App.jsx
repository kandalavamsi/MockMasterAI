import { lazy, Suspense, useEffect, useState } from "react";
import { getExamMetadata, getHealth } from "./api/client.js";
import Dashboard from "./components/Dashboard.jsx";
import Navbar from "./components/Navbar.jsx";
import CBTMockTest from "./components/CBTMockTest.jsx";

const PaperStudio = lazy(() => import("./components/PaperStudio.jsx"));

export default function App() {
  const [health, setHealth] = useState({ status: "checking" });
  const [exams, setExams] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [activeView, setActiveView] = useState("dashboard");

  function navigateTo(view) {
    if (view === activeView) return;
    window.history.pushState({ mockmasterView: view }, "", window.location.href);
    setActiveView(view);
  }

  async function loadBackendData() {
    setHealth({ status: "checking" });
    setLoadError("");

    try {
      const [healthResult, examResult] = await Promise.all([
        getHealth(),
        getExamMetadata(),
      ]);
      setHealth(healthResult);
      setExams(examResult);
    } catch (error) {
      setHealth({ status: "offline" });
      setExams(null);
      setLoadError(error.message);
    }
  }

  useEffect(() => {
    loadBackendData();
  }, []);

  useEffect(() => {
    if (window.history.state?.mockmasterView !== "dashboard") {
      window.history.replaceState(
        { ...window.history.state, mockmasterView: "dashboard" },
        "",
        window.location.href,
      );
    }

    function handlePopState(event) {
      const view = ["dashboard", "paper", "cbt"].includes(event.state?.mockmasterView)
        ? event.state.mockmasterView
        : "dashboard";
      setActiveView(view);
    }

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  return (
    <div className="app-shell">
      <Navbar
        activeView={activeView}
        healthStatus={health.status}
        onNavigate={navigateTo}
      />
      <main>
        {activeView === "dashboard" ? (
          <Dashboard
            exams={exams}
            error={loadError}
            onRetry={loadBackendData}
            onNavigate={navigateTo}
          />
        ) : activeView === "paper" ? (
          <Suspense fallback={<div className="loading-panel page-width" role="status"><span className="spinner" />Loading Paper Studio…</div>}>
            <PaperStudio exams={exams} loadError={loadError} onRetry={loadBackendData} />
          </Suspense>
        ) : (
          <CBTMockTest
            exams={exams}
            loadError={loadError}
            onRetry={loadBackendData}
            onNavigate={navigateTo}
          />
        )}
      </main>
    </div>
  );
}
