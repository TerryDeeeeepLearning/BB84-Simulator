// Lab tab: theory curves + Monte Carlo experiments, each exportable as a poster figure.
(function () {
    'use strict';
    const B = window.BB84;
    const T = (s, p) => B.T(s, p);
    const $ = id => document.getElementById(id);
    const tick = () => new Promise(r => setTimeout(r, 0));

    const HW = {
        gys: Object.assign({}, B.GYS, { label: 'GYS 2004' }),
        // illustrative modern system: SNSPDs, low dark counts, good alignment
        snspd: { alpha: 0.2, etaBob: 0.6, Y0: 1e-7, ed: 0.01, e0: 0.5, f: 1.1, q: 0.5, label: 'SNSPD (illustrative)' }
    };
    const pctFmt = d => v => (v * 100).toFixed(d) + '%';
    const misalignFor = e => Math.asin(Math.sqrt(e)) / B.DEG;
    // a parameter label inside a card, translated by the static pass
    const lbl = s => `<span data-i18n>${s}</span>`;

    function hw() { return HW[$('lab-hw').value]; }
    function seed(tag) { return ($('lab-seed').value || '') + ':' + tag; }
    function progress(msg) { $('lab-progress').textContent = msg || ''; }

    // ---- Monte Carlo pulse runner: aggregates per intensity class, chunked so the UI stays live ----
    async function runPulses(P, N, rng, label) {
        const ctx = B.prepareChannel(P);
        const agg = [0, 1, 2].map(() => ({ sent: 0, matched: 0, det: 0, err: 0 }));
        const out = {};
        const CHUNK = 150000;
        for (let done = 0; done < N; done += CHUNK) {
            const end = Math.min(N, done + CHUNK);
            for (let i = done; i < end; i++) {
                B.simulatePulse(P, ctx, rng, undefined, out);
                const a = agg[out.intensity];
                a.sent++;
                if (out.aBasis !== out.bBasis) continue;
                a.matched++;
                if (out.click) { a.det++; if (out.aBit !== out.bBit) a.err++; }
            }
            if (label) progress(`${label} · ${Math.round(end / N * 100)}%`);
            await tick();
        }
        return agg.map(a => Object.assign(a, { Q: a.matched ? a.det / a.matched : 0, E: a.det ? a.err / a.det : 0 }));
    }

    function decoyParams(m, L, mu, nu, eve) {
        return Object.assign(B.defaultParams(), {
            source: 'wcp', mu, decoy: { nu, pSignal: 0.7, pDecoy: 0.2, pVacuum: 0.1 },
            distance: L, alpha: m.alpha, etaDet: m.etaBob, pDark: m.Y0 / 2, misalign: misalignFor(m.ed),
            eve: eve || { mode: 'none', fraction: 1 }
        });
    }
    function decoyFromAgg(agg, m, mu, nu) {
        const est = B.decoyEstimate({ mu, nu, Qmu: agg[0].Q, Emu: agg[0].E, Qnu: agg[1].Q, Enu: agg[1].E, Y0: agg[2].Q, e0: 0.5, f: m.f });
        const q = agg[0].matched / agg[0].sent;
        return Object.assign(est, { rate: q * est.R, q });
    }

    // ---------- card scaffolding ----------
    const cards = [];
    function card(def) {
        const elc = document.createElement('article');
        elc.className = 'card lab-card';
        elc.innerHTML = `<h2></h2><p class="lede"></p><div class="params"></div><div class="chart-host"></div>
            <div class="chart-actions"><button data-act="table" data-i18n>Table</button><button data-act="png">PNG</button><button data-act="svg">SVG</button><button data-act="csv">CSV</button></div>
            <p class="takeaway" hidden></p>`;
        if (def.params) elc.querySelector('.params').innerHTML = def.params;
        if (def.run) {
            const btn = document.createElement('button');
            btn.className = 'card-run';
            btn.dataset.i18n = '';
            btn.textContent = 'Run simulation';
            btn.addEventListener('click', () => runCard(def));
            elc.querySelector('.params').appendChild(btn);
            def.btn = btn;
        }
        if (def.kind === 'table') elc.querySelectorAll('[data-act="table"], [data-act="png"], [data-act="svg"]').forEach(b => b.remove());
        $('lab-grid').appendChild(elc);
        B.I18N.applyStatic(elc);
        def.el = elc;
        def.host = elc.querySelector('.chart-host');
        def.setTakeaway = html => { const t = elc.querySelector('.takeaway'); t.hidden = !html; t.innerHTML = html || ''; };
        def.q = sel => elc.querySelector(sel);
        elc.querySelectorAll('.params select').forEach(s => s.addEventListener('change', () => { def.mc = null; draw(def); }));
        elc.querySelectorAll('.chart-actions button').forEach(b => b.addEventListener('click', () => {
            if (!def.chart) return;
            const name = 'bb84-' + def.id;
            if (b.dataset.act === 'table') def.chart.toggleTable();
            if (b.dataset.act === 'png') B.Charts.exportPNG(def.chart, name);
            if (b.dataset.act === 'svg') B.Charts.exportSVG(def.chart, name);
            if (b.dataset.act === 'csv') B.Charts.exportCSV(def.chart, name);
        }));
        cards.push(def);
        draw(def);
        return def;
    }
    function draw(def) {
        def.el.querySelector('h2').textContent = T(def.title);
        def.el.querySelector('.lede').textContent = T(def.lede);
        const spec = def.spec();
        if (def.chart) def.chart.update(spec);
        else def.chart = def.kind === 'table' ? def.makeTable(def.host, spec) : new B.Charts.XYChart(def.host, spec);
        def.setTakeaway(def.takeaway ? def.takeaway() : '');
    }
    async function runCard(def) {
        if (def.running) return;
        def.running = true;
        if (def.btn) def.btn.disabled = true;
        def.host.style.opacity = '0.6';
        try {
            def.mc = await def.run();
            draw(def);
        } finally {
            def.running = false;
            if (def.btn) def.btn.disabled = false;
            def.host.style.opacity = '';
            progress('');
        }
    }

    // ================= 1. QBER vs eavesdropping =================
    card({
        id: 'qber-vs-eve',
        title: 'Eavesdropping leaves a fingerprint',
        lede: 'QBER of the sifted key as Eve intercept–resends a growing share of the pulses. Line: theory. Dots: photon-level Monte Carlo.',
        params: `${lbl('Intrinsic channel error')} <select data-k="e"><option value="0">0%</option><option value="0.02" selected>2%</option><option value="0.05">5%</option></select>
                 ${lbl('Pulses per point')} <select data-k="n"><option value="4000">4 000</option><option value="20000" selected>20 000</option></select>`,
        e() { return +this.q('[data-k="e"]').value; },
        spec() {
            const e = this.e();
            const theory = [];
            for (let f = 0; f <= 1.0001; f += 0.02) theory.push([+f.toFixed(2), B.qberInterceptResend(f, e)]);
            const series = [{ name: T('Theory: e(1 − f/2) + f/4'), slot: 1, type: 'line', data: theory }];
            if (this.mc) series.push({ name: T('Monte Carlo'), slot: 2, type: 'points', data: this.mc });
            return {
                title: T('QBER rises linearly with the fraction of pulses Eve attacks'),
                subtitle: T('Intercept–resend, random basis · intrinsic error {e}%', { e: (e * 100).toFixed(0) }),
                x: { label: T('Fraction of pulses intercepted'), min: 0, max: 1, fmt: pctFmt(0), valueFmt: pctFmt(0) },
                y: { label: 'QBER', min: 0, max: 0.3, fmt: pctFmt(0), valueFmt: pctFmt(1) },
                series, refs: [{ axis: 'y', value: B.QBER_THRESHOLD, label: T('11% abort threshold') }]
            };
        },
        takeaway() {
            const e = this.e();
            const fMax = (B.QBER_THRESHOLD - e) / (0.25 - e / 2);
            return T('With {e}% intrinsic error, Eve can intercept at most <b>{f}%</b> of pulses before the alarm trips — and even then privacy amplification removes what she learned.',
                { e: (e * 100).toFixed(0), f: (fMax * 100).toFixed(0) });
        },
        async run() {
            const e = this.e(), N = +this.q('[data-k="n"]').value;
            const rng = B.makeRng(seed('qber'));
            const pts = [];
            for (let f = 0; f <= 1.0001; f += 0.1) {
                const P = Object.assign(B.defaultParams(), { misalign: misalignFor(e), eve: { mode: 'intercept', fraction: f } });
                const agg = await runPulses(P, N, rng, T('QBER vs Eve · f = {f}%', { f: (f * 100).toFixed(0) }));
                pts.push([+f.toFixed(1), agg[0].E]);
            }
            return pts;
        }
    });

    // ================= 2. Information race =================
    card({
        id: 'information',
        title: 'Why the threshold is 11%',
        lede: "A secret key exists while Bob knows more about Alice's bits than Eve does. Each curve is mutual information per sifted bit.",
        spec() {
            const data = k => { const out = []; for (let q = 0; q <= 0.2500001; q += 0.0025) out.push([+q.toFixed(4), B.info[k](q)]); return out; };
            return {
                title: T("Bob's information vs Eve's, as the error rate grows"),
                subtitle: T('I(A:B) = 1 − h(Q); Eve: intercept–resend, optimal individual (cloning) and coherent-attack bound h(Q)'),
                x: { label: 'QBER', min: 0, max: 0.25, fmt: pctFmt(0), valueFmt: pctFmt(1) },
                y: { label: T('Bits of information per sifted bit'), min: 0, max: 1, valueFmt: v => v.toFixed(3) },
                series: [
                    { name: 'Bob I(A:B)', slot: 1, type: 'line', data: data('aliceBob') },
                    { name: T('Eve · intercept–resend'), slot: 2, type: 'line', data: data('interceptResend') },
                    { name: T('Eve · optimal individual'), slot: 3, type: 'line', data: data('optimalIndividual') },
                    { name: T('Eve · coherent bound h(Q)'), slot: 4, type: 'line', data: data('collective') }
                ],
                refs: [{ axis: 'x', value: B.QBER_THRESHOLD, label: '11.0%' }]
            };
        },
        takeaway() {
            let qi = 0;
            for (let q = 0.05; q < 0.25; q += 0.0001) if (B.info.aliceBob(q) <= B.info.optimalIndividual(q)) { qi = q; break; }
            return T('Against the strongest attacks allowed by quantum mechanics, Bob stays ahead only while QBER &lt; <b>{thr}%</b> (where 1 − h(Q) = h(Q)). Restricting Eve to individual attacks would push the limit to {qi}%.',
                { thr: (B.QBER_THRESHOLD * 100).toFixed(1), qi: (qi * 100).toFixed(1) });
        }
    });

    // ================= 3. Sampling statistics =================
    card({
        id: 'sampling',
        title: 'Catching Eve needs enough samples',
        lede: 'Distribution of the estimated QBER over 500 sessions, honest channel (2% error) vs Eve intercepting half of the pulses.',
        params: `${lbl('Bits sacrificed per session')} <select data-k="k"><option value="20">20</option><option value="50" selected>50</option><option value="200">200</option><option value="1000">1 000</option></select>`,
        spec() {
            const k = +this.q('[data-k="k"]').value;
            const bw = this.mc ? this.mc.bw : 0.02;
            const series = [
                { name: T('Honest channel'), slot: 1, type: 'step-area', binWidth: bw, data: this.mc ? this.mc.honest : [] },
                { name: T('Eve on 50% of pulses'), slot: 2, type: 'step-area', binWidth: bw, data: this.mc ? this.mc.eve : [] }
            ];
            return {
                title: T('QBER estimates from {k} sacrificed bits per session', { k }),
                subtitle: T('Monte Carlo, 500 sessions each · expected QBER 2% (honest) vs 14% (Eve)'),
                x: { label: T('Estimated QBER'), min: 0, max: 0.4, fmt: pctFmt(0), valueFmt: pctFmt(1) },
                y: { label: T('Share of sessions'), min: 0, max: this.mc ? this.mc.ymax : 0.5, fmt: pctFmt(0), valueFmt: pctFmt(1) },
                series, refs: [{ axis: 'x', value: B.QBER_THRESHOLD, label: T('abort above 11%') }]
            };
        },
        takeaway() {
            if (!this.mc) return T('Press <b>Run simulation</b> to sample 2 × 500 sessions.');
            return T('With {k} sampled bits, Eve is caught in <b>{d}%</b> of sessions and honest sessions are falsely aborted <b>{fa}%</b> of the time. Larger samples separate the two cleanly — one reason real systems work with blocks of 10⁵ bits or more.',
                { k: this.mc.k, d: (this.mc.detect * 100).toFixed(1), fa: (this.mc.falseAlarm * 100).toFixed(1) });
        },
        async run() {
            const k = +this.q('[data-k="k"]').value, M = 500;
            const rng = B.makeRng(seed('sampling' + k));
            const e = 0.02;
            const estimates = async (eve, label) => {
                const P = Object.assign(B.defaultParams(), { misalign: misalignFor(e), eve });
                const ctx = B.prepareChannel(P), out = {}, res = [];
                for (let s = 0; s < M; s++) {
                    let got = 0, err = 0;
                    while (got < k) {
                        B.simulatePulse(P, ctx, rng, undefined, out);
                        if (out.click && out.aBasis === out.bBasis) { got++; if (out.aBit !== out.bBit) err++; }
                    }
                    res.push(err / k);
                    if (s % 50 === 0) { progress(T('{label} · session {s}/{M}', { label, s, M })); await tick(); }
                }
                return res;
            };
            const hon = await estimates({ mode: 'none', fraction: 1 }, T('Honest sessions'));
            const evs = await estimates({ mode: 'intercept', fraction: 0.5 }, T('Eve sessions'));
            const bw = Math.max(0.01, 1 / k);
            const hist = arr => {
                const bins = new Map();
                arr.forEach(v => { const b = Math.round(v / bw); bins.set(b, (bins.get(b) || 0) + 1); });
                const out = [];
                for (let b = 0; b * bw <= 0.4 + 1e-9; b++) out.push([+(b * bw).toFixed(4), (bins.get(b) || 0) / arr.length]);
                return out;
            };
            const honest = hist(hon), eve = hist(evs);
            const ymax = Math.min(1, Math.ceil(Math.max(...honest.map(d => d[1]), ...eve.map(d => d[1])) * 10 + 0.5) / 10);
            const thr = B.QBER_THRESHOLD;
            return {
                k, bw, honest, eve, ymax,
                detect: evs.filter(v => v > thr).length / M,
                falseAlarm: hon.filter(v => v > thr).length / M
            };
        }
    });

    // ================= 4. Key rate vs distance =================
    card({
        id: 'distance',
        title: 'Decoy states extend the reach',
        lede: 'Secret key per signal pulse vs fiber length for a weak-coherent BB84 system. Lines: asymptotic theory at the optimal μ. Dots: photon-level Monte Carlo with a vacuum + weak decoy (ν = 0.1).',
        params: `${lbl('Pulses per point')} <select data-k="n"><option value="1000000">1 M</option><option value="4000000" selected>4 M</option></select>`,
        theory() {
            const m = hw();
            const sps = [], inf = [], vw = [], gllp = [];
            for (let L = 0; L <= 220; L += 2) {
                sps.push([L, B.rateSPS(L, m)]);
                inf.push([L, B.bestOverMu(mu => B.rateInfiniteDecoy(L, m, mu)).rate]);
                vw.push([L, B.bestOverMu(mu => B.rateVacuumWeak(L, m, mu, 0.1), 0.12).rate]);
                gllp.push([L, B.bestOverMu(mu => B.rateGLLP(L, m, mu)).rate]);
            }
            return { sps, inf, vw, gllp };
        },
        spec() {
            const t = this.theory();
            this._t = t;
            const series = [
                { name: T('Ideal single-photon source'), slot: 4, type: 'line', data: t.sps },
                { name: T('Decoy · infinite'), slot: 1, type: 'line', data: t.inf },
                { name: T('Decoy · vacuum + weak'), slot: 3, type: 'line', data: t.vw },
                { name: T('No decoy (GLLP)'), slot: 2, type: 'line', data: t.gllp }
            ];
            if (this.mc) series.push({ name: T('Monte Carlo · vacuum + weak'), slot: 3, type: 'points', data: this.mc });
            return {
                title: T('Without decoy states, multi-photon pulses cap the distance'),
                subtitle: T('Hardware model: {hw} · α = {a} dB/km · e_d = {ed}% · f = {f}', { hw: T(hw().label), a: hw().alpha, ed: (hw().ed * 100).toFixed(1), f: hw().f }),
                height: 400,
                x: { label: T('Fiber length (km)'), min: 0, max: 220, valueFmt: v => v + ' km' },
                y: { label: T('Secret key per signal pulse'), type: 'log', min: 1e-8, max: 1e-1 },
                series
            };
        },
        takeaway() {
            const t = this._t || this.theory();
            const reach = arr => { let r = 0; arr.forEach(d => { if (d[1] > 0) r = d[0]; }); return r; };
            return T('Maximum distance: no decoy ≈ <b>{g} km</b>, vacuum + weak decoy ≈ <b>{v} km</b>, infinite decoy ≈ <b>{i} km</b>. Without decoys every multi-photon pulse must be assumed leaked to a PNS attack.',
                { g: reach(t.gllp), v: reach(t.vw), i: reach(t.inf) });
        },
        async run() {
            const m = hw(), N = +this.q('[data-k="n"]').value;
            const rng = B.makeRng(seed('distance'));
            const pts = [];
            for (const L of [0, 25, 50, 75, 100, 125]) {
                const mu = B.bestOverMu(x => B.rateVacuumWeak(L, m, x, 0.1), 0.12).mu || 0.5;
                const agg = await runPulses(decoyParams(m, L, mu, 0.1), N, rng, T('Distance · {L} km', { L }));
                const est = decoyFromAgg(agg, m, mu, 0.1);
                pts.push([L, est.rate > 0 ? est.rate : null]);
            }
            return pts;
        }
    });

    // ================= 5. PNS vs decoy =================
    card({
        id: 'pns-decoy',
        kind: 'table',
        title: 'Decoy states expose a photon-number-splitting attack',
        lede: "Eve blocks single-photon pulses, keeps one photon of every multi-photon pulse and uses a lossless line so Bob's count rate and QBER look normal. Only the decoy pulses — which she cannot tell apart — reveal her.",
        params: `${lbl('Fiber length')} <select data-k="L"><option value="25">25 km</option><option value="50" selected>50 km</option><option value="75">75 km</option></select>
                 ${lbl('Pulses')} <select data-k="n"><option value="2000000">2 M</option><option value="6000000" selected>6 M</option></select>`,
        makeTable(host, spec) {
            const api = {
                spec,
                render() {
                    const s = this.spec;
                    host.innerHTML = '';
                    const t = document.createElement('table');
                    t.className = 'facts';
                    const hr = t.createTHead().insertRow();
                    s.header.forEach(h => { const th = document.createElement('th'); th.textContent = h; hr.appendChild(th); });
                    const tb = t.createTBody();
                    s.rows.forEach(r => {
                        const tr = tb.insertRow();
                        r.forEach((v, i) => {
                            const td = tr.insertCell();
                            if (v && typeof v === 'object') { td.textContent = v.text; td.className = v.cls; } else td.textContent = v;
                            if (i === 0) td.style.textAlign = 'left';
                        });
                    });
                    host.appendChild(t);
                },
                update(spec2) { this.spec = spec2; this.render(); },
                toggleTable() { },
                csv() { return [this.spec.header].concat(this.spec.rows.map(r => r.map(v => (v && typeof v === 'object') ? v.text : v))).map(r => r.map(c => `"${c}"`).join(',')).join('\n'); },
                layout() { return { W: 0, H: 0 }; }
            };
            api.render();
            return api;
        },
        spec() {
            const header = [T('Quantity'), T('Honest channel'), T('PNS attack')];
            if (!this.mc) return { header, rows: [[T('Press “Run simulation”'), '—', '—']] };
            const { honest: a, pns: b } = this.mc;
            const sci = v => v.toExponential(2), pc = v => (v * 100).toFixed(2) + '%';
            const verdict = r => r > 0 ? { text: T('secure key ✓'), cls: 'verdict-good' } : { text: T('abort ✗'), cls: 'verdict-bad' };
            return {
                header,
                rows: [
                    [T('Signal gain Q_μ (what Bob sees)'), sci(a.agg[0].Q), sci(b.agg[0].Q)],
                    [T('Signal QBER E_μ'), pc(a.agg[0].E), pc(b.agg[0].E)],
                    [T('Naive key rate, ignoring multi-photon pulses'), sci(a.naive), sci(b.naive)],
                    [T('Decoy gain Q_ν'), sci(a.agg[1].Q), sci(b.agg[1].Q)],
                    [T('Vacuum gain Y₀'), sci(a.agg[2].Q), sci(b.agg[2].Q)],
                    [T('Single-photon yield bound Y₁ᴸ'), sci(a.est.Y1L), sci(b.est.Y1L)],
                    [T('Decoy-state key rate R'), sci(Math.max(0, a.est.rate)), sci(Math.max(0, b.est.rate))],
                    [T('Verdict with decoy analysis'), verdict(a.est.rate), verdict(b.est.rate)]
                ]
            };
        },
        takeaway() {
            if (!this.mc) return '';
            const { honest: a, pns: b } = this.mc;
            return T("Bob's signal gain changes by only {g}% and the QBER stays at the normal level (Eve adds no errors), so a naive analysis happily makes a key Eve knows. The decoy gain drops {d}×, the single-photon yield bound collapses and the decoy-state analysis aborts.",
                { g: (Math.abs(b.agg[0].Q / a.agg[0].Q - 1) * 100).toFixed(0), d: (a.agg[1].Q / Math.max(1e-12, b.agg[1].Q)).toFixed(1) });
        },
        async run() {
            const m = hw(), L = +this.q('[data-k="L"]').value, N = +this.q('[data-k="n"]').value;
            const mu = 0.5, nu = 0.1;
            const rng = B.makeRng(seed('pns' + L));
            const one = async (eve, label) => {
                const agg = await runPulses(decoyParams(m, L, mu, nu, eve), N, rng, label);
                const est = decoyFromAgg(agg, m, mu, nu);
                const naive = (agg[0].matched / agg[0].sent) * agg[0].Q * (1 - B.h(agg[0].E) - m.f * B.h(agg[0].E));
                return { agg, est, naive };
            };
            return {
                honest: await one({ mode: 'none', fraction: 1 }, T('Honest channel')),
                pns: await one({ mode: 'pns', fraction: 1 }, T('PNS attack'))
            };
        }
    });

    // ================= 6. Finite-key effects =================
    card({
        id: 'finite-key',
        title: 'Finite blocks cost key',
        lede: 'Secret fraction of the sifted key vs block size, with the statistical penalty of estimating the QBER from a finite sample (ε_sec = 10⁻¹⁰, ε_cor = 10⁻¹², f = 1.16).',
        spec() {
            const qs = [0.01, 0.03, 0.05];
            const series = qs.map((q, i) => {
                const data = [];
                for (let e = 3; e <= 10.0001; e += 0.25) data.push([Math.pow(10, e), B.finiteKeyFraction(Math.pow(10, e), q, 1.16, 1e-10, 1e-12)]);
                return { name: `QBER ${(q * 100).toFixed(0)}%`, slot: i + 1, type: 'line', data, endLabel: T('→ {v} asymptotic', { v: B.practicalFraction(q, 1.16).toFixed(2) }) };
            });
            return {
                title: T('Real systems need 10⁵–10⁷ bits per block'),
                subtitle: T('Finite-key bound after Tomamichel et al. 2012, optimal sampling split'),
                x: { label: T('Sifted bits per block'), type: 'log', min: 1e3, max: 1e10, valueFmt: v => v.toExponential(1) },
                y: { label: T('Secret key / sifted bits'), min: 0, max: 1, valueFmt: v => v.toFixed(3) },
                series
            };
        },
        takeaway() {
            const need = (q, frac) => { for (let e = 2; e <= 12; e += 0.01) { const N = Math.pow(10, e); if (B.finiteKeyFraction(N, q, 1.16, 1e-10, 1e-12) >= frac * B.practicalFraction(q, 1.16)) return N; } return Infinity; };
            const first = need(0.03, 0.01), ninety = need(0.03, 0.9);
            const f = v => {
                if (!isFinite(v)) return '∞';
                const e = Math.floor(Math.log10(v)), m = Math.round(v / Math.pow(10, e));
                return (m > 1 ? m + ' × ' : '') + '10' + String(e).split('').map(c => '⁰¹²³⁴⁵⁶⁷⁸⁹'[+c]).join('');
            };
            return T('At 3% QBER, key appears only after ≈ <b>{a}</b> sifted bits and reaches 90% of the asymptotic rate after ≈ <b>{b}</b>. A 100-cell grid demonstrates the protocol, it cannot certify a key.',
                { a: f(first), b: f(ninety) });
        }
    });

    // ================= 7. Cascade + PA pipeline vs theory =================
    card({
        id: 'pipeline',
        title: 'The implemented pipeline matches theory',
        lede: "Secret fraction produced by this simulator's own Cascade + Toeplitz pipeline, compared with the Shor–Preskill bound (perfect error correction) and with a practical code efficiency f = 1.16.",
        params: `${lbl('Sifted bits per point')} <select data-k="n"><option value="2000">≈ 2 000</option><option value="8000" selected>≈ 8 000</option></select>`,
        spec() {
            const sp = [], pr = [];
            for (let q = 0; q <= 0.1200001; q += 0.002) { sp.push([+q.toFixed(3), B.shorPreskill(q)]); pr.push([+q.toFixed(3), B.practicalFraction(q, 1.16)]); }
            const series = [
                { name: 'Shor–Preskill 1 − 2h(Q)', slot: 1, type: 'line', data: sp },
                { name: T('Practical 1 − (1 + f)h(Q), f = 1.16'), slot: 2, type: 'line', data: pr }
            ];
            if (this.mc) series.push({ name: T('Simulated Cascade + PA'), slot: 3, type: 'points', data: this.mc.pts });
            return {
                title: T('Secret fraction after error correction and privacy amplification'),
                subtitle: T('Asymptotic key length ℓ = n[1 − h(Q)] − leak_EC, Q estimated from 10% of the sifted bits'),
                x: { label: 'QBER', min: 0, max: 0.12, fmt: pctFmt(0), valueFmt: pctFmt(1) },
                y: { label: T('Secret key / corrected bits'), min: 0, max: 1, valueFmt: v => v.toFixed(3) },
                series, refs: [{ axis: 'x', value: B.QBER_THRESHOLD, label: '11%' }]
            };
        },
        takeaway() {
            if (!this.mc) return T('Press <b>Run simulation</b> to push real Cascade sessions through the pipeline.');
            return T('Measured Cascade efficiency: f = <b>{f}</b> on average (1.00 would be the Shannon limit). Every extra parity bit Cascade reveals is a bit privacy amplification must remove.',
                { f: this.mc.fMean.toFixed(2) });
        },
        async run() {
            const nTarget = +this.q('[data-k="n"]').value;
            const rng = B.makeRng(seed('pipeline'));
            const pts = [], fs = [];
            for (let q = 0.005; q <= 0.1051; q += 0.01) {
                const P = Object.assign(B.defaultParams(), { misalign: misalignFor(q) });
                const ctx = B.prepareChannel(P);
                const pulses = [];
                for (let i = 0; i < nTarget * 2; i++) pulses.push(B.simulatePulse(P, ctx, rng));
                const r = B.postProcess(pulses, { sampleFrac: 0.1, record: false, trackEve: false, hashKey: false }, rng);
                pts.push([+q.toFixed(3), r.aborted ? 0 : r.ell / r.keyIdx.length]);
                if (r.ecEfficiency) fs.push(r.ecEfficiency);
                progress(T('Pipeline · QBER {q}%', { q: (q * 100).toFixed(1) }));
                await tick();
            }
            return { pts, fMean: fs.reduce((a, b) => a + b, 0) / Math.max(1, fs.length) };
        }
    });

    async function runAll() {
        $('lab-run-all').disabled = true;
        try {
            for (const c of cards) if (c.run) await runCard(c);
        } finally {
            $('lab-run-all').disabled = false;
            progress(T('All simulations finished.'));
        }
    }
    async function exportAll() {
        for (const c of cards) {
            if (c.kind === 'table') { B.Charts.download(`bb84-${c.id}.csv`, new Blob([c.chart.csv()], { type: 'text/csv' })); continue; }
            await B.Charts.exportPNG(c.chart, 'bb84-' + c.id);
            await new Promise(r => setTimeout(r, 300));
        }
    }

    function init() {
        $('lab-run-all').addEventListener('click', runAll);
        $('lab-export-all').addEventListener('click', exportAll);
        $('lab-hw').addEventListener('change', () => cards.forEach(c => { if (c.id === 'distance' || c.id === 'pns-decoy') c.mc = null; draw(c); }));
    }

    B.Lab = {
        init, cards, runCard,
        relang: () => { cards.forEach(draw); progress(''); },
        rerender: () => cards.forEach(c => c.chart && c.chart.render())
    };
})();
