import React, { useState, useEffect } from 'react';
import { fetchRFQDetails, activateDemoWindow } from '../services/api';
import CountdownTimer from './CountdownTimer';
import ActivityLog from './ActivityLog';
import BidSubmissionModal from './BidSubmissionModal';

export default function AuctionDetail({ rfqId, onBack, role }) {
  const [rfq, setRfq] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isBidModalOpen, setIsBidModalOpen] = useState(false);

  // Function to load latest RFQ data
  async function loadData() {
    try {
      const data = await fetchRFQDetails(rfqId);
      setRfq(data);
      setError('');
    } catch (err) {
      setError(err.message || 'Failed to load RFQ details');
    } finally {
      setLoading(false);
    }
  }

  // Initial load + periodic polling every 3 seconds for real-time sync
  useEffect(() => {
    loadData();

    const interval = setInterval(() => {
      loadData();
    }, 3000);

    return () => clearInterval(interval);
  }, [rfqId]);

  async function handleFastForward() {
    try {
      const updated = await activateDemoWindow(rfq.id);
      setRfq(updated);
    } catch (err) {
      alert('Could not activate demo trigger window');
    }
  }

  if (loading && !rfq) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>Loading auction details...</div>;
  }

  if (error && !rfq) {
    return (
      <div style={{ padding: '20px' }}>
        <button className="btn-secondary" onClick={onBack}>← Back</button>
        <div style={{ color: '#ef4444', marginTop: '16px' }}>{error}</div>
      </div>
    );
  }

  const triggerRuleLabels = {
    BID_RECEIVED: 'Any Bid Received in Last X Minutes',
    ANY_RANK_CHANGE: 'Any Supplier Rank Change in Last X Minutes',
    L1_RANK_CHANGE: 'Lowest Bidder (L1) Rank Change in Last X Minutes'
  };

  return (
    <div>
      {/* Top back navigation and actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <button className="btn-secondary" onClick={onBack}>
          ← Back to Auctions
        </button>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <span style={{ fontSize: '12px', color: '#64748b' }}>
            ● Auto-syncing live every 3s
          </span>
          <button
            className="btn-secondary"
            onClick={handleFastForward}
            title="Sets deadline to 8 minutes from now so you can immediately test the live anti-sniping extension"
            style={{ fontSize: '12px', border: '1px solid #fde047', color: '#854d0e', backgroundColor: '#fefce8' }}
          >
            ⚡ Test Extension Window
          </button>
          <button className="btn-secondary" onClick={loadData} style={{ fontSize: '13px' }}>
            ↻ Refresh Now
          </button>
          {role === 'buyer' && (
            <span className="badge badge-closed" style={{ fontSize: '12px', padding: '6px 12px' }}>
              Buyer Monitoring Mode
            </span>
          )}
          {rfq.status === 'ACTIVE' && role === 'supplier' && (
            <button className="btn-primary" onClick={() => setIsBidModalOpen(true)}>
              + Submit Quote
            </button>
          )}
        </div>
      </div>

      {/* Countdown Timer Banner */}
      <CountdownTimer
        closeTime={rfq.bid_close_time}
        forcedCloseTime={rfq.forced_bid_close_time}
        status={rfq.status}
        triggerWindowMinutes={rfq.trigger_window_minutes}
      />

      {/* Header Summary Card */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '14px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span className={`badge badge-${rfq.status.toLowerCase().replace('_', '-')}`}>
                {rfq.status.replace('_', ' ')}
              </span>
              <span style={{ fontSize: '14px', color: '#64748b', fontWeight: '600' }}>
                Ref ID: {rfq.reference_id}
              </span>
            </div>
            <h1 style={{ fontSize: '22px', fontWeight: '700', marginTop: '8px', color: '#0f172a' }}>
              {rfq.name}
            </h1>
            <p style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
              Service / Pickup Date: <strong>{rfq.pickup_date}</strong>
            </p>
          </div>

          <div style={{ backgroundColor: '#f8fafc', padding: '14px 20px', borderRadius: '8px', border: '1px solid #e2e8f0', textAlign: 'right' }}>
            <div style={{ fontSize: '12px', color: '#64748b', fontWeight: '600' }}>CURRENT LOWEST QUOTE (L1)</div>
            <div style={{ fontSize: '24px', fontWeight: '800', color: '#16a34a', marginTop: '2px' }}>
              {rfq.current_lowest_bid ? `₹${rfq.current_lowest_bid.toLocaleString(undefined, { minimumFractionDigits: 2 })}` : 'No bids'}
            </div>
            {rfq.current_l1_supplier && (
              <div style={{ fontSize: '12px', color: '#334155', fontWeight: '500' }}>
                Held by: <strong>{rfq.current_l1_supplier}</strong>
              </div>
            )}
          </div>
        </div>

        {/* British Auction Config Grid */}
        <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #e2e8f0', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
          <div>
            <div style={{ fontSize: '12px', color: '#64748b' }}>Trigger Window (X)</div>
            <div style={{ fontWeight: '600', color: '#1e293b' }}>Last {rfq.trigger_window_minutes} Minutes</div>
          </div>
          <div>
            <div style={{ fontSize: '12px', color: '#64748b' }}>Extension Duration (Y)</div>
            <div style={{ fontWeight: '600', color: '#1e293b' }}>+{rfq.extension_duration_minutes} Minutes added</div>
          </div>
          <div>
            <div style={{ fontSize: '12px', color: '#64748b' }}>Extension Trigger Rule</div>
            <div style={{ fontWeight: '600', color: '#2563eb' }}>
              {triggerRuleLabels[rfq.extension_trigger] || rfq.extension_trigger}
            </div>
          </div>
          <div>
            <div style={{ fontSize: '12px', color: '#64748b' }}>Anti-Sniping Hard Cap</div>
            <div style={{ fontWeight: '600', color: '#dc2626' }}>
              Cannot extend past Forced Close
            </div>
          </div>
        </div>
      </div>

      {/* Main Two-Column Layout: Bids on left, Activity on right */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
        
        {/* Left Column: Bids Ranking Table */}
        <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: '700' }}>Competitive Bids & Rankings</h3>
              <p style={{ fontSize: '12px', color: '#64748b' }}>Sorted from lowest quote (L1) to highest</p>
            </div>
            <span style={{ fontSize: '13px', fontWeight: '600', color: '#475569' }}>
              {rfq.bids.length} Submitted
            </span>
          </div>

          <div className="table-container" style={{ border: 'none' }}>
            <table>
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Supplier</th>
                  <th>Carrier</th>
                  <th>Total Quote</th>
                  <th>Breakdown (F / O / D)</th>
                  <th>Transit</th>
                  <th>Validity</th>
                </tr>
              </thead>
              <tbody>
                {rfq.bids.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
                      No quotes submitted yet. Be the first supplier to bid!
                    </td>
                  </tr>
                ) : (
                  rfq.bids.map((b) => (
                    <tr key={b.id} style={b.rank === 'L1' ? { backgroundColor: '#f0fdf4' } : {}}>
                      <td>
                        <span className={`badge ${b.rank === 'L1' ? 'badge-l1' : 'badge-closed'}`}>
                          {b.rank}
                        </span>
                      </td>
                      <td>
                        <strong style={{ color: '#0f172a' }}>{b.supplier_name}</strong>
                      </td>
                      <td>{b.carrier_name}</td>
                      <td>
                        <strong style={{ color: b.rank === 'L1' ? '#16a34a' : '#1e293b' }}>
                          ₹{b.total_price.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </strong>
                      </td>
                      <td style={{ fontSize: '12px', color: '#64748b' }}>
                        ₹{b.freight_charges} + ₹{b.origin_charges} + ₹{b.destination_charges}
                      </td>
                      <td>{b.transit_time}</td>
                      <td>{b.validity_of_quote}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column: Activity Log / Audit Trail */}
        <div className="card">
          <div style={{ marginBottom: '14px', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: '700' }}>Auction Activity & Extension Log</h3>
            <p style={{ fontSize: '12px', color: '#64748b' }}>
              Live audit trail of bid submissions, rank shifts, and anti-sniping time extensions
            </p>
          </div>
          <ActivityLog logs={rfq.activity_logs} />
        </div>

      </div>

      {/* Quote Submission Modal */}
      <BidSubmissionModal
        rfq={rfq}
        isOpen={isBidModalOpen}
        onClose={() => setIsBidModalOpen(false)}
        onBidSuccess={loadData}
      />
    </div>
  );
}
