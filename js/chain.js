// Browser chain reads for unsend.games (GitHub Pages).
// Direct BSC RPC reads from the visitor's browser. Read-only.
(function () {
  'use strict';
  var NFT = '0x6f8C7984e3C857E8Fbe55A75D3d5FFc9E4a19DcA';
  var CLAIM = '0xfE37A7eBCC6DA7E625d7E744b4FeFE1E48a9892C';
  var TOKEN = '0xB17eB2beF0E8A24975218a7ECcb2b439a9C335C5';
  var ZERO = '0x0000000000000000000000000000000000000000';
  var RPCS = [
    'https://bsc-dataseed-public.bnbchain.org',
    'https://bsc-rpc.publicnode.com',
    'https://bsc-dataseed.binance.org'
  ];
  var SEL = {
    stats: '0x8bcdcbf3',
    totalSupply: '0x18160ddd',
    currentPrice: '0x9d1b464a',
    mintOpen: '0x24bbd049',
    seedOf: '0x82829f74',
    recoveryClassOf: '0x1dbc6dfb',
    messageIndexOf: '0xa1e85750',
    mintedBy: '0x3cef28d2',
    holdsAgentId: '0x11213086',
    ownerOf: '0x6352211e',
    claimAmount: '0x23b221a0',
    claimedById: '0x4c80ee12',
    totalClaimed: '0xd54ad2a1',
    claimsRemaining: '0x754c463f',
    claimOpen: '0x4b8bcb58',
    poolBalance: '0x96365d44'
  };

  function encUint(n) { return BigInt(n).toString(16).padStart(64, '0'); }
  function encAddr(a) { return String(a).toLowerCase().replace(/^0x/, '').padStart(64, '0'); }
  function wordAt(hex, i) { return BigInt('0x' + hex.slice(2 + i * 64, 2 + (i + 1) * 64)); }
  function addrAt(hex, i) { return '0x' + hex.slice(2 + i * 64 + 24, 2 + (i + 1) * 64); }

  function post(url, payload) {
    var ctl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var timer = ctl ? setTimeout(function () { ctl.abort(); }, 20000) : null;
    return fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: ctl ? ctl.signal : undefined
    }).then(function (r) {
      if (timer) clearTimeout(timer);
      if (!r.ok) throw new Error('http ' + r.status);
      return r.json();
    }, function (e) {
      if (timer) clearTimeout(timer);
      throw e;
    });
  }
  function viaRpc(fn) {
    var p = Promise.reject(new Error('no rpc'));
    RPCS.forEach(function (u) { p = p.catch(function () { return fn(u); }); });
    return p;
  }
  function ethCall(to, data) {
    return viaRpc(function (u) {
      return post(u, { jsonrpc: '2.0', id: 1, method: 'eth_call', params: [{ to: to, data: data }, 'latest'] })
        .then(function (j) {
          if (j.error || typeof j.result !== 'string') throw new Error('rpc error');
          return j.result;
        });
    });
  }
  // Multicall3 aggregate3: many contract reads inside ONE eth_call.
  var MC3 = '0xcA11bde05977b3631167028862bE2a173976CA11';
  var AGG_SEL = '0x82ad56cb';
  function encBytes(hex) {
    var body = hex.replace(/^0x/, '');
    var padded = body.padEnd(Math.ceil(body.length / 64) * 64, '0');
    return encUint(body.length / 2) + padded;
  }
  function aggregate3(calls) {
    var tuples = calls.map(function (c) {
      return encAddr(c.to) + encUint(1) + encUint(96) + encBytes(c.data);
    });
    var head = '', tail = '', off = tuples.length * 32;
    tuples.forEach(function (t) {
      head += encUint(off);
      tail += t;
      off += t.length / 2;
    });
    var data = AGG_SEL + encUint(32) + encUint(calls.length) + head + tail;
    return ethCall(MC3, data).then(function (hex) {
      var base = 2 + Number(wordAt(hex, 0)) * 2;
      var len = Number(wordAt(hex, (base - 2) / 64));
      var out = [];
      for (var i = 0; i < len; i++) {
        var rel = Number(wordAt(hex, (base - 2) / 64 + 1 + i));
        var t = (base - 2) / 64 + 1 + rel / 32;
        var ok = wordAt(hex, t) !== 0n;
        var bOff = Number(wordAt(hex, t + 1));
        var bLen = Number(wordAt(hex, t + bOff / 32));
        var bytes = '0x' + hex.slice((t + bOff / 32 + 1) * 64 + 2, (t + bOff / 32 + 1) * 64 + 2 + bLen * 2);
        out.push({ ok: ok, result: bytes });
      }
      return out;
    });
  }
  function aggregate3Chunked(calls, size) {
    var chunks = [];
    for (var i = 0; i < calls.length; i += size) chunks.push(calls.slice(i, i + size));
    var out = new Array(chunks.length);
    var next = 0;
    function worker() {
      var idx = next++;
      if (idx >= chunks.length) return Promise.resolve();
      return aggregate3(chunks[idx]).then(function (r) {
        out[idx] = r;
        return worker();
      });
    }
    var pool = [];
    for (var w = 0; w < Math.min(4, chunks.length); w++) pool.push(worker());
    return Promise.all(pool).then(function () {
      var flat = [];
      out.forEach(function (r) { flat = flat.concat(r); });
      return flat;
    });
  }

  // Recovery ledger. stats() is safe for the zero address, so the public
  // ledger reads stats(0) directly.
  function stats(wallet) {
    var hasWallet = /^0x[0-9a-fA-F]{40}$/.test(wallet || '') && wallet.toLowerCase() !== ZERO.toLowerCase();
    var addr = hasWallet ? wallet : ZERO;
    return aggregate3([{ to: NFT, data: SEL.stats + encAddr(addr) }]).then(function (r) {
      if (!r[0].ok) throw new Error('stats read failed');
      var hex = r[0].result;
      return {
        minted: Number(wordAt(hex, 0)),
        max: Number(wordAt(hex, 1)),
        priceWei: wordAt(hex, 2).toString(),
        open: wordAt(hex, 3) !== 0n,
        hasAgentId: wordAt(hex, 4) !== 0n,
        hasMinted: wordAt(hex, 5) !== 0n,
        contract: NFT
      };
    });
  }

  function walletInfo(wallet) {
    return aggregate3([
      { to: NFT, data: SEL.holdsAgentId + encAddr(wallet) },
      { to: NFT, data: SEL.mintedBy + encAddr(wallet) }
    ]).then(function (r) {
      return {
        hasAgentId: r[0].ok ? wordAt(r[0].result, 0) !== 0n : false,
        minted: r[1].ok ? Number(wordAt(r[1].result, 0)) : 0
      };
    });
  }

  // Most recent recovered works, with seeds.
  function recent() {
    return ethCall(NFT, SEL.totalSupply).then(function (hex) {
      var n = Number(wordAt(hex, 0));
      var ids = [];
      for (var i = n; i > Math.max(0, n - 12); i--) ids.push(i);
      if (!ids.length) return { minted: n, items: [] };
      var calls = ids.map(function (id) { return { to: NFT, data: SEL.seedOf + encUint(id) }; });
      return aggregate3(calls).then(function (results) {
        var items = [];
        ids.forEach(function (id, k) {
          var r = results[k];
          if (!r || !r.ok) return;
          var v = wordAt(r.result, 0);
          if (v === 0n) return;
          items.push({ id: id, seed: '0x' + v.toString(16).padStart(64, '0') });
        });
        return { minted: n, items: items };
      });
    });
  }

  // Claim ledger; with an id, also that work's claim state, amount,
  // recovery class and message index.
  function claimInfo(id) {
    var calls = [
      { to: CLAIM, data: SEL.totalClaimed },
      { to: CLAIM, data: SEL.claimsRemaining },
      { to: CLAIM, data: SEL.claimOpen },
      { to: CLAIM, data: SEL.poolBalance }
    ];
    if (id !== undefined) {
      calls.push({ to: CLAIM, data: SEL.claimedById + encUint(id) });
      calls.push({ to: CLAIM, data: SEL.claimAmount + encUint(id) });
      calls.push({ to: NFT, data: SEL.ownerOf + encUint(id) });
      calls.push({ to: NFT, data: SEL.recoveryClassOf + encUint(id) });
      calls.push({ to: NFT, data: SEL.messageIndexOf + encUint(id) });
    }
    return aggregate3(calls).then(function (r) {
      if (!r[0].ok) throw new Error('claim read failed');
      var out = {
        claimed: Number(wordAt(r[0].result, 0)),
        max: 8888,
        remaining: Number(wordAt(r[1].result, 0)),
        open: wordAt(r[2].result, 0) !== 0n,
        poolWei: wordAt(r[3].result, 0).toString(),
        claimContract: CLAIM,
        tokenContract: TOKEN
      };
      if (id !== undefined) {
        out.id = id;
        out.claimedForId = r[4].ok ? wordAt(r[4].result, 0) !== 0n : false;
        out.amountWei = r[5].ok ? wordAt(r[5].result, 0).toString() : '0';
        out.owner = r[6].ok ? addrAt(r[6].result, 0) : null;
        out.recoveryClass = r[7].ok ? Number(wordAt(r[7].result, 0)) : 0;
        out.messageIndex = r[8].ok ? Number(wordAt(r[8].result, 0)) : 0;
      }
      return out;
    });
  }

  // Message tracker: the set of message indexes (0..11) that already have
  // at least one Restored (class 2) work minted.
  function tracker() {
    return ethCall(NFT, SEL.totalSupply).then(function (hex) {
      var n = Number(wordAt(hex, 0));
      if (!n) return { minted: 0, found: [] };
      var calls = [];
      for (var i = 1; i <= n; i++) {
        calls.push({ to: NFT, data: SEL.recoveryClassOf + encUint(i) });
        calls.push({ to: NFT, data: SEL.messageIndexOf + encUint(i) });
      }
      return aggregate3Chunked(calls, 300).then(function (res) {
        var found = {};
        for (var id = 1; id <= n; id++) {
          var c = res[(id - 1) * 2], m = res[(id - 1) * 2 + 1];
          if (!c || !c.ok || !m || !m.ok) continue;
          if (Number(wordAt(c.result, 0)) === 2) found[Number(wordAt(m.result, 0))] = 1;
        }
        return { minted: n, found: Object.keys(found).map(Number).sort(function (a, b) { return a - b; }) };
      });
    });
  }

  // Every minted work with owner and traits (rendered in-browser).
  function market() {
    return ethCall(NFT, SEL.totalSupply).then(function (hex) {
      var n = Number(wordAt(hex, 0));
      if (!n) return { contract: NFT, chain: 'bsc', minted: 0, owners: 0, items: [] };
      var calls = [];
      for (var i = 1; i <= n; i++) {
        calls.push({ to: NFT, data: SEL.ownerOf + encUint(i) });
        calls.push({ to: NFT, data: SEL.seedOf + encUint(i) });
      }
      return aggregate3Chunked(calls, 300).then(function (res) {
        var items = [];
        var ownerSet = {};
        for (var id = 1; id <= n; id++) {
          var o = res[(id - 1) * 2], s = res[(id - 1) * 2 + 1];
          if (!o || !o.ok || !s || !s.ok) continue;
          var owner = addrAt(o.result, 0);
          var v = wordAt(s.result, 0);
          if (v === 0n || !window.UnsendArt) continue;
          var seed = '0x' + v.toString(16).padStart(64, '0');
          try {
            var st = window.UnsendArt.render(seed, id).stats;
            ownerSet[owner.toLowerCase()] = 1;
            items.push({
              id: id, owner: owner, seed: seed,
              cls: st.cls, clsName: st.clsName, palette: st.palette,
              recalled: st.recalled, msgIndex: st.msgIndex, message: st.message,
              msgLabel: st.cls === 2 ? '第 ' + (st.msgIndex + 1) + ' 条消息' : (st.cls === 1 ? '第 ' + (st.msgIndex + 1) + ' 条消息的片段' : '无消息'),
              img: '/art/' + id + '.svg',
              element: 'https://element.market/assets/bsc/' + NFT + '/' + id
            });
          } catch (e) {}
        }
        return { contract: NFT, chain: 'bsc', minted: n, owners: Object.keys(ownerSet).length, items: items };
      });
    });
  }

  window.UnsendChain = {
    stats: stats, walletInfo: walletInfo, recent: recent,
    claimInfo: claimInfo, workInfo: claimInfo, tracker: tracker, market: market
  };
})();
