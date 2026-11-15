const API_BASE_URL = 'http://localhost:8000/api';

export async function fetchRFQs() {
  const response = await fetch(`${API_BASE_URL}/rfqs`);
  if (!response.ok) {
    throw new Error('Failed to fetch RFQs');
  }
  return response.json();
}

export async function fetchRFQDetails(rfqId) {
  const response = await fetch(`${API_BASE_URL}/rfqs/${rfqId}`);
  if (!response.ok) {
    throw new Error('Failed to fetch RFQ details');
  }
  return response.json();
}

export async function createRFQ(payload) {
  const response = await fetch(`${API_BASE_URL}/rfqs`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Failed to create RFQ');
  }
  return response.json();
}

export async function submitBid(rfqId, payload) {
  const response = await fetch(`${API_BASE_URL}/rfqs/${rfqId}/bids`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.detail || 'Failed to submit quote');
  }
  return response.json();
}

export async function activateDemoWindow(rfqId) {
  const response = await fetch(`${API_BASE_URL}/rfqs/${rfqId}/activate-demo-window`, {
    method: 'POST'
  });

  if (!response.ok) {
    throw new Error('Failed to activate demo window');
  }
  return response.json();
}
