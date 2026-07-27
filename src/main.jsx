import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import CommandCenterShell from './components/CommandCenterShell.jsx';
import WednesdayGuide from './components/WednesdayGuide.jsx';
import WednesdayVoice from './components/WednesdayVoice.jsx';
import WhiteLabelAttribution from './components/WhiteLabelAttribution.jsx';

function FleetFlowRoot() {
  return (
    <CommandCenterShell>
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
      <WednesdayVoice />
      <WhiteLabelAttribution />
    </CommandCenterShell>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <FleetFlowRoot />
  </React.StrictMode>
);
