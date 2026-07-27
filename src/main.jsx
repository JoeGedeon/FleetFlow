import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import WednesdayGuide from './components/WednesdayGuide.jsx';

function FleetFlowRoot() {
  return (
    <>
      <App />
      <WednesdayGuide
        role="office"
        onNavigate={(action) => {
          window.dispatchEvent(
            new CustomEvent('fleetflow:wednesday-navigation', {
              detail: { action },
            })
          );
        }}
      />
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <FleetFlowRoot />
  </React.StrictMode>
);
