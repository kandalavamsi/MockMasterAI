const NAV_ITEMS = [
  { id: "dashboard", label: "Overview" },
  { id: "paper", label: "Paper Studio" },
  { id: "cbt", label: "Mock Test" },
];

export default function Navbar({ activeView, healthStatus, onNavigate }) {
  const isOnline = healthStatus === "ok";
  const healthLabel =
    healthStatus === "checking"
      ? "Connecting"
      : isOnline
        ? "Backend connected"
        : "Backend offline";

  return (
    <header className="topbar">
      <button className="brand brand-button" type="button" onClick={() => onNavigate("dashboard")}>
        <span className="brand-mark">M</span>
        <span>
          <strong>MOCKMASTER</strong>
          <small>AI EXAM WORKSPACE</small>
        </span>
      </button>
      <nav className="main-nav" aria-label="Main navigation">
        {NAV_ITEMS.map((item) => (
          <button
            className={`nav-link${activeView === item.id ? " active" : ""}`}
            key={item.id}
            onClick={() => onNavigate(item.id)}
          >
            {item.label}
          </button>
        ))}
      </nav>
      <div className={`health-pill ${isOnline ? "online" : ""}`} role="status">
        <span className="health-dot" />
        {healthLabel}
      </div>
    </header>
  );
}
