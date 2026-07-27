import { useMemo, useState } from 'react';
import './commandCenterShell.css';

const PRIMARY_NAV = [
  'Dashboard',
  'Operations',
  'Customers',
  'Storage',
  'Financial',
  'People',
  'Fleet',
  'Business',
  'PACER',
  'Wednesday',
  'System',
];

const SECONDARY_NAV = {
  Dashboard: ['Mission Control', 'Alerts', 'Daily Brief'],
  Operations: ['Jobs', 'Calendar', 'Dispatch', 'Routes', 'Warehouse', 'Claims', 'Documents'],
  Customers: ['Leads', 'CRM', 'Active Clients', 'Storage Clients', 'Reviews', 'Marketing'],
  Storage: ['Units', 'Vaults', 'Inventory', 'Photos', 'Digital Twin', 'Retrieval'],
  Financial: ['Invoices', 'Payments', 'Payroll', 'Expenses', 'Profit', 'Forecast', 'Reports'],
  People: ['Team', 'Crew Log', 'Availability', 'Permissions'],
  Fleet: ['Vehicles', 'Load Sheets', 'Maintenance', 'Assignments'],
  Business: ['Revenue', 'Sales', 'Pipeline', 'Forecast', 'Growth'],
  PACER: ['Patterns', 'Recommendations', 'Operational Feed', 'Alerts', 'Knowledge', 'Decisions'],
  Wednesday: ['Talk', 'Ask', 'History', 'Tasks', 'Automation', 'Training', "What's New"],
  System: ['Company', 'Workspaces', 'Integrations', 'Security', 'Settings'],
};

function dispatchNavigation(section, destination) {
  window.dispatchEvent(
    new CustomEvent('fleetflow:command-navigation', {
      detail: { section, destination },
    })
  );
}

export default function CommandCenterShell({ children }) {
  const [activeSection, setActiveSection] = useState('Dashboard');
  const [activeDestination, setActiveDestination] = useState('Mission Control');
  const destinations = useMemo(() => SECONDARY_NAV[activeSection] || [], [activeSection]);

  const selectSection = section => {
    const nextDestination = SECONDARY_NAV[section]?.[0] || section;
    setActiveSection(section);
    setActiveDestination(nextDestination);
    dispatchNavigation(section, nextDestination);
  };

  const selectDestination = destination => {
    setActiveDestination(destination);
    dispatchNavigation(activeSection, destination);
  };

  return (
    <div className="ff-command-shell">
      <header className="ff-command-header">
        <div className="ff-command-brand">
          <span className="ff-command-mark" aria-hidden="true">◇</span>
          <div>
            <strong>FLEETFLOW</strong>
            <small>Command Center</small>
          </div>
        </div>

        <nav className="ff-primary-nav" aria-label="FleetFlow primary navigation">
          {PRIMARY_NAV.map(section => (
            <button
              key={section}
              type="button"
              className={section === activeSection ? 'active' : ''}
              onClick={() => selectSection(section)}
            >
              {section}
            </button>
          ))}
        </nav>
      </header>

      <nav className="ff-secondary-nav" aria-label={`${activeSection} navigation`}>
        <span className="ff-secondary-label">{activeSection}</span>
        <div className="ff-secondary-scroll">
          {destinations.map(destination => (
            <button
              key={destination}
              type="button"
              className={destination === activeDestination ? 'active' : ''}
              onClick={() => selectDestination(destination)}
            >
              {destination}
            </button>
          ))}
        </div>
      </nav>

      <main className="ff-command-content">{children}</main>
    </div>
  );
}
