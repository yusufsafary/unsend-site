// Unsend claim section: ledger, status, message tracker, check a work.
(function () {
  'use strict';
  const $ = (s) => document.querySelector(s);
  const fmt = (n) => n.toLocaleString('en');
  const fmtTok = (wei) => fmt(Number(BigInt(wei) / 1000000000000000000n));
  if (!$('#claim')) return;

  function paint(c) {
    const cc = $('#cClaimed'); if (cc) cc.textContent = fmt(c.claimed);
    const cf = $('#cFill'); if (cf) cf.style.width = (c.claimed / c.max * 100).toFixed(2) + '%';
    const st = $('#cStatus');
    if (st) st.textContent = c.open ? 'Claims open' : 'Opening soon';
  }
  function poll() {
    if (!window.UnsendChain) return;
    window.UnsendChain.claimInfo().then(paint).catch(function () {});
  }
  poll();
  setInterval(poll, 30000);

  // ---------- message tracker: twelve slots, lit by Restored finds ----------
  (function tracker() {
    const box = $('#slots');
    if (!box || !window.UnsendArt) return;
    box.innerHTML = window.UnsendArt.MESSAGES.map(function (m, i) {
      return '<div class="slot" data-slot="' + i + '"><div class="no">MESSAGE NO. ' + String(i + 1).padStart(2, '0') + ' / 12</div><div class="w">············</div></div>';
    }).join('');
    if (!window.UnsendChain) return;
    window.UnsendChain.tracker().then(function (t) {
      (t.found || []).forEach(function (idx) {
        const el = box.querySelector('[data-slot="' + idx + '"]');
        if (el) {
          el.classList.add('found');
          el.querySelector('.w').textContent = window.UnsendArt.MESSAGES[idx];
        }
      });
    }).catch(function () {});
  })();

  const btn = $('#workBtn'), out = $('#workOut'), inp = $('#work');
  if (btn) btn.addEventListener('click', function () {
    const id = parseInt((inp.value || '').replace(/[^0-9]/g, ''), 10);
    if (!id || id < 1 || id > 8888) { out.textContent = 'Enter a work number from 1 to 8,888.'; return; }
    out.textContent = 'Reading contracts…';
    window.UnsendChain.stats().then(function (s) {
      if (id > s.minted) { out.textContent = 'Case #' + id + ' has not been recovered yet.'; return null; }
      return window.UnsendChain.claimInfo(id).then(function (c) {
        if (c.claimedForId) { out.textContent = 'Case #' + id + ': $UNSD already claimed.'; return; }
        const clsName = c.recoveryClass === 2 ? 'Restored' : (c.recoveryClass === 1 ? 'Shard' : 'Ash');
        const msg = window.UnsendArt ? window.UnsendArt.MESSAGES[c.messageIndex] : '';
        const detail = c.recoveryClass === 2
          ? ' Message No. ' + (c.messageIndex + 1) + ' recovered in full: "' + msg + '"'
          : (c.recoveryClass === 1 ? ' It carries a fragment of message No. ' + (c.messageIndex + 1) + '.' : ' Nothing of its message survived.');
        out.textContent = 'Case #' + id + ': unclaimed. Recovery ' + clsName + ', worth ' + fmtTok(c.amountWei) + ' $UNSD.' + detail + ' Owner ' + (c.owner ? c.owner.slice(0, 6) + '…' + c.owner.slice(-4) : 'unknown') + ' can claim it.';
      });
    }).catch(function () { out.textContent = 'Could not reach BNB Chain. Try again.'; });
  });
})();
