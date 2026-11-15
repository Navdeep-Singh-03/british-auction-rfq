import React, { useState } from 'react';
import { submitBid } from '../services/api';

export default function BidSubmissionModal({ rfq, isOpen, onClose, onBidSuccess }) {
  const [supplierName, setSupplierName] = useState('');
  const [carrierName, setCarrierName] = useState('');
  const [freightCharges, setFreightCharges] = useState('');
  const [originCharges, setOriginCharges] = useState('');
  const [destinationCharges, setDestinationCharges] = useState('');
  const [transitTime, setTransitTime] = useState('');
  const [validityOfQuote, setValidityOfQuote] = useState('15 Days');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const numFreight = parseFloat(freightCharges) || 0;
  const numOrigin = parseFloat(originCharges) || 0;
  const numDest = parseFloat(destinationCharges) || 0;
  const totalPrice = numFreight + numOrigin + numDest;

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!supplierName.trim() || !carrierName.trim()) {
      setError('Supplier Name and Carrier Name are required.');
      return;
    }
    if (numFreight <= 0) {
      setError('Freight charges must be greater than zero.');
      return;
    }
    if (!transitTime.trim()) {
      setError('Transit time is required.');
      return;
    }

    setLoading(true);
    try {
      await submitBid(rfq.id, {
        supplier_name: supplierName,
        carrier_name: carrierName,
        freight_charges: numFreight,
        origin_charges: numOrigin,
        destination_charges: numDest,
        transit_time: transitTime,
        validity_of_quote: validityOfQuote
      });

      // Clear form
      setSupplierName('');
      setCarrierName('');
      setFreightCharges('');
      setOriginCharges('');
      setDestinationCharges('');
      setTransitTime('');
      onClose();
      onBidSuccess();
    } catch (err) {
      setError(err.message || 'Failed to submit bid');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: '700' }}>Submit Supplier Quote</h2>
            <p style={{ fontSize: '13px', color: '#64748b' }}>
              RFQ: {rfq.reference_id} — {rfq.name}
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
              <label>Supplier / Company Name *</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. DHL Global, BlueDart"
                value={supplierName}
                onChange={(e) => setSupplierName(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label>Carrier Name / Vehicle Type *</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. Boeing 777-F, 32ft Container Truck"
                value={carrierName}
                onChange={(e) => setCarrierName(e.target.value)}
                required
              />
            </div>
          </div>

          <div style={{ backgroundColor: '#f8fafc', padding: '14px', borderRadius: '6px', marginBottom: '16px', border: '1px solid #e2e8f0' }}>
            <h4 style={{ fontSize: '13px', fontWeight: '600', marginBottom: '10px', color: '#334155' }}>Quote Price Breakdown (₹)</h4>
            <div className="form-row">
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Freight Charges *</label>
                <input
                  type="number"
                  step="any"
                  className="form-control"
                  placeholder="₹"
                  value={freightCharges}
                  onChange={(e) => setFreightCharges(e.target.value)}
                  required
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Origin Charges</label>
                <input
                  type="number"
                  step="any"
                  className="form-control"
                  placeholder="₹"
                  value={originCharges}
                  onChange={(e) => setOriginCharges(e.target.value)}
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Destination Charges</label>
                <input
                  type="number"
                  step="any"
                  className="form-control"
                  placeholder="₹"
                  value={destinationCharges}
                  onChange={(e) => setDestinationCharges(e.target.value)}
                />
              </div>
            </div>

            <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px dashed #cbd5e1', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '14px', fontWeight: '600', color: '#475569' }}>Total Submitted Quote:</span>
              <span style={{ fontSize: '20px', fontWeight: '700', color: '#2563eb' }}>
                ₹{totalPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Transit Time *</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. 24 Hours, 3 Days"
                value={transitTime}
                onChange={(e) => setTransitTime(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label>Validity of Quote *</label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. 15 Days, 30 Days"
                value={validityOfQuote}
                onChange={(e) => setValidityOfQuote(e.target.value)}
                required
              />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '18px' }}>
            <button type="button" className="btn-secondary" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Submitting Quote...' : 'Submit Quote & Compete'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
