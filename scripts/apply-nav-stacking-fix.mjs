import fs from 'node:fs';

const sourcePath = new URL('../index.html', import.meta.url);
const distDir = new URL('../dist/', import.meta.url);
const distIndexPath = new URL('../dist/index.html', import.meta.url);
const navMarker = 'fleetflow-original-nav-stacking-fix-v2';
const wednesdayMarker = 'fleetflow-wednesday-introduction-v1';

let html = fs.readFileSync(sourcePath, 'utf8');

if (!html.includes(navMarker)) {
  const patch = `
<!-- ${navMarker} -->
<style id="${navMarker}">
  /*
   * Preserve the original navigation contract:
   * - dropdown coordinates are calculated from getBoundingClientRect()
   * - dropdowns therefore remain viewport-relative (position: fixed)
   * - nav groups remain non-positioning ancestors (position: static)
   */
  .topbar {
    z-index: 5000 !important;
    overflow: visible !important;
  }

  .tabs,
  #tabs-container,
  .nav-bar {
    z-index: 4500 !important;
    overflow: visible !important;
  }

  .nav-group {
    position: static !important;
    z-index: auto !important;
    overflow: visible !important;
  }

  .nav-dropdown {
    position: fixed !important;
    z-index: 6000 !important;
  }

  .main-content,
  .content,
  main,
  .page,
  .dashboard,
  .dashboard-content {
    position: relative;
    z-index: 1 !important;
  }

  @media (hover: none), (pointer: coarse), (max-width: 1180px) {
    .tabs,
    #tabs-container,
    .nav-bar {
      overflow: visible !important;
    }

    .nav-group {
      position: static !important;
    }

    .nav-dropdown {
      position: fixed !important;
      z-index: 6000 !important;
    }
  }
</style>
`;

  if (!html.includes('</head>')) {
    throw new Error('index.html is missing </head>; refusing to patch.');
  }

  html = html.replace('</head>', `${patch}\n</head>`);
  console.log('Injected original navigation coordinate-system fix.');
} else {
  console.log('Original navigation coordinate-system fix already present.');
}

if (!html.includes(wednesdayMarker)) {
  const wednesdayPatch = `
<!-- ${wednesdayMarker} -->
<style id="${wednesdayMarker}">
  :root {
    --wednesday-blue: #66d7ff;
    --wednesday-deep: #07111f;
    --wednesday-panel: rgba(8, 20, 36, 0.96);
    --wednesday-gold: #f4bf5f;
  }

  #wednesday-launcher {
    position: fixed;
    right: 22px;
    bottom: 22px;
    z-index: 8500;
    width: 62px;
    height: 62px;
    border: 1px solid rgba(102, 215, 255, 0.65);
    border-radius: 50%;
    background:
      radial-gradient(circle at 40% 32%, rgba(255,255,255,0.95) 0 3%, transparent 4%),
      radial-gradient(circle at center, rgba(102,215,255,0.34), rgba(7,17,31,0.96) 68%);
    box-shadow: 0 0 0 7px rgba(102,215,255,0.08), 0 0 34px rgba(102,215,255,0.45);
    color: white;
    font: 800 19px/1 system-ui, sans-serif;
    cursor: pointer;
    display: grid;
    place-items: center;
    transition: transform .2s ease, box-shadow .2s ease;
  }

  #wednesday-launcher:hover,
  #wednesday-launcher:focus-visible {
    transform: translateY(-2px) scale(1.03);
    box-shadow: 0 0 0 8px rgba(102,215,255,0.11), 0 0 42px rgba(102,215,255,0.62);
    outline: none;
  }

  #wednesday-launcher::after {
    content: '';
    position: absolute;
    inset: -8px;
    border: 1px solid rgba(102,215,255,0.25);
    border-radius: 50%;
    animation: wednesdayPulse 2.8s ease-out infinite;
  }

  @keyframes wednesdayPulse {
    0% { transform: scale(.82); opacity: .85; }
    70%, 100% { transform: scale(1.34); opacity: 0; }
  }

  #wednesday-intro {
    position: fixed;
    inset: 0;
    z-index: 9000;
    display: none;
    align-items: center;
    justify-content: center;
    padding: 22px;
    background:
      radial-gradient(circle at 50% 30%, rgba(47, 153, 210, 0.22), transparent 42%),
      linear-gradient(135deg, rgba(3,10,19,.96), rgba(6,20,35,.96));
    backdrop-filter: blur(12px);
  }

  #wednesday-intro.is-open { display: flex; }

  .wednesday-stage {
    position: relative;
    width: min(920px, 100%);
    min-height: min(620px, 82vh);
    overflow: hidden;
    border: 1px solid rgba(102,215,255,.26);
    border-radius: 28px;
    background: linear-gradient(180deg, rgba(12,30,49,.97), rgba(4,12,23,.98));
    box-shadow: 0 30px 90px rgba(0,0,0,.52), inset 0 1px rgba(255,255,255,.04);
    color: #f4f8fb;
  }

  .wednesday-grid {
    position: absolute;
    inset: 0;
    opacity: .22;
    background-image:
      linear-gradient(rgba(102,215,255,.14) 1px, transparent 1px),
      linear-gradient(90deg, rgba(102,215,255,.14) 1px, transparent 1px);
    background-size: 42px 42px;
    mask-image: linear-gradient(to bottom, black, transparent 90%);
  }

  .wednesday-network {
    position: absolute;
    inset: 0;
    background:
      radial-gradient(circle at 19% 29%, rgba(244,191,95,.95) 0 2px, transparent 3px),
      radial-gradient(circle at 79% 24%, rgba(102,215,255,.95) 0 2px, transparent 3px),
      radial-gradient(circle at 67% 73%, rgba(244,191,95,.9) 0 2px, transparent 3px),
      radial-gradient(circle at 28% 76%, rgba(102,215,255,.9) 0 2px, transparent 3px),
      linear-gradient(24deg, transparent 47%, rgba(102,215,255,.13) 48% 49%, transparent 50%),
      linear-gradient(145deg, transparent 47%, rgba(244,191,95,.13) 48% 49%, transparent 50%);
    animation: networkDrift 10s ease-in-out infinite alternate;
  }

  @keyframes networkDrift {
    from { transform: scale(1) translateY(0); opacity: .55; }
    to { transform: scale(1.05) translateY(-8px); opacity: .92; }
  }

  .wednesday-content {
    position: relative;
    z-index: 2;
    min-height: inherit;
    display: grid;
    grid-template-columns: minmax(250px, .8fr) minmax(320px, 1.2fr);
    align-items: center;
    gap: 30px;
    padding: 54px;
  }

  .wednesday-symbol-wrap {
    display: grid;
    place-items: center;
  }

  .wednesday-symbol {
    position: relative;
    width: 210px;
    aspect-ratio: 1;
    border-radius: 42% 42% 48% 48%;
    background:
      repeating-linear-gradient(45deg, transparent 0 18px, rgba(255,255,255,.16) 19px 21px),
      repeating-linear-gradient(-45deg, transparent 0 18px, rgba(255,255,255,.12) 19px 21px),
      radial-gradient(circle at 40% 30%, #baf1ff, #3ec7ff 23%, #0869a2 62%, #042a4d 100%);
    filter: drop-shadow(0 0 34px rgba(57,194,255,.58));
    animation: pineappleFloat 4s ease-in-out infinite;
  }

  .wednesday-symbol::before {
    content: '';
    position: absolute;
    left: 50%;
    top: -84px;
    width: 128px;
    height: 112px;
    transform: translateX(-50%);
    background: conic-gradient(from 20deg at 50% 100%, #69dcff, #0a6b9f, #7ce7ff, #06476d, #69dcff);
    clip-path: polygon(50% 0, 61% 43%, 85% 12%, 72% 52%, 100% 35%, 75% 69%, 88% 100%, 50% 77%, 12% 100%, 25% 69%, 0 35%, 28% 52%, 15% 12%, 39% 43%);
    opacity: .95;
  }

  .wednesday-symbol::after {
    content: '';
    position: absolute;
    inset: -20px;
    border: 1px solid rgba(102,215,255,.28);
    border-radius: 50%;
    animation: symbolRing 5s linear infinite;
  }

  @keyframes pineappleFloat {
    0%,100% { transform: translateY(0) rotate(-1deg); }
    50% { transform: translateY(-12px) rotate(1deg); }
  }

  @keyframes symbolRing { to { transform: rotate(360deg); } }

  .wednesday-kicker {
    margin: 0 0 12px;
    color: var(--wednesday-blue);
    letter-spacing: .19em;
    text-transform: uppercase;
    font: 800 12px/1.4 system-ui, sans-serif;
  }

  .wednesday-copy h2 {
    margin: 0;
    max-width: 620px;
    font: 800 clamp(34px, 5vw, 62px)/.98 system-ui, sans-serif;
    letter-spacing: -.045em;
  }

  .wednesday-copy h2 span { color: var(--wednesday-blue); }

  .wednesday-copy p {
    max-width: 620px;
    margin: 22px 0 0;
    color: rgba(235,245,250,.8);
    font: 500 17px/1.65 system-ui, sans-serif;
  }

  .wednesday-manifesto {
    display: grid;
    grid-template-columns: repeat(3, minmax(0,1fr));
    gap: 10px;
    margin-top: 24px;
  }

  .wednesday-manifesto div {
    padding: 13px 12px;
    border: 1px solid rgba(102,215,255,.14);
    border-radius: 13px;
    background: rgba(255,255,255,.035);
    color: rgba(240,247,252,.85);
    font: 750 12px/1.35 system-ui, sans-serif;
    text-align: center;
  }

  .wednesday-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 12px;
    margin-top: 28px;
  }

  .wednesday-actions button {
    min-height: 48px;
    padding: 0 19px;
    border-radius: 12px;
    border: 1px solid rgba(102,215,255,.26);
    font: 800 14px/1 system-ui, sans-serif;
    cursor: pointer;
  }

  #wednesday-begin {
    color: #04111b;
    border-color: transparent;
    background: linear-gradient(135deg, #b9efff, #4acbff);
    box-shadow: 0 10px 28px rgba(62,199,255,.22);
  }

  #wednesday-skip {
    color: rgba(244,248,251,.86);
    background: rgba(255,255,255,.04);
  }

  .wednesday-close {
    position: absolute;
    top: 18px;
    right: 18px;
    z-index: 3;
    width: 42px;
    height: 42px;
    border: 1px solid rgba(255,255,255,.12);
    border-radius: 50%;
    color: white;
    background: rgba(0,0,0,.22);
    cursor: pointer;
    font-size: 22px;
  }

  .wednesday-credit {
    position: absolute;
    left: 26px;
    bottom: 20px;
    z-index: 2;
    color: rgba(230,241,248,.48);
    font: 700 11px/1.4 system-ui, sans-serif;
    letter-spacing: .07em;
  }

  @media (max-width: 760px) {
    #wednesday-launcher { width: 56px; height: 56px; right: 14px; bottom: 14px; }
    .wednesday-stage { min-height: 86vh; border-radius: 22px; }
    .wednesday-content { grid-template-columns: 1fr; gap: 24px; padding: 70px 24px 64px; text-align: center; }
    .wednesday-symbol { width: 138px; }
    .wednesday-symbol::before { top: -58px; width: 90px; height: 78px; }
    .wednesday-copy p { font-size: 15px; }
    .wednesday-manifesto { grid-template-columns: 1fr; }
    .wednesday-actions { justify-content: center; }
    .wednesday-credit { left: 18px; right: 18px; text-align: center; }
  }

  @media (prefers-reduced-motion: reduce) {
    #wednesday-launcher::after,
    .wednesday-network,
    .wednesday-symbol,
    .wednesday-symbol::after { animation: none !important; }
  }
</style>

<div id="wednesday-intro" role="dialog" aria-modal="true" aria-labelledby="wednesday-title">
  <section class="wednesday-stage">
    <div class="wednesday-grid"></div>
    <div class="wednesday-network"></div>
    <button class="wednesday-close" type="button" aria-label="Close Wednesday introduction">×</button>
    <div class="wednesday-content">
      <div class="wednesday-symbol-wrap" aria-hidden="true">
        <div class="wednesday-symbol"></div>
      </div>
      <div class="wednesday-copy">
        <p class="wednesday-kicker">FleetFlow Intelligence · Wednesday</p>
        <h2 id="wednesday-title">Your operation has a new <span>working partner.</span></h2>
        <p>
          Welcome to FleetFlow. I am Wednesday. I help your office organize jobs, crews,
          schedules, paperwork, and decisions before details disappear into another busy day.
          This environment was built from the truck up, then engineered to grow with your company.
        </p>
        <div class="wednesday-manifesto" aria-label="FleetFlow principles">
          <div>Capture the decision</div>
          <div>Recognize the pattern</div>
          <div>Keep the operation moving</div>
        </div>
        <div class="wednesday-actions">
          <button id="wednesday-begin" type="button">Enter FleetFlow</button>
          <button id="wednesday-skip" type="button">Continue without voice</button>
        </div>
      </div>
    </div>
    <div class="wednesday-credit">Powered by FleetFlow · A JPG Ventures, LLC Production</div>
  </section>
</div>
<button id="wednesday-launcher" type="button" aria-label="Open Wednesday introduction" title="Meet Wednesday">W</button>

<script id="${wednesdayMarker}">
(() => {
  const STORAGE_KEY = 'fleetflow_wednesday_intro_seen_v1';
  const intro = document.getElementById('wednesday-intro');
  const launcher = document.getElementById('wednesday-launcher');
  const begin = document.getElementById('wednesday-begin');
  const skip = document.getElementById('wednesday-skip');
  const close = intro?.querySelector('.wednesday-close');

  if (!intro || !launcher || !begin || !skip || !close) return;

  const message = [
    'Welcome to FleetFlow.',
    'I am Wednesday, your operational guide.',
    'I help your office organize jobs, crews, schedules, paperwork, and decisions before details disappear into another busy day.',
    'FleetFlow was built from the truck up, and designed to grow with your company.',
    'Let us get your operation moving.'
  ].join(' ');

  const stopVoice = () => {
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  };

  const speak = () => {
    if (!('speechSynthesis' in window)) return;
    stopVoice();
    const utterance = new SpeechSynthesisUtterance(message);
    utterance.rate = 0.92;
    utterance.pitch = 0.88;
    utterance.volume = 1;
    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find((voice) => /samantha|ava|victoria|female|zira/i.test(voice.name));
    if (preferred) utterance.voice = preferred;
    window.speechSynthesis.speak(utterance);
  };

  const openIntro = (withVoice = false) => {
    intro.classList.add('is-open');
    document.documentElement.style.overflow = 'hidden';
    setTimeout(() => begin.focus(), 100);
    if (withVoice) setTimeout(speak, 240);
  };

  const closeIntro = () => {
    stopVoice();
    intro.classList.remove('is-open');
    document.documentElement.style.overflow = '';
    try { localStorage.setItem(STORAGE_KEY, '1'); } catch {}
    launcher.focus();
  };

  begin.addEventListener('click', () => {
    speak();
    setTimeout(closeIntro, 11500);
  });

  skip.addEventListener('click', closeIntro);
  close.addEventListener('click', closeIntro);
  launcher.addEventListener('click', () => openIntro(true));
  intro.addEventListener('click', (event) => {
    if (event.target === intro) closeIntro();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && intro.classList.contains('is-open')) closeIntro();
  });

  const showWhenAppIsReady = () => {
    let seen = false;
    try { seen = localStorage.getItem(STORAGE_KEY) === '1'; } catch {}
    if (seen) return;

    const appReady = document.querySelector('.topbar, #tabs-container, .nav-bar');
    if (appReady) {
      setTimeout(() => openIntro(false), 700);
      return;
    }

    const observer = new MutationObserver(() => {
      if (document.querySelector('.topbar, #tabs-container, .nav-bar')) {
        observer.disconnect();
        setTimeout(() => openIntro(false), 700);
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    setTimeout(() => observer.disconnect(), 30000);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', showWhenAppIsReady, { once: true });
  } else {
    showWhenAppIsReady();
  }
})();
</script>
`;

  if (!html.includes('</body>')) {
    throw new Error('index.html is missing </body>; refusing to inject Wednesday.');
  }

  html = html.replace('</body>', `${wednesdayPatch}\n</body>`);
  console.log('Injected Wednesday guided introduction.');
} else {
  console.log('Wednesday guided introduction already present.');
}

fs.rmSync(distDir, { recursive: true, force: true });
fs.mkdirSync(distDir, { recursive: true });
fs.writeFileSync(distIndexPath, html);
console.log('Staged patched legacy FleetFlow index.html in dist/.');
