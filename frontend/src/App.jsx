import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import AuctionList from './components/AuctionList';
import AuctionDetail from './components/AuctionDetail';
import CreateRFQModal from './components/CreateRFQModal';
import { fetchRFQs } from './services/api';

export default function App() {
  const [rfqs, setRfqs] = useState([]);
  const [selectedRfqId, setSelectedRfqId] = useState(null);
  const [currentView, setCurrentView] = useState('list'); // 'list', 'buyer', 'supplier'
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function loadRFQs() {
    try {
      const data = await fetchRFQs();
      setRfqs(data);
      setError('');
    } catch (err) {
      setError('Could not connect to FastAPI backend. Please ensure the server is running on port 8000.');
    } finally {
      setLoading(false);
    }
  }

  // Load RFQs on initial mount and poll every 5 seconds
  useEffect(() => {
    loadRFQs();

    const interval = setInterval(() => {
      loadRFQs();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  function handleSelectRFQ(id) {
    setSelectedRfqId(id);
  }

  function handleBack() {
    setSelectedRfqId(null);
    loadRFQs();
  }

  return (
    <div className="app-container">
      <Navbar
        currentView={currentView}
        setCurrentView={(view) => {
          setCurrentView(view);
          setSelectedRfqId(null);
        }}
        openCreateModal={() => setIsCreateModalOpen(true)}
      />

      <main className="main-content">
        {error && (
          <div style={{ backgroundColor: '#fee2e2', color: '#b91c1c', padding: '12px 16px', borderRadius: '6px', marginBottom: '20px', fontSize: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>{error}</span>
            <button className="btn-secondary" style={{ padding: '4px 10px', fontSize: '12px' }} onClick={loadRFQs}>
              Retry
            </button>
          </div>
        )}

        {selectedRfqId ? (
          <AuctionDetail
            rfqId={selectedRfqId}
            onBack={handleBack}
            role={currentView}
          />
        ) : (
          <AuctionList
            rfqs={rfqs}
            onSelectRFQ={handleSelectRFQ}
            openCreateModal={() => setIsCreateModalOpen(true)}
            role={currentView}
          />
        )}
      </main>

      <CreateRFQModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreated={() => {
          loadRFQs();
        }}
      />
    </div>
  );
}
