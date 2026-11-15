import React, { useState } from 'react';

export default function AuctionList({ rfqs, onSelectRFQ, openCreateModal, role }) {
  const [filter, setFilter] = useState('ALL');
  const [search, setSearch] = useState('');

  const filteredRfqs = rfqs.filter((rfq) => {
    const matchesFilter =
      filter === 'ALL' ||
      (filter === 'ACTIVE' && rfq.status === 'ACTIVE') ||
      (filter === 'CLOSED' && (rfq.status === 'CLOSED' || rfq.status === 'FORCE_CLOSED'));

    const matchesSearch =
      rfq.name.toLowerCase().includes(search.toLowerCase()) ||
      rfq.reference_id.toLowerCase().includes(search.toLowerCase());

    return matchesFilter && matchesSearch;
  });

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: '700' }}>
            {role === 'buyer' ? 'Buyer RFQ Dashboard' : role === 'supplier' ? 'Supplier Bidding Portal' : 'British Auction RFQ System'}
          </h2>
          <p style={{ fontSize: '13px', color: '#64748b' }}>
            Competitive procurement with dynamic anti-sniping bid extensions
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <input
            type="text"
            className="form-control"
            placeholder="Search reference or title..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: '220px' }}
          />

          <select
            className="form-control"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            style={{ width: '130px' }}
          >
            <option value="ALL">All Status</option>
            <option value="ACTIVE">Active Only</option>
            <option value="CLOSED">Closed Only</option>
          </select>

          {role === 'buyer' && (
            <button className="btn-primary" onClick={openCreateModal}>
              + New RFQ
            </button>
          )}
        </div>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Reference ID & Title</th>
              <th>Status</th>
              <th>Current Lowest Bid (L1)</th>
              <th>Current Bid Close Time</th>
              <th>Forced Hard Cap</th>
              <th>Rule Config</th>
              <th>Total Quotes</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredRfqs.length === 0 ? (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
                  No RFQs found matching the selected filter.
                </td>
              </tr>
            ) : (
              filteredRfqs.map((rfq) => {
                const closeDate = new Date(rfq.bid_close_time).toLocaleString([], {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                });
                const forcedDate = new Date(rfq.forced_bid_close_time).toLocaleString([], {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                });

                return (
                  <tr key={rfq.id}>
                    <td>
                      <div style={{ fontWeight: '600', color: '#1e293b' }}>{rfq.reference_id}</div>
                      <div style={{ fontSize: '12px', color: '#64748b' }}>{rfq.name}</div>
                    </td>
                    <td>
                      <span className={`badge badge-${rfq.status.toLowerCase().replace('_', '-')}`}>
                        {rfq.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td>
                      {rfq.current_lowest_bid ? (
                        <span className="badge badge-l1" style={{ fontSize: '13px' }}>
                          ₹{rfq.current_lowest_bid.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </span>
                      ) : (
                        <span style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: '12px' }}>
                          No bids yet
                        </span>
                      )}
                    </td>
                    <td>
                      <div style={{ fontWeight: '500' }}>{closeDate}</div>
                    </td>
                    <td>
                      <div style={{ color: '#64748b', fontSize: '13px' }}>{forcedDate}</div>
                    </td>
                    <td>
                      <span className="badge badge-rule">
                        X={rfq.trigger_window_minutes}m, Y={rfq.extension_duration_minutes}m
                      </span>
                      <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                        {rfq.extension_trigger}
                      </div>
                    </td>
                    <td>
                      <strong>{rfq.total_bids}</strong> quotes
                    </td>
                    <td>
                      <button
                        className="btn-primary"
                        style={{ fontSize: '12px', padding: '6px 12px' }}
                        onClick={() => onSelectRFQ(rfq.id)}
                      >
                        {role === 'supplier' && rfq.status === 'ACTIVE'
                          ? 'Participate & Bid →'
                          : role === 'buyer'
                          ? 'Monitor Auction →'
                          : 'View Details →'}
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
