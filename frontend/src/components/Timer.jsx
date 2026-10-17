import { useEffect, useRef, useState } from "react";

function formatTime(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export default function Timer({ deadline, onExpire }) {
  const [remaining, setRemaining] = useState(
    Math.max(0, Math.ceil((deadline - Date.now()) / 1000)),
  );
  const onExpireRef = useRef(onExpire);
  const hasExpired = useRef(false);

  useEffect(() => {
    onExpireRef.current = onExpire;
  }, [onExpire]);

  useEffect(() => {
    const tick = () => {
      const seconds = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setRemaining(seconds);
      if (seconds === 0 && !hasExpired.current) {
        hasExpired.current = true;
        onExpireRef.current();
      }
    };

    tick();
    const intervalId = window.setInterval(tick, 1000);
    return () => window.clearInterval(intervalId);
  }, [deadline]);

  const isWarning = remaining <= 300 && remaining > 0;

  return (
    <div className={`timer-box${isWarning ? " timer-warning" : ""}`} role="timer" aria-label={`${Math.floor(remaining / 60)} minutes ${remaining % 60} seconds remaining`}>
      <span className="timer-label">TIME LEFT</span>
      <strong>{formatTime(remaining)}</strong>
      {isWarning && <span className="timer-alert">Finishing soon</span>}
    </div>
  );
}
