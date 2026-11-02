// Unsend art engine: one forensic reconstruction per work.
// Deterministic from (seed, id). Runs in the browser (window.UnsendArt)
// and in Node (module.exports) with identical output.
//
// Recovery class, message index, palette and recall window are NOT
// artistic choices: they repeat the exact rule stored by the NFT
// contract at mint (BigInt arithmetic on the seed), so the artwork
// always agrees with recoveryClassOf / messageIndexOf on-chain:
//   r = seed % 1000 -> class 0 "Ash" (<700), 1 "Shard" (<970), 2 "Restored"
//   messageIndex = (seed / 1000) % 12
//   paletteIndex = (seed / 12000) % 4
//   recalledIndex = (seed / 48000) % 5
(function () {
  'use strict';

  var MESSAGES = [
    'forget i said anything',
    'you were right. i was wrong.',
    'i never stopped loving you',
    'the money is under the floor',
    'dont come home tonight',
    'i quit. effective now.',
    'it was me. im sorry.',
    'meet me where we first met',
    'i saw what you did',
    'this is the last message',
    'i lied about everything',
    'call me before you land'
  ];
  var RECALLED = ['9 seconds', '48 seconds', '3 minutes', '26 minutes', '2 hours'];
  var CLASS_NAMES = ['Ash', 'Shard', 'Restored'];
  var ACCENT = '#FF5147';
  var PALETTES = [
    { name: 'Slate', bg: '#0B0E13', bubble: '#151A21', hi: '#1E252F', ink: '#C7CDD4', dim: '#5C6670' },
    { name: 'Bruise', bg: '#0D0A14', bubble: '#181126', hi: '#221838', ink: '#CFC6E8', dim: '#655A85' },
    { name: 'Petrol', bg: '#071114', bubble: '#0E2126', hi: '#15333A', ink: '#C2DEDC', dim: '#4E6E6C' },
    { name: 'Ember', bg: '#120A08', bubble: '#221210', hi: '#301B17', ink: '#E8CCC4', dim: '#7D574E' }
  ];
  var GRAY = '#9AA3AD';
  var BAR = '#1C0D0B'; // dark redaction bar

  function xmur3(str) {
    var h = 1779033703 ^ str.length;
    for (var i = 0; i < str.length; i++) {
      h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
      h = (h << 13) | (h >>> 19);
    }
    return function () {
      h = Math.imul(h ^ (h >>> 16), 2246822507);
      h = Math.imul(h ^ (h >>> 13), 3266489909);
      return (h ^= h >>> 16) >>> 0;
    };
  }
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function rngFrom(seedStr) {
    return mulberry32(xmur3(seedStr)());
  }

  function recoveryClass(seedBig) {
    var r = seedBig % 1000n;
    return r < 700n ? 0 : (r < 970n ? 1 : 2);
  }
  function messageIndex(seedBig) {
    return Number((seedBig / 1000n) % 12n);
  }
  function paletteIndex(seedBig) {
    return Number((seedBig / 12000n) % 4n);
  }
  function recalledIndex(seedBig) {
    return Number((seedBig / 48000n) % 5n);
  }
  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  // word wrap by character budget (monospace metrics)
  function wrap(text, maxChars) {
    var words = text.split(' '), lines = [], cur = '';
    words.forEach(function (w) {
      if (!cur) cur = w;
      else if ((cur + ' ' + w).length <= maxChars) cur += ' ' + w;
      else { lines.push(cur); cur = w; }
    });
    if (cur) lines.push(cur);
    return lines;
  }

  function render(seedInput, id) {
    var seedStr = String(seedInput);
    var seedBig;
    try { seedBig = BigInt(seedStr); } catch (e) { seedBig = 0n; }
    var cls = recoveryClass(seedBig);
    var clsName = CLASS_NAMES[cls];
    var msgIdx = messageIndex(seedBig);
    var pal = PALETTES[paletteIndex(seedBig)];
    var recalled = RECALLED[recalledIndex(seedBig)];
    var message = MESSAGES[msgIdx];
    var rnd = rngFrom('unsend:' + seedStr + ':' + id);

    var W = 800, M = 40;
    var parts = [];
    parts.push('<rect width="800" height="800" fill="' + pal.bg + '"/>');
    parts.push('<rect x="24" y="24" width="752" height="752" fill="none" stroke="' + pal.dim + '" stroke-opacity="0.45" stroke-width="1.5"/>');

    // ---- header ----
    var caseLabel = id > 0 ? 'CASE #' + String(id).padStart(4, '0') : 'CASE FILE · DEMO';
    parts.push('<text x="' + (M + 16) + '" y="72" font-family="monospace" font-size="21" letter-spacing="4" fill="' + pal.ink + '">' + caseLabel + '</text>');
    parts.push('<text x="' + (W - M - 16) + '" y="72" font-family="monospace" font-size="21" letter-spacing="4" text-anchor="end" fill="' + pal.dim + '">UNSEND / RECONSTRUCTION</text>');
    parts.push('<line x1="' + (M + 16) + '" y1="94" x2="' + (W - M - 16) + '" y2="94" stroke="' + pal.dim + '" stroke-opacity="0.5" stroke-width="1.5"/>');
    parts.push('<text x="' + (M + 16) + '" y="128" font-family="monospace" font-size="16" letter-spacing="3" fill="' + pal.dim + '">EVIDENCE LOCKER · BNB CHAIN</text>');
    parts.push('<text x="' + (W - M - 16) + '" y="128" font-family="monospace" font-size="16" letter-spacing="3" text-anchor="end" fill="' + pal.dim + '">SURFACE ' + pal.name.toUpperCase() + '</text>');

    // ---- chat bubble ----
    var bx = 92, bw = 616, by = 178, bh = 292, brad = 26;
    var tail = '<path d="M' + (bx + 54) + ' ' + (by + bh) + ' l6 30 l26 -30 z" fill="' + (cls === 2 ? pal.hi : pal.bubble) + '"/>';
    if (cls === 0) {
      parts.push('<rect x="' + bx + '" y="' + by + '" width="' + bw + '" height="' + bh + '" rx="' + brad + '" fill="none" stroke="' + pal.dim + '" stroke-width="2"/>');
      parts.push('<path d="M' + (bx + 54) + ' ' + (by + bh - 1) + ' l6 30 l26 -30 z" fill="' + pal.bg + '" stroke="' + pal.dim + '" stroke-width="2"/>');
      // gray placeholder bar
      var pbW = 250 + Math.floor(rnd() * 90);
      parts.push('<rect x="' + (bx + 40) + '" y="' + (by + 96) + '" width="' + pbW + '" height="22" rx="11" fill="' + GRAY + '" fill-opacity="0.4"/>');
      parts.push('<text x="' + (bx + 40) + '" y="' + (by + 168) + '" font-family="monospace" font-style="italic" font-size="25" fill="' + pal.dim + '">This message was unsent</text>');
      // ash speckle, denser inside the bubble
      var sp = '';
      for (var s = 0; s < 150; s++) {
        var inB = s < 100;
        var sx = inB ? bx + 14 + rnd() * (bw - 28) : 40 + rnd() * 720;
        var sy = inB ? by + 12 + rnd() * (bh - 24) : 150 + rnd() * 560;
        var rr = (0.8 + rnd() * 1.9).toFixed(1);
        var op = (0.12 + rnd() * 0.4).toFixed(2);
        sp += '<circle cx="' + sx.toFixed(0) + '" cy="' + sy.toFixed(0) + '" r="' + rr + '" fill="' + (rnd() < 0.5 ? GRAY : pal.dim) + '" fill-opacity="' + op + '"/>';
      }
      parts.push(sp);
    } else {
      parts.push('<rect x="' + bx + '" y="' + by + '" width="' + bw + '" height="' + bh + '" rx="' + brad + '" fill="' + (cls === 2 ? pal.hi : pal.bubble) + '"/>');
      parts.push(tail);
      var fs = 30, charW = fs * 0.6, lineH = 46, tx = bx + 40, maxChars = Math.floor((bw - 80) / charW);
      var lines = wrap(message, maxChars);
      var startY = by + bh / 2 - ((lines.length - 1) * lineH) / 2 + 10;
      if (cls === 2) {
        lines.forEach(function (ln, li) {
          parts.push('<text x="' + tx + '" y="' + (startY + li * lineH) + '" font-family="monospace" font-size="' + fs + '" fill="' + pal.ink + '">' + esc(ln) + '</text>');
        });
        // recovered tag inside the bubble
        var tagY = by + bh - 30;
        parts.push('<rect x="' + tx + '" y="' + (tagY - 13) + '" width="10" height="10" fill="' + ACCENT + '"/>');
        parts.push('<text x="' + (tx + 20) + '" y="' + (tagY - 3) + '" font-family="monospace" font-size="16" letter-spacing="3" fill="' + ACCENT + '">RECOVERED IN FULL</text>');
        parts.push('<text x="' + (bx + bw - 40) + '" y="' + (tagY - 3) + '" font-family="monospace" font-size="16" letter-spacing="2" text-anchor="end" fill="' + pal.dim + '">MESSAGE NO. ' + (msgIdx + 1) + ' OF 12</text>');
      } else {
        // Shard: first ~40% of characters visible, rest under redaction bars.
        var total = message.length;
        var visCount = Math.floor(total * 0.4);
        // red ghost copy of the visible part (chromatic glitch), behind main text
        var seen = 0, li2, ln2, visLine;
        for (li2 = 0; li2 < lines.length; li2++) {
          ln2 = lines[li2];
          var take = Math.max(0, Math.min(ln2.length, visCount - seen));
          if (take > 0) {
            visLine = ln2.slice(0, take);
            var jy = (rnd() - 0.5) * 5;
            parts.push('<text x="' + (tx + 5) + '" y="' + (startY + li2 * lineH + jy + 2) + '" font-family="monospace" font-size="' + fs + '" fill="' + ACCENT + '" fill-opacity="0.35">' + esc(visLine) + '</text>');
          }
          seen += ln2.length + (li2 < lines.length - 1 ? 1 : 0);
        }
        seen = 0;
        lines.forEach(function (ln, li) {
          var take = Math.max(0, Math.min(ln.length, visCount - seen));
          var jy = (rnd() - 0.5) * 5;
          var y = startY + li * lineH + jy;
          if (take > 0) {
            parts.push('<text x="' + tx + '" y="' + y + '" font-family="monospace" font-size="' + fs + '" fill="' + pal.ink + '">' + esc(ln.slice(0, take)) + '</text>');
          }
          if (take < ln.length) {
            var barX = tx + take * charW + (take > 0 ? 6 : 0);
            var barW = (ln.length - take) * charW - (take > 0 ? 2 : 0);
            if (barW > 8) parts.push('<rect x="' + barX.toFixed(0) + '" y="' + (y - fs + 10).toFixed(0) + '" width="' + barW.toFixed(0) + '" height="' + (fs + 4) + '" fill="' + BAR + '"/>');
          }
          seen += ln.length + (li < lines.length - 1 ? 1 : 0);
        });
        // glitch slices across the bubble
        var gs = '';
        var nSlice = 2 + Math.floor(rnd() * 2);
        for (var g = 0; g < nSlice; g++) {
          var gy = by + 40 + rnd() * (bh - 90);
          var gx = bx + rnd() * bw * 0.4;
          var gw = 90 + rnd() * 240;
          gs += '<rect x="' + gx.toFixed(0) + '" y="' + gy.toFixed(0) + '" width="' + gw.toFixed(0) + '" height="' + (3 + Math.floor(rnd() * 3)) + '" fill="' + (g % 2 ? ACCENT : pal.dim) + '" fill-opacity="0.5"/>';
        }
        parts.push(gs);
        var tagY2 = by + bh - 30;
        parts.push('<rect x="' + tx + '" y="' + (tagY2 - 13) + '" width="10" height="10" fill="' + pal.dim + '"/>');
        parts.push('<text x="' + (tx + 20) + '" y="' + (tagY2 - 3) + '" font-family="monospace" font-size="16" letter-spacing="3" fill="' + pal.dim + '">PARTIAL RECOVERY</text>');
      }
    }

    // ---- below the bubble: case lines ----
    var ly = 548;
    parts.push('<text x="' + (M + 16) + '" y="' + ly + '" font-family="monospace" font-size="19" letter-spacing="3" fill="' + pal.ink + '">RECALLED AFTER ' + recalled.toUpperCase() + '</text>');
    parts.push('<text x="' + (M + 16) + '" y="' + (ly + 40) + '" font-family="monospace" font-size="19" letter-spacing="3" fill="' + pal.ink + '">RECOVERY <tspan fill="' + (cls === 2 ? ACCENT : pal.dim) + '">' + clsName.toUpperCase() + '</tspan></text>');
    parts.push('<text x="' + (M + 16) + '" y="' + (ly + 80) + '" font-family="monospace" font-size="19" letter-spacing="3" fill="' + pal.dim + '">SEED ' + esc(seedStr.slice(0, 10)).toUpperCase() + '</text>');
    parts.push('<text x="' + (W - M - 16) + '" y="' + (ly + 80) + '" font-family="monospace" font-size="19" letter-spacing="3" text-anchor="end" fill="' + pal.dim + '">' + (id > 0 ? 'NO. ' + id + ' / 8888' : 'DEMONSTRATION') + '</text>');

    // ---- redacted footer strip: gray bars like a censored document ----
    var rb = '';
    var rx = M + 16, rw;
    while (rx < W - M - 90) {
      rw = 40 + rnd() * 130;
      if (rx + rw > W - M - 16) rw = W - M - 16 - rx;
      rb += '<rect x="' + rx.toFixed(0) + '" y="692" width="' + rw.toFixed(0) + '" height="13" fill="' + pal.dim + '" fill-opacity="' + (0.18 + rnd() * 0.2).toFixed(2) + '"/>';
      rx += rw + 14;
    }
    parts.push(rb);
    parts.push('<rect x="' + (M + 16) + '" y="724" width="52" height="13" fill="' + ACCENT + '" fill-opacity="0.75"/>');
    parts.push('<text x="' + (M + 82) + '" y="735" font-family="monospace" font-size="15" letter-spacing="3" fill="' + pal.dim + '">UNSEND · CASE FILE</text>');

    var traits = [
      { trait_type: 'Recovery', value: clsName },
      { trait_type: 'Message', value: cls === 2 ? 'No. ' + (msgIdx + 1) : (cls === 1 ? 'Fragment of No. ' + (msgIdx + 1) : 'None') },
      { trait_type: 'Surface', value: pal.name },
      { trait_type: 'Recalled After', value: recalled },
      { trait_type: 'Seed', value: seedStr.slice(0, 10) }
    ];
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="800" viewBox="0 0 800 800">' + parts.join('') + '</svg>';
    return {
      id: id, seed: seedStr, traits: traits, svg: svg,
      stats: { cls: cls, clsName: clsName, msgIndex: msgIdx, palette: pal.name, recalled: recalled, message: message }
    };
  }

  var api = {
    render: render, MESSAGES: MESSAGES, RECALLED: RECALLED, PALETTES: PALETTES,
    CLASS_NAMES: CLASS_NAMES, recoveryClass: recoveryClass, messageIndex: messageIndex,
    paletteIndex: paletteIndex, recalledIndex: recalledIndex
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.UnsendArt = api;
})();
