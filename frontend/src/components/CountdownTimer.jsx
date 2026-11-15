import React, { useState, useEffect } from 'react';

export default function CountdownTimer({ closeTime, forcedCloseTime, status, triggerWindowMinutes }) {
  const [timeLeft, setTimeLeft] = useState('');
  const [isUrgent, setIsUrgent] = useState(false);
  const [isForceClosed, setIsForceClosed] = useState(false);

  useEffect(() => {
    function calculateCountdown() {
      const now = new Date().getTime();
      const closeTarget = new Date(closeTime).getTime();
      const forcedTarget = new Date(forcedCloseTime).getTime();

      if (now >= forcedTarget || status === 'FORCE_CLOSED') {
        setTimeLeft('FORCE CLOSED');
        setIsForceClosed(true);
        setIsUrgent(false);
        return;
      }

      const diff = closeTarget - now;
      if (diff <= 0 || status === 'CLOSED') {
        setTimeLeft('CLOSED');
        setIsUrgent(false);
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      const formatted = `${hours > 0 ? hours + 'h ' : ''}${minutes}m ${seconds}s`;
      setTimeLeft(formatted);

      // Highlight urgent if within trigger window
      const triggerThreshold = (triggerWindowMinutes || 10) * 60 * 1000;
      setIsUrgent(diff <= triggerThreshold);
    }

    calculateCountdown();
    const interval = setInterval(calculateCountdown, 1000);

    return () => clearInterval(interval);
  }, [closeTime, forcedCloseTime, status, triggerWindowMinutes]);

  const formattedClose = new Date(closeTime).toLocaleString();
  const formattedForced = new Date(forcedCloseTime).toLocaleString();

  return (
    <div className="countdown-banner">
      <div>
        <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '4px' }}>
          CURRENT BID CLOSING COUNTDOWN
        </div>
        <div className={`countdown-digits ${isUrgent ? 'urgent' : ''}`}>
          {timeLeft}
        </div>
        {isUrgent && (
          <div style={{ fontSize: '12px', color: '#f87171', marginTop: '4px', fontWeight: '600' }}>
            ⚡ Trigger Window Active! New qualifying bids will automatically extend this auction.
          </div>
        )}
      </div>

      <div style={{ fontSize: '13px', textAlign: 'right' }}>
        <div>
          <span style={{ color: '#94a3b8' }}>Scheduled Close: </span>
          <strong>{formattedClose}</strong>
        </div>
        <div style={{ marginTop: '4px' }}>
          <span style={{ color: '#94a3b8' }}>Forced Hard Cap: </span>
          <strong style={{ color: '#fca5a5' }}>{formattedForced}</strong>
        </div>
      </div>
    </div>
  );
}
