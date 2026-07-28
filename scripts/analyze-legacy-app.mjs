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

  const toFileLine = (localLine) => contentStartFileLine + (localLine - 1);

  // Not every "// ====" border line marks a real section boundary — some are
  // used as one-off decorative dividers between functions *inside* a
  // section, with no matching close border and real code right after them
  // (e.g. file line 16615, directly above `function openNewJobModal`). A
  // border only opens a genuine banner if every line between it and the
  // next border is itself blank or a comment — i.e. an actual title, not
  // code. Anything else is a solo divider: skip it, don't start a section.
  const decorativeDividers = [];
  const sections = [];
  let i = 0;
  while (i < borderLineNumbers.length) {
    const openLocal = borderLineNumbers[i];
    const closeLocal = i + 1 < borderLineNumbers.length ? borderLineNumbers[i + 1] : null;
    const between = closeLocal ? lines.slice(openLocal, closeLocal - 1) : [];
    const isRealPair = closeLocal !== null && between.length > 0 && between.every((l) => l.trim() === '' || /^\s*\/\//.test(l));

    if (isRealPair) {
      const titleLines = between.map((l) => l.replace(/^\s*\/\/\s?/, '').trim()).filter(Boolean);
      sections.push({
        name: titleLines.join(' — ') || `(untitled section at line ${toFileLine(openLocal)})`,
        bannerStartLocal: openLocal,
        bannerEndLocal: closeLocal,
        contentStartLocal: closeLocal + 1,
      });
      i += 2;
    } else {
      decorativeDividers.push(toFileLine(openLocal));
      i += 1;
    }
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

  return { sections: allSections, coverageOk: true, scriptStartFileLine, scriptEndFileLine, decorativeDividers };
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

  return { bindings, unresolved, ast };
}

// ---------------------------------------------------------------------------
// Step 3b: Firestore collection + Firebase Storage path inventory
//
// Both are addressed by string/template expressions rather than any declared
// schema, so the only way to know what the app actually touches is to read the
// call sites. Collection names arrive either as literals or as COL_* constants;
// Storage paths are usually template literals or a local built just above the
// call, so the raw argument source is reported verbatim rather than guessed at.
// ---------------------------------------------------------------------------

function inventoryFirebaseUsage(ast, scriptContent, contentStartFileLine) {
  const toFileLine = (localLine) => contentStartFileLine + (localLine - 1);
  const src = (node) => scriptContent.slice(node.start, node.end);

  // Top-level `const NAME = 'literal'` map, so COL_JOBS resolves to 'ff_jobs'.
  const stringConsts = new Map();
  for (const node of ast.body) {
    if (node.type !== 'VariableDeclaration') continue;
    for (const d of node.declarations) {
      if (d.id.type === 'Identifier' && d.init && d.init.type === 'Literal' && typeof d.init.value === 'string') {
        stringConsts.set(d.id.name, d.init.value);
      }
    }
  }

  // `storage.ref(path)` usually receives a local built a few lines earlier, so
  // index every assignment in the file and resolve the argument back to the
  // nearest preceding one. Reporting the bare identifier would inventory
  // nothing.
  const assignments = new Map(); // name -> [{ line, source }]
  const noteAssignment = (name, node) => {
    if (!assignments.has(name)) assignments.set(name, []);
    assignments.get(name).push({ line: node.loc.start.line, source: src(node) });
  };
  acornWalk.simple(ast, {
    VariableDeclarator(node) {
      if (node.id.type === 'Identifier' && node.init) noteAssignment(node.id.name, node.init);
    },
    AssignmentExpression(node) {
      if (node.left.type === 'Identifier') noteAssignment(node.left.name, node.right);
    },
  });
  const resolveIdentifier = (name, useLocalLine) => {
    const candidates = (assignments.get(name) || []).filter((a) => a.line <= useLocalLine);
    if (!candidates.length) return null;
    return candidates.reduce((best, a) => (a.line > best.line ? a : best));
  };

  const collections = new Map(); // resolved name -> { name, via:Set, lines:[] }
  const storagePaths = [];

  const noteCollection = (name, via, line) => {
    if (!collections.has(name)) collections.set(name, { name, via: new Set(), lines: [] });
    const entry = collections.get(name);
    entry.via.add(via);
    entry.lines.push(line);
  };

  acornWalk.simple(ast, {
    CallExpression(node) {
      const callee = node.callee;
      if (callee.type !== 'MemberExpression' || callee.computed || callee.property.type !== 'Identifier') return;
      const method = callee.property.name;
      const arg = node.arguments[0];
      const line = toFileLine(node.loc.start.line);

      if (method === 'collection' && arg) {
        if (arg.type === 'Literal' && typeof arg.value === 'string') {
          noteCollection(arg.value, `literal '${arg.value}'`, line);
        } else if (arg.type === 'Identifier') {
          const resolved = stringConsts.get(arg.name);
          noteCollection(resolved ?? `(unresolved: ${arg.name})`, arg.name, line);
        } else {
          noteCollection(`(dynamic: ${src(arg)})`, 'dynamic expression', line);
        }
      }

      if ((method === 'ref' || method === 'refFromURL') && callee.object.type === 'Identifier' && /storage/i.test(callee.object.name)) {
        let argument = arg ? src(arg) : '(no argument)';
        let resolvedFrom = '';
        if (arg && arg.type === 'Identifier') {
          const assigned = resolveIdentifier(arg.name, node.loc.start.line);
          if (assigned) {
            argument = assigned.source;
            resolvedFrom = `${arg.name} assigned at line ${toFileLine(assigned.line)}`;
          }
        }
        storagePaths.push({ line, method, argument, resolvedFrom });
      }
    },
  });

  return {
    collections: [...collections.values()]
      .map((c) => ({ name: c.name, via: [...c.via].sort().join(', '), useCount: c.lines.length, firstLine: Math.min(...c.lines) }))
      .sort((a, b) => a.name.localeCompare(b.name)),
    storagePaths: storagePaths.sort((a, b) => a.line - b.line),
  };
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

// ---------------------------------------------------------------------------
// Reachability: split bindings into "something reads this" vs "nothing does".
//
// A binding is only a CANDIDATE orphan, never a confirmed one. The inline
// handler scanner cannot credit references from handlers assembled by string
// concatenation (`'...onclick="openBOL(\'' + job.id + '\')"...'`) — those land
// in the "unparsed" handler bucket, so a function reachable only that way looks
// unreferenced here. Verdicts are recorded by hand in the review file, never
// inferred by this tool.
// ---------------------------------------------------------------------------

const ORPHAN_REVIEW_FILE = 'docs/legacy-orphan-review.json';
const VALID_REVIEW_STATUSES = ['unreviewed', 'false positive', 'confirmed orphan'];

function loadOrphanReview(repoRootDir) {
  const p = path.join(repoRootDir, ORPHAN_REVIEW_FILE);
  if (!fs.existsSync(p)) return {};
  const parsed = JSON.parse(fs.readFileSync(p, 'utf8'));
  for (const [name, entry] of Object.entries(parsed)) {
    if (!entry || !VALID_REVIEW_STATUSES.includes(entry.status)) {
      throw new Error(
        `${ORPHAN_REVIEW_FILE}: "${name}" has status ${JSON.stringify(entry?.status)}; ` +
        `expected one of ${VALID_REVIEW_STATUSES.map((s) => JSON.stringify(s)).join(', ')}.`
      );
    }
  }
  return parsed;
}

function bindingType(kind) {
  if (kind === 'function') return 'function';
  if (kind === 'const') return 'constant';
  if (kind === 'class' || kind === 'ClassName') return 'class';
  if (kind === 'let' || kind === 'var') return 'variable';
  return kind;
}

function classifyBindingReachability(bindings, sections, review = {}, unparsedHandlers = []) {
  // The unparsed fragments are the known blind spot, so check them directly
  // instead of leaving every candidate to a manual read. A name followed by
  // "(" inside a fragment is a call the reference graph could not credit.
  const reachableViaUnparsed = (name) => {
    const callRe = new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\(`);
    return unparsedHandlers.filter((h) => callRe.test(h.value)).map((h) => h.line);
  };

  const rows = bindings.map((b) => {
    const reads = b.references.filter((r) => r.isRead && !r.fromInlineHandler).length;
    const writes = b.references.filter((r) => r.isWrite).length;
    const handlerRefs = b.references.filter((r) => r.fromInlineHandler).length;
    const unreferenced = reads === 0 && handlerRefs === 0;
    const unparsedCalls = unreferenced ? reachableViaUnparsed(b.name) : [];
    return {
      name: b.name,
      declaredLine: b.declaredLine,
      type: bindingType(b.kind),
      section: sectionNameForLine(sections, b.declaredLine),
      reads,
      writes,
      handlerRefs,
      unparsedCalls,
      // Nothing reads it in JS, no parseable handler names it, and no unparsed
      // handler fragment appears to call it either.
      isCandidate: unreferenced && unparsedCalls.length === 0,
      isLikelyReachable: unreferenced && unparsedCalls.length > 0,
      reviewStatus: review[b.name]?.status || 'unreviewed',
      reviewNote: review[b.name]?.note || '',
    };
  });

  const byLine = (a, b) => (a.declaredLine ?? 0) - (b.declaredLine ?? 0);
  return {
    candidates: rows.filter((r) => r.isCandidate).sort(byLine),
    likelyReachable: rows.filter((r) => r.isLikelyReachable).sort(byLine),
    // Named for what it proves: at least one inbound reference exists. That is
    // NOT the same as "live" — see the reachability caveat in the report.
    inboundReferenced: rows.filter((r) => !r.isCandidate && !r.isLikelyReachable).sort(byLine),
    reviewedCount: rows.filter((r) => r.isCandidate && r.reviewStatus !== 'unreviewed').length,
  };
}

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
  const { sections, scriptStartFileLine, scriptEndFileLine, decorativeDividers } = extractSections(
    mainScript.content,
    mainScriptStartLine,
    offsetToLine,
    mainScript.contentStart
  );

  const { bindings, unresolved, ast: mainAst } = analyzeGlobalScope(mainScript.content, mainScriptStartLine);
  const firebaseUsage = inventoryFirebaseUsage(mainAst, mainScript.content, mainScriptStartLine);

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
  const orphans = classifyBindingReachability(
    bindings,
    sections,
    loadOrphanReview(repoRoot),
    handlers.filter((h) => h.classification === 'unparsed')
  );

  const localTestingScripts = smallScripts.filter((s) =>
    /location\.protocol\s*===?\s*['"]file:['"]/i.test(s.content)
  );

  // Dynamic dispatch would let a binding be called by a name assembled at
  // runtime, invisible to both the reference graph and the handler scan. Track
  // it so the orphan queue's confidence is asserted by the tool, not by a
  // one-off manual check that silently rots.
  const dynamicDispatch = {
    windowIndex: (mainScript.content.match(/window\s*\[/g) || []).length,
    evalCalls: (mainScript.content.match(/\beval\s*\(/g) || []).length,
    newFunction: (mainScript.content.match(/new\s+Function\s*\(/g) || []).length,
  };

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
    decorativeDividers,
    sections: sections.map((s) => ({ name: s.name, startLine: s.startLine, endLine: s.endLine, lineCount: s.endLine - s.startLine + 1 })),
    bindings,
    unresolvedGlobals: unresolved,
    handlers,
    coupling,
    startupCandidates,
    orphans,
    firebaseUsage,
    dynamicDispatch,
    localTestingScripts: localTestingScripts.map((t) => offsetToLine(t.contentStart)),
  };

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, renderMarkdown(report));

  console.log(`Sections: ${sections.length}`);
  console.log(`Decorative dividers (solo "// ====" lines, not section boundaries): ${decorativeDividers.length}${decorativeDividers.length ? ' at lines ' + decorativeDividers.join(', ') : ''}`);
  console.log(`Global bindings: ${bindings.length}`);
  console.log(`Unresolved globals referenced (e.g. firebase/document/window): ${unresolved.length}`);
  console.log(`Inline event handlers: ${handlers.length} (${handlers.filter((h) => h.classification === 'unparsed').length} unparsed — their refs are not credited)`);
  console.log(`Zero-reference candidates: ${orphans.candidates.length} (${orphans.reviewedCount} reviewed) — candidates only, verification required`);
  console.log(`Auto-cleared as reachable via unparsed handlers: ${orphans.likelyReachable.length}`);
  console.log(`Firestore collections: ${firebaseUsage.collections.length} · Storage call sites: ${firebaseUsage.storagePaths.length}`);
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
  if (r.decorativeDividers.length) {
    p(`- Decorative dividers: ${r.decorativeDividers.length} solo "// ====" line(s) at ${r.decorativeDividers.join(', ')} — these are one-off separators between functions *inside* a section (no matching close border, real code immediately follows), not section boundaries. They are excluded from the section list below rather than misread as banners.`);
  }
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
    p(`| ${c.name} | ${c.startLine}-${c.endLine} | ${c.couplingScore} | ${c.dependsOn.join(', ') || '—'} | ${c.dependedOnBy.join(', ') || '—'} |`);
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

  p('## Unparsed handler dependencies');
  p();
  p('These inline handlers did not parse as standalone JavaScript — almost always because');
  p('the attribute value is assembled by string concatenation, so the captured text is a');
  p('fragment rather than an expression. **Their references are not credited to any binding.**');
  p('That makes them the specific reason a zero-reference result below is a *candidate* and');
  p('not a verdict: a function reachable only through one of these looks unreferenced.');
  p();
  const unparsed = r.handlers.filter((h) => h.classification === 'unparsed');
  p(`Count: ${unparsed.length} of ${r.handlers.length} handlers.`);
  p();
  if (unparsed.length) {
    p('| Line | Event | Captured fragment |');
    p('|---|---|---|');
    for (const h of unparsed) {
      p(`| ${h.line} | ${h.eventName} | ${codeSpan(h.value.slice(0, 120))} |`);
    }
    p();
  }

  p('## Reference summary');
  p();
  p('Every global binding falls into exactly one of three buckets. The first is the healthy');
  p('majority and is not re-listed here — the **Global bindings** table above already carries');
  p('each one with its read/write counts and handler status. The other two are enumerated below.');
  p();
  p('| Bucket | Count | What this proves |');
  p('|---|---|---|');
  p(`| Inbound-referenced bindings | ${r.orphans.inboundReferenced.length} | At least one inbound reference exists — something reads it, or a parseable inline handler names it. |`);
  p(`| Handler-linked candidates | ${r.orphans.likelyReachable.length} | No credited reference, but an unparsed handler fragment appears to call it. Auto-cleared; confirm the call site. |`);
  p(`| Zero-reference candidates | ${r.orphans.candidates.length} | No inbound reference found by any check this tool performs. Needs a human verdict. |`);
  p(`| **Total** | **${r.orphans.inboundReferenced.length + r.orphans.likelyReachable.length + r.orphans.candidates.length}** | |`);
  p();
  p('> **These are reference counts, not reachability.** "Inbound-referenced" means something');
  p('> points at the binding — it does **not** prove the application can reach it. Local reference');
  p('> counting cannot see orphan *islands*: three functions that only call each other, with no');
  p('> path in from any entry point, each show an inbound reference and land in the first bucket.');
  p('> This analysis reliably finds orphan **leaves** only. Treat the first number as an upper');
  p('> bound on live code, not a count of it.');
  p('>');
  p('> Closing that gap needs mark-and-sweep from real roots (inline handlers, top-level');
  p('> statements, `addEventListener` registrations), which would replace these buckets with');
  p('> *reachable from application roots* / *unreachable islands* / *zero-reference leaves*.');
  p('> Not implemented here.');
  p();

  p('## Likely reachable via unparsed handler (auto-cleared, not orphans)');
  p();
  p('These have no credited reference, but their name appears as a call inside one of the');
  p('unparsed handler fragments above — so they *are* reachable and the reference graph simply');
  p('could not see it. Listed separately rather than deleted from the queue, because the match');
  p('is textual: confirm the call site before relying on it.');
  p();
  if (r.orphans.likelyReachable.length) {
    p('| Binding | Line | Type | Called from handler at line(s) |');
    p('|---|---|---|---|');
    for (const c of r.orphans.likelyReachable) {
      p(`| \`${c.name}\` | ${c.declaredLine ?? '—'} | ${c.type} | ${c.unparsedCalls.join(', ')} |`);
    }
  } else {
    p('_None._');
  }
  p();

  p('## Zero-reference bindings (candidates — verification required)');
  p();
  p('Bindings that nothing reads in JavaScript, that no *parseable* inline handler names, and');
  p('that no unparsed handler fragment appears to call.');
  p('**This is a review queue, not a delete list.** Confirm each before acting.');
  p();
  const dd = r.dynamicDispatch;
  const ddClean = dd.windowIndex === 0 && dd.evalCalls === 0 && dd.newFunction === 0;
  p('Dynamic-dispatch scan (the remaining way a binding could be reached invisibly): ' +
    `\`window[...]\` ${dd.windowIndex}, \`eval(\` ${dd.evalCalls}, \`new Function(\` ${dd.newFunction}.` +
    (ddClean
      ? ' **All zero** — no runtime-assembled call sites in the main script, so the list below is not hiding that class of reference.'
      : ' **Non-zero — names may be assembled at runtime, so treat this list with extra caution.**'));
  p();
  p('Still unchecked by this tool: references from the other `<script>` blocks, and code that');
  p('is deliberately dormant rather than dead.');
  p();
  p('Verdicts are recorded by hand in `docs/legacy-orphan-review.json` (keyed by binding name,');
  p('`status` one of `unreviewed` / `false positive` / `confirmed orphan`, optional `note`), so');
  p('they survive regeneration of this document. Nothing in this repository deletes a candidate.');
  p();
  p(`Candidates: **${r.orphans.candidates.length}** · reviewed so far: ${r.orphans.reviewedCount} · inbound-referenced elsewhere: ${r.orphans.inboundReferenced.length}`);
  p();
  p('| Binding | Line | Type | Section | Reads | Writes | Handler refs | Verification |');
  p('|---|---|---|---|---|---|---|---|');
  for (const c of r.orphans.candidates) {
    p(`| \`${c.name}\` | ${c.declaredLine ?? '—'} | ${c.type} | ${c.section} | ${c.reads} | ${c.writes} | ${c.handlerRefs} | ${c.reviewStatus}${c.reviewNote ? ' — ' + c.reviewNote : ''} |`);
  }
  p();

  p('## Firestore collections');
  p();
  p('Every `.collection(...)` call site in the main script. `COL_*` constants are resolved to');
  p('their literal value; anything not statically resolvable is reported as-is rather than guessed.');
  p();
  p('| Collection | Referenced via | Call sites | First line |');
  p('|---|---|---|---|');
  for (const c of r.firebaseUsage.collections) {
    p(`| \`${c.name}\` | ${c.via} | ${c.useCount} | ${c.firstLine} |`);
  }
  p();

  p('## Firebase Storage paths');
  p();
  p('Every `storage.ref(...)` / `storage.refFromURL(...)` call site, with the path argument');
  p('reproduced verbatim from source — these are template literals or locals built at the call,');
  p('so the literal expression is more honest than an interpolated guess.');
  p();
  p('| Line | Method | Path argument (source) | Resolved from |');
  p('|---|---|---|---|');
  for (const s of r.firebaseUsage.storagePaths) {
    p(`| ${s.line} | \`${s.method}\` | ${codeSpan(s.argument)} | ${s.resolvedFrom || '—'} |`);
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

// Inline code span for arbitrary source text. Template literals and
// concatenated handler fragments contain backticks and pipes, both of which
// break a naive `...` wrap inside a table cell.
function codeSpan(text) {
  const flat = String(text).replace(/\s+/g, ' ').trim().replace(/\|/g, '\\|');
  const longestRun = (flat.match(/`+/g) || []).reduce((n, run) => Math.max(n, run.length), 0);
  const fence = '`'.repeat(longestRun + 1);
  const pad = flat.startsWith('`') || flat.endsWith('`') ? ' ' : '';
  return `${fence}${pad}${flat}${pad}${fence}`;
}

function sectionNameForLine(sections, line) {
  if (line == null) return '—';
  for (const s of sections) if (line >= s.startLine && line <= s.endLine) return s.name;
  return '—';
}

main();
