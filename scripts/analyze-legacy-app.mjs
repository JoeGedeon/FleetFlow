#!/usr/bin/env node
// Dev-only static analysis tool for FleetFlow legacy decomposition, Phase 0.
// Reads index.html, maps its inline <script>/<style> blocks and the
// "// ====" banner sections inside the main application script, resolves
// global-scope bindings via a real AST + scope analyzer (acorn + eslint-scope,
// not regex/grep), catalogs inline on* HTML event handlers and what they
// reference, and writes docs/legacy-app-map.md.
//
// This tool makes NO changes to index.html, netlify.toml, Firebase, auth, or
// any runtime behavior. It only reads the file and writes documentation.
//
// Usage: node scripts/analyze-legacy-app.mjs

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as acorn from 'acorn';
import * as acornWalk from 'acorn-walk';
import { analyze as analyzeScope } from 'eslint-scope';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const indexPath = path.join(repoRoot, 'index.html');
const outPath = path.join(repoRoot, 'docs', 'legacy-app-map.md');

const ACORN_OPTS = { ecmaVersion: 2022, sourceType: 'script', locations: true, ranges: true };

// ---------------------------------------------------------------------------
// Line/offset helpers
// ---------------------------------------------------------------------------

function buildLineIndex(text) {
  const starts = [0];
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '\n') starts.push(i + 1);
  }
  return starts;
}

function makeOffsetToLine(lineStarts) {
  return function offsetToLine(offset) {
    let lo = 0;
    let hi = lineStarts.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (lineStarts[mid] <= offset) lo = mid;
      else hi = mid - 1;
    }
    return lo + 1; // 1-indexed line number
  };
}

// ---------------------------------------------------------------------------
// Step 1: find top-level <script> / <style> tags
// ---------------------------------------------------------------------------

function findTopLevelTags(html, tagName) {
  const openRe = new RegExp(`<${tagName}(\\s[^>]*)?>`, 'gi');
  const closeTag = `</${tagName}>`;
  const results = [];
  let m;
  while ((m = openRe.exec(html))) {
    const openStart = m.index;
    const contentStart = openRe.lastIndex;
    const attrs = (m[1] || '').trim();
    const srcMatch = /\bsrc\s*=\s*["']([^"']+)["']/i.exec(attrs);
    const closeIdx = html.indexOf(closeTag, contentStart);
    if (closeIdx === -1) {
      throw new Error(`Unclosed <${tagName}> tag at char offset ${openStart} (attrs="${attrs}")`);
    }
    results.push({
      tagName,
      attrs,
      src: srcMatch ? srcMatch[1] : null,
      openStart,
      contentStart,
      contentEnd: closeIdx,
      content: html.slice(contentStart, closeIdx),
    });
    openRe.lastIndex = closeIdx + closeTag.length;
  }
  return results;
}

// ---------------------------------------------------------------------------
// Step 2: banner-delimited sections inside the main script
// ---------------------------------------------------------------------------

const BANNER_RE = /^\s*\/\/ ={10,}\s*$/;

function extractSections(scriptContent, contentStartFileLine, offsetToLine, scriptStartOffset) {
  const lines = scriptContent.split('\n');
  const borderLineNumbers = []; // 1-indexed within scriptContent
  lines.forEach((line, idx) => {
    if (BANNER_RE.test(line)) borderLineNumbers.push(idx + 1);
  });

  if (borderLineNumbers.length % 2 !== 0) {
    throw new Error(
      `Found an odd number of banner border lines (${borderLineNumbers.length}) inside the main script. ` +
      `Banners are expected in open/close pairs — cannot safely determine section boundaries.`
    );
  }

  const toFileLine = (localLine) => contentStartFileLine + (localLine - 1);

  const sections = [];
  for (let i = 0; i < borderLineNumbers.length; i += 2) {
    const openLocal = borderLineNumbers[i];
    const closeLocal = borderLineNumbers[i + 1];
    const titleLines = lines
      .slice(openLocal, closeLocal - 1)
      .map((l) => l.replace(/^\s*\/\/\s?/, '').trim())
      .filter(Boolean);
    sections.push({
      name: titleLines.join(' — ') || `(untitled section at line ${toFileLine(openLocal)})`,
      bannerStartLocal: openLocal,
      bannerEndLocal: closeLocal,
      contentStartLocal: closeLocal + 1, // filled as final content start below
    });
  }

  // content of section i spans from just after its banner close to just
  // before the next section's banner open (or end of script for the last).
  for (let i = 0; i < sections.length; i++) {
    const nextOpen = i + 1 < sections.length ? sections[i + 1].bannerStartLocal : lines.length + 1;
    sections[i].contentEndLocal = nextOpen - 1;
  }

  const preambleEndLocal = sections.length ? sections[0].bannerStartLocal - 1 : lines.length;
  const preamble = preambleEndLocal >= 1
    ? { name: '(preamble — before first banner)', bannerStartLocal: 1, contentEndLocal: preambleEndLocal }
    : null;

  const allSections = preamble ? [preamble, ...sections] : sections;
  for (const s of allSections) {
    s.startLine = toFileLine(s.bannerStartLocal);
    s.endLine = toFileLine(s.contentEndLocal);
  }

  // Coverage validation (amendment #4): the sections must exactly tile the
  // main script's line range with no gaps and no overlaps.
  const scriptStartFileLine = offsetToLine(scriptStartOffset);
  const scriptEndFileLine = toFileLine(lines.length);
  let cursor = scriptStartFileLine;
  for (const s of allSections) {
    if (s.startLine !== cursor) {
      throw new Error(
        `Section coverage gap/overlap detected: expected section "${s.name}" to start at file line ${cursor}, ` +
        `but it starts at ${s.startLine}.`
      );
    }
    cursor = s.endLine + 1;
  }
  if (cursor - 1 !== scriptEndFileLine) {
    throw new Error(
      `Section coverage does not reach the end of the main script. Last covered line: ${cursor - 1}, ` +
      `script ends at line ${scriptEndFileLine}.`
    );
  }

  return { sections: allSections, coverageOk: true, scriptStartFileLine, scriptEndFileLine };
}

function sectionForLine(sections, fileLine) {
  // sections are contiguous and sorted by construction — linear scan is fine
  // for ~80 sections; kept simple and obviously correct over cleverness.
  for (const s of sections) {
    if (fileLine >= s.startLine && fileLine <= s.endLine) return s;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Step 3: AST + scope analysis of the main script
// ---------------------------------------------------------------------------

function analyzeGlobalScope(scriptContent, contentStartFileLine) {
  const ast = acorn.parse(scriptContent, ACORN_OPTS);
  const scopeManager = analyzeScope(ast, {
    ecmaVersion: 2022,
    sourceType: 'script',
    ignoreEval: true,
    optimistic: false,
    nodejsScope: false,
  });
  const globalScope = scopeManager.scopes[0];
  if (globalScope.type !== 'global') {
    throw new Error(`Expected eslint-scope's first scope to be type "global", got "${globalScope.type}".`);
  }

  const toFileLine = (localLine) => contentStartFileLine + (localLine - 1);

  const bindings = globalScope.variables.map((v) => {
    const def = v.defs[0];
    const kind = def ? (def.kind || (def.type === 'FunctionName' ? 'function' : def.type === 'ClassName' ? 'class' : def.type)) : 'unknown';
    const declaredLine = def ? toFileLine(def.name.loc.start.line) : null;
    const references = v.references.map((r) => ({
      line: toFileLine(r.identifier.loc.start.line),
      isWrite: r.isWrite(),
      isRead: r.isRead(),
    }));
    return { name: v.name, kind, declaredLine, references };
  });

  const unresolved = [...new Set(globalScope.through.map((r) => r.identifier.name))].sort();

  return { bindings, unresolved };
}

// ---------------------------------------------------------------------------
// Step 4: inline HTML event-handler catalog (amendment #2)
// ---------------------------------------------------------------------------

const HANDLER_ATTR_RE = /\bon([a-zA-Z]+)\s*=\s*(["'])([\s\S]*?)\2/g;

function extractInlineHandlers(html, offsetToLine, mainScriptRange) {
  const handlers = [];
  let m;
  while ((m = HANDLER_ATTR_RE.exec(html))) {
    const eventName = 'on' + m[1].toLowerCase();
    const value = m[3];
    const attrOffset = m.index;
    const line = offsetToLine(attrOffset);
    const insideMainScript = mainScriptRange && attrOffset >= mainScriptRange.start && attrOffset < mainScriptRange.end;

    const entry = { eventName, line, value, insideMainScript, classification: 'unparsed', calls: [], identifiers: [] };

    try {
      const ast = acorn.parse(value, ACORN_OPTS);
      const body = ast.body;
      if (body.length === 1 && body[0].type === 'ExpressionStatement' && body[0].expression.type === 'CallExpression' && body[0].expression.callee.type === 'Identifier') {
        entry.classification = 'direct-call';
      } else if (body.length === 1 && body[0].type === 'ExpressionStatement' && body[0].expression.type === 'AssignmentExpression') {
        entry.classification = 'assignment';
      } else if (body.length > 1) {
        entry.classification = 'multi-statement';
      } else {
        entry.classification = 'other-expression';
      }

      const calls = [];
      const idents = [];
      acornWalk.simple(ast, {
        CallExpression(node) {
          if (node.callee.type === 'Identifier') calls.push(node.callee.name);
        },
        Identifier(node) {
          idents.push(node.name);
        },
        MemberExpression(node) {
          // do not treat non-computed property names as identifier refs
          if (!node.computed && node.property.type === 'Identifier') {
            const idx = idents.lastIndexOf(node.property.name);
            if (idx !== -1) idents.splice(idx, 1);
          }
        },
      });
      entry.calls = [...new Set(calls)];
      entry.identifiers = [...new Set(idents)];
    } catch {
      // Not parseable as a standalone JS snippet — leave as 'unparsed'.
    }

    handlers.push(entry);
  }
  return handlers;
}

// ---------------------------------------------------------------------------
// Step 5: coupling score / safe extraction order
// ---------------------------------------------------------------------------

function computeCoupling(sections, bindings) {
  const declaredBy = new Map(); // name -> section object
  for (const b of bindings) {
    const s = b.declaredLine != null ? sectionForLine(sections, b.declaredLine) : null;
    if (s) declaredBy.set(b.name, s);
  }

  const outbound = new Map(); // sectionName -> Set(otherSectionName it depends on)
  const inbound = new Map(); // sectionName -> Set(otherSectionName that depends on it)
  for (const s of sections) {
    outbound.set(s.name, new Set());
    inbound.set(s.name, new Set());
  }

  for (const b of bindings) {
    const declSection = declaredBy.get(b.name);
    if (!declSection) continue;
    for (const ref of b.references) {
      const refSection = sectionForLine(sections, ref.line);
      if (!refSection || refSection === declSection) continue;
      outbound.get(refSection.name).add(declSection.name);
      inbound.get(declSection.name).add(refSection.name);
    }
  }

  return sections
    .map((s) => ({
      name: s.name,
      startLine: s.startLine,
      endLine: s.endLine,
      lineCount: s.endLine - s.startLine + 1,
      dependsOn: [...outbound.get(s.name)].sort(),
      dependedOnBy: [...inbound.get(s.name)].sort(),
      couplingScore: outbound.get(s.name).size + inbound.get(s.name).size,
    }))
    .sort((a, b) => a.couplingScore - b.couplingScore || a.startLine - b.startLine);
}

// ---------------------------------------------------------------------------
// Step 6: startup/auth candidate paths (amendment #3) — findings only, no
// runtime code is written here or anywhere else in Phase 0.
// ---------------------------------------------------------------------------

const STARTUP_NAME_RE = /login|logout|restoreSession|checkAuth|onAuth|initApp|startApp|signIn|signOut|showApp|showLogin/i;

function findStartupCandidates(bindings, sections) {
  const candidates = [];
  for (const b of bindings) {
    if (STARTUP_NAME_RE.test(b.name)) {
      const s = b.declaredLine != null ? sectionForLine(sections, b.declaredLine) : null;
      candidates.push({ name: b.name, kind: b.kind, declaredLine: b.declaredLine, section: s ? s.name : null });
    }
  }
  const currentUser = bindings.find((b) => b.name === 'currentUser');
  const currentUserWrites = currentUser
    ? currentUser.references.filter((r) => r.isWrite).map((r) => r.line)
    : [];
  const dashboardCalls = bindings.filter((b) => /^(buildTabs|renderActiveTab|renderDashboard)$/.test(b.name));
  return {
    candidateFunctions: candidates.sort((a, b) => (a.declaredLine ?? 0) - (b.declaredLine ?? 0)),
    currentUserWriteLines: currentUserWrites,
    dashboardEntryPoints: dashboardCalls.map((b) => ({ name: b.name, declaredLine: b.declaredLine })),
  };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  const html = fs.readFileSync(indexPath, 'utf8');
  const lineStarts = buildLineIndex(html);
  const offsetToLine = makeOffsetToLine(lineStarts);

  const scriptTags = findTopLevelTags(html, 'script');
  const styleTags = findTopLevelTags(html, 'style');

  const inlineScripts = scriptTags.filter((t) => !t.src);
  const externalScripts = scriptTags.filter((t) => t.src);

  if (inlineScripts.length === 0) {
    throw new Error('No inline <script> blocks found — expected at least one (the main application script).');
  }

  inlineScripts.sort((a, b) => b.content.length - a.content.length);
  const mainScript = inlineScripts[0];
  const smallScripts = inlineScripts.slice(1);

  const mainScriptStartLine = offsetToLine(mainScript.contentStart);
  const { sections, scriptStartFileLine, scriptEndFileLine } = extractSections(
    mainScript.content,
    mainScriptStartLine,
    offsetToLine,
    mainScript.contentStart
  );

  const { bindings, unresolved } = analyzeGlobalScope(mainScript.content, mainScriptStartLine);

  const mainScriptRange = { start: mainScript.contentStart, end: mainScript.contentEnd };
  const handlers = extractInlineHandlers(html, offsetToLine, mainScriptRange);

  // Attach handler references back onto the bindings they call/touch.
  const bindingByName = new Map(bindings.map((b) => [b.name, b]));
  for (const h of handlers) {
    const names = new Set([...h.calls, ...h.identifiers]);
    for (const name of names) {
      const b = bindingByName.get(name);
      if (b) {
        b.references.push({ line: h.line, isWrite: false, isRead: true, fromInlineHandler: true, event: h.eventName });
      }
    }
  }

  const coupling = computeCoupling(sections, bindings);
  const startupCandidates = findStartupCandidates(bindings, sections);

  const localTestingScripts = smallScripts.filter((s) =>
    /location\.protocol\s*===?\s*['"]file:['"]/i.test(s.content)
  );

  const report = {
    file: 'index.html',
    totalLines: lineStarts.length,
    externalScripts: externalScripts.map((t) => ({ src: t.src, line: offsetToLine(t.openStart) })),
    styleBlocks: styleTags.map((t) => ({
      startLine: offsetToLine(t.contentStart),
      endLine: offsetToLine(t.contentEnd) - 1,
      lineCount: t.content.split('\n').length,
    })),
    smallScripts: smallScripts.map((t) => ({
      startLine: offsetToLine(t.contentStart),
      endLine: offsetToLine(t.contentEnd) - 1,
      lineCount: t.content.split('\n').length,
      localTestingOnly: /location\.protocol\s*===?\s*['"]file:['"]/i.test(t.content),
    })),
    mainScript: { startLine: scriptStartFileLine, endLine: scriptEndFileLine, sectionCount: sections.length },
    sections: sections.map((s) => ({ name: s.name, startLine: s.startLine, endLine: s.endLine, lineCount: s.endLine - s.startLine + 1 })),
    bindings,
    unresolvedGlobals: unresolved,
    handlers,
    coupling,
    startupCandidates,
    localTestingScripts: localTestingScripts.map((t) => offsetToLine(t.contentStart)),
  };

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, renderMarkdown(report));

  console.log(`Sections: ${sections.length}`);
  console.log(`Global bindings: ${bindings.length}`);
  console.log(`Unresolved globals referenced (e.g. firebase/document/window): ${unresolved.length}`);
  console.log(`Inline event handlers: ${handlers.length}`);
  console.log(`Coverage check: PASS (sections exactly tile lines ${scriptStartFileLine}-${scriptEndFileLine})`);
  console.log(`Wrote ${path.relative(repoRoot, outPath)}`);
}

function renderMarkdown(r) {
  const lines = [];
  const p = (s = '') => lines.push(s);

  p('# FleetFlow Legacy `index.html` Map');
  p();
  p('Generated by `scripts/analyze-legacy-app.mjs` (acorn + acorn-walk + eslint-scope — real');
  p('AST/scope resolution, not regex). Deterministic: re-running against unchanged source');
  p('produces an identical file. This document contains no runtime code and describes the');
  p('file as it exists today; it does not itself change any behavior.');
  p();
  p(`- Total file lines: ${r.totalLines}`);
  p(`- Main application script: lines ${r.mainScript.startLine}-${r.mainScript.endLine} (${r.mainScript.sectionCount} banner-delimited sections)`);
  p(`- Section coverage: validated — sections exactly tile lines ${r.mainScript.startLine}-${r.mainScript.endLine} with no gaps or overlaps`);
  p(`- Global bindings resolved: ${r.bindings.length}`);
  p(`- Inline HTML event handlers cataloged: ${r.handlers.length}`);
  p();

  p('## External CDN scripts');
  p();
  p('| Line | src |');
  p('|---|---|');
  for (const s of r.externalScripts) p(`| ${s.line} | \`${s.src}\` |`);
  p();

  p('## Style blocks');
  p();
  p('| Start | End | Lines |');
  p('|---|---|---|');
  for (const s of r.styleBlocks) p(`| ${s.startLine} | ${s.endLine} | ${s.lineCount} |`);
  p();

  p('## Small standalone `<script>` blocks (outside the main application script)');
  p();
  p('| Start | End | Lines | Local-testing only (`file:` protocol gated) |');
  p('|---|---|---|---|');
  for (const s of r.smallScripts) p(`| ${s.startLine} | ${s.endLine} | ${s.lineCount} | ${s.localTestingOnly ? 'YES' : 'no'} |`);
  if (r.localTestingScripts.length) {
    p();
    p('> Blocks flagged local-testing-only are gated behind `location.protocol === \'file:\'` and');
    p('> do not run in production (Netlify serves over `https:`). Same category as the earlier');
    p('> password-bypass finding — real, but should never be mistaken for production auth/startup behavior.');
  }
  p();

  p('## Sections (main script, in file order)');
  p();
  p('| # | Section | Start | End | Lines |');
  p('|---|---|---|---|---|');
  r.sections.forEach((s, i) => p(`| ${i + 1} | ${s.name} | ${s.startLine} | ${s.endLine} | ${s.lineCount} |`));
  p();

  p('## Safe extraction order (lowest coupling first)');
  p();
  p('Coupling score = number of distinct other sections this section depends on, plus number of');
  p('distinct other sections that depend on it (via resolved global-variable read/write references,');
  p('including inline HTML event handlers). Lower is safer to extract first.');
  p();
  p('| Section | Lines | Coupling | Depends on | Depended on by |');
  p('|---|---|---|---|---|');
  for (const c of r.coupling) {
    p(`| ${c.name} | ${c.startLine}-${c.endLine} | ${c.couplingScore} | ${c.dependsOn.join(', ') || '—'} | ${c.dependedOnBy.join(', ') || '—'}`);
  }
  p();

  p('## Global bindings');
  p();
  p('`var`/`function` declarations become `window` properties in a plain (non-module) `<script>`');
  p('tag and stay reachable if later split across multiple `<script src>` files loaded in order.');
  p('**`let`/`const` do NOT** — they are scoped to the single `<script>` tag that declares them and');
  p('become invisible to any other file the moment this script is split, unless explicitly attached');
  p('to a shared object (e.g. `window.X`) or kept together. This applies to `NAV_GROUPS`, `activeTab`,');
  p('`STATE`, `currentUser`, and every other `let`/`const` binding below — each is a concrete blocker');
  p('for whichever Phase 3 split first tries to separate its declaring section from its readers.');
  p();
  p('| Name | Kind | Declared line | Declaring section | Refs | Reads | Writes | Read from inline handler |');
  p('|---|---|---|---|---|---|---|---|');
  for (const b of r.bindings.slice().sort((a, b2) => (a.declaredLine ?? 0) - (b2.declaredLine ?? 0))) {
    const reads = b.references.filter((x) => x.isRead).length;
    const writes = b.references.filter((x) => x.isWrite).length;
    const fromHandler = b.references.some((x) => x.fromInlineHandler);
    const section = sectionNameForLine(r.sections, b.declaredLine);
    p(`| \`${b.name}\` | ${b.kind} | ${b.declaredLine ?? '—'} | ${section} | ${b.references.length} | ${reads} | ${writes} | ${fromHandler ? 'yes' : 'no'} |`);
  }
  p();

  if (r.unresolvedGlobals.length) {
    p('## Unresolved identifiers (not declared anywhere in the main script)');
    p();
    p('External globals referenced but not declared here — e.g. `firebase`, `document`, `window`,');
    p('browser APIs, or CDN-provided names. Not a problem by itself; listed for completeness.');
    p();
    p(r.unresolvedGlobals.map((n) => `\`${n}\``).join(', '));
    p();
  }

  p('## Inline HTML event handlers');
  p();
  p(`Found ${r.handlers.length} total. Classification distinguishes a direct function call`);
  p('(`toggleNavGroup(\'command\')`) from an assignment, a multi-statement handler, or anything');
  p('that did not parse as a standalone JS snippet.');
  p();
  const byEvent = {};
  for (const h of r.handlers) byEvent[h.eventName] = (byEvent[h.eventName] || 0) + 1;
  p('| Event | Count |');
  p('|---|---|');
  for (const [ev, count] of Object.entries(byEvent).sort((a, b) => b[1] - a[1])) p(`| ${ev} | ${count} |`);
  p();
  const byClass = {};
  for (const h of r.handlers) byClass[h.classification] = (byClass[h.classification] || 0) + 1;
  p('| Classification | Count |');
  p('|---|---|');
  for (const [c, count] of Object.entries(byClass).sort((a, b) => b[1] - a[1])) p(`| ${c} | ${count} |`);
  p();
  p('Sample (first 15, by file line):');
  p();
  p('| Line | Event | Classification | Calls | In main-script-generated markup |');
  p('|---|---|---|---|---|');
  for (const h of r.handlers.slice(0, 15)) {
    p(`| ${h.line} | ${h.eventName} | ${h.classification} | ${h.calls.join(', ') || '—'} | ${h.insideMainScript ? 'yes (built at render time)' : 'no (static HTML)'} |`);
  }
  p();

  p('## Phase 2 `fleetflow:ready` candidate dispatch points');
  p();
  p('Findings only — **no runtime code is added in Phase 0.** These are the identifiers most');
  p('likely to mark "authentication resolved + dashboard ready" across the different startup');
  p('paths (fresh login, restored session, role-specific render, logout/login cycle, local testing).');
  p('Phase 2 planning should trace all of these before choosing the exact-once guarded dispatch site.');
  p();
  p('Auth/startup-named bindings:');
  p();
  p('| Name | Kind | Declared line | Section |');
  p('|---|---|---|---|');
  for (const c of r.startupCandidates.candidateFunctions) {
    p(`| \`${c.name}\` | ${c.kind} | ${c.declaredLine ?? '—'} | ${c.section ?? '—'} |`);
  }
  p();
  p(`\`currentUser\` write sites (candidate "auth resolved" points): lines ${r.startupCandidates.currentUserWriteLines.join(', ') || 'none found'}`);
  p();
  p('Dashboard/nav entry points (candidate "app rendered" points):');
  p();
  for (const d of r.startupCandidates.dashboardEntryPoints) p(`- \`${d.name}\` declared at line ${d.declaredLine}`);
  p();

  return lines.join('\n') + '\n';
}

function sectionNameForLine(sections, line) {
  if (line == null) return '—';
  for (const s of sections) if (line >= s.startLine && line <= s.endLine) return s.name;
  return '—';
}

main();
