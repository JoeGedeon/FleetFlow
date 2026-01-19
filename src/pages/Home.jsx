import Dashboard from '../components/Dashboard';

export default function Home() {
  return (
    <main style={{ padding: '2rem' }}>
      <h1 style={{ fontSize: '2rem', fontWeight: 800 }}>
        FreeFlow v1
      </h1>
      <p style={{ opacity: 0.6 }}>
        Operational flow, accountability, zero nonsense.
      </p>

      <Dashboard />
    </main>
  );
}
