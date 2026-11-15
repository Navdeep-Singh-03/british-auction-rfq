import React, { useState } from 'react';
import { createRFQ } from '../services/api';

export default function CreateRFQModal({ isOpen, onClose, onCreated }) {
  const now = new Date();
  const defaultStart = new Date(now.getTime() - 10 * 60000).toISOString().slice(0, 16);
  const defaultClose = new Date(now.getTime() + 15 * 60000).toISOString().slice(0, 16);
  const defaultForced = new Date(now.getTime() + 35 * 60000).toISOString().slice(0, 16);

  const [referenceId, setReferenceId] = useState('');
  const [name, setName] = useState('');
  const [pickupDate, setPickupDate] = useState('2026-11-25');
  const [bidStartTime, setBidStartTime] = useState(defaultStart);
  const [bidCloseTime, setBidCloseTime] = useState(defaultClose);
  const [forcedBidCloseTime, setForcedBidCloseTime] = useState(defaultForced);
  const [triggerWindow, setTriggerWindow] = useState('10');
  const [extensionDuration, setExtensionDuration] = useState('5');
  const [extensionTrigger, setExtensionTrigger] = useState('L1_RANK_CHANGE');
  const [isBritishAuction, setIsBritishAuction] = useState(true);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (new Date(forcedBidCloseTime) <= new Date(bidCloseTime)) {
      setError('Validation Error: Forced Bid Close Time must always be greater than Bid Close Time.');
      return;
    }
    if (new Date(bidCloseTime) <= new Date(bidStartTime)) {
      setError('Validation Error: Bid Close Time must be later than Bid Start Time.');
      return;
    }

    setLoading(true);
    try {
      await createRFQ({
        reference_id: referenceId.trim(),
        name: name.trim(),
        pickup_date: pickupDate,
        bid_start_time: new Date(bidStartTime).toISOString(),
        bid_close_time: new Date(bidCloseTime).toISOString(),
        forced_bid_close_time: new Date(forcedBidCloseTime).toISOString(),
        trigger_window_minutes: parseInt(triggerWindow, 10),
        extension_duration_minutes: parseInt(extensionDuration, 10),
        extension_trigger: extensionTrigger,
        is_british_auction: isBritishAuction
      });

      onClose();
      onCreated();
    } catch (err) {
      setError(err.message || 'Failed to create RFQ');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: '700' }}>Create RFQ (British Auction)</h2>
            <p style={{ fontSize: '13px', color: '#64748b' }}>
              Configure quotation timeline and British Auction dynamic extension rules
            </p>
          </div>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        {error && (
          <div style={{ backgroundColor: '#fee2e2', color: '#b91c1c', padding: '10px', borderRadius: '6px', fontSize: '13px', marginBottom: '16px' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label>RFQ Reference ID *</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. RFQ-DEL-BOM-004"
                value={referenceId}
                onChange={(e) => setReferenceId(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label>Pickup / Service Date *</label>
              <input
                type="date"
                className="form-control"
                value={pickupDate}
                onChange={(e) => setPickupDate(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label>RFQ Title / Description *</label>
            <input
              type="text"
              className="form-control"
              placeholder="e.g. Full Truckload Shipment Delhi to Mumbai (32ft Multi-axle)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div style={{ backgroundColor: '#f8fafc', padding: '14px', borderRadius: '6px', marginBottom: '16px', border: '1px solid #e2e8f0' }}>
            <h4 style={{ fontSize: '13px', fontWeight: '600', marginBottom: '10px', color: '#334155' }}>Bidding Schedule & Hard Cap</h4>
            <div className="form-row">
              <div className="form-group">
                <label>Bid Start Time *</label>
                <input
                  type="datetime-local"
                  className="form-control"
                  value={bidStartTime}
                  onChange={(e) => setBidStartTime(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label>Bid Close Time *</label>
                <input
                  type="datetime-local"
                  className="form-control"
                  value={bidCloseTime}
                  onChange={(e) => setBidCloseTime(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label>Forced Bid Close Time (Hard Cap) *</label>
                <input
                  type="datetime-local"
                  className="form-control"
                  value={forcedBidCloseTime}
                  onChange={(e) => setForcedBidCloseTime(e.target.value)}
                  required
                />
              </div>
            </div>
            <p style={{ fontSize: '11px', color: '#64748b', marginTop: '4px' }}>
              Rule: Auction extensions will never exceed the Forced Bid Close Time under any circumstances.
            </p>
          </div>

          <div style={{ backgroundColor: '#eff6ff', padding: '14px', borderRadius: '6px', marginBottom: '16px', border: '1px solid #bfdbfe' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <h4 style={{ fontSize: '13px', fontWeight: '700', color: '#1e40af' }}>British Auction Parameters</h4>
              <label style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px', color: '#1e40af', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={isBritishAuction}
                  onChange={(e) => setIsBritishAuction(e.target.checked)}
                />
                Enable British Auction
              </label>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Trigger Window X (Minutes)</label>
                <input
                  type="number"
                  min="1"
                  max="120"
                  className="form-control"
                  value={triggerWindow}
                  onChange={(e) => setTriggerWindow(e.target.value)}
                  required
                />
                <span style={{ fontSize: '11px', color: '#64748b' }}>Monitors bids in the last X minutes before close.</span>
              </div>

              <div className="form-group">
                <label>Extension Duration Y (Minutes)</label>
                <input
                  type="number"
                  min="1"
                  max="120"
                  className="form-control"
                  value={extensionDuration}
                  onChange={(e) => setExtensionDuration(e.target.value)}
                  required
                />
                <span style={{ fontSize: '11px', color: '#64748b' }}>Time added to close time when condition is met.</span>
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Extension Trigger Condition</label>
              <select
                className="form-control"
                value={extensionTrigger}
                onChange={(e) => setExtensionTrigger(e.target.value)}
              >
                <option value="BID_RECEIVED">a) Any Bid Received in Last X Minutes</option>
                <option value="ANY_RANK_CHANGE">b) Any Supplier Rank Change in Last X Minutes</option>
                <option value="L1_RANK_CHANGE">c) Lowest Bidder (L1) Rank Change in Last X Minutes</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button type="button" className="btn-secondary" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Creating...' : 'Create RFQ'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
