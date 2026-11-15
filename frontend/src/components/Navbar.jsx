import React from 'react';

export default function Navbar({ currentView, setCurrentView, openCreateModal }) {
  return (
    <nav className="navbar">
      <div className="brand" onClick={() => setCurrentView('list')}>
        <div className="brand-logo">B</div>
        <div className="brand-text">
          <h1>British Auction RFQ</h1>
          <span>Logistics & Quotations</span>
        </div>
      </div>

      <div className="nav-tabs-center">
        <button
          className={`nav-btn ${currentView === 'list' ? 'active' : ''}`}
          onClick={() => setCurrentView('list')}
        >
          All Auctions
        </button>
        <button
          className={`nav-btn ${currentView === 'buyer' ? 'active' : ''}`}
          onClick={() => setCurrentView('buyer')}
        >
          Buyer View
        </button>
        <button
          className={`nav-btn ${currentView === 'supplier' ? 'active' : ''}`}
          onClick={() => setCurrentView('supplier')}
        >
          Supplier View
        </button>
      </div>

      <div className="nav-action-right">
        {currentView !== 'supplier' ? (
          <button
            className="btn-primary"
            onClick={openCreateModal}
          >
            + Create RFQ
          </button>
        ) : (
          <div style={{ width: '120px' }}></div>
        )}
      </div>
    </nav>
  );
}
