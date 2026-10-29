// Simulator tab: the six-step BB84 walkthrough on Alice's and Bob's grids.
(function () {
    'use strict';
    const B = window.BB84;
    const T = (s, p) => B.T(s, p);
    const $ = id => document.getElementById(id);
    const sleep = ms => new Promise(r => setTimeout(r, ms));

    const PRESETS = {
        textbook: { grid: 10, source: 'single', mu: 0.5, distance: 0, alpha: 0.2, misalign: 0, depol: 0, etaDet: 100, pDark: '0' },
        lab: { grid: 16, source: 'wcp', mu: 0.5, distance: 1, alpha: 0.2, misalign: 3, depol: 0, etaDet: 85, pDark: '1e-7' },
        metro: { grid: 20, source: 'wcp', mu: 0.5, distance: 25, alpha: 0.2, misalign: 5, depol: 0.5, etaDet: 80, pDark: '1e-6' },
        noisy: { grid: 12, source: 'single', mu: 0.5, distance: 5, alpha: 0.2, misalign: 12, depol: 3, etaDet: 90, pDark: '1e-5' }
    };
    const STEP_NAMES = ['Prepare', 'Transmit', 'Sift', 'Estimate', 'Correct', 'Amplify'];

    const S = {
        n: 100, step: 0, P: null, ctx: null, rng: null, pulses: [], bobChoice: null,
        pp: null, token: 0, busy: false, selected: -1, aborted: false, funnel: null,
        status: null, banner: null
    };

    // ---------- parameters ----------
    function readParams() {
        const P = B.defaultParams();
        P.source = $('source').value;
        P.mu = +$('mu').value || 0.5;
        P.distance = +$('distance').value || 0;
        P.alpha = +$('alpha').value || 0;
        P.misalign = +$('misalign').value || 0;
        P.depol = (+$('depol').value || 0) / 100;
        P.etaDet = Math.max(0.01, (+$('etaDet').value || 100) / 100);
        P.pDark = +$('pDark').value;
        P.eve = { mode: $('eve-mode').value, fraction: (+$('eve-fraction').value) / 100 };
        return P;
    }
    function postOpts() {
        return { sampleFrac: (+$('sample-frac').value || 25) / 100, security: $('security').value };
    }

    function updateHints() {
        const P = readParams();
        const eta = Math.pow(10, -P.alpha * P.distance / 10);
        const s2 = Math.pow(Math.sin(P.misalign * B.DEG), 2);
        const eInt = s2 + (2 * P.depol / 3) * (1 - 2 * s2);
        const det = P.source === 'single' ? eta * P.etaDet : 1 - Math.exp(-eta * P.etaDet * P.mu);
        $('channel-hint').textContent = T('Fiber transmission {eta}% · expected detection {det}% per pulse · intrinsic QBER ≈ {e}%',
            { eta: (eta * 100).toFixed(1), det: (det * 100).toFixed(1), e: (eInt * 100).toFixed(1) });
        $('mu-row').style.display = P.source === 'wcp' ? '' : 'none';
        $('fraction-row').style.display = (P.eve.mode === 'intercept' || P.eve.mode === 'pattern') ? '' : 'none';
        const eveHints = {
            none: 'No eavesdropper on the line.',
            intercept: 'Eve measures in a random basis and resends. Expect ≈ 25% errors on attacked pulses.',
            pns: P.source === 'single'
                ? 'A single-photon source has no spare photons — PNS gives Eve nothing.'
                : 'Eve keeps one photon from each multi-photon pulse and fakes the loss. No errors — invisible without decoy states.',
            pattern: "Eve knows Bob's bases in advance (e.g. a reused signature) and measures in them. No errors, full knowledge."
        };
        $('eve-hint').textContent = T(eveHints[P.eve.mode]);
        $('fiber-label').textContent = T('{d} km fiber', { d: P.distance });
        $('eve-badge').hidden = P.eve.mode === 'none';
    }

    function applyPreset(name) {
        const p = PRESETS[name];
        if (!p) return;
        $('grid-size').value = String(p.grid);
        $('source').value = p.source;
        $('mu').value = p.mu;
        $('distance').value = p.distance;
        $('alpha').value = p.alpha;
        $('misalign').value = p.misalign;
        $('depol').value = p.depol;
        $('etaDet').value = p.etaDet;
        $('pDark').value = p.pDark;
    }

    // ---------- drawing helpers ----------
    function polLine(phi, len) {
        const a = phi * B.DEG, x = len * Math.cos(a), y = -len * Math.sin(a);
        return `<line x1="${(-x).toFixed(2)}" y1="${(-y).toFixed(2)}" x2="${x.toFixed(2)}" y2="${y.toFixed(2)}"/>`;
    }
    function basisLines(basis) {
        const b = B.BASIS_ANGLE[basis];
        return `<g class="basis">${polLine(b, 9)}${polLine(b + 90, 9)}</g>`;
    }
    function cellsOf(grid) { return $(grid).children; }

    function initGrids() {
        S.n = +$('grid-size').value;
        ['alice-grid', 'bob-grid'].forEach(id => {
            const g = $(id);
            g.style.setProperty('--n', S.n);
            g.innerHTML = '';
            for (let i = 0; i < S.n * S.n; i++) {
                const c = document.createElement('div');
                c.className = 'cell';
                c.dataset.i = i;
                c.tabIndex = -1;
                c.addEventListener('click', () => onCellClick(id, i));
                g.appendChild(c);
            }
        });
    }

    function drawAlice(i) {
        const p = S.pulses[i], c = cellsOf('alice-grid')[i];
        c.className = 'cell on';
        let html = `<svg class="pol" viewBox="-10 -10 20 20">${polLine(p.phiA, 8)}</svg><span class="bit">${p.aBit}</span>`;
        if (S.P.source === 'wcp') html += `<span class="tag">${p.n}γ</span>`;
        c.innerHTML = html;
        if (p.n === 0) c.style.opacity = '0.55'; else c.style.opacity = '';
        c.title = T('Pulse {i}: {basis} basis, bit {bit} → |{state}⟩, {n} photon(s)',
            { i: i + 1, basis: B.BASIS_SYMBOL[p.aBasis], bit: p.aBit, state: B.STATE_NAME[p.aBasis][p.aBit], n: p.n });
    }

    function eveDot(p) {
        if (!$('eve-reveal').checked) return '';
        return (p.eve === 'measured' || p.eve === 'split') ? '<span class="eve-dot">E</span>' : '';
    }

    function drawBob(i) {
        const p = S.pulses[i], c = cellsOf('bob-grid')[i];
        if (p.click === 0) {
            c.className = 'cell lost';
            c.innerHTML = `<svg class="pol" viewBox="-10 -10 20 20">${basisLines(p.bBasis)}</svg><span>·</span>${eveDot(p)}`;
            c.title = T('Pulse {i}: no detector click', { i: i + 1 });
            return;
        }
        c.className = 'cell on';
        const seen = B.stateAngle(p.bBasis, p.bBit);
        c.innerHTML = `<svg class="pol" viewBox="-10 -10 20 20">${basisLines(p.bBasis)}${polLine(seen, 8)}</svg><span class="bit">${p.bBit}</span>${p.click === 2 ? '<span class="tag">2×</span>' : ''}${eveDot(p)}`;
        c.title = T('Pulse {i}: measured in {basis} → bit {bit}', { i: i + 1, basis: B.BASIS_SYMBOL[p.bBasis], bit: p.bBit });
    }

    function drawBobChoice() {
        const cells = cellsOf('bob-grid');
        for (let i = 0; i < cells.length; i++) {
            const b = S.bobChoice[i], c = cells[i];
            c.className = 'cell choosable' + (b === null ? '' : ' on');
            c.innerHTML = b === null ? '' : `<svg class="pol" viewBox="-10 -10 20 20"><g>${polLine(B.BASIS_ANGLE[b], 8)}${polLine(B.BASIS_ANGLE[b] + 90, 8)}</g></svg>`;
        }
    }

    // status line and banner keep their English template so a language switch can redraw them
    function setStatus(key, params) {
        S.status = key ? [key, params] : null;
        $('status').textContent = key ? T(key, params) : '';
    }
    function setBanner(key, params, ok) {
        S.banner = key ? [key, params, ok] : null;
        const b = $('banner');
        b.hidden = !key;
        b.textContent = key ? T(key, params) : '';
        b.classList.toggle('ok', !!ok);
    }
    function updateStepper() {
        document.querySelectorAll('#stepper li').forEach(li => {
            const k = +li.dataset.step;
            li.classList.toggle('done', k <= S.step);
            li.classList.toggle('current', k === S.step + 1 && !S.aborted && S.step < 6);
            li.classList.toggle('aborted', S.aborted && k === S.step);
        });
        const btn = $('btn-step');
        if (S.step === 0) btn.textContent = T('Start');
        else if (S.step >= 6 || S.aborted) btn.textContent = T('New session');
        else btn.textContent = T('Next: {step}', { step: T(STEP_NAMES[S.step]) });
        $('export-qasm').disabled = S.step < 2;
        $('export-json').disabled = S.step < 2;
    }

    // ---------- report ----------
    function tile(label, value, note) {
        return `<div class="tile"><div class="label">${T(label)}</div><div class="value">${value}</div><div class="note">${note || '&nbsp;'}</div></div>`;
    }
    function pct(x, d) { return (x * 100).toFixed(d === undefined ? 1 : d) + '%'; }

    function updateReport() {
        const N = S.pulses.length, pp = S.pp;
        const tiles = [];
        if (!N) {
            $('tiles').innerHTML = ['Pulses sent', 'Detected', 'Sifted', 'QBER', 'Leaked in EC', 'Final key'].map(l => tile(l, '—')).join('');
            renderFunnel([]);
            return;
        }
        const empty = S.pulses.filter(p => p.n === 0).length;
        tiles.push(tile('Pulses sent', N, S.P.source === 'wcp' ? T('{n} carried no photon', { n: empty }) : T('one photon each')));
        const det = S.step >= 2 ? S.pulses.filter(p => p.click > 0).length : null;
        tiles.push(tile('Detected', det === null ? '—' : det, det === null ? '' : T('{p} of pulses', { p: pct(det / N) })));
        tiles.push(tile('Sifted', S.step >= 3 ? pp.sifted.length : '—', S.step >= 3 ? T('bases matched') : ''));
        tiles.push(tile('QBER', S.step >= 4 ? pct(pp.qEst) : '—', S.step >= 4 ? T('estimated from {n} bits · true {q}', { n: pp.sampleIdx.length, q: pct(pp.qTrue) }) : ''));
        tiles.push(tile('Leaked in EC', S.step >= 5 && pp.ec ? pp.ec.leak : '—', S.step >= 5 && pp.ec
            ? T('{n} error(s) fixed{f}', { n: pp.ec.flips.length, f: pp.ecEfficiency ? ` · f = ${pp.ecEfficiency.toFixed(2)}` : '' }) : ''));
        tiles.push(tile('Final key', S.step >= 6 && pp.finalKey ? pp.ell : (S.aborted ? '0' : '—'), S.step >= 6 && pp.finalKey ? T('secret bits') : (S.aborted ? T('aborted') : '')));
        $('tiles').innerHTML = tiles.join('');

        const stages = [['Sent', N]];
        if (S.step >= 2) stages.push(['Detected', det]);
        if (S.step >= 3) stages.push(['Sifted', pp.sifted.length]);
        if (S.step >= 4) stages.push(['Kept after sampling', pp.keyIdx.length]);
        if (S.step >= 6) stages.push(['Secret key', pp.finalKey ? pp.ell : 0]);
        renderFunnel(stages);
    }

    function renderFunnel(stages) {
        const spec = {
            title: T('Where the bits go'), categories: stages.map(s => T(s[0])), values: stages.map(s => s[1]),
            slot: 1, width: 320, labelWidth: 128, valueLabel: T('Bits')
        };
        if (!S.funnel) S.funnel = new B.Charts.BarChart($('funnel'), spec);
        else S.funnel.update(spec);
    }

    function updateKeyOut() {
        const pp = S.pp;
        const eo = $('eve-out');
        if (S.step < 6 || !pp || !pp.finalKey) {
            $('key-out').textContent = S.aborted ? T('No key — session aborted.') : '—';
            eo.innerHTML = '';
            return;
        }
        $('key-out').textContent = pp.finalKey.join('');
        const mode = S.P.eve.mode;
        const touched = S.pulses.filter(p => p.eve === 'measured' || p.eve === 'split').length;
        const leakNote = T('Cascade revealed <b>{leak}</b> parities in public.', { leak: pp.ec.leak });
        const after = T("After Toeplitz hashing, Eve's information about the {ell}-bit key is <b>{info} bit(s)</b>", { ell: pp.ell, info: pp.eveInfoAfter });
        const known = { known: pp.eveKnownBefore, n: pp.keyIdx.length, touched };
        let msg;
        if (mode === 'none') msg = T('{leakNote} {after} — privacy amplification removed what the parities revealed.', { leakNote, after });
        else if (mode === 'pns') msg = T('Eve split <b>{touched}</b> multi-photon pulses and added no errors. She knew <b>{known}</b> of {n} key bits exactly. {after}. {extra}',
            Object.assign({ after, extra: pp.eveInfoAfter > 0 ? T('The QBER looked clean, so hashing was too weak — decoy states (see Lab) are the fix.') : '' }, known));
        else msg = T('Eve touched <b>{touched}</b> pulses and knew <b>{known}</b> of {n} key bits exactly. {leakNote} {after}.', Object.assign({ leakNote, after }, known));
        eo.innerHTML = msg;
    }

    // ---------- inspector ----------
    function onCellClick(grid, i) {
        if (grid === 'bob-grid' && S.bobChoice && S.step < 2 && !$('sign-canvas')) {
            S.bobChoice[i] = S.bobChoice[i] === 0 ? 1 : 0;
            drawBobChoice();
            return;
        }
        if (!S.pulses.length) return;
        document.querySelectorAll('.cell.selected').forEach(c => c.classList.remove('selected'));
        cellsOf('alice-grid')[i].classList.add('selected');
        cellsOf('bob-grid')[i].classList.add('selected');
        S.selected = i;
        renderInspector(i);
    }

    function inspectorHint() {
        $('inspector').innerHTML = `<p class="hint">${T('Click any cell to see its quantum state, the measurement bases and the Born-rule probabilities.')}</p>`;
    }

    function renderInspector(i) {
        const p = S.pulses[i];
        if (!p) return;
        const TH = B.Charts.THEMES[B.Charts.currentTheme()];
        const R = 80, cx = 110, cy = 100;
        const ln = (phi, len, color, w) => {
            const a = phi * B.DEG, x = len * Math.cos(a), y = -len * Math.sin(a);
            return `<line x1="${cx - x}" y1="${cy - y}" x2="${cx + x}" y2="${cy + y}" stroke="${color}" stroke-width="${w}" stroke-linecap="round"/>`;
        };
        const lbl = (phi, len, str, color) => {
            const a = phi * B.DEG;
            return `<text x="${cx + len * Math.cos(a)}" y="${cy - len * Math.sin(a)}" font-size="11" fill="${color}" text-anchor="middle">${str}</text>`;
        };
        let svg = `<svg viewBox="0 0 220 200" role="img" aria-label="${T('Polarisation diagram')}"><circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="${TH.grid}" stroke-width="1"/>`;
        [0, 45, 90, 135].forEach(a => { svg += lbl(a, R + 12, ['H', 'D', 'V', 'A'][a / 45], TH.muted); });
        const after2 = S.step >= 2;
        if (after2) {
            const b = B.BASIS_ANGLE[p.bBasis];
            svg += ln(b, R, TH.axis, 1) + ln(b + 90, R, TH.axis, 1);
            if (p.eve === 'measured') {
                const e = B.BASIS_ANGLE[p.eveBasis];
                svg += ln(e, R - 6, TH.series[1], 1.5) + ln(e + 90, R - 6, TH.series[1], 1.5);
            }
        }
        svg += ln(p.phiA, R - 10, TH.series[0], 4);
        if (after2 && p.arrived > 0 && Math.abs(B.normAngle(p.phiB) - B.normAngle(p.phiA)) > 0.01) svg += ln(p.phiB, R - 22, TH.series[2], 3);
        svg += '</svg>';

        const amp = B.amplitudes(p.phiA);
        const rows = [];
        rows.push(['Alice', T('{basis} basis, bit {bit} → |{state}⟩ = {ket}',
            { basis: B.BASIS_SYMBOL[p.aBasis], bit: p.aBit, state: B.STATE_NAME[p.aBasis][p.aBit], ket: B.STATE_KET[p.aBasis][p.aBit] })]);
        rows.push([T('State'), `|ψ⟩ = ${amp[0].toFixed(3)}|H⟩ ${amp[1] < 0 ? '−' : '+'} ${Math.abs(amp[1]).toFixed(3)}|V⟩`]);
        rows.push([T('Photons'), S.P.source === 'wcp' ? T('{n} (Poisson, μ = {mu})', { n: p.n, mu: S.P.mu }) : T('1 (single-photon source)')]);
        if (after2) {
            const eveText = {
                none: () => T('did nothing'),
                measured: () => T('measured in {eb} → got {bit}, resent |{state}⟩', { eb: B.BASIS_SYMBOL[p.eveBasis], bit: p.eveBit, state: B.STATE_NAME[p.eveBasis][p.eveBit] }) +
                    T(p.eveBasis === p.aBasis ? ' (right basis: no disturbance)' : ' (wrong basis: 50% chance of an error)'),
                split: () => T('kept one photon in memory, forwarded the rest losslessly'),
                blocked: () => T('blocked the pulse'),
                forwarded: () => T('forwarded it losslessly (no information)')
            }[p.eve]();
            rows.push(['Eve', eveText]);
            rows.push([T('Channel'), T('{n} photon(s) arrived', { n: p.arrived }) + (p.noise ? T(' · Pauli {p} error', { p: p.noise }) : '') + (S.P.misalign ? T(' · drift {d}°', { d: S.P.misalign }) : '')]);
            const p0 = p.p0;
            rows.push(['Bob', T('{basis} basis · Born rule P(0) = {p0}, P(1) = {p1}', { basis: B.BASIS_SYMBOL[p.bBasis], p0: p0.toFixed(3), p1: (1 - p0).toFixed(3) }) +
                `<div class="prob-bar"><span style="width:${p0 * 100}%;background:${TH.series[0]}"></span><span style="width:${(1 - p0) * 100}%;background:${TH.series[1]}"></span></div>`]);
            rows.push([T('Result'), p.click === 0 ? T('no click (photon lost or not detected)') :
                T(p.click === 2 ? 'double click → random bit {bit}' : 'click → bit {bit}', { bit: p.bBit }) + (p.darkOnly ? T(' (dark count!)') : '')]);
        }
        if (S.step >= 3 && S.pp) {
            let fate = T(p.click === 0 ? 'discarded: no detection' : (p.aBasis !== p.bBasis ? 'discarded: bases differ' : 'kept at sifting'));
            if (S.step >= 4 && S.pp.sampleIdx.includes(i)) fate = T('revealed for QBER estimation') + (p.aBit !== p.bBit ? T(' — error found') : '');
            else if (S.step >= 5 && S.pp.ecFlipPulses && S.pp.ecFlipPulses.includes(i)) fate = T('error found and fixed by Cascade');
            else if (S.step >= 6 && S.pp.finalKey && S.pp.keyIdx.includes(i)) fate = T('went into the hashed final key');
            rows.push([T('Fate'), fate]);
        }
        $('inspector').innerHTML = `<p><b>${T('Pulse {i}', { i: i + 1 })}</b></p>${svg}<dl>${rows.map(r => `<dt>${r[0]}</dt><dd>${r[1]}</dd>`).join('')}</dl>
            <p class="hint">${T(after2 ? "Blue: Alice's state · gray: Bob's basis · orange: Eve's basis · aqua: state reaching Bob" : "Blue: Alice's state · later steps add Eve and Bob")}</p>`;
    }

    // ---------- the six steps ----------
    async function animate(token, count, fn, fast) {
        const delay = fast ? 0 : Math.max(2, Math.round(900 / count));
        for (let i = 0; i < count; i++) {
            if (token !== S.token) return false;
            fn(i);
            if (delay && i % (count > 200 ? 3 : 1) === 0) await sleep(delay);
        }
        return token === S.token;
    }

    async function step1(fast) {
        const token = S.token;
        S.P = readParams();
        S.ctx = B.prepareChannel(S.P);
        S.rng = B.makeRng($('seed').value.trim() || undefined);
        S.pulses = [];
        const N = S.n * S.n;
        for (let i = 0; i < N; i++) S.pulses.push(B.prepareAlice(S.P, S.rng));
        setStatus('Step 1 · Alice draws a random basis and bit for every pulse and encodes them in photon polarisation.');
        if (!(await animate(token, N, drawAlice, fast))) return false;
        S.step = 1;
        if (S.bobChoice) {
            setStatus(S.bobChoice.includes(null)
                ? 'Alice is ready. Bob still has cells without a basis — click them, use Fill, or draw a signature.'
                : 'Alice is ready. Press Next to send the photons to Bob.');
        } else {
            setStatus(S.P.source === 'wcp'
                ? 'Alice is ready. The γ badge shows the photon number of each laser pulse — many are empty.'
                : 'Alice is ready. Press Next to send the photons through the fiber.');
        }
        return true;
    }

    async function step2(fast) {
        if (S.bobChoice && S.bobChoice.includes(null)) {
            setStatus('Bob must choose a basis for every cell first (click cells, Fill, Random or Draw).');
            return false;
        }
        const token = S.token;
        const N = S.pulses.length;
        for (let i = 0; i < N; i++) B.propagate(S.P, S.ctx, S.rng, S.pulses[i], S.bobChoice ? S.bobChoice[i] : undefined);
        $('bob-tools').hidden = true;
        setStatus('Step 2 · Photons cross the fiber; Eve may interfere; Bob measures each one in his own basis.');
        if (!(await animate(token, N, drawBob, fast))) return false;
        S.step = 2;
        const det = S.pulses.filter(p => p.click > 0).length;
        const dbl = S.pulses.filter(p => p.click === 2).length;
        setStatus('Bob registered {det} of {n} pulses{dbl}. Next, the bases are compared in public.',
            { det, n: N, dbl: dbl ? T(' ({n} double clicks)', { n: dbl }) : '' });
        return true;
    }

    async function step3(fast) {
        const token = S.token;
        S.pp = B.postProcess(S.pulses, postOpts(), S.rng);
        const keep = new Set(S.pp.sifted);
        const N = S.pulses.length;
        setStatus('Step 3 · Sifting: Alice and Bob announce their bases (never the bits) and drop every mismatch and every missing click.');
        if (!(await animate(token, N, i => {
            if (!keep.has(i)) {
                cellsOf('alice-grid')[i].classList.add('out');
                cellsOf('bob-grid')[i].classList.add('out');
            }
        }, fast))) return false;
        S.step = 3;
        setStatus('{k} of {n} pulses survive sifting (bases matched and Bob saw a click).', { k: S.pp.sifted.length, n: N });
        return true;
    }

    function markBoth(i, cls, tagText) {
        [cellsOf('alice-grid')[i], cellsOf('bob-grid')[i]].forEach(c => {
            c.classList.add(cls);
            if (tagText) {
                let t = c.querySelector('.tag');
                if (!t) { t = document.createElement('span'); t.className = 'tag'; c.appendChild(t); }
                t.textContent = tagText;
            }
        });
    }

    async function step4(fast) {
        const token = S.token, pp = S.pp;
        const errs = new Set(pp.sampleErrors);
        setStatus('Step 4 · A random sample of sifted bits is revealed to measure the quantum bit error rate (QBER).');
        if (!(await animate(token, pp.sampleIdx.length, k => {
            const i = pp.sampleIdx[k];
            markBoth(i, 'sample', 'S');
            if (errs.has(i)) markBoth(i, 'err', '✗');
        }, fast))) return false;
        S.step = 4;
        if (pp.aborted && pp.stage === 'estimate') {
            abort(pp);
            return false;
        }
        setStatus('QBER = {q} ({e} / {n}), below the {thr} threshold, so the session continues. Sampled bits are now public and are dropped.',
            { q: pct(pp.qEst), e: pp.sampleErrors.length, n: pp.sampleIdx.length, thr: pct(B.QBER_THRESHOLD) });
        return true;
    }

    async function step5(fast) {
        const token = S.token, pp = S.pp;
        setStatus("Step 5 · Cascade error correction: compare block parities, binary-search each mismatch, fix Bob's bit.");
        const flips = pp.ecFlipPulses || [];
        if (!(await animate(token, flips.length, k => {
            const i = flips[k];
            const c = cellsOf('bob-grid')[i];
            c.classList.add('fixed');
            const bit = c.querySelector('.bit');
            if (bit) bit.textContent = S.pulses[i].aBit;
            let t = c.querySelector('.tag');
            if (!t) { t = document.createElement('span'); t.className = 'tag'; c.appendChild(t); }
            t.textContent = '↻';
        }, fast || flips.length < 3))) return false;
        S.step = 5;
        if (pp.aborted && pp.stage === 'ec') {
            abort(pp);
            return false;
        }
        setStatus('Cascade fixed {n} error(s) using {leak} public parity bits (4 passes, first block size {k1}). Keys now agree.',
            { n: flips.length, leak: pp.ec.leak, k1: pp.ec.k1 });
        return true;
    }

    async function step6(fast) {
        const token = S.token, pp = S.pp;
        if (pp.aborted) {
            S.step = 6;
            abort(pp);
            return false;
        }
        setStatus('Step 6 · Privacy amplification: a random Toeplitz matrix hashes the key down to ℓ bits.');
        if (!(await animate(token, pp.keyIdx.length, k => {
            const i = pp.keyIdx[k];
            [cellsOf('alice-grid')[i], cellsOf('bob-grid')[i]].forEach(c => { c.classList.remove('fixed'); c.classList.add('key'); });
        }, fast))) return false;
        S.step = 6;
        setStatus('Done. {n} corrected bits were compressed to a {ell}-bit secret key shared by Alice and Bob.', { n: pp.keyIdx.length, ell: pp.ell });
        if (pp.eveInfoAfter > 0) {
            // the protocol saw nothing wrong — only the god view reveals the leak
            setBanner('Alice and Bob believe they share a secure {ell}-bit key, but Eve knows {info} bit(s) of it. Their checks could not see this attack.',
                { ell: pp.ell, info: pp.eveInfoAfter });
        } else {
            setBanner("Secure key established: {ell} bits. Eve's information about it: 0 bits.", { ell: pp.ell }, true);
        }
        return true;
    }

    function abort(pp) {
        S.aborted = true;
        setStatus('Session aborted.');
        setBanner(pp.reasonKey, pp.reasonArgs);
        updateStepper();
        updateReport();
        updateKeyOut();
    }

    const STEPS = [step1, step2, step3, step4, step5, step6];

    async function next(fast) {
        if (S.busy) return false;
        if (S.step >= 6 || S.aborted) { reset(); return false; }
        S.busy = true;
        $('btn-step').disabled = true;
        $('btn-run').disabled = true;
        let ok = false;
        try {
            ok = await STEPS[S.step](fast);
        } finally {
            S.busy = false;
            $('btn-step').disabled = false;
            $('btn-run').disabled = false;
        }
        updateStepper();
        updateReport();
        updateKeyOut();
        if (S.selected >= 0) renderInspector(S.selected);
        return ok;
    }

    async function runAll() {
        if (S.step >= 6 || S.aborted) reset();
        while (S.step < 6 && !S.aborted) {
            const before = S.step;
            await next(true);
            if (S.step === before) break;
        }
    }

    function reset() {
        S.token++;
        S.step = 0;
        S.pulses = [];
        S.pp = null;
        S.aborted = false;
        S.selected = -1;
        const sc = $('sign-canvas');
        if (sc) sc.remove();
        $('apply-sig').hidden = true;
        initGrids();
        const mode = $('bob-mode').value;
        if (mode === 'random') {
            S.bobChoice = null;
            $('bob-tools').hidden = true;
        } else {
            S.bobChoice = new Array(S.n * S.n).fill(null);
            $('bob-tools').hidden = false;
            $('draw-btn').hidden = mode !== 'signature';
            drawBobChoice();
        }
        setBanner(null);
        setStatus(S.bobChoice ? "Choose Bob's bases (click cells, Fill or Draw), then press Start." : 'Press Start to begin a new session.');
        inspectorHint();
        updateHints();
        updateStepper();
        updateReport();
        updateKeyOut();
    }

    // ---------- Bob's manual / signature bases ----------
    function fillChoice(kind) {
        if (!S.bobChoice || S.step >= 2) return;
        const rng = B.makeRng();
        for (let i = 0; i < S.bobChoice.length; i++) {
            S.bobChoice[i] = kind === 'clear' ? null : kind === 'rand' ? rng.bit() : +kind;
        }
        drawBobChoice();
    }

    function startDrawing() {
        if (!S.bobChoice || S.step >= 2 || $('sign-canvas')) return;
        const wrap = $('bob-wrap');
        const cv = document.createElement('canvas');
        cv.id = 'sign-canvas';
        const dpr = window.devicePixelRatio || 1;
        cv.width = wrap.clientWidth * dpr;
        cv.height = wrap.clientHeight * dpr;
        wrap.appendChild(cv);
        const ctx = cv.getContext('2d');
        ctx.scale(dpr, dpr);
        ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--ink').trim() || '#000';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        let drawing = false;
        const pos = e => { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
        cv.addEventListener('pointerdown', e => { drawing = true; cv.setPointerCapture(e.pointerId); const [x, y] = pos(e); ctx.beginPath(); ctx.moveTo(x, y); });
        cv.addEventListener('pointermove', e => { if (!drawing) return; const [x, y] = pos(e); ctx.lineTo(x, y); ctx.stroke(); });
        cv.addEventListener('pointerup', () => { drawing = false; });
        cv.addEventListener('pointercancel', () => { drawing = false; });
        $('draw-btn').hidden = true;
        $('apply-sig').hidden = false;
        setStatus("Draw on Bob's grid with mouse, pen or finger, then press Apply. Inked cells become +, the rest ×.");
    }

    function applySignature() {
        const cv = $('sign-canvas');
        if (!cv) return;
        const ctx = cv.getContext('2d');
        const data = ctx.getImageData(0, 0, cv.width, cv.height).data;
        const wrapBox = $('bob-wrap').getBoundingClientRect();
        const sx = cv.width / wrapBox.width, sy = cv.height / wrapBox.height;
        const cells = cellsOf('bob-grid');
        for (let i = 0; i < cells.length; i++) {
            const r = cells[i].getBoundingClientRect();
            const x0 = Math.floor((r.left - wrapBox.left) * sx), x1 = Math.floor((r.right - wrapBox.left) * sx);
            const y0 = Math.floor((r.top - wrapBox.top) * sy), y1 = Math.floor((r.bottom - wrapBox.top) * sy);
            let ink = false;
            for (let y = y0; y < y1 && !ink; y += 2) {
                for (let x = x0; x < x1; x += 2) {
                    if (data[(y * cv.width + x) * 4 + 3] > 0) { ink = true; break; }
                }
            }
            S.bobChoice[i] = ink ? 0 : 1;
        }
        cv.remove();
        $('apply-sig').hidden = true;
        $('draw-btn').hidden = false;
        drawBobChoice();
        setStatus('Signature applied. Note: a signature is a fixed pattern, not randomness — try Eve "Knows Bob\'s basis pattern".');
    }

    // ---------- export to real quantum hardware ----------
    function toQasm() {
        const N = S.pulses.length;
        const anyEve = S.pulses.some(p => p.eve === 'measured');
        const L = [
            'OPENQASM 2.0;',
            'include "qelib1.inc";',
            `// BB84 session from BB84 Simulator v2 — ${N} pulses.`,
            '// One qubit is reused: reset → Alice prepares → (Eve measures and resends) → Bob measures.',
            '// Fiber loss, multi-photon pulses and detector effects are not in the circuit;',
            '// the quantum processor\'s own gate, reset and readout errors play the role of channel noise.',
            'qreg q[1];',
            `creg bob[${N}];`
        ];
        if (anyEve) L.push(`creg eve[${N}];`);
        S.pulses.forEach((p, i) => {
            L.push(`// pulse ${i}: Alice ${B.BASIS_SYMBOL[p.aBasis]} bit ${p.aBit}${p.eve === 'measured' ? `, Eve ${B.BASIS_SYMBOL[p.eveBasis]}` : ''}, Bob ${B.BASIS_SYMBOL[p.bBasis]}`);
            L.push('reset q[0];');
            if (p.aBit) L.push('x q[0];');
            if (p.aBasis) L.push('h q[0];');
            if (p.eve === 'measured') {
                if (p.eveBasis) L.push('h q[0];');
                L.push(`measure q[0] -> eve[${i}];`);
                if (p.eveBasis) L.push('h q[0];');
            }
            if (p.bBasis) L.push('h q[0];');
            L.push(`measure q[0] -> bob[${i}];`);
        });
        return L.join('\n') + '\n';
    }
    function toJSON() {
        return JSON.stringify({
            format: 'bb84-simulator-session', version: 2, pulses: S.pulses.length,
            params: S.P,
            alice: { bases: S.pulses.map(p => p.aBasis), bits: S.pulses.map(p => p.aBit) },
            eve: { bases: S.pulses.map(p => (p.eve === 'measured' ? p.eveBasis : -1)) },
            bob: { bases: S.pulses.map(p => p.bBasis) },
            simulated: { clicks: S.pulses.map(p => p.click), bits: S.pulses.map(p => p.bBit) }
        }, null, 1);
    }

    // ---------- language switch: redraw every piece of generated text ----------
    function relang() {
        updateHints();
        updateStepper();
        updateReport();
        updateKeyOut();
        if (S.status) setStatus(S.status[0], S.status[1]);
        if (S.banner) setBanner(S.banner[0], S.banner[1], S.banner[2]);
        if (S.selected >= 0) renderInspector(S.selected); else if (!S.pulses.length) inspectorHint();
    }

    // ---------- wiring ----------
    function init() {
        const evereveal = document.createElement('label');
        evereveal.className = 'row';
        evereveal.innerHTML = '<span data-i18n>Show Eve\'s actions (god view)</span> <input id="eve-reveal" type="checkbox" checked style="width:auto">';
        $('eve-hint').before(evereveal);
        B.I18N.applyStatic(evereveal);

        $('preset').addEventListener('change', e => { applyPreset(e.target.value); reset(); });
        ['grid-size', 'source', 'mu', 'distance', 'alpha', 'misalign', 'depol', 'etaDet', 'pDark',
            'eve-mode', 'eve-fraction', 'sample-frac', 'security', 'seed', 'bob-mode'].forEach(id => {
            $(id).addEventListener('change', () => {
                if (!['grid-size', 'eve-mode', 'eve-fraction', 'sample-frac', 'security', 'seed', 'bob-mode'].includes(id)) $('preset').value = 'custom';
                reset();
            });
        });
        $('eve-reveal').addEventListener('change', () => { if (S.step >= 2) S.pulses.forEach((p, i) => { if (!cellsOf('bob-grid')[i].classList.contains('out')) drawBob(i); }); });
        $('btn-step').addEventListener('click', () => next(false));
        $('btn-run').addEventListener('click', runAll);
        $('btn-reset').addEventListener('click', reset);
        document.querySelectorAll('#bob-tools [data-fill]').forEach(b => b.addEventListener('click', () => fillChoice(b.dataset.fill)));
        $('draw-btn').addEventListener('click', startDrawing);
        $('apply-sig').addEventListener('click', applySignature);
        $('export-qasm').addEventListener('click', () => B.Charts.download('bb84-session.qasm', new Blob([toQasm()], { type: 'text/plain' })));
        $('export-json').addEventListener('click', () => B.Charts.download('bb84-session.json', new Blob([toJSON()], { type: 'application/json' })));
        document.querySelectorAll('#funnel-actions button').forEach(b => b.addEventListener('click', () => {
            if (b.dataset.act === 'table') S.funnel.toggleTable();
            else B.Charts.exportPNG(S.funnel, 'bb84-funnel');
        }));
        applyPreset('textbook');
        reset();
    }

    B.SimUI = { init, relang, rerender: () => { if (S.funnel) S.funnel.render(); if (S.selected >= 0) renderInspector(S.selected); } };
})();
