import { useRef, useState } from 'react';
import './wednesdayVoice.css';

function getRecognitionConstructor() {
  if (typeof window === 'undefined') return null;
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

export default function WednesdayVoice() {
  const recognitionRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [status, setStatus] = useState('Ready');

  const startListening = () => {
    const Recognition = getRecognitionConstructor();

    if (!Recognition) {
      setOpen(true);
      setStatus('Voice recognition is not supported by this browser.');
      return;
    }

    if (!recognitionRef.current) {
      const recognition = new Recognition();
      recognition.lang = 'en-US';
      recognition.interimResults = true;
      recognition.continuous = false;

      recognition.onstart = () => {
        setListening(true);
        setStatus('Listening…');
      };

      recognition.onresult = event => {
        const text = Array.from(event.results)
          .map(result => result[0]?.transcript || '')
          .join(' ')
          .trim();
        setTranscript(text);
      };

      recognition.onerror = event => {
        setStatus(`Voice error: ${event.error}`);
        setListening(false);
      };

      recognition.onend = () => {
        setListening(false);
        setStatus('Ready');
      };

      recognitionRef.current = recognition;
    }

    setOpen(true);
    setTranscript('');
    recognitionRef.current.start();
  };

  const sendCommand = () => {
    const command = transcript.trim();
    if (!command) return;

    window.dispatchEvent(
      new CustomEvent('fleetflow:wednesday-command', {
        detail: { command },
      })
    );
    setStatus('Command received');
  };

  return (
    <>
      <button
        type="button"
        className={`ff-wednesday-launcher ${listening ? 'listening' : ''}`}
        onClick={() => setOpen(value => !value)}
        aria-label="Open Wednesday voice assistant"
      >
        <span aria-hidden="true">🎙️</span>
        <span>Wednesday</span>
      </button>

      {open && (
        <section className="ff-wednesday-panel" aria-label="Wednesday voice assistant">
          <div className="ff-wednesday-panel-header">
            <div>
              <small>FleetFlow operations guide</small>
              <h2>Wednesday</h2>
            </div>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close Wednesday">×</button>
          </div>

          <p className="ff-wednesday-status">{status}</p>
          <textarea
            value={transcript}
            onChange={event => setTranscript(event.target.value)}
            placeholder="Speak or type a command, such as “Open Jobs.”"
            rows={4}
          />

          <div className="ff-wednesday-actions">
            <button type="button" onClick={startListening} className={listening ? 'active' : ''}>
              {listening ? 'Listening…' : '🎤 Talk'}
            </button>
            <button type="button" onClick={sendCommand} disabled={!transcript.trim()}>
              Send command
            </button>
          </div>
        </section>
      )}
    </>
  );
}
