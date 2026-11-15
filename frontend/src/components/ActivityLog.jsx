import React from 'react';

export default function ActivityLog({ logs }) {
  if (!logs || logs.length === 0) {
    return <p style={{ color: '#64748b', fontSize: '14px' }}>No auction activity recorded yet.</p>;
  }

  return (
    <div className="timeline">
      {logs.map((log) => {
        const timeStr = new Date(log.created_at).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        });

        return (
          <div key={log.id} className={`timeline-item ${log.action_type}`}>
            <div className="time-stamp">{timeStr}</div>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <strong style={{ fontSize: '13px' }}>
                  {log.action_type.replace('_', ' ')}
                </strong>
                {log.bid_amount && (
                  <span className="badge badge-l1" style={{ fontSize: '11px', padding: '2px 6px' }}>
                    ₹{log.bid_amount.toLocaleString()}
                  </span>
                )}
              </div>
              <div style={{ color: '#334155', marginTop: '2px' }}>
                {log.reason}
              </div>
              {log.old_close_time && log.new_close_time && (
                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>
                  Close extended: {new Date(log.old_close_time).toLocaleTimeString()} → {new Date(log.new_close_time).toLocaleTimeString()}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
