import StatusBar from './StatusBar';
import ChatPanel from './ChatPanel';

export default function Dashboard() {
  return (
    <div style={{ marginTop: '2rem', display: 'grid', gap: '1.5rem' }}>
      <StatusBar />
      <ChatPanel />
    </div>
  );
}
