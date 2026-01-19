export default function ChatPanel() {
  return (
    <div style={{
      padding: '1rem',
      borderRadius: '12px',
      background: '#111',
      border: '1px solid #222',
      minHeight: '200px'
    }}>
      <strong>Dispatch Log</strong>
      <p style={{ opacity: 0.6, marginTop: '0.5rem' }}>
        No messages yet.
      </p>
    </div>
  );
}
