// Physical layer: photon polarisation qubits, source, fiber channel, eavesdropper, detectors.
//
// A linearly polarised photon is the qubit  |ψ⟩ = cos φ |H⟩ + sin φ |V⟩.
// The four BB84 states all lie on this great circle of the Bloch sphere:
//   + basis (rectilinear): bit 0 = |H⟩ (0°),  bit 1 = |V⟩ (90°)
//   × basis (diagonal):    bit 0 = |D⟩ (45°), bit 1 = |A⟩ (135°)
// Every operation used here (rotation, Pauli X/Y/Z, projective measurement) keeps the
// state on that circle, so tracking the angle φ is an exact state-vector simulation.
(function (root) {
    'use strict';
    const BB84 = root.BB84 = root.BB84 || {};
    const DEG = Math.PI / 180;

    const BASIS_ANGLE = [0, 45];          // 0 = '+', 1 = '×'
    const BASIS_SYMBOL = ['+', '×'];
    const STATE_NAME = [['H', 'V'], ['D', 'A']];
    const STATE_KET = [['|0⟩', '|1⟩'], ['|+⟩', '|−⟩']];

    function normAngle(phi) {
        phi %= 180;
        return phi < 0 ? phi + 180 : phi;
    }
    function stateAngle(basis, bit) {
        return BASIS_ANGLE[basis] + 90 * bit;
    }
    function amplitudes(phi) {
        return [Math.cos(phi * DEG), Math.sin(phi * DEG)];
    }
    // Born rule: P(outcome 0) = |⟨β|ψ⟩|² = cos²(φ − β)
    function probZero(phi, basis) {
        const c = Math.cos((phi - BASIS_ANGLE[basis]) * DEG);
        return c * c;
    }
    // projective measurement; the state collapses onto the observed eigenstate
    function measure(phi, basis, rng) {
        const p0 = probZero(phi, basis);
        const bit = rng.random() < p0 ? 0 : 1;
        return { bit, p0, post: stateAngle(basis, bit) };
    }
    // Pauli errors on the polarisation circle (Y equals XZ up to a global phase)
    function applyPauli(phi, which) {
        if (which === 'X') return normAngle(90 - phi);
        if (which === 'Z') return normAngle(-phi);
        return normAngle(phi + 90); // Y
    }

    // ===== Parameters =====
    function defaultParams() {
        return {
            source: 'single',      // 'single' photon source or 'wcp' (attenuated laser)
            mu: 0.5,               // mean photon number of signal pulses
            decoy: null,           // { nu, pSignal, pDecoy, pVacuum } — Lab only
            pPlus: 0.5,            // probability of choosing the '+' basis
            distance: 0,           // km of fiber
            alpha: 0.2,            // fiber loss, dB/km
            etaDet: 1,             // detector efficiency
            pDark: 0,              // dark-count probability per detector per gate
            misalign: 0,           // polarisation drift in degrees (error = sin²θ)
            depol: 0,              // depolarising probability per pulse
            eve: { mode: 'none', fraction: 1 } // none | intercept | pns | pattern
        };
    }

    function poissonP(lambda, n) {
        let p = Math.exp(-lambda);
        for (let i = 1; i <= n; i++) p *= lambda / i;
        return p;
    }

    // Pre-compute channel transmittance and, for a PNS attack, how Eve tunes her
    // lossless channel so Bob's detection rate looks exactly like the honest fiber.
    function prepareChannel(P) {
        const etaCh = Math.pow(10, -P.alpha * P.distance / 10);
        const ctx = { etaCh, pnsKeep: 0, pnsSingle: 0 };
        if (P.eve.mode === 'pns') {
            const mu = P.mu;
            const target = P.source === 'single'
                ? etaCh * P.etaDet
                : 1 - Math.exp(-etaCh * P.etaDet * mu);
            let gMulti = 0, p1 = 1;
            if (P.source !== 'single') {
                p1 = poissonP(mu, 1);
                for (let n = 2; n < 40; n++) gMulti += poissonP(mu, n) * (1 - Math.pow(1 - P.etaDet, n - 1));
            }
            if (gMulti >= target) {
                ctx.pnsKeep = target / gMulti;
            } else {
                ctx.pnsKeep = 1;
                ctx.pnsSingle = Math.min(1, (target - gMulti) / (p1 * P.etaDet));
            }
        }
        return ctx;
    }

    // ===== Alice: random basis, random bit, photon-number statistics of the source =====
    function prepareAlice(P, rng, out) {
        out = out || {};
        out.aBasis = rng.random() < P.pPlus ? 0 : 1;
        out.aBit = rng.bit();
        let lambda = P.mu, cls = 0;
        if (P.decoy) {
            const r = rng.random();
            if (r < P.decoy.pSignal) { cls = 0; lambda = P.mu; }
            else if (r < P.decoy.pSignal + P.decoy.pDecoy) { cls = 1; lambda = P.decoy.nu; }
            else { cls = 2; lambda = 0; }
        }
        out.intensity = cls;
        out.n = P.source === 'single' ? 1 : rng.poisson(lambda);
        out.phiA = stateAngle(out.aBasis, out.aBit);
        return out;
    }

    // ===== Eve, fiber, Bob =====
    function propagate(P, ctx, rng, pulse, bobBasis) {
        const bBasis = (bobBasis === 0 || bobBasis === 1) ? bobBasis : (rng.random() < P.pPlus ? 0 : 1);
        let phi = pulse.phiA;
        let photons = pulse.n;
        let lossless = false;

        pulse.bBasis = bBasis;
        pulse.eve = 'none';     // none | measured | split | blocked | forwarded
        pulse.eveBasis = -1;
        pulse.eveBit = -1;
        pulse.eveKnows = false; // does Eve know Alice's bit exactly once bases are public?

        const mode = P.eve.mode;
        if ((mode === 'intercept' || mode === 'pattern') && photons > 0 && rng.random() < P.eve.fraction) {
            // intercept–resend: measure one photon, prepare fresh copies of the result
            const eb = mode === 'pattern' ? bBasis : rng.bit();
            const m = measure(phi, eb, rng);
            phi = m.post;
            pulse.eve = 'measured';
            pulse.eveBasis = eb;
            pulse.eveBit = m.bit;
            pulse.eveKnows = eb === pulse.aBasis;
        } else if (mode === 'pns') {
            if (photons >= 2) {
                if (rng.random() < ctx.pnsKeep) {
                    // keep one photon in a quantum memory, send the rest losslessly;
                    // after the basis announcement she measures it in the right basis
                    photons -= 1;
                    lossless = true;
                    pulse.eve = 'split';
                    pulse.eveBasis = pulse.aBasis;
                    pulse.eveBit = pulse.aBit;
                    pulse.eveKnows = true;
                } else { photons = 0; pulse.eve = 'blocked'; }
            } else if (photons === 1) {
                if (rng.random() < ctx.pnsSingle) { lossless = true; pulse.eve = 'forwarded'; }
                else { photons = 0; pulse.eve = 'blocked'; }
            }
        }

        // fiber attenuation: each photon survives independently
        const arrived = lossless ? photons : rng.binomial(photons, ctx.etaCh);

        // channel / alignment noise
        pulse.noise = '';
        if (arrived > 0) {
            if (P.misalign) phi = normAngle(phi + P.misalign);
            if (P.depol > 0 && rng.random() < P.depol) {
                const which = ['X', 'Y', 'Z'][rng.int(3)];
                phi = applyPauli(phi, which);
                pulse.noise = which;
            }
        }

        // Bob: polarising beam splitter + two single-photon detectors
        const p0 = probZero(phi, bBasis);
        let c0 = rng.random() < P.pDark;
        let c1 = rng.random() < P.pDark;
        const dark = c0 || c1;
        let signal = 0;
        for (let i = 0; i < arrived; i++) {
            if (rng.random() < P.etaDet) {
                signal++;
                if (rng.random() < p0) c0 = true; else c1 = true;
            }
        }
        pulse.arrived = arrived;
        pulse.phiB = phi;
        pulse.p0 = p0;
        pulse.darkOnly = dark && signal === 0;
        if (c0 && c1) {
            // double click: assign a random bit (squashing model)
            pulse.click = 2;
            pulse.bBit = rng.bit();
        } else if (c0 || c1) {
            pulse.click = 1;
            pulse.bBit = c0 ? 0 : 1;
        } else {
            pulse.click = 0;
            pulse.bBit = -1;
        }
        return pulse;
    }

    function simulatePulse(P, ctx, rng, bobBasis, out) {
        return propagate(P, ctx, rng, prepareAlice(P, rng, out), bobBasis);
    }

    Object.assign(BB84, {
        DEG, BASIS_ANGLE, BASIS_SYMBOL, STATE_NAME, STATE_KET,
        normAngle, stateAngle, amplitudes, probZero, measure, applyPauli,
        defaultParams, poissonP, prepareChannel, prepareAlice, propagate, simulatePulse
    });
})(typeof window !== 'undefined' ? window : globalThis);
