#!/usr/bin/env node
// Stemmer test suite — runs in Node.js, used by deploy.sh
// Extracts FC (dictionary) and stemmer logic from index.html, loads compromise,
// then checks stemOf() against expected outputs.
"use strict";

var fs = require("fs");
var path = require("path");
var html = fs.readFileSync(path.join(__dirname, "index.html"), "utf8");

// ── 1. Extract and run the FC decoder to build ALLSET ────────────────────────
var fcMatch = html.match(/var FC = "([^"]+)"/);
if (!fcMatch) { console.error("Could not find FC in index.html"); process.exit(1); }
var FC = fcMatch[1];

var WORDS = [], ALLSET = new Set();
(function decode() {
  var prev = "", i = 0;
  while (i < FC.length) {
    var n = FC.charCodeAt(i) - 48;
    if (n >= 10) n -= 10;
    i++;
    var j = i;
    while (j < FC.length && FC.charCodeAt(j) >= 97) j++;
    var w = prev.slice(0, n) + FC.slice(i, j);
    WORDS.push(w); ALLSET.add(w);
    prev = w; i = j;
  }
})();

// ── 2. Load compromise synchronously ────────────────────────────────────────
var nlpPath = path.join(__dirname, "compromise.js");
if (!fs.existsSync(nlpPath)) {
  console.error("compromise.js not found at " + nlpPath);
  console.error("Run: curl -sL https://unpkg.com/compromise@14.16.0/builds/compromise.js -o boggle/compromise.js");
  process.exit(1);
}
// compromise uses a UMD build — load it into a fake module context
var nlpSrc = fs.readFileSync(nlpPath, "utf8");
var mod = { exports: {} };
(new Function("module", "exports", nlpSrc))(mod, mod.exports);
var nlp = mod.exports;

// ── 3. Stemmer (verbatim from index.html) ────────────────────────────────────
var _lemmaCache = {};

function _simpleLemma(w) {
  w = w.toLowerCase();
  if (w.endsWith("sses")) return w.slice(0, -2);
  if (w.endsWith("ies") && w.length > 4) return w.slice(0, -3) + "y";
  if (w.endsWith("ss")) return w;
  if (w.endsWith("s") && w.length > 3) return w.slice(0, -1);
  if (w.endsWith("ing") && w.length > 5) return w.slice(0, -3);
  if (w.endsWith("ed") && w.length > 4) return w.slice(0, -2);
  return w;
}

function _dictStem(w) {
  var cands = [];
  if (w.endsWith("ed"))  { cands.push(w.slice(0,-1)); cands.push(w.slice(0,-2)); }
  if (w.endsWith("ing")) { cands.push(w.slice(0,-3)+"e"); cands.push(w.slice(0,-3)); }
  if (w.endsWith("er"))  { cands.push(w.slice(0,-2)+"e"); cands.push(w.slice(0,-2)); }
  if (w.endsWith("s") && !w.endsWith("ss")) { cands.push(w.slice(0,-1)); }
  var valid = cands.filter(function(c){ return c.length >= 2 && c !== w && ALLSET.has(c); });
  if (valid.length) return valid.reduce(function(a,b){ return a.length >= b.length ? a : b; });
  return w;
}

function stemOf(w) {
  w = w.toLowerCase();
  if (_lemmaCache[w] !== undefined) return _lemmaCache[w];
  var result = w;
  var doc = nlp(w);
  var noun = doc.nouns().toSingular().text();
  if (noun && noun !== w) { result = noun; }
  else {
    var verb = doc.verbs().toInfinitive().text();
    if (verb && verb !== w) { result = verb; }
    else {
      var forced = nlp(w).tag("Verb").verbs().toInfinitive().text();
      if (forced && forced !== w && ALLSET.has(forced)) { result = forced; }
      else {
        var tags = doc.json()[0] ? (doc.json()[0].terms[0] ? doc.json()[0].terms[0].tags : []) : [];
        var isInflected = tags.indexOf("PastTense") >= 0 || tags.indexOf("Gerund") >= 0 ||
                          tags.indexOf("PresentTense") >= 0 || tags.indexOf("Plural") >= 0;
        if (isInflected) result = _dictStem(w);
      }
    }
  }
  _lemmaCache[w] = result;
  return result;
}

// ── 4. Test cases: [input, expectedStem, note] ───────────────────────────────
var TESTS = [
  // Plurals
  ["cats",     "cat",    "plural -s"],
  ["foxes",    "fox",    "plural -es"],
  ["toms",     "tom",    "plural -s"],
  ["sows",     "sow",    "plural -s"],
  ["rigs",     "rig",    "plural -s"],
  ["cans",     "can",    "plural -s"],
  ["oaks",     "oak",    "plural -s"],
  ["geese",    "goose",  "irregular plural"],
  ["groves",   "grove",  "plural -es (e-stem)"],
  ["stones",   "stone",  "plural -es (e-stem)"],
  ["reeds",    "reed",   "plural -s"],
  ["cliffs",   "cliff",  "plural -s"],
  ["grasses",  "grass",  "plural -es double s"],
  ["sparrows", "sparrow","plural -s"],
  ["warblers", "warbler","plural -s"],
  ["beetles",  "beetle", "plural -es (e-stem)"],

  // Past tense
  ["walked",   "walk",   "-ed regular"],
  ["drifted",  "drift",  "-ed regular"],
  ["bleached", "bleach", "-ed regular"],
  ["bared",    "bare",   "-ed e-stem (compromise gap)"],
  ["eared",    "ear",    "-ed short stem (compromise gap)"],
  ["cared",    "care",   "-ed e-stem"],
  ["dared",    "dare",   "-ed e-stem"],
  ["fared",    "fare",   "-ed e-stem"],

  // Gerunds / present participle
  ["running",  "run",    "-ing double consonant"],
  ["swimming", "swim",   "-ing double consonant"],
  ["flowing",  "flow",   "-ing (adj, compromise gap)"],
  ["rushing",  "rush",   "-ing (adj, compromise gap)"],
  ["drifting", "drift",  "-ing"],
  ["wading",   "wade",   "-ing e-stem"],
  ["blazing",  "blaze",  "-ing e-stem"],
  ["soaring",  "soar",   "-ing"],
  ["rippling", "ripple", "-ing e-stem"],
  ["towering", "tower",  "-ing"],

  // Should NOT stem (real standalone words)
  ["dater",    "dater",  "real word, no stem"],
  ["water",    "water",  "real word, no stem"],
  ["later",    "later",  "real word, no stem"],
  ["hunters",  "hunter", "plural of -er word"],

  // Should NOT stem (already root / pronouns / other)
  ["this",     "this",   "pronoun, no stem"],
  ["oak",      "oak",    "already root"],
  ["run",      "run",    "already root"],
  ["cat",      "cat",    "already root"],
  ["bare",     "bare",   "already root"],
  ["ear",      "ear",    "already root"],
];

// ── 5. Run and report ────────────────────────────────────────────────────────
var pass = 0, fail = 0, failures = [];
TESTS.forEach(function(t) {
  var input = t[0], expected = t[1], note = t[2];
  var got = stemOf(input);
  if (got === expected) {
    pass++;
  } else {
    fail++;
    failures.push({ input: input, got: got, expected: expected, note: note });
  }
});

if (failures.length) {
  console.error("\n  STEMMER FAILURES:\n");
  failures.forEach(function(f) {
    console.error("  ✗  " + f.input + " → " + f.got + " (expected " + f.expected + ")  [" + f.note + "]");
  });
  console.error("\n  " + fail + " failed, " + pass + " passed\n");
  process.exit(1);
} else {
  console.log("  stemmer: " + pass + "/" + TESTS.length + " tests passed");
}
