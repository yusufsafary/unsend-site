// Unsend homepage: recovery demo bench, sample case files, recovery
// ledger, wallet check, gallery of recent works, copy buttons.
(function () {
  'use strict';
  const $ = (s) => document.querySelector(s);
  const fmt = (n) => n.toLocaleString('en');
  const hex = (n) => '0x' + BigInt(n).toString(16).padStart(64, '0');
  const clsLabel = (st) => st.cls === 2 ? '已恢复 · 第 ' + (st.msgIndex + 1) + ' 条消息' : st.clsName;

  // ---------- sample case files (Case 02) ----------
  const SAMPLES = [3, 710, 1976, 16];
  (function samples() {
    const grid = $('#formGrid');
    if (!grid || !window.UnsendArt) return;
    grid.innerHTML = '';
    SAMPLES.forEach(function (d) {
      const r = window.UnsendArt.render(hex(d), 0);
      const fig = document.createElement('figure');
      fig.className = 'form' + (r.stats.cls === 1 ? ' shard' : '');
      fig.innerHTML = r.svg + '<figcaption><b>' + clsLabel(r.stats) + '</b><span>' + r.stats.palette + ' · 撤回时间 ' + r.stats.recalled + '</span></figcaption>';
      grid.appendChild(fig);
    });
    const pals = $('#pals');
    if (pals) {
      pals.innerHTML = window.UnsendArt.PALETTES.map(function (p) {
        return '<span class="pal">' + p.name + '</span>';
      }).join('');
    }
  })();

  // ---------- interactive recovery demo ----------
  (function demo() {
    const stage = $('#demoStage'), btn = $('#demoBtn'), count = $('#demoCount'),
      note = $('#demoNote'), read = $('#demoRead'), panel = document.querySelector('.demo');
    if (!stage || !btn || !window.UnsendArt) return;
    // Deterministic bench sequence: roughly every 4th attempt lands Restored.
    const SEQ = [3, 710, 16, 1976, 88, 733, 204, 991, 555, 812, 1003, 2976];
    let idx = 0, attempts = 0, busy = false;
    function paint() {
      const r = window.UnsendArt.render(hex(SEQ[idx]), 0);
      stage.innerHTML = r.svg;
      return r.stats;
    }
    paint();
    btn.addEventListener('click', function () {
      if (busy) return;
      busy = true;
      attempts++;
      if (count) count.textContent = attempts;
      idx = (idx + 1) % SEQ.length;
      panel.classList.add('glitching');
      setTimeout(function () {
        const st = paint();
        if (read) read.textContent = '尝试 ' + String(attempts).padStart(2, '0') + ' · 恢复：' + st.clsName + ' · 撤回时间：' + st.recalled;
        if (note) {
          note.textContent = st.cls === 2
            ? '完整恢复。大多数消息再也回不来了。'
            : (st.cls === 1 ? '部分恢复。一个片段留了下来，其余都消失了。' : '什么都没恢复。只剩下占位符。');
          note.classList.toggle('hit', st.cls === 2);
        }
      }, 240);
      setTimeout(function () { panel.classList.remove('glitching'); busy = false; }, 500);
    });
  })();

  // ---------- recovery (mint) ledger ----------
  function paintStats(s) {
    const bc = $('#barCount'); if (bc) bc.textContent = fmt(s.minted);
    const mm = $('#mMinted'); if (mm) mm.textContent = fmt(s.minted);
    const ml = $('#mLeft'); if (ml) ml.textContent = fmt(s.max - s.minted);
    const mf = $('#mFill'); if (mf) mf.style.width = (s.minted / s.max * 100).toFixed(2) + '%';
    const st = $('#mStatus');
    if (st) {
      if (s.minted >= s.max) st.textContent = '已售罄';
      else if (s.open) st.textContent = '实时恢复中';
      else st.textContent = '恢复即将开放';
    }
  }
  function poll() {
    if (!window.UnsendChain) return;
    window.UnsendChain.stats().then(paintStats).catch(function () {});
  }
  poll();
  setInterval(poll, 15000);

  // ---------- gallery: recent works ----------
  (function gallery() {
    const box = $('#gallery');
    if (!box || !window.UnsendChain || !window.UnsendArt) return;
    window.UnsendChain.recent().then(function (j) {
      if (!j.items.length) return;
      box.innerHTML = '';
      j.items.forEach(function (it) {
        const r = window.UnsendArt.render(it.seed, it.id);
        const d = document.createElement('a');
        d.href = '/market';
        d.innerHTML = r.svg + '<span class="mono" style="display:block;padding:10px 12px">#' + it.id + ' · ' + clsLabel(r.stats) + '</span>';
        box.appendChild(d);
      });
    }).catch(function () {});
  })();

  // ---------- check a wallet ----------
  (function check() {
    const btn = $('#whoBtn'), out = $('#whoOut'), inp = $('#who');
    if (!btn) return;
    btn.addEventListener('click', function () {
      const a = (inp.value || '').trim();
      if (!/^0x[0-9a-fA-F]{40}$/.test(a)) { out.textContent = '这不像是钱包地址。'; return; }
      out.textContent = '正在读取合约…';
      window.UnsendChain.walletInfo(a).then(function (w) {
        if (!w.hasAgentId) out.textContent = '没有 Agent ID。此钱包无法恢复。';
        else if (w.minted >= 20) out.textContent = '已持有 Agent ID。已恢复 20 个案件。已达到钱包上限。';
        else out.textContent = '已持有 Agent ID。已恢复 ' + w.minted + ' / 20 个案件。可以恢复。';
      }).catch(function () { out.textContent = '无法连接 BNB Chain。请重试。'; });
    });
  })();

  // ---------- copy buttons ----------
  document.querySelectorAll('[data-copy]').forEach(function (b) {
    b.addEventListener('click', function () {
      const el = document.getElementById(b.getAttribute('data-copy'));
      if (!el) return;
      if (navigator.clipboard) navigator.clipboard.writeText(el.innerText);
      b.textContent = '已复制';
      setTimeout(function () { b.textContent = '复制'; }, 1600);
    });
  });
})();
