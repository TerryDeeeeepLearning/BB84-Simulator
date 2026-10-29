// Small SVG chart kit: line / points / step-area / horizontal bars.
// Every chart has a hover readout, a table view, and PNG (3×) / SVG / CSV export for posters.
(function (root) {
    'use strict';
    const BB84 = root.BB84 = root.BB84 || {};
    const NS = 'http://www.w3.org/2000/svg';

    const THEMES = {
        light: {
            surface: '#fcfcfb', text1: '#0b0b0b', text2: '#52514e', muted: '#898781',
            grid: '#e1e0d9', axis: '#c3c2b7',
            series: ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#6250d6', '#e34948']
        },
        dark: {
            surface: '#1a1a19', text1: '#f0efec', text2: '#c3c2b7', muted: '#898781',
            grid: '#2c2c2a', axis: '#383835',
            series: ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#008300', '#9085e9', '#e66767']
        }
    };
    const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

    function currentTheme() {
        const t = document.documentElement.dataset.theme;
        if (t === 'light' || t === 'dark') return t;
        return root.matchMedia && root.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }

    function el(name, attrs, parent) {
        const n = document.createElementNS(NS, name);
        for (const k in attrs) n.setAttribute(k, attrs[k]);
        if (parent) parent.appendChild(n);
        return n;
    }
    function text(parent, str, attrs) {
        const t = el('text', attrs, parent);
        t.textContent = str;
        return t;
    }

    const SUP = { '-': '⁻', '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹' };
    function pow10Label(e) {
        if (e === 0) return '1';
        if (e === 1) return '10';
        return '10' + String(e).split('').map(c => SUP[c]).join('');
    }

    function niceTicks(min, max, count) {
        const span = max - min;
        const raw = span / Math.max(1, count);
        const mag = Math.pow(10, Math.floor(Math.log10(raw)));
        const step = [1, 2, 2.5, 5, 10].map(m => m * mag).find(s => span / s <= count) || 10 * mag;
        const out = [];
        for (let v = Math.ceil(min / step - 1e-9) * step; v <= max + 1e-9; v += step) out.push(+v.toFixed(10));
        return out;
    }

    function scale(axis, lo, hi) {
        if (axis.type === 'log') {
            const a = Math.log10(axis.min), b = Math.log10(axis.max);
            return v => lo + (Math.log10(Math.max(v, axis.min * 1e-3)) - a) / (b - a) * (hi - lo);
        }
        return v => lo + (v - axis.min) / (axis.max - axis.min) * (hi - lo);
    }
    function axisTicks(axis) {
        if (axis.ticks) return axis.ticks;
        if (axis.type === 'log') {
            const out = [];
            for (let e = Math.ceil(Math.log10(axis.min)); e <= Math.floor(Math.log10(axis.max)); e++) out.push(Math.pow(10, e));
            return out;
        }
        return niceTicks(axis.min, axis.max, axis.tickCount || 5);
    }
    function tickLabel(axis, v) {
        if (axis.fmt) return axis.fmt(v);
        if (axis.type === 'log') return pow10Label(Math.round(Math.log10(v)));
        return String(+v.toFixed(6));
    }
    function valueLabel(axis, v) {
        if (v === null || v === undefined || Number.isNaN(v)) return '—';
        if (axis.valueFmt) return axis.valueFmt(v);
        if (axis.type === 'log') return v.toExponential(2);
        return String(+v.toPrecision(4));
    }

    // ============ XY chart ============
    function XYChart(container, spec) {
        this.container = container;
        this.spec = spec;
        container.classList.add('chart');
        container.innerHTML = '';
        this.plot = document.createElement('div');
        this.plot.className = 'chart-plot';
        this.tip = document.createElement('div');
        this.tip.className = 'chart-tip';
        this.tip.hidden = true;
        this.tableWrap = document.createElement('div');
        this.tableWrap.className = 'chart-table';
        this.tableWrap.hidden = true;
        container.append(this.plot, this.tip, this.tableWrap);
        this.render();
    }

    // legend items flow left→right and wrap; returns [{x, row}] plus the row count
    // fontScale enlarges every label proportionally, e.g. for print posters
    // CJK and full-width characters are roughly twice as wide as Latin ones at the same size
    const textWidth = s => Array.from(s).reduce((w, ch) => w + (/[⺀-￯]/.test(ch) ? 12.5 : 7), 0);
    const legendWidth = (sr, F) => (34 + textWidth(sr.name)) * F;
    function legendLayout(series, W, F) {
        if (series.length < 2) return { items: [], rows: 0 };
        let x = 16, row = 0;
        const items = series.map(sr => {
            const w = legendWidth(sr, F);
            if (x + w > W - 16 && x > 16) { x = 16; row++; }
            const it = { x, row };
            x += w;
            return it;
        });
        return { items, rows: row + 1 };
    }

    XYChart.prototype.layout = function () {
        const s = this.spec;
        const W = s.width || 680, F = s.fontScale || 1;
        const rows = legendLayout(s.series, W, F).rows;
        const H = (s.height || 380) + Math.max(0, rows - 1) * 20 * F;
        return { W, H: H + 8, ml: 64 * F, mr: 24, mt: (32 + rows * 20) * F + (s._title ? 34 : 0), mb: 52 * F };
    };

    XYChart.prototype.build = function (themeName, withTitle) {
        const s = this.spec, T = THEMES[themeName], F = s.fontScale || 1;
        s._title = withTitle;
        const { W, H, ml, mr, mt, mb } = this.layout();
        const svg = el('svg', { xmlns: NS, viewBox: `0 0 ${W} ${H}`, width: W, height: H, 'font-family': FONT, role: 'img' });
        el('title', {}, svg).textContent = s.title || '';
        el('rect', { x: 0, y: 0, width: W, height: H, fill: T.surface }, svg);
        const x0 = ml, x1 = W - mr, y0 = H - mb, y1 = mt;
        const sx = scale(s.x, x0, x1), sy = scale(s.y, y0, y1);

        if (withTitle) {
            text(svg, s.title, { x: 16, y: 26, 'font-size': 17 * F, 'font-weight': 600, fill: T.text1 });
            if (s.subtitle) text(svg, s.subtitle, { x: 16, y: 46, 'font-size': 12 * F, fill: T.text2 });
        }

        // legend row (identity never by color alone: line key / dot / swatch + name)
        const leg = legendLayout(s.series, W, F);
        const legTop = mt - (leg.rows * 20 + 4) * F;
        if (leg.rows) {
            s.series.forEach((sr, si) => {
                const c = T.series[sr.slot - 1];
                const lx = leg.items[si].x, ly = legTop + (12 + leg.items[si].row * 20) * F;
                if (sr.type === 'points') {
                    el('circle', { cx: lx + 8 * F, cy: ly - 4 * F, r: 4.5 * F, fill: c, stroke: T.surface, 'stroke-width': 2 }, svg);
                } else if (sr.type === 'step-area') {
                    el('rect', { x: lx, y: ly - 10 * F, width: 16 * F, height: 12 * F, rx: 2, fill: c, 'fill-opacity': 0.35 }, svg);
                    el('line', { x1: lx, x2: lx + 16 * F, y1: ly - 10 * F, y2: ly - 10 * F, stroke: c, 'stroke-width': 2 }, svg);
                } else {
                    el('line', { x1: lx, x2: lx + 16 * F, y1: ly - 4 * F, y2: ly - 4 * F, stroke: c, 'stroke-width': 2.5 * F, 'stroke-linecap': 'round' }, svg);
                }
                text(svg, sr.name, { x: lx + 22 * F, y: ly, 'font-size': 12 * F, fill: T.text2 });
            });
        }

        // grid + ticks
        const g = el('g', {}, svg);
        axisTicks(s.y).forEach(v => {
            if (v < s.y.min - 1e-12 || v > s.y.max + 1e-12) return;
            const y = sy(v);
            el('line', { x1: x0, x2: x1, y1: y, y2: y, stroke: T.grid, 'stroke-width': 1 }, g);
            text(g, tickLabel(s.y, v), { x: x0 - 8, y: y + 4 * F, 'font-size': 11 * F, fill: T.muted, 'text-anchor': 'end', 'font-variant-numeric': 'tabular-nums' });
        });
        axisTicks(s.x).forEach(v => {
            if (v < s.x.min - 1e-12 || v > s.x.max + 1e-12) return;
            const x = sx(v);
            text(g, tickLabel(s.x, v), { x, y: y0 + 18 * F, 'font-size': 11 * F, fill: T.muted, 'text-anchor': 'middle', 'font-variant-numeric': 'tabular-nums' });
        });
        el('line', { x1: x0, x2: x1, y1: y0, y2: y0, stroke: T.axis, 'stroke-width': 1 }, g);
        text(g, s.x.label, { x: (x0 + x1) / 2, y: H - 12 * F, 'font-size': 12 * F, fill: T.text2, 'text-anchor': 'middle' });
        text(g, s.y.label, { x: -(y0 + y1) / 2, y: 16 * F, 'font-size': 12 * F, fill: T.text2, 'text-anchor': 'middle', transform: 'rotate(-90)' });

        // reference lines (thresholds) — solid hairline + label
        (s.refs || []).forEach(r => {
            if (r.axis === 'y') {
                const y = sy(r.value);
                el('line', { x1: x0, x2: x1, y1: y, y2: y, stroke: T.text2, 'stroke-width': 1 }, svg);
                text(svg, r.label, { x: x1 - 4, y: y - 6, 'font-size': 11 * F, fill: T.text2, 'text-anchor': 'end' });
            } else {
                const x = sx(r.value);
                el('line', { x1: x, x2: x, y1: y0, y2: y1, stroke: T.text2, 'stroke-width': 1 }, svg);
                text(svg, r.label, { x: x + 5, y: y1 + 12 * F, 'font-size': 11 * F, fill: T.text2 });
            }
        });

        // clip so log-scale zeros and overshoots stay inside the plot
        const clipId = 'clip' + Math.random().toString(36).slice(2, 8);
        const defs = el('defs', {}, svg);
        const cp = el('clipPath', { id: clipId }, defs);
        el('rect', { x: x0, y: y1 - 6, width: x1 - x0, height: y0 - y1 + 6 }, cp);
        const plotG = el('g', { 'clip-path': `url(#${clipId})` }, svg);

        const inY = v => v !== null && v !== undefined && !Number.isNaN(v) && (s.y.type !== 'log' || v > 0);
        s.series.forEach(sr => {
            const c = T.series[sr.slot - 1];
            const pts = sr.data.filter(d => inY(d[1]));
            if (!pts.length) return;
            if (sr.type === 'points') {
                pts.forEach(d => el('circle', { cx: sx(d[0]), cy: sy(d[1]), r: 4.5 * F, fill: c, stroke: T.surface, 'stroke-width': 2 }, plotG));
            } else if (sr.type === 'step-area') {
                const w = sr.binWidth;
                let dPath = `M${sx(pts[0][0] - w / 2)},${y0}`;
                pts.forEach(d => { dPath += `L${sx(d[0] - w / 2)},${sy(d[1])}L${sx(d[0] + w / 2)},${sy(d[1])}`; });
                dPath += `L${sx(pts[pts.length - 1][0] + w / 2)},${y0}`;
                el('path', { d: dPath + 'Z', fill: c, 'fill-opacity': 0.12, stroke: 'none' }, plotG);
                el('path', { d: dPath, fill: 'none', stroke: c, 'stroke-width': 2, 'stroke-linejoin': 'round' }, plotG);
            } else {
                // break the line where values fall out (e.g. zero key rate on a log axis)
                let dPath = '', pen = false;
                sr.data.forEach(d => {
                    if (!inY(d[1])) { pen = false; return; }
                    dPath += (pen ? 'L' : 'M') + sx(d[0]).toFixed(2) + ',' + sy(d[1]).toFixed(2);
                    pen = true;
                });
                el('path', { d: dPath, fill: 'none', stroke: c, 'stroke-width': 2 * F, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }, plotG);
                if (sr.endLabel) {
                    const last = pts[pts.length - 1];
                    const nearEdge = sx(last[0]) > x1 - 60;
                    text(svg, sr.endLabel, { x: nearEdge ? sx(last[0]) : sx(last[0]) + 6, y: sy(last[1]) + (nearEdge ? -8 : 4), 'font-size': 11 * F, fill: T.text2, 'text-anchor': nearEdge ? 'end' : 'start' });
                }
            }
        });

        (s.annotations || []).forEach(a => {
            text(svg, a.text, { x: sx(a.x), y: sy(a.y), 'font-size': 11 * F, fill: T.text2, 'text-anchor': a.anchor || 'start' });
        });

        return { svg, sx, sy, x0, x1, y0, y1 };
    };

    XYChart.prototype.render = function () {
        const built = this.build(currentTheme(), false);
        this.built = built;
        const svg = built.svg;
        svg.removeAttribute('width');
        svg.removeAttribute('height');
        svg.setAttribute('tabindex', '0');
        const tr = BB84.T || ((s, p) => s.replace('{title}', p.title));
        svg.setAttribute('aria-label', tr('{title}. Use left and right arrows to read values.', { title: this.spec.title || tr('Chart', {}) }));
        this.plot.innerHTML = '';
        this.plot.appendChild(svg);
        this.attachHover();
        if (!this.tableWrap.hidden) this.renderTable();
    };

    XYChart.prototype.xPositions = function () {
        const xs = new Set();
        this.spec.series.forEach(sr => sr.data.forEach(d => xs.add(d[0])));
        return Array.from(xs).sort((a, b) => a - b);
    };

    XYChart.prototype.attachHover = function () {
        const { svg, sx, x0, x1, y0, y1 } = this.built;
        const s = this.spec, T = THEMES[currentTheme()];
        const cross = el('line', { y1, y2: y0, stroke: T.muted, 'stroke-width': 1, visibility: 'hidden' }, svg);
        const hit = el('rect', { x: x0, y: y1, width: x1 - x0, height: y0 - y1, fill: 'transparent' }, svg);
        const xs = this.xPositions();
        let idx = -1;
        const show = i => {
            if (i < 0 || i >= xs.length) return;
            idx = i;
            const xv = xs[i];
            const px = sx(xv);
            cross.setAttribute('x1', px); cross.setAttribute('x2', px);
            cross.setAttribute('visibility', 'visible');
            this.tip.innerHTML = '';
            const head = document.createElement('div');
            head.className = 'tip-head';
            head.textContent = `${s.x.label}: ${valueLabel(s.x, xv)}`;
            this.tip.appendChild(head);
            s.series.forEach(sr => {
                let best = null, bd = Infinity;
                sr.data.forEach(d => { const dd = Math.abs(d[0] - xv); if (dd < bd) { bd = dd; best = d; } });
                const span = (s.x.max - s.x.min);
                if (!best || (sr.type === 'points' && bd > span * 0.02 && s.x.type !== 'log')) return;
                const row = document.createElement('div');
                row.className = 'tip-row';
                const key = document.createElement('span');
                key.className = 'tip-key';
                key.style.background = T.series[sr.slot - 1];
                const val = document.createElement('strong');
                val.textContent = valueLabel(s.y, best[1]);
                const name = document.createElement('span');
                name.className = 'tip-name';
                name.textContent = sr.name;
                row.append(key, val, name);
                this.tip.appendChild(row);
            });
            this.tip.hidden = false;
            const box = svg.getBoundingClientRect();
            const scaleX = box.width / (this.layout().W);
            const left = px * scaleX;
            this.tip.style.left = Math.min(box.width - 190, Math.max(0, left + 12)) + 'px';
            this.tip.style.top = (y1 * scaleX + 4) + 'px';
        };
        const hide = () => { cross.setAttribute('visibility', 'hidden'); this.tip.hidden = true; };
        const nearest = evt => {
            const box = svg.getBoundingClientRect();
            const px = (evt.clientX - box.left) * (this.layout().W / box.width);
            let bi = 0, bd = Infinity;
            xs.forEach((xv, i) => { const d = Math.abs(sx(xv) - px); if (d < bd) { bd = d; bi = i; } });
            return bi;
        };
        hit.addEventListener('pointermove', e => show(nearest(e)));
        hit.addEventListener('pointerleave', hide);
        svg.addEventListener('keydown', e => {
            if (e.key === 'ArrowRight') { show(Math.min(xs.length - 1, idx + 1)); e.preventDefault(); }
            if (e.key === 'ArrowLeft') { show(Math.max(0, idx < 0 ? 0 : idx - 1)); e.preventDefault(); }
            if (e.key === 'Escape') hide();
        });
        svg.addEventListener('blur', hide);
    };

    XYChart.prototype.rows = function () {
        const s = this.spec, xs = this.xPositions();
        return xs.map(xv => [xv].concat(s.series.map(sr => {
            const d = sr.data.find(p => p[0] === xv);
            return d ? d[1] : null;
        })));
    };
    XYChart.prototype.header = function () {
        return [this.spec.x.label].concat(this.spec.series.map(sr => sr.name + ' — ' + this.spec.y.label));
    };
    XYChart.prototype.renderTable = function () {
        const s = this.spec;
        const table = document.createElement('table');
        const thead = table.createTHead().insertRow();
        this.header().forEach(hd => { const th = document.createElement('th'); th.textContent = hd; thead.appendChild(th); });
        const tb = table.createTBody();
        this.rows().forEach(r => {
            const tr = tb.insertRow();
            r.forEach((v, i) => { tr.insertCell().textContent = i === 0 ? valueLabel(s.x, v) : valueLabel(s.y, v); });
        });
        this.tableWrap.innerHTML = '';
        this.tableWrap.appendChild(table);
    };
    XYChart.prototype.toggleTable = function () {
        this.tableWrap.hidden = !this.tableWrap.hidden;
        if (!this.tableWrap.hidden) this.renderTable();
        return !this.tableWrap.hidden;
    };
    XYChart.prototype.csv = function () {
        const esc = v => (v === null ? '' : `"${String(v).replace(/"/g, '""')}"`);
        return [this.header().map(esc).join(',')].concat(this.rows().map(r => r.map(v => (v === null ? '' : v)).join(','))).join('\n');
    };
    XYChart.prototype.update = function (patch) {
        Object.assign(this.spec, patch);
        this.render();
    };

    // ============ Horizontal bar chart (one series → one color) ============
    function BarChart(container, spec) {
        XYChart.call(this, container, spec);
    }
    BarChart.prototype = Object.create(XYChart.prototype);
    BarChart.prototype.layout = function () {
        const s = this.spec;
        const rowH = 34;
        return { W: s.width || 480, H: 24 + (s._title ? 34 : 0) + s.categories.length * rowH + 16, ml: s.labelWidth || 150, mr: 64, mt: 16 + (s._title ? 34 : 0), mb: 16, rowH };
    };
    BarChart.prototype.build = function (themeName, withTitle) {
        const s = this.spec, T = THEMES[themeName];
        s._title = withTitle;
        const { W, H, ml, mr, mt, rowH } = this.layout();
        const svg = el('svg', { xmlns: NS, viewBox: `0 0 ${W} ${H}`, width: W, height: H, 'font-family': FONT, role: 'img' });
        el('title', {}, svg).textContent = s.title || '';
        el('rect', { x: 0, y: 0, width: W, height: H, fill: T.surface }, svg);
        if (withTitle) text(svg, s.title, { x: 16, y: 26, 'font-size': 17, 'font-weight': 600, fill: T.text1 });
        const max = Math.max(1, ...s.values);
        const x0 = ml, x1 = W - mr;
        const c = T.series[(s.slot || 1) - 1];
        this._bars = [];
        el('line', { x1: x0, x2: x0, y1: mt, y2: mt + s.categories.length * rowH, stroke: T.axis, 'stroke-width': 1 }, svg);
        s.categories.forEach((cat, i) => {
            const y = mt + i * rowH + 5;
            const bh = 22;
            const w = Math.max(0, (s.values[i] / max) * (x1 - x0));
            text(svg, cat, { x: x0 - 10, y: y + bh / 2 + 4, 'font-size': 12, fill: T.text2, 'text-anchor': 'end' });
            if (w > 0) {
                const r = Math.min(4, w);
                // square at the baseline, 4px rounded data-end
                el('path', { d: `M${x0},${y}H${x0 + w - r}Q${x0 + w},${y} ${x0 + w},${y + r}V${y + bh - r}Q${x0 + w},${y + bh} ${x0 + w - r},${y + bh}H${x0}Z`, fill: c }, svg);
            }
            text(svg, s.fmt ? s.fmt(s.values[i]) : String(s.values[i]), { x: x0 + w + 6, y: y + bh / 2 + 4, 'font-size': 12, fill: T.text1, 'font-weight': 600 });
            this._bars.push({ y, h: bh, cat, value: s.values[i] });
        });
        return { svg };
    };
    BarChart.prototype.attachHover = function () {
        const { svg } = this.built, s = this.spec;
        const { W } = this.layout();
        this._bars.forEach(b => {
            const hit = el('rect', { x: 0, y: b.y - 5, width: W, height: b.h + 10, fill: 'transparent' }, svg);
            hit.addEventListener('pointermove', () => {
                this.tip.innerHTML = '';
                const row = document.createElement('div');
                row.className = 'tip-row';
                const val = document.createElement('strong');
                val.textContent = s.fmt ? s.fmt(b.value) : String(b.value);
                const name = document.createElement('span');
                name.className = 'tip-name';
                name.textContent = b.cat + (s.notes && s.notes[b.cat] ? ' · ' + s.notes[b.cat] : '');
                row.append(val, name);
                this.tip.appendChild(row);
                this.tip.hidden = false;
                const box = svg.getBoundingClientRect();
                this.tip.style.left = '12px';
                this.tip.style.top = ((b.y + b.h + 8) * box.width / W) + 'px';
            });
            hit.addEventListener('pointerleave', () => { this.tip.hidden = true; });
        });
    };
    BarChart.prototype.rows = function () { return this.spec.categories.map((c, i) => [c, this.spec.values[i]]); };
    BarChart.prototype.header = function () { return ['Stage', this.spec.valueLabel || 'Value']; };
    BarChart.prototype.renderTable = function () {
        const table = document.createElement('table');
        const thead = table.createTHead().insertRow();
        this.header().forEach(hd => { const th = document.createElement('th'); th.textContent = hd; thead.appendChild(th); });
        const tb = table.createTBody();
        this.rows().forEach(r => { const tr = tb.insertRow(); tr.insertCell().textContent = r[0]; tr.insertCell().textContent = String(r[1]); });
        this.tableWrap.innerHTML = '';
        this.tableWrap.appendChild(table);
    };

    // ============ Export ============
    function download(name, blob) {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = name;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
    }
    // poster exports are always the light theme, with the title baked in
    function svgString(chart) {
        const { svg } = chart.build('light', true);
        return new XMLSerializer().serializeToString(svg);
    }
    function exportSVG(chart, name) {
        download(name + '.svg', new Blob([svgString(chart)], { type: 'image/svg+xml' }));
    }
    function exportPNG(chart, name, factor) {
        factor = factor || 3;
        return new Promise(resolve => {
            const str = svgString(chart);
            const { W, H } = chart.layout();
            const img = new Image();
            img.onload = () => {
                const cv = document.createElement('canvas');
                cv.width = W * factor; cv.height = H * factor;
                const ctx = cv.getContext('2d');
                ctx.scale(factor, factor);
                ctx.drawImage(img, 0, 0, W, H);
                cv.toBlob(b => { download(name + '.png', b); resolve(); }, 'image/png');
            };
            img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(str);
        });
    }
    function exportCSV(chart, name) {
        download(name + '.csv', new Blob([chart.csv()], { type: 'text/csv' }));
    }

    BB84.Charts = { THEMES, currentTheme, XYChart, BarChart, exportPNG, exportSVG, exportCSV, download };
})(typeof window !== 'undefined' ? window : globalThis);
