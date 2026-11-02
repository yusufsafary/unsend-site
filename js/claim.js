// Unsend claim section: ledger, status, message tracker, check a work.
(function () {
  'use strict';
  const $ = (s) => document.querySelector(s);
  const fmt = (n) => n.toLocaleString('en');
  const fmtTok = (wei) => fmt(Number(BigInt(wei) / 1000000000000000000n));

  function paint(c) {
    const cc = $('#cClaimed'); if (cc) cc.textContent = fmt(c.claimed);
    const cf = $('#cFill'); if (cf) cf.style.width = (c.claimed / c.max * 100).toFixed(2) + '%';
    const st = $('#cStatus');
    if (st) st.textContent = c.open ? '领取已开放' : '即将开放';
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
      return '<div class="slot" data-slot="' + i + '"><div class="no">消息编号 ' + String(i + 1).padStart(2, '0') + ' / 12</div><div class="w">············</div></div>';
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
    if (!id || id < 1 || id > 8888) { out.textContent = '请输入 1 到 8,888 之间的作品编号。'; return; }
    out.textContent = '正在读取合约…';
    window.UnsendChain.stats().then(function (s) {
      if (id > s.minted) { out.textContent = '案件 #' + id + ' 尚未被恢复。'; return null; }
      return window.UnsendChain.claimInfo(id).then(function (c) {
        if (c.claimedForId) { out.textContent = '案件 #' + id + '：$UNSD 已领取。'; return; }
        const clsName = c.recoveryClass === 2 ? '已恢复' : (c.recoveryClass === 1 ? '碎片' : '灰烬');
        const msg = window.UnsendArt ? window.UnsendArt.MESSAGES[c.messageIndex] : '';
        const detail = c.recoveryClass === 2
          ? ' 第 ' + (c.messageIndex + 1) + ' 条消息已完整恢复：\u201c' + msg + '\u201d'
          : (c.recoveryClass === 1 ? ' 它带有第 ' + (c.messageIndex + 1) + ' 条消息的一个片段。' : ' 它的消息什么都没留下。');
        out.textContent = '案件 #' + id + '：尚未领取。恢复等级 ' + clsName + '，价值 ' + fmtTok(c.amountWei) + ' $UNSD。' + detail + ' 持有者 ' + (c.owner ? c.owner.slice(0, 6) + '…' + c.owner.slice(-4) : '未知') + ' 可以领取。';
      });
    }).catch(function () { out.textContent = '无法连接 BNB Chain。请重试。'; });
  });
})();
