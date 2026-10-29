// Random number source.
// Unseeded runs are seeded from crypto.getRandomValues (our stand-in for a quantum RNG);
// seeded runs are reproducible, which is what you want for poster figures.
(function (root) {
    'use strict';
    const BB84 = root.BB84 = root.BB84 || {};

    // sfc32 — small, fast, good-quality 32-bit generator
    function sfc32(a, b, c, d) {
        return function () {
            a >>>= 0; b >>>= 0; c >>>= 0; d >>>= 0;
            let t = (a + b) | 0;
            a = b ^ (b >>> 9);
            b = (c + (c << 3)) | 0;
            c = (c << 21) | (c >>> 11);
            d = (d + 1) | 0;
            t = (t + d) | 0;
            c = (c + t) | 0;
            return (t >>> 0) / 4294967296;
        };
    }

    // xmur3 string hash → seed words
    function seedWords(str) {
        let h = 1779033703 ^ str.length;
        for (let i = 0; i < str.length; i++) {
            h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
            h = (h << 13) | (h >>> 19);
        }
        const next = () => {
            h = Math.imul(h ^ (h >>> 16), 2246822507);
            h = Math.imul(h ^ (h >>> 13), 3266489909);
            return (h ^= h >>> 16) >>> 0;
        };
        return [next(), next(), next(), next()];
    }

    function makeRng(seed) {
        let words;
        if (seed === undefined || seed === null || seed === '') {
            words = new Uint32Array(4);
            root.crypto.getRandomValues(words);
        } else {
            words = seedWords(String(seed));
        }
        const random = sfc32(words[0], words[1], words[2], words[3]);
        for (let i = 0; i < 16; i++) random();

        return {
            random,
            bit: () => (random() < 0.5 ? 1 : 0),
            int: n => Math.floor(random() * n),
            // Knuth's method — fine for the small means used by attenuated laser pulses
            poisson(lambda) {
                if (lambda <= 0) return 0;
                const L = Math.exp(-lambda);
                let k = 0, p = 1;
                do { k++; p *= random(); } while (p > L);
                return k - 1;
            },
            binomial(n, p) {
                let k = 0;
                for (let i = 0; i < n; i++) if (random() < p) k++;
                return k;
            },
            shuffle(arr) {
                for (let i = arr.length - 1; i > 0; i--) {
                    const j = Math.floor(random() * (i + 1));
                    const t = arr[i]; arr[i] = arr[j]; arr[j] = t;
                }
                return arr;
            },
            // random subset of `count` items from `arr` (returns [picked, rest])
            split(arr, count) {
                const copy = this.shuffle(arr.slice());
                return [copy.slice(0, count).sort((a, b) => a - b), copy.slice(count).sort((a, b) => a - b)];
            }
        };
    }

    BB84.makeRng = makeRng;
})(typeof window !== 'undefined' ? window : globalThis);
