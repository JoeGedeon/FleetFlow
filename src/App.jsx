import React, { useState } from 'react';

export default function App() {
  const [role, setRole] = useState('driver');
  const [status, setStatus] = useState('survey');

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#111',
        color: '#fff',
        padding: '20px',
        fontFamily: 'Arial, sans-serif'
      }}
    >
      <h1 style={{ fontSize: '28px', marginBottom: '20px' }}>
        FreeFlow – App is Running
      </h1>

      <div style={{ marginBottom: '20px' }}>
        <strong>Active Role:</strong> {role}
      </div>

      <div style={{ marginBottom: '20px' }}>
        <strong>Status:</strong> {status}
      </div>

      <div style={{ marginBottom: '20px' }}>
        <button onClick={() => setRole('driver')} style={btn}>
          Driver
        </button>
        <button onClick={() => setRole('office')} style={btn}>
          Office
        </button>
        <button onClick={() => setRole('client')} style={btn}>
          Client
        </button>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <button onClick={() => setStatus('survey')} style={btn}>
          Survey
        </button>
        <button onClick={() => setStatus('loading')} style={btn}>
          Loading
        </button>
        <button onClick={() => setStatus('delivery')} style={btn}>
          Delivery
        </button>
      </div>

      <hr style={{ margin: '30px 0', borderColor: '#333' }} />

      {role === 'driver' && <DriverView status={status} />}
      {role === 'office' && <OfficeView status={status} />}
      {role === 'client' && <ClientView status={status} />}
    </div>
  );
}

const DriverView = ({ status }) => (
  <div>
    <h2>Driver View</h2>
    <p>Current Status: {status}</p>
    <p>This is where walkthrough, photos, and inventory will live.</p>
  </div>
);

const OfficeView = ({ status }) => (
  <div>
    <h2>Office View</h2>
    <p>Current Status: {status}</p>
    <p>This is where pricing, edits, and approvals will live.</p>
  </div>
);

const ClientView = ({ status }) => (
  <div>
    <h2>Client View</h2>
    <p>Current Status: {status}</p>
    <p>This is where signatures and payments will live.</p>
  </div>
);

const btn = {
  marginRight: '10px',
  padding: '10px 14px',
  backgroundColor: '#2563eb',
  color: '#fff',
  border: 'none',
  borderRadius: '6px',
  cursor: 'pointer'
};
