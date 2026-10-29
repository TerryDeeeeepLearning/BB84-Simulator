// Classical post-processing over the authenticated public channel:
// sifting → parameter estimation → Cascade error correction → verification → privacy amplification.
(function (root) {
    'use strict';
    const BB84 = root.BB84 = root.BB84 || {};

    function parity(bits, idx) {
        let p = 0;
        for (let i = 0; i < idx.length; i++) p ^= bits[idx[i]];
        return p;
    }

    // ===== Cascade (Brassard & Salvail 1993) =====
    // Bob's copy is corrected in place; every parity Alice reveals is counted as leakage
    // and (optionally) recorded as a linear function Eve now knows.
    function cascade(A, Bin, q, rng, opts) {
        opts = opts || {};
        const passes = opts.passes || 4;
        const record = !!opts.record;
        const n = A.length;
        const B = Bin.slice();
        const revealed = [];
        const flips = [];
        let leak = 0;
        if (n === 0) return { B, leak, revealed, flips, k1: 0 };

        const k1 = Math.max(4, Math.min(n, Math.round(0.73 / Math.max(q, 0.005))));
        const blocks = [];   // blocks[p][b] = list of positions
        const blockOf = [];  // blockOf[p][pos] = b

        const reveal = sub => { leak++; if (record) revealed.push(sub.slice()); };

        function binarySearch(list) {
            let lo = 0, hi = list.length;
            while (hi - lo > 1) {
                const mid = (lo + hi) >> 1;
                const half = list.slice(lo, mid);
                reveal(half);
                if (parity(A, half) !== parity(B, half)) hi = mid; else lo = mid;
            }
            return list[lo];
        }

        function correct(p, b, currentPass) {
            const queue = [[p, b]];
            while (queue.length) {
                const [pp, bb] = queue.pop();
                const list = blocks[pp][bb];
                // the block's parity is already public, so checking it costs nothing
                if (parity(A, list) === parity(B, list)) continue;
                const pos = binarySearch(list);
                B[pos] ^= 1;
                flips.push(pos);
                for (let r = 0; r <= currentPass; r++) {
                    if (r !== pp) queue.push([r, blockOf[r][pos]]);
                }
            }
        }

        for (let p = 0; p < passes; p++) {
            const k = Math.min(n, k1 << p);
            const order = Array.from({ length: n }, (_, i) => i);
            if (p > 0) rng.shuffle(order);
            const pb = [], bo = new Int32Array(n);
            for (let s = 0; s < n; s += k) {
                const list = order.slice(s, s + k);
                list.forEach(pos => { bo[pos] = pb.length; });
                pb.push(list);
            }
            blocks.push(pb);
            blockOf.push(bo);
            for (let b = 0; b < pb.length; b++) {
                reveal(pb[b]);
                if (parity(A, pb[b]) !== parity(B, pb[b])) correct(p, b, p);
            }
        }
        return { B, leak, revealed, flips, k1 };
    }

    // ===== GF(2) linear algebra (bit-packed) =====
    function makeVec(n) { return new Uint32Array((n + 31) >>> 5); }
    function setBit(v, i) { v[i >>> 5] |= (1 << (i & 31)); }
    function highestBit(v) {
        for (let w = v.length - 1; w >= 0; w--) {
            if (v[w]) return (w << 5) + 31 - Math.clz32(v[w]);
        }
        return -1;
    }
    // incremental row-echelon basis; insert() reports whether the row was independent
    function gf2Basis() {
        const pivots = new Map();
        return {
            insert(src) {
                const v = src.slice();
                for (;;) {
                    const hb = highestBit(v);
                    if (hb < 0) return false;
                    const piv = pivots.get(hb);
                    if (!piv) { pivots.set(hb, v); return true; }
                    for (let w = 0; w < v.length; w++) v[w] ^= piv[w];
                }
            },
            get rank() { return pivots.size; }
        };
    }

    // ===== Privacy amplification: Toeplitz hashing (2-universal) =====
    function toeplitzRow(seed, n, j) {
        const v = makeVec(n);
        for (let i = 0; i < n; i++) if (seed[j - i + n - 1]) setBit(v, i);
        return v;
    }
    function toeplitzHash(bits, seed, ell) {
        const n = bits.length, out = new Array(ell);
        for (let j = 0; j < ell; j++) {
            let p = 0;
            for (let i = 0; i < n; i++) p ^= seed[j - i + n - 1] & bits[i];
            out[j] = p;
        }
        return out;
    }

    // Eve's information about the final key, in bits, given everything she holds:
    // the bits she knows exactly plus every parity revealed during error correction.
    // I(K_final ; Eve) = rank[known; parities; T] − rank[known; parities]
    function eveInformation(n, knownPositions, parities, seed, ell) {
        const basis = gf2Basis();
        knownPositions.forEach(i => { const v = makeVec(n); setBit(v, i); basis.insert(v); });
        parities.forEach(list => { const v = makeVec(n); list.forEach(i => setBit(v, i)); basis.insert(v); });
        let gained = 0;
        for (let j = 0; j < ell; j++) if (basis.insert(toeplitzRow(seed, n, j))) gained++;
        return ell - gained;
    }

    // ===== Key length =====
    function keyLength(o) {
        const h = BB84.h;
        if (o.security === 'finite') {
            return Math.floor(BB84.finiteKeyLength(o.n, Math.max(1, o.k), o.qEst, o.leak, o.epsSec, o.epsCor));
        }
        return Math.floor(o.n * (1 - h(o.qEst)) - o.leak);
    }

    // abort reasons keep their English template + arguments so the UI can translate them later
    const fill = (s, p) => (p ? s.replace(/\{(\w+)\}/g, (m, k) => (k in p ? p[k] : m)) : s);
    function abortWith(res, key, args) {
        return Object.assign(res, { aborted: true, reasonKey: key, reasonArgs: args || null, reason: fill(key, args) });
    }

    // ===== The whole classical stage for one session =====
    function postProcess(pulses, opts, rng) {
        const o = Object.assign({
            sampleFrac: 0.25, security: 'asymptotic', epsSec: 1e-10, epsCor: 1e-12,
            record: true, trackEve: true, hashKey: true
        }, opts);
        const res = { stage: 'sift', aborted: false, reason: '' };

        // 1. sifting: keep detected signal pulses with matching bases
        const sifted = [];
        for (let i = 0; i < pulses.length; i++) {
            const p = pulses[i];
            if (p.click > 0 && p.intensity === 0 && p.aBasis === p.bBasis) sifted.push(i);
        }
        res.detected = pulses.reduce((c, p) => c + (p.click > 0 ? 1 : 0), 0);
        res.sifted = sifted;

        // 2. parameter estimation on a random public sample
        const nSample = sifted.length >= 2 ? Math.max(1, Math.round(sifted.length * o.sampleFrac)) : 0;
        const [sampleIdx, keyIdx] = rng.split(sifted, nSample);
        res.sampleIdx = sampleIdx;
        res.keyIdx = keyIdx;
        res.sampleErrors = sampleIdx.filter(i => pulses[i].aBit !== pulses[i].bBit);
        res.qEst = nSample ? res.sampleErrors.length / nSample : 0;
        const keyErr = keyIdx.filter(i => pulses[i].aBit !== pulses[i].bBit);
        res.keyErrors = keyErr;
        res.qTrue = sifted.length ? (keyErr.length + res.sampleErrors.length) / sifted.length : 0;
        res.stage = 'estimate';

        if (sifted.length < 4 || keyIdx.length < 2) {
            return abortWith(res, 'Too few sifted bits to run the protocol.');
        }
        if (res.qEst > BB84.QBER_THRESHOLD) {
            return abortWith(res, 'Estimated QBER {q}% is above the {thr}% security threshold — eavesdropping suspected, key discarded.',
                { q: (res.qEst * 100).toFixed(1), thr: (BB84.QBER_THRESHOLD * 100).toFixed(1) });
        }

        // 3. error correction
        const A = keyIdx.map(i => pulses[i].aBit);
        const B = keyIdx.map(i => pulses[i].bBit);
        const ec = cascade(A, B, res.qEst, rng, { record: o.record });
        res.ec = ec;
        res.ecFlipPulses = ec.flips.map(j => keyIdx[j]);
        const residual = A.reduce((c, a, j) => c + (a !== ec.B[j] ? 1 : 0), 0);
        res.residual = residual;
        res.ecEfficiency = keyErr.length ? ec.leak / (A.length * BB84.h(keyErr.length / A.length)) : null;
        res.stage = 'ec';
        if (residual > 0) {
            return abortWith(res, 'Verification hash mismatch: {n} error(s) survived Cascade — session aborted.', { n: residual });
        }

        // 4. privacy amplification
        const ell = keyLength({ security: o.security, n: A.length, k: nSample, qEst: res.qEst, leak: ec.leak, epsSec: o.epsSec, epsCor: o.epsCor });
        res.ell = Math.max(0, ell);
        res.stage = 'pa';
        if (ell <= 0) {
            return abortWith(res, o.security === 'finite'
                ? 'Finite-key bound leaves no secret bits — the block is far too short (real systems use 10⁵–10⁷ sifted bits).'
                : 'Error correction leaked as much as the raw key contained — no secret bits left.');
        }
        if (o.hashKey) {
            const seed = Array.from({ length: A.length + ell - 1 }, () => rng.bit());
            res.seed = seed;
            res.finalKey = toeplitzHash(A, seed, ell);
            if (o.trackEve) {
                const known = [];
                keyIdx.forEach((pi, j) => { if (pulses[pi].eveKnows) known.push(j); });
                res.eveKnownBefore = known.length;
                res.eveInfoAfter = eveInformation(A.length, known, ec.revealed, seed, ell);
            }
        }
        res.stage = 'done';
        return res;
    }

    Object.assign(BB84, { parity, cascade, gf2Basis, makeVec, setBit, toeplitzHash, eveInformation, keyLength, postProcess });
})(typeof window !== 'undefined' ? window : globalThis);
