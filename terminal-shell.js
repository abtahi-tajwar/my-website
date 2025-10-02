// terminal-shell.js
// Interactive shell with Tab-completion + fuzzy matching.
// Commands: /help, /ls, /cd <key>, /cat <name|index|N.txt>

const DEFAULTS = {
  userHost: "abtahi@portfolio",
  dataUrl: "./data.json",
  welcomeHint: "Type /help. Press <Tab> for autocomplete.",
};

let $terminalBody;
let $activeInput;
let DATA = {};
let PATH = [];     // breadcrumbs into DATA
let HISTORY = [];
let HISTORY_I = -1;

// --- Utilities --------------------------------------------------------------

function byId(id){ return document.getElementById(id); }
function esc(str){ return String(str).replace(/[&<>"']/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[s])); }
function autoScroll(){ $terminalBody.scrollTop = $terminalBody.scrollHeight; }
function isNonEmptyString(x){ return typeof x === "string" && x.trim().length > 0; }
function normalizeName(s){ return String(s).trim().toLowerCase(); }
function isArrayOfStrings(arr){ return Array.isArray(arr) && arr.length > 0 && arr.every((x) => typeof x === "string"); }
function unique(arr){ return Array.from(new Set(arr)); }

// --- Smart name heuristics (arrays of objects) ------------------------------

const PREFERRED_KEYS = [
  "name", "title", "institution", "company", "organization", "org",
  "school", "degree", "role", "position", "project", "label", "filename", "file"
];
const SECONDARY_REGEX = /(name|title|company|institution|school|org|project|position|role)/i;

function bestDisplayKey(obj){
  if (!obj || typeof obj !== "object") return null;
  for (const k of PREFERRED_KEYS) {
    if (k in obj && isNonEmptyString(obj[k])) return k;
  }
  for (const k of Object.keys(obj)) {
    if (SECONDARY_REGEX.test(k) && isNonEmptyString(obj[k])) return k;
  }
  for (const k of Object.keys(obj)) {
    if (isNonEmptyString(obj[k])) return k;
  }
  for (const k of ["id", "slug", "key"]) {
    if (k in obj && obj[k] != null) return k;
  }
  return null;
}
function bestDisplayName(obj, idx){
  if (obj == null || typeof obj !== "object") return `${idx+1}.txt`;
  const k = bestDisplayKey(obj);
  if (k) return String(obj[k]);
  return `${idx+1}.txt`;
}

// --- Filenames for array-of-strings ----------------------------------------

function filenameFromString(s, idx){
  let base = String(s ?? "").trim();
  if (!base) return `${idx+1}.txt`;
  return base.replace(/[\/\\]/g, "-");
}

// --- Path / node helpers ----------------------------------------------------

function getNodeAtPath() {
  let node = DATA;
  for (const seg of PATH) {
    if (seg.t === 'obj') node = node?.[seg.key];
    else if (seg.t === 'arr') node = Array.isArray(node) ? node[seg.idx] : undefined;
  }
  return node;
}
function currentPathText() {
  if (PATH.length === 0) return "~";
  const parts = [];
  let node = DATA;
  for (const seg of PATH) {
    if (seg.t === 'obj') {
      parts.push(seg.key);
      node = node?.[seg.key];
    } else {
      const label = (typeof seg.name === 'string' && seg.name) ? seg.name : `${seg.idx+1}.txt`;
      parts.push(label);
      if (Array.isArray(node)) node = node[seg.idx];
    }
  }
  return "~/" + parts.join("/");
}

// --- Candidate lists for autocomplete / fuzzy -------------------------------

function getCandidatesForCurrentLocation(action /* 'cd' | 'cat' | 'ls' */) {
  const node = getNodeAtPath();
  const list = [];

  if (node && typeof node === "object" && !Array.isArray(node)) {
    // object: keys
    for (const k of Object.keys(node)) {
      const v = node[k];
      const isDir = v && typeof v === "object";
      if (action === "cd") {
        if (isDir) list.push(k); // only directories for cd
      } else {
        // ls & cat can show everything
        list.push(isDir ? `${k}/` : k);
      }
    }
    return unique(list).sort();
  }

  if (Array.isArray(node)) {
    if (isArrayOfStrings(node)) {
      // strings behave as files
      node.forEach((s, i) => list.push(filenameFromString(s, i)));
      return unique(list).sort();
    }
    // array of objects
    node.forEach((v, i) => list.push(bestDisplayName(v, i)));
    return unique(list).sort();
  }

  return list;
}

// naive but effective fuzzy scoring: higher is better
function fuzzyScore(candidate, input) {
  const c = normalizeName(candidate);
  const q = normalizeName(input);
  if (!q) return 0;
  if (c === q) return 1000;
  if (c.startsWith(q)) return 800;
  if (c.includes(q)) return 600;

  // subsequence score
  let i = 0, j = 0, hits = 0;
  while (i < c.length && j < q.length) {
    if (c[i] === q[j]) { hits++; j++; }
    i++;
  }
  return hits > 0 ? 400 + hits : 0;
}

function fuzzyFilter(candidates, input) {
  const scored = candidates
    .map(name => ({ name, score: fuzzyScore(name.replace(/\/$/,''), input) }))
    .filter(x => x.score > 0)
    .sort((a,b) => b.score - a.score || a.name.localeCompare(b.name));
  return scored.map(x => x.name);
}

function commonPrefix(strings) {
  if (!strings.length) return "";
  let prefix = strings[0];
  for (let i=1;i<strings.length;i++){
    while (strings[i].toLowerCase().indexOf(prefix.toLowerCase()) !== 0) {
      prefix = prefix.slice(0, -1);
      if (!prefix) return "";
    }
  }
  return prefix;
}

// --- Printing ---------------------------------------------------------------

function printLine(text, klass = "terminal-output") {
  const line = document.createElement("div");
  line.className = `terminal-line ${klass}`;
  line.innerHTML = esc(text);
  $terminalBody.appendChild(line);
  autoScroll();
}
function printJSON(value) {
  const pre = document.createElement("pre");
  pre.className = "terminal-line terminal-output";
  pre.style.whiteSpace = "pre-wrap";
  pre.textContent = typeof value === "string" ? value : JSON.stringify(value, null, 2);
  $terminalBody.appendChild(pre);
  autoScroll();
}
function printPrompt() {
  const wrap = document.createElement("div");
  wrap.className = "terminal-line terminal-command";
  wrap.innerHTML = `<span class="prompt-label">${esc(DEFAULTS.userHost)}:${esc(currentPathText())}$ </span>`;
  const input = document.createElement("input");
  input.type = "text";
  input.className = "terminal-input";
  input.autocomplete = "off";
  input.spellcheck = false;
  input.setAttribute("aria-label", "terminal input");
  wrap.appendChild(input);
  $terminalBody.appendChild(wrap);
  $activeInput = input;
  input.focus();

  // Tab-completion state
  let lastTabMatches = [];
  let lastTabIndex = -1;

  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      const cmd = input.value.trim();
      lockLineAndExec(wrap, cmd);
    } else if (e.key === "ArrowUp") {
      if (HISTORY.length) {
        if (HISTORY_I < 0) HISTORY_I = HISTORY.length - 1;
        else HISTORY_I = Math.max(0, HISTORY_I - 1);
        input.value = HISTORY[HISTORY_I];
        setCaretToEnd(input);
        e.preventDefault();
      }
    } else if (e.key === "ArrowDown") {
      if (HISTORY.length) {
        if (HISTORY_I >= 0) HISTORY_I = Math.min(HISTORY.length - 1, HISTORY_I + 1);
        input.value = HISTORY_I >= 0 ? HISTORY[HISTORY_I] : "";
        setCaretToEnd(input);
        e.preventDefault();
      }
    } else if (e.key === "Tab") {
      e.preventDefault();
      const { verb, argStartIndex, arg } = parseVerbAndArg(input.value);
      const action = (verb === "cd") ? "cd" : (verb === "cat" ? "cat" : "ls");
      const candidates = getCandidatesForCurrentLocation(action).map(x => x.replace(/\/$/,''));
      const matches = arg ? fuzzyFilter(candidates, arg) : candidates;

      if (!matches.length) {
        // nothing to complete
        return;
      }

      // If we have previous matches and user keeps tabbing, cycle through
      if (lastTabMatches.length && arraysEqual(lastTabMatches, matches)) {
        // cycle
        lastTabIndex = e.shiftKey
          ? (lastTabIndex - 1 + matches.length) % matches.length
          : (lastTabIndex + 1) % matches.length;
        input.value = buildCompletedCommand(input.value, argStartIndex, matches[lastTabIndex]);
        setCaretToEnd(input);
        return;
      }

      lastTabMatches = matches;
      lastTabIndex = -1;

      if (matches.length === 1) {
        // single match: complete
        input.value = buildCompletedCommand(input.value, argStartIndex, matches[0]);
        setCaretToEnd(input);
      } else {
        // multiple: try extend to common prefix
        const pref = commonPrefix(matches);
        if (pref && pref.length > (arg ?? "").length) {
          input.value = buildCompletedCommand(input.value, argStartIndex, pref);
          setCaretToEnd(input);
        } else {
          // show the set of matches, then keep the prompt active
          printLine(matches.join("  "));
          lastTabIndex = -1; // next Tab will start cycling
        }
      }
    }
  });

  wrap.addEventListener("click", () => input.focus());
  autoScroll();
}

function arraysEqual(a,b){
  if (a.length !== b.length) return false;
  for (let i=0;i<a.length;i++){ if (a[i]!==b[i]) return false; }
  return true;
}
function setCaretToEnd(input){
  setTimeout(() => input.setSelectionRange(input.value.length, input.value.length), 0);
}

// Parse "/cd foo bar" -> {verb:'cd', argStartIndex: 4, arg:'foo bar'}
// Parse "/cat pro"    -> {verb:'cat', argStartIndex: 5, arg:'pro'}
function parseVerbAndArg(raw){
  let str = raw.trim().replace(/^\//,"");
  const parts = str.split(/\s+/);
  const verb = (parts[0] || "").toLowerCase();
  const verbIndex = str.indexOf(parts[0] || "");
  const argStartIndex = verbIndex >= 0 ? verbIndex + (parts[0]?.length || 0) + 1 : 0;
  const arg = str.slice(argStartIndex).trim();
  return { verb, argStartIndex, arg };
}

function buildCompletedCommand(raw, argStartIndex, completion){
  const prefix = raw.trim().replace(/^\//,"").slice(0, argStartIndex).trimEnd();
  return `/${prefix} ${completion}`.trim();
}

function lockLineAndExec(wrap, cmd) {
  const label = wrap.querySelector(".prompt-label");
  wrap.innerHTML = `${label ? label.outerHTML : ""}${esc(cmd)}`;
  wrap.classList.add("terminal-locked");
  HISTORY.push(cmd);
  HISTORY_I = -1;

  execCommand(cmd).finally(() => {
    printPrompt();
  });
}

// --- Command exec -----------------------------------------------------------

async function execCommand(raw) {
  const cmd = raw.replace(/^\//, ""); // accept both "/ls" and "ls"
  const [name, ...rest] = cmd.split(/\s+/);
  const arg = rest.join(" ").trim();

  switch ((name || "").toLowerCase()) {
    case "help":
      printLine("Available commands:", "terminal-success");
      printLine("/help — Show this help");
      printLine("/ls — List directory");
      printLine("/cd <key|..|/> — Enter folder (supports fuzzy matching & Tab completion)");
      printLine("/cat <key|name|index|N.txt> — Show file/object (supports fuzzy matching & Tab)");
      printLine("Tips: Use Tab to autocomplete. Shift+Tab to cycle backward.");
      break;

    case "ls":
      ls();
      break;

    case "cd":
      cd(arg);
      break;

    case "cat":
      cat(arg);
      break;

    case "clear":
      $terminalBody.innerHTML = "";
      break;

    case "":
      // no-op
      break;

    default:
      printLine(`Command not found: ${esc(name)} (try /help)`, "terminal-error");
  }
}

// --- Implementations --------------------------------------------------------

function ls() {
  const node = getNodeAtPath();
  if (node === null || node === undefined) {
    printLine("Not found.", "terminal-error");
    return;
  }

  if (typeof node === "object" && !Array.isArray(node)) {
    const keys = Object.keys(node);
    if (!keys.length) return printLine("(empty)");
    for (const k of keys) {
      const v = node[k];
      const isDir = v && typeof v === "object";
      printLine(isDir ? `${k}/` : k, isDir ? "terminal-success" : "terminal-output");
    }
    return;
  }

  if (Array.isArray(node)) {
    if (!node.length) return printLine("(empty)");
    if (isArrayOfStrings(node)) {
      node.forEach((s, i) => printLine(filenameFromString(s, i), "terminal-output"));
      return;
    }
    node.forEach((_, i) => printLine(bestDisplayName(node[i], i), "terminal-output"));
    return;
  }

  printLine(String(node));
}

function cd(arg) {
  if (!arg) return printLine("Usage: /cd <key|..|/>", "terminal-error");
  if (arg === "/" || arg === "~") { PATH = []; return; }
  if (arg === "..") { if (PATH.length) PATH.pop(); return; }

  const node = getNodeAtPath();

  if (node && typeof node === "object" && !Array.isArray(node)) {
    const keys = Object.keys(node);
    let key = null;

    // Exact first
    if (arg in node) key = arg;
    else {
      // Fuzzy over keys (directories only)
      const dirKeys = keys.filter(k => node[k] && typeof node[k] === "object");
      const matches = fuzzyFilter(dirKeys, arg);
      if (matches.length === 1) key = matches[0];
      else if (matches.length > 1) {
        printLine(matches.map(m => m + "/").join("  "));
        return;
      }
    }

    if (!key) return printLine(`No such directory: ${arg}`, "terminal-error");
    const next = node[key];
    if (next && typeof next === "object") PATH.push({ t:'obj', key });
    else printLine("Not a directory (expects object or array)", "terminal-error");
    return;
  }

  if (Array.isArray(node)) {
    // arrays: only cd into object/array items
    const candidates = getCandidatesForCurrentLocation("cd"); // names of object/array items
    const names = candidates.map(x => x.replace(/\/$/,''));

    // Map names -> index
    const nameToIndex = new Map();
    node.forEach((v,i) => {
      if (v && typeof v === "object") {
        nameToIndex.set(bestDisplayName(v,i), i);
      }
    });

    let idx = -1;

    // Try exact numeric forms first
    if (/^\d+(\.txt)?$/i.test(arg)) {
      const n = parseInt(arg, 10);
      if (!Number.isNaN(n)) {
        if (n >= 1 && n <= node.length) idx = n - 1;
        else if (n >= 0 && n < node.length) idx = n;
      }
      if (idx !== -1 && !(node[idx] && typeof node[idx] === "object")) idx = -1;
    }

    // Try exact name
    if (idx === -1 && nameToIndex.has(arg)) idx = nameToIndex.get(arg);

    // Fuzzy over names
    if (idx === -1) {
      const matches = fuzzyFilter(names, arg);
      if (matches.length === 1) idx = nameToIndex.get(matches[0]);
      else if (matches.length > 1) {
        printLine(matches.join("  "));
        return;
      }
    }

    if (idx === -1) return printLine(`No such directory: ${arg}`, "terminal-error");
    const next = node[idx];
    if (!(next && typeof next === "object")) {
      return printLine("Not a directory (file item; use /cat to view)", "terminal-error");
    }
    PATH.push({ t:'arr', idx, name: bestDisplayName(next, idx) });
    return;
  }

  printLine("Cannot cd into a primitive value.", "terminal-error");
}

function cat(arg) {
  if (!arg) return printLine("Usage: /cat <key|name|index|N.txt>", "terminal-error");
  const node = getNodeAtPath();

  if (node && typeof node === "object" && !Array.isArray(node)) {
    // try exact key first
    if (arg in node) return printJSON(node[arg]);

    // fuzzy over keys (files + folders)
    const keys = Object.keys(node);
    const matches = fuzzyFilter(keys, arg);
    if (matches.length === 1) return printJSON(node[matches[0]]);
    if (matches.length > 1) { printLine(matches.join("  ")); return; }

    return printLine(`No such key: ${arg}`, "terminal-error");
  }

  if (Array.isArray(node)) {
    // arrays of strings: fuzzy over filenames
    if (isArrayOfStrings(node)) {
      const files = node.map((s,i)=>filenameFromString(s,i));
      let idx = -1;

      // numeric?
      if (/^\d+(\.txt)?$/i.test(arg)) {
        const n = parseInt(arg, 10);
        if (!Number.isNaN(n)) {
          if (n >= 1 && n <= node.length) idx = n - 1;
          else if (n >= 0 && n < node.length) idx = n;
        }
      }
      if (idx === -1) {
        // exact filename?
        idx = files.findIndex(f => f.toLowerCase() === arg.toLowerCase());
      }
      if (idx === -1) {
        const matches = fuzzyFilter(files, arg);
        if (matches.length === 1) idx = files.indexOf(matches[0]);
        else if (matches.length > 1) { printLine(matches.join("  ")); return; }
      }
      if (idx === -1) return printLine(`No such file: ${arg}`, "terminal-error");
      return printJSON(node[idx]);
    }

    // arrays of objects: fuzzy over bestDisplayName
    const names = node.map((v,i)=>bestDisplayName(v,i));
    let idx = -1;

    // numeric?
    if (/^\d+(\.txt)?$/i.test(arg)) {
      const n = parseInt(arg, 10);
      if (!Number.isNaN(n)) {
        if (n >= 1 && n <= node.length) idx = n - 1;
        else if (n >= 0 && n < node.length) idx = n;
      }
    }
    if (idx === -1) {
      // exact name?
      idx = names.findIndex(nm => nm.toLowerCase() === arg.toLowerCase());
    }
    if (idx === -1) {
      const matches = fuzzyFilter(names, arg);
      if (matches.length === 1) idx = names.indexOf(matches[0]);
      else if (matches.length > 1) { printLine(matches.join("  ")); return; }
    }
    if (idx === -1) return printLine(`No such item: ${arg}`, "terminal-error");
    return printJSON(node[idx]);
  }

  printJSON(node);
}

// --- Init -------------------------------------------------------------------

async function initInteractiveTerminal(terminalBodyEl, options = {}) {
  DEFAULTS.userHost = options.userHost || DEFAULTS.userHost;
  DEFAULTS.dataUrl  = options.dataUrl  || DEFAULTS.dataUrl;

  $terminalBody = terminalBodyEl || byId("terminalBody");
  if (!$terminalBody) return;

  try {
    const res = await fetch(DEFAULTS.dataUrl, { cache: "no-store" });
    DATA = await res.json();
  } catch (e) {
    console.warn("Failed to load data.json. Falling back to {}.", e);
    DATA = {};
  }

  printLine(DEFAULTS.welcomeHint, "terminal-success");
  printPrompt();
}

window.initInteractiveTerminal = initInteractiveTerminal;

// Minimal input styles (optional)
const style = document.createElement("style");
style.textContent = `
.terminal-input{ background:transparent;border:none;outline:none;color:#fff;font:inherit;width:70%; }
.prompt-label{ color:#7dd3fc;margin-right:6px; }
.terminal-locked .terminal-input{ display:none; }
`;
document.head.appendChild(style);

// Start shell on page load (no typing animation)
window.addEventListener("load", () => {
  const el = document.getElementById("terminalBody");
  if (el) initInteractiveTerminal(el, { userHost: "abtahi@portfolio", dataUrl: "./data.json" });
});
