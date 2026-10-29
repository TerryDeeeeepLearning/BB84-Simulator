// Closed-form security theory used for reference curves and key-length bounds.
(function (root) {
    'use strict';
    const BB84 = root.BB84 = root.BB84 || {};

    // binary Shannon entropy
    function h(x) {
        if (x <= 0 || x >= 1) return 0;
        return -x * Math.log2(x) - (1 - x) * Math.log2(1 - x);
    }

    // Shor–Preskill (2000) asymptotic secret fraction with ideal error correction
    function shorPreskill(q) { return Math.max(0, 1 - 2 * h(q)); }
    // same bound with a realistic error-correction efficiency f ≥ 1
    function practicalFraction(q, f) { return Math.max(0, 1 - h(q) - f * h(q)); }

    // QBER where 1 − 2h(Q) = 0  (≈ 11.0 %)
    const QBER_THRESHOLD = (function () {
        let lo = 0.05, hi = 0.2;
        for (let i = 0; i < 60; i++) { const m = (lo + hi) / 2; (1 - 2 * h(m) > 0) ? lo = m : hi = m; }
        return (lo + hi) / 2;
    })();

    // intercept–resend on a fraction f of pulses, on top of an intrinsic error e
    function qberInterceptResend(f, e) { return e * (1 - f / 2) + f / 4; }

    // mutual information per sifted bit as a function of QBER
    const info = {
        aliceBob: q => 1 - h(q),
        interceptResend: q => Math.min(1, 2 * q),                         // Eve knows half of what she touched
        optimalIndividual: q => 1 - h(0.5 + Math.sqrt(q * (1 - q))),     // Fuchs et al. 1997 (phase-covariant cloner)
        collective: q => h(q)                                             // Devetak–Winter / Shor–Preskill
    };

    // ===== Practical (weak-coherent) BB84 key rates vs distance =====
    // Gobby, Yuan, Shields (2004) parameters, as used by Ma, Qi, Zhao, Lo (2005)
    const GYS = { alpha: 0.21, etaBob: 0.045, Y0: 1.7e-6, ed: 0.033, e0: 0.5, f: 1.22, q: 0.5 };

    function channelEta(L, m) { return m.etaBob * Math.pow(10, -m.alpha * L / 10); }

    // expected gain and error rate for intensity λ
    function expected(L, lambda, m) {
        const eta = channelEta(L, m);
        const Q = m.Y0 + 1 - Math.exp(-eta * lambda);
        const EQ = m.e0 * m.Y0 + m.ed * (1 - Math.exp(-eta * lambda));
        return { eta, Q, E: EQ / Q };
    }

    function singlePhoton(L, m) {
        const eta = channelEta(L, m);
        const Y1 = m.Y0 + eta - m.Y0 * eta;
        return { Y1, e1: (m.e0 * m.Y0 + m.ed * eta) / Y1 };
    }

    // ideal single-photon source
    function rateSPS(L, m) {
        const { Y1, e1 } = singlePhoton(L, m);
        return m.q * Y1 * (1 - h(e1) - m.f * h(e1));
    }

    // decoy-state with infinitely many decoys (Lo, Ma, Chen 2005)
    function rateInfiniteDecoy(L, m, mu) {
        const s = expected(L, mu, m);
        const { Y1, e1 } = singlePhoton(L, m);
        const Q1 = Y1 * mu * Math.exp(-mu);
        return m.q * (-s.Q * m.f * h(s.E) + Q1 * (1 - h(e1)));
    }

    // vacuum + one weak decoy bounds (Ma, Qi, Zhao, Lo 2005)
    function decoyEstimate(d) {
        const { mu, nu, Qmu, Emu, Qnu, Enu, Y0, e0 = 0.5, f } = d;
        const Y1L = (mu / (mu * nu - nu * nu)) *
            (Qnu * Math.exp(nu) - Qmu * Math.exp(mu) * (nu * nu) / (mu * mu) - ((mu * mu - nu * nu) / (mu * mu)) * Y0);
        const e1U = Y1L > 0 ? Math.min(0.5, (Enu * Qnu * Math.exp(nu) - e0 * Y0) / (Y1L * nu)) : 0.5;
        const Q1L = Math.max(0, Y1L) * mu * Math.exp(-mu);
        const R = -Qmu * f * h(Emu) + Q1L * (1 - h(Math.max(0, e1U)));
        return { Y1L, e1U, Q1L, R };
    }

    function rateVacuumWeak(L, m, mu, nu) {
        const s = expected(L, mu, m), w = expected(L, nu, m);
        const est = decoyEstimate({ mu, nu, Qmu: s.Q, Emu: s.E, Qnu: w.Q, Enu: w.E, Y0: m.Y0, e0: m.e0, f: m.f });
        return m.q * est.R;
    }

    // GLLP without decoys: every multi-photon pulse must be assumed compromised
    function rateGLLP(L, m, mu) {
        const s = expected(L, mu, m);
        const pMulti = 1 - (1 + mu) * Math.exp(-mu);
        const delta = pMulti / s.Q;
        if (delta >= 1) return 0;
        const eS = s.E / (1 - delta);
        if (eS >= 0.5) return 0;
        return m.q * s.Q * (-m.f * h(s.E) + (1 - delta) * (1 - h(eS)));
    }

    // grid search for the optimal signal intensity; decoy bounds need μ > ν, so pass muMin
    function bestOverMu(fn, muMin) {
        let best = 0, bestMu = 0;
        for (let mu = muMin || 0.002; mu <= 1.2; mu += 0.002) {
            const r = fn(mu);
            if (r > best) { best = r; bestMu = mu; }
        }
        return { rate: best, mu: bestMu };
    }

    // ===== Finite-key length =====
    // After Tomamichel, Lim, Gisin, Renner, Nat. Commun. 3, 634 (2012):
    // ℓ = n[1 − h(Q + μ)] − leak_EC − log2(2 / (ε_sec² ε_cor)),
    // μ = sqrt( (n+k)/(nk) · (k+1)/k · ln(2/ε_sec) ),  k = bits sacrificed for estimation
    function finiteMu(n, k, epsSec) {
        return Math.sqrt(((n + k) / (n * k)) * ((k + 1) / k) * Math.log(2 / epsSec));
    }
    function finiteKeyLength(n, k, q, leak, epsSec, epsCor) {
        const qq = Math.min(0.5, q + finiteMu(n, k, epsSec));
        return n * (1 - h(qq)) - leak - Math.log2(2 / (epsSec * epsSec * epsCor));
    }
    // best key fraction for N sifted bits, optimising the sampling split
    function finiteKeyFraction(N, q, f, epsSec, epsCor) {
        let best = 0;
        for (let s = 0.005; s <= 0.6; s += 0.005) {
            const k = Math.round(N * s), n = N - k;
            if (k < 2 || n < 2) continue;
            const l = finiteKeyLength(n, k, q, f * n * h(q), epsSec, epsCor);
            if (l / N > best) best = l / N;
        }
        return best;
    }

    Object.assign(BB84, {
        h, shorPreskill, practicalFraction, QBER_THRESHOLD, qberInterceptResend, info,
        GYS, channelEta, expected, singlePhoton, rateSPS, rateInfiniteDecoy, decoyEstimate,
        rateVacuumWeak, rateGLLP, bestOverMu, finiteMu, finiteKeyLength, finiteKeyFraction
    });
})(typeof window !== 'undefined' ? window : globalThis);
