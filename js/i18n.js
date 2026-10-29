// English / Traditional Chinese switch.
// English text is the key; T('… {x} …', {x}) looks up the Chinese template and fills placeholders.
// Static HTML marks translatable elements with data-i18n (and data-i18n-placeholder / data-i18n-title).
(function (root) {
    'use strict';
    const BB84 = root.BB84 = root.BB84 || {};

    const ZH = {
        // ---------- header / tabs ----------
        'Quantum key distribution, photon by photon': '逐顆光子模擬量子金鑰分發',
        'Simulator': '模擬器',
        'Lab · Data': '實驗室 · 數據',
        'Guide': '說明',
        'Theme': '主題',
        'Toggle light / dark': '切換淺色 / 深色',
        'Switch language': '切換語言',
        'How to explain': '解說手冊',

        // ---------- setup ----------
        'Setup': '設定',
        'Scenario': '情境',
        'Textbook (ideal)': '教科書（理想）',
        'Lab bench · 1 km, laser source': '實驗桌 · 1 km、雷射光源',
        'Metro fiber · 25 km': '都會光纖 · 25 km',
        'Noisy channel · 5 km': '高雜訊通道 · 5 km',
        'Custom': '自訂',
        'Pulses': '脈衝數',
        'Source': '光源',
        'Type': '類型',
        'Single-photon source': '單光子源',
        'Attenuated laser (weak coherent)': '衰減雷射（弱相干光）',
        'Mean photons μ': '平均光子數 μ',
        'Channel &amp; detectors': '通道與偵測器',
        'Fiber length (km)': '光纖長度 (km)',
        'Loss (dB/km)': '損耗 (dB/km)',
        'Polarisation drift (°)': '偏振漂移 (°)',
        'Depolarisation (%)': '去極化 (%)',
        'Detector efficiency (%)': '偵測效率 (%)',
        'Dark count / gate': '暗計數 / 每閘',
        "Bob's bases": 'Bob 的基底',
        'Random (QRNG)': '隨機（量子亂數）',
        'Manual — click cells': '手動 — 點選格子',
        'Signature — draw a pattern': '簽名 — 手繪圖案',
        'Eavesdropper (Eve)': '竊聽者 (Eve)',
        'No Eve': '無竊聽',
        'Intercept–resend': '攔截重送',
        'Photon-number splitting (PNS)': '光子數分離攻擊 (PNS)',
        "Knows Bob's basis pattern": '已知 Bob 的基底圖樣',
        'Pulses attacked (%)': '受攻擊脈衝 (%)',
        "Show Eve's actions (god view)": '顯示 Eve 的動作（上帝視角）',
        'Post-processing': '後處理',
        'Bits sacrificed for QBER (%)': '用於估計 QBER 的位元 (%)',
        'Security analysis': '安全性分析',
        'Asymptotic (textbook)': '漸近（教科書）',
        'Finite-key (ε = 10⁻¹⁰)': '有限金鑰（ε = 10⁻¹⁰）',
        'Seed (optional)': '亂數種子（選填）',
        'random': '隨機',

        // ---------- stage ----------
        'Prepare': '準備',
        'Transmit': '傳送',
        'Sift': '篩選',
        'Estimate': '估計',
        'Correct': '糾錯',
        'Amplify': '放大',
        'Fill +': '全部 +',
        'Fill ×': '全部 ×',
        'Random': '隨機',
        'Clear': '清除',
        'Draw signature': '手繪簽名',
        'Apply': '套用',
        'Start': '開始',
        'Run all': '全部執行',
        'Reset': '重設',
        'New session': '新的一輪',
        'Next: {step}': '下一步：{step}',
        'Choose a scenario, then press Start.': '選好情境後按「開始」。',
        'Photon polarisation (line) + bit': '光子偏振（線段）＋位元',
        'No click (lost)': '未偵測（遺失）',
        'Discarded at sifting': '篩選時捨棄',
        'Sacrificed to estimate QBER': '用於估計 QBER',
        'Error': '錯誤',
        'Fixed by Cascade': '由 Cascade 修正',
        'Key bit': '金鑰位元',
        'Touched by Eve': '被 Eve 動過',
        '{d} km fiber': '{d} km 光纖',

        // ---------- report ----------
        'Session report': '實驗報告',
        'Where the bits go': '位元的去向',
        'Table': '表格',
        'Final key': '最終金鑰',
        'Inspect a photon': '檢視單顆光子',
        'Click any cell to see its quantum state, the measurement bases and the Born-rule probabilities.': '點任一格，查看它的量子態、量測基底與 Born rule 機率。',
        'Run on a real quantum computer': '在真實量子電腦上執行',
        'Exports this session as an OpenQASM 2.0 circuit (Alice → Eve → Bob on one reused qubit) and a JSON file for <code>tools/run_on_qiskit.py</code>.': '把這一輪匯出成 OpenQASM 2.0 電路（Alice → Eve → Bob，重複使用同一顆 qubit），以及給 <code>tools/run_on_qiskit.py</code> 使用的 JSON 檔。',
        'Pulses sent': '送出脈衝',
        'Detected': '偵測到',
        'Sifted': '篩選後',
        'Leaked in EC': '糾錯洩漏',
        '{n} carried no photon': '{n} 個沒有光子',
        'one photon each': '每個一顆光子',
        '{p} of pulses': '佔脈衝 {p}',
        'bases matched': '基底相同',
        'estimated from {n} bits · true {q}': '由 {n} 位元估計 · 真實 {q}',
        '{n} error(s) fixed{f}': '修正 {n} 個錯誤{f}',
        'secret bits': '祕密位元',
        'aborted': '已中止',
        'Sent': '送出',
        'Kept after sampling': '抽樣後保留',
        'Secret key': '祕密金鑰',
        'Bits': '位元',
        'No key — session aborted.': '沒有金鑰 — 本輪已中止。',
        'Cascade revealed <b>{leak}</b> parities in public.': 'Cascade 公開了 <b>{leak}</b> 個同位位元。',
        "After Toeplitz hashing, Eve's information about the {ell}-bit key is <b>{info} bit(s)</b>": '經過 Toeplitz 雜湊後，Eve 對這把 {ell} 位元金鑰的資訊量是 <b>{info} 位元</b>',
        '{leakNote} {after} — privacy amplification removed what the parities revealed.': '{leakNote}{after}，隱私放大已經消除同位位元洩漏的資訊。',
        'Eve split <b>{touched}</b> multi-photon pulses and added no errors. She knew <b>{known}</b> of {n} key bits exactly. {after}. {extra}': 'Eve 分離了 <b>{touched}</b> 個多光子脈衝，沒有造成任何錯誤。她確切知道 {n} 個金鑰位元中的 <b>{known}</b> 個。{after}。{extra}',
        'The QBER looked clean, so hashing was too weak — decoy states (see Lab) are the fix.': 'QBER 看起來很乾淨，所以雜湊壓縮得不夠；解法是誘騙態（見實驗室分頁）。',
        'Eve touched <b>{touched}</b> pulses and knew <b>{known}</b> of {n} key bits exactly. {leakNote} {after}.': 'Eve 動過 <b>{touched}</b> 個脈衝，確切知道 {n} 個金鑰位元中的 <b>{known}</b> 個。{leakNote}{after}。',

        // ---------- cell titles & inspector ----------
        'Pulse {i}: {basis} basis, bit {bit} → |{state}⟩, {n} photon(s)': '脈衝 {i}：{basis} 基底，位元 {bit} → |{state}⟩，{n} 顆光子',
        'Pulse {i}: no detector click': '脈衝 {i}：偵測器沒有響',
        'Pulse {i}: measured in {basis} → bit {bit}': '脈衝 {i}：用 {basis} 量測 → 位元 {bit}',
        'Pulse {i}': '脈衝 {i}',
        'Polarisation diagram': '偏振圖',
        'State': '量子態',
        'Photons': '光子數',
        'Channel': '通道',
        'Result': '結果',
        'Fate': '去向',
        '{basis} basis, bit {bit} → |{state}⟩ = {ket}': '{basis} 基底，位元 {bit} → |{state}⟩ = {ket}',
        '{n} (Poisson, μ = {mu})': '{n}（Poisson 分佈，μ = {mu}）',
        '1 (single-photon source)': '1（單光子源）',
        'did nothing': '沒有動作',
        'measured in {eb} → got {bit}, resent |{state}⟩': '用 {eb} 量測 → 得到 {bit}，重送 |{state}⟩',
        ' (right basis: no disturbance)': '（基底正確：沒有擾動）',
        ' (wrong basis: 50% chance of an error)': '（基底錯誤：50% 機率造成錯誤）',
        'kept one photon in memory, forwarded the rest losslessly': '把一顆光子存進量子記憶體，其餘無損轉送',
        'blocked the pulse': '攔下這個脈衝',
        'forwarded it losslessly (no information)': '無損轉送（沒有得到資訊）',
        '{n} photon(s) arrived': '到達 {n} 顆光子',
        ' · Pauli {p} error': ' · Pauli {p} 錯誤',
        ' · drift {d}°': ' · 偏振漂移 {d}°',
        '{basis} basis · Born rule P(0) = {p0}, P(1) = {p1}': '{basis} 基底 · Born rule P(0) = {p0}，P(1) = {p1}',
        'no click (photon lost or not detected)': '沒有響（光子遺失或未被偵測）',
        'double click → random bit {bit}': '雙響 → 隨機指定位元 {bit}',
        'click → bit {bit}': '響 → 位元 {bit}',
        ' (dark count!)': '（暗計數！）',
        'discarded: no detection': '捨棄：沒有偵測到',
        'discarded: bases differ': '捨棄：基底不同',
        'kept at sifting': '篩選時保留',
        'revealed for QBER estimation': '公開用於估計 QBER',
        ' — error found': ' — 發現錯誤',
        'error found and fixed by Cascade': '發現錯誤並由 Cascade 修正',
        'went into the hashed final key': '進入雜湊後的最終金鑰',
        "Blue: Alice's state · gray: Bob's basis · orange: Eve's basis · aqua: state reaching Bob": '藍：Alice 的態 · 灰：Bob 的基底 · 橘：Eve 的基底 · 綠：到達 Bob 的態',
        "Blue: Alice's state · later steps add Eve and Bob": '藍：Alice 的態 · 後面的步驟會加上 Eve 與 Bob',

        // ---------- hints ----------
        'Fiber transmission {eta}% · expected detection {det}% per pulse · intrinsic QBER ≈ {e}%': '光纖穿透率 {eta}% · 每個脈衝預期偵測率 {det}% · 本質 QBER ≈ {e}%',
        'No eavesdropper on the line.': '線路上沒有竊聽者。',
        'Eve measures in a random basis and resends. Expect ≈ 25% errors on attacked pulses.': 'Eve 用隨機基底量測後重送，受攻擊的脈衝約有 25% 會出錯。',
        'A single-photon source has no spare photons — PNS gives Eve nothing.': '單光子源沒有多餘的光子，PNS 攻擊拿不到任何資訊。',
        'Eve keeps one photon from each multi-photon pulse and fakes the loss. No errors — invisible without decoy states.': 'Eve 從每個多光子脈衝留下一顆光子，並偽造光纖損耗。不會產生錯誤，沒有誘騙態就偵測不到。',
        "Eve knows Bob's bases in advance (e.g. a reused signature) and measures in them. No errors, full knowledge.": 'Eve 事先知道 Bob 的基底（例如重複使用的簽名），並用相同基底量測。不產生錯誤，卻知道全部資訊。',

        // ---------- status messages ----------
        'Step 1 · Alice draws a random basis and bit for every pulse and encodes them in photon polarisation.': '步驟 1 · Alice 為每個脈衝隨機選基底和位元，編碼在光子的偏振上。',
        'Alice is ready. Bob still has cells without a basis — click them, use Fill, or draw a signature.': 'Alice 準備好了。Bob 還有格子沒選基底：點選格子、使用「全部」按鈕或手繪簽名。',
        'Alice is ready. Press Next to send the photons to Bob.': 'Alice 準備好了。按「下一步」把光子送給 Bob。',
        'Alice is ready. The γ badge shows the photon number of each laser pulse — many are empty.': 'Alice 準備好了。γ 標記是每個雷射脈衝的光子數，很多脈衝是空的。',
        'Alice is ready. Press Next to send the photons through the fiber.': 'Alice 準備好了。按「下一步」讓光子穿過光纖。',
        'Bob must choose a basis for every cell first (click cells, Fill, Random or Draw).': 'Bob 必須先為每一格選好基底（點選格子、全部、隨機或手繪）。',
        'Step 2 · Photons cross the fiber; Eve may interfere; Bob measures each one in his own basis.': '步驟 2 · 光子穿過光纖，Eve 可能介入，Bob 用自己的基底量測每一顆。',
        'Bob registered {det} of {n} pulses{dbl}. Next, the bases are compared in public.': 'Bob 偵測到 {n} 個脈衝中的 {det} 個{dbl}。接下來公開比對基底。',
        ' ({n} double clicks)': '（{n} 次雙響）',
        'Step 3 · Sifting: Alice and Bob announce their bases (never the bits) and drop every mismatch and every missing click.': '步驟 3 · 篩選：Alice 和 Bob 公開基底（從不公開位元），丟掉基底不同與沒有偵測到的脈衝。',
        '{k} of {n} pulses survive sifting (bases matched and Bob saw a click).': '{n} 個脈衝中有 {k} 個通過篩選（基底相同且 Bob 有偵測到）。',
        'Step 4 · A random sample of sifted bits is revealed to measure the quantum bit error rate (QBER).': '步驟 4 · 公開一部分隨機抽出的位元，量測量子位元錯誤率（QBER）。',
        'QBER = {q} ({e} / {n}), below the {thr} threshold, so the session continues. Sampled bits are now public and are dropped.': 'QBER = {q}（{e} / {n}），低於 {thr} 門檻，繼續進行。被抽樣的位元已經公開，因此捨棄。',
        "Step 5 · Cascade error correction: compare block parities, binary-search each mismatch, fix Bob's bit.": '步驟 5 · Cascade 糾錯：比對區塊同位，二分搜尋找出錯誤，修正 Bob 的位元。',
        'Cascade fixed {n} error(s) using {leak} public parity bits (4 passes, first block size {k1}). Keys now agree.': 'Cascade 用 {leak} 個公開同位位元修正了 {n} 個錯誤（4 輪，第一輪區塊大小 {k1}）。現在雙方金鑰一致。',
        'Step 6 · Privacy amplification: a random Toeplitz matrix hashes the key down to ℓ bits.': '步驟 6 · 隱私放大：用隨機 Toeplitz 矩陣把金鑰雜湊壓縮成 ℓ 位元。',
        'Done. {n} corrected bits were compressed to a {ell}-bit secret key shared by Alice and Bob.': '完成。{n} 個修正後的位元被壓縮成 Alice 與 Bob 共享的 {ell} 位元祕密金鑰。',
        'Alice and Bob believe they share a secure {ell}-bit key, but Eve knows {info} bit(s) of it. Their checks could not see this attack.': 'Alice 和 Bob 以為他們共享一把安全的 {ell} 位元金鑰，但 Eve 知道其中 {info} 位元。他們的檢查看不出這種攻擊。',
        "Secure key established: {ell} bits. Eve's information about it: 0 bits.": '安全金鑰建立完成：{ell} 位元。Eve 對它的資訊量：0 位元。',
        'Session aborted.': '本輪已中止。',
        "Choose Bob's bases (click cells, Fill or Draw), then press Start.": '先選好 Bob 的基底（點選格子、全部或手繪），再按「開始」。',
        'Press Start to begin a new session.': '按「開始」進行新的一輪。',
        "Draw on Bob's grid with mouse, pen or finger, then press Apply. Inked cells become +, the rest ×.": '用滑鼠、觸控筆或手指在 Bob 的格子上畫，再按「套用」。有筆跡的格子變成 +，其餘變成 ×。',
        'Signature applied. Note: a signature is a fixed pattern, not randomness — try Eve "Knows Bob\'s basis pattern".': '簽名已套用。注意：簽名是固定圖樣，不是隨機；可以試試 Eve 的「已知 Bob 的基底圖樣」。',

        // ---------- abort reasons (postprocess.js) ----------
        'Too few sifted bits to run the protocol.': '篩選後的位元太少，無法執行協定。',
        'Estimated QBER {q}% is above the {thr}% security threshold — eavesdropping suspected, key discarded.': '估計 QBER {q}% 高於 {thr}% 安全門檻，疑似遭到竊聽，金鑰作廢。',
        'Verification hash mismatch: {n} error(s) survived Cascade — session aborted.': '驗證雜湊不一致：有 {n} 個錯誤沒被 Cascade 修正，本輪中止。',
        'Finite-key bound leaves no secret bits — the block is far too short (real systems use 10⁵–10⁷ sifted bits).': '有限金鑰界限下沒有剩餘的祕密位元：區塊太短了（真實系統使用 10⁵–10⁷ 個篩選後位元）。',
        'Error correction leaked as much as the raw key contained — no secret bits left.': '糾錯洩漏的資訊和原始金鑰一樣多，沒有剩下祕密位元。',

        // ---------- lab: shared ----------
        'Hardware model': '硬體模型',
        'GYS 2004 (InGaAs APD, 1550 nm)': 'GYS 2004（InGaAs APD，1550 nm）',
        'Modern SNSPD system (illustrative)': '現代 SNSPD 系統（示意）',
        'SNSPD (illustrative)': 'SNSPD（示意）',
        'Seed': '亂數種子',
        'Run all simulations': '執行全部模擬',
        'Download all figures (PNG)': '下載全部圖表 (PNG)',
        'All simulations finished.': '全部模擬完成。',
        'Run simulation': '執行模擬',
        'Monte Carlo': '蒙地卡羅',
        'Pulses per point': '每點脈衝數',
        'Honest channel': '正常通道',
        'Chart': '圖表',
        '{title}. Use left and right arrows to read values.': '{title}。用左右方向鍵讀取數值。',

        // lab 1
        'Eavesdropping leaves a fingerprint': '竊聽一定留下痕跡',
        'QBER of the sifted key as Eve intercept–resends a growing share of the pulses. Line: theory. Dots: photon-level Monte Carlo.': 'Eve 攔截重送的脈衝比例越來越高時，篩選後金鑰的 QBER 變化。線：理論。點：光子層級的蒙地卡羅模擬。',
        'Intrinsic channel error': '通道本質錯誤',
        'Theory: e(1 − f/2) + f/4': '理論：e(1 − f/2) + f/4',
        'QBER rises linearly with the fraction of pulses Eve attacks': 'QBER 隨 Eve 攻擊的脈衝比例線性上升',
        'Intercept–resend, random basis · intrinsic error {e}%': '攔截重送、隨機基底 · 本質錯誤 {e}%',
        'Fraction of pulses intercepted': '被攔截的脈衝比例',
        '11% abort threshold': '11% 中止門檻',
        'With {e}% intrinsic error, Eve can intercept at most <b>{f}%</b> of pulses before the alarm trips — and even then privacy amplification removes what she learned.': '通道本質錯誤為 {e}% 時，Eve 最多只能攔截 <b>{f}%</b> 的脈衝就會觸發警報；而且就算沒觸發，隱私放大也會消除她得到的資訊。',
        'QBER vs Eve · f = {f}%': 'QBER 與 Eve · f = {f}%',

        // lab 2
        'Why the threshold is 11%': '為什麼門檻是 11%',
        "A secret key exists while Bob knows more about Alice's bits than Eve does. Each curve is mutual information per sifted bit.": '只要 Bob 對 Alice 位元的了解比 Eve 多，就能產生祕密金鑰。每條曲線是每個篩選後位元的互資訊。',
        "Bob's information vs Eve's, as the error rate grows": '錯誤率上升時，Bob 與 Eve 的資訊量',
        'I(A:B) = 1 − h(Q); Eve: intercept–resend, optimal individual (cloning) and coherent-attack bound h(Q)': 'I(A:B) = 1 − h(Q)；Eve：攔截重送、最佳個別攻擊（複製機）與相干攻擊上界 h(Q)',
        'Bits of information per sifted bit': '每個篩選位元的資訊量（位元）',
        'Information (bits)': '資訊量（位元）',
        'Eve · intercept–resend': 'Eve · 攔截重送',
        'Eve · optimal individual': 'Eve · 最佳個別攻擊',
        'Eve · coherent bound h(Q)': 'Eve · 相干攻擊上界 h(Q)',
        'Against the strongest attacks allowed by quantum mechanics, Bob stays ahead only while QBER &lt; <b>{thr}%</b> (where 1 − h(Q) = h(Q)). Restricting Eve to individual attacks would push the limit to {qi}%.': '面對量子力學允許的最強攻擊，只有在 QBER &lt; <b>{thr}%</b>（1 − h(Q) = h(Q) 的交點）時 Bob 才領先。若 Eve 只能做個別攻擊，門檻會提高到 {qi}%。',

        // lab 3
        'Catching Eve needs enough samples': '抓到 Eve 需要足夠的樣本',
        'Distribution of the estimated QBER over 500 sessions, honest channel (2% error) vs Eve intercepting half of the pulses.': '500 次實驗中估計出的 QBER 分佈：正常通道（2% 錯誤）對比 Eve 攔截一半脈衝。',
        'Bits sacrificed per session': '每輪犧牲的位元數',
        'Eve on 50% of pulses': 'Eve 攻擊 50% 脈衝',
        'QBER estimates from {k} sacrificed bits per session': '每輪用 {k} 個犧牲位元估計 QBER',
        'Monte Carlo, 500 sessions each · expected QBER 2% (honest) vs 14% (Eve)': '蒙地卡羅，各 500 輪 · 預期 QBER 2%（正常）對比 14%（Eve）',
        'Estimated QBER': '估計的 QBER',
        'Share of sessions': '實驗輪數比例',
        'abort above 11%': '超過 11% 中止',
        'Press <b>Run simulation</b> to sample 2 × 500 sessions.': '按 <b>執行模擬</b> 跑 2 × 500 輪實驗。',
        'With {k} sampled bits, Eve is caught in <b>{d}%</b> of sessions and honest sessions are falsely aborted <b>{fa}%</b> of the time. Larger samples separate the two cleanly — one reason real systems work with blocks of 10⁵ bits or more.': '抽樣 {k} 位元時，Eve 在 <b>{d}%</b> 的實驗中被抓到，正常通道則有 <b>{fa}%</b> 被誤判中止。樣本越大兩者分得越開，這也是真實系統使用 10⁵ 位元以上區塊的原因之一。',
        '{label} · session {s}/{M}': '{label} · 第 {s}/{M} 輪',
        'Honest sessions': '正常通道實驗',
        'Eve sessions': 'Eve 實驗',

        // lab 4
        'Decoy states extend the reach': '誘騙態延長傳輸距離',
        'Secret key per signal pulse vs fiber length for a weak-coherent BB84 system. Lines: asymptotic theory at the optimal μ. Dots: photon-level Monte Carlo with a vacuum + weak decoy (ν = 0.1).': '弱相干光 BB84 系統中，每個訊號脈衝產生的祕密金鑰與光纖長度的關係。線：最佳 μ 下的漸近理論。點：使用真空＋弱誘騙態（ν = 0.1）的光子層級蒙地卡羅模擬。',
        'Ideal single-photon source': '理想單光子源',
        'Decoy · infinite': '誘騙態 · 無限多組',
        'Decoy · vacuum + weak': '誘騙態 · 真空＋弱',
        'No decoy (GLLP)': '無誘騙態 (GLLP)',
        'Monte Carlo · vacuum + weak': '蒙地卡羅 · 真空＋弱',
        'Without decoy states, multi-photon pulses cap the distance': '沒有誘騙態，多光子脈衝會限制傳輸距離',
        'Hardware model: {hw} · α = {a} dB/km · e_d = {ed}% · f = {f}': '硬體模型：{hw} · α = {a} dB/km · e_d = {ed}% · f = {f}',
        'Secret key per signal pulse': '每個訊號脈衝的祕密金鑰',
        'Maximum distance: no decoy ≈ <b>{g} km</b>, vacuum + weak decoy ≈ <b>{v} km</b>, infinite decoy ≈ <b>{i} km</b>. Without decoys every multi-photon pulse must be assumed leaked to a PNS attack.': '最遠距離：無誘騙態 ≈ <b>{g} km</b>，真空＋弱誘騙態 ≈ <b>{v} km</b>，無限誘騙態 ≈ <b>{i} km</b>。沒有誘騙態時，每個多光子脈衝都必須假設已經被 PNS 攻擊洩漏。',
        'Distance · {L} km': '距離 · {L} km',

        // lab 5
        'Decoy states expose a photon-number-splitting attack': '誘騙態揭穿光子數分離攻擊',
        "Eve blocks single-photon pulses, keeps one photon of every multi-photon pulse and uses a lossless line so Bob's count rate and QBER look normal. Only the decoy pulses — which she cannot tell apart — reveal her.": 'Eve 擋下單光子脈衝，從每個多光子脈衝留下一顆光子，並用無損線路讓 Bob 的計數率和 QBER 看起來正常。只有她分辨不出來的誘騙脈衝會揭露她。',
        'Fiber length': '光纖長度',
        'Quantity': '物理量',
        'PNS attack': 'PNS 攻擊',
        'Press “Run simulation”': '請按「執行模擬」',
        'secure key ✓': '安全金鑰 ✓',
        'abort ✗': '中止 ✗',
        'Signal gain Q_μ (what Bob sees)': '訊號增益 Q_μ（Bob 看到的）',
        'Signal QBER E_μ': '訊號 QBER E_μ',
        'Naive key rate, ignoring multi-photon pulses': '天真的金鑰率（忽略多光子脈衝）',
        'Decoy gain Q_ν': '誘騙增益 Q_ν',
        'Vacuum gain Y₀': '真空增益 Y₀',
        'Single-photon yield bound Y₁ᴸ': '單光子產率下界 Y₁ᴸ',
        'Decoy-state key rate R': '誘騙態金鑰率 R',
        'Verdict with decoy analysis': '誘騙態分析的判定',
        "Bob's signal gain changes by only {g}% and the QBER stays at the normal level (Eve adds no errors), so a naive analysis happily makes a key Eve knows. The decoy gain drops {d}×, the single-photon yield bound collapses and the decoy-state analysis aborts.": 'Bob 的訊號增益只變了 {g}%，QBER 也維持正常（Eve 不造成錯誤），所以天真的分析會產生一把 Eve 知道的金鑰。但誘騙增益下降 {d} 倍，單光子產率下界崩潰，誘騙態分析因此中止。',

        // lab 6
        'Finite blocks cost key': '有限區塊會損失金鑰',
        'Secret fraction of the sifted key vs block size, with the statistical penalty of estimating the QBER from a finite sample (ε_sec = 10⁻¹⁰, ε_cor = 10⁻¹², f = 1.16).': '篩選後金鑰中可成為祕密金鑰的比例與區塊大小的關係，已計入用有限樣本估計 QBER 的統計懲罰（ε_sec = 10⁻¹⁰，ε_cor = 10⁻¹²，f = 1.16）。',
        '→ {v} asymptotic': '→ 漸近值 {v}',
        'Real systems need 10⁵–10⁷ bits per block': '真實系統每個區塊需要 10⁵–10⁷ 位元',
        'Finite-key bound after Tomamichel et al. 2012, optimal sampling split': '有限金鑰界限依 Tomamichel 等人 2012，採最佳抽樣比例',
        'Sifted bits per block': '每區塊篩選後位元數',
        'Secret key / sifted bits': '祕密金鑰 / 篩選後位元',
        'At 3% QBER, key appears only after ≈ <b>{a}</b> sifted bits and reaches 90% of the asymptotic rate after ≈ <b>{b}</b>. A 100-cell grid demonstrates the protocol, it cannot certify a key.': 'QBER 3% 時，要約 <b>{a}</b> 個篩選後位元才開始有金鑰，約 <b>{b}</b> 個才達到漸近值的 90%。100 格的網格只能示範協定，無法認證一把金鑰。',

        // lab 7
        'The implemented pipeline matches theory': '實作的流程與理論一致',
        "Secret fraction produced by this simulator's own Cascade + Toeplitz pipeline, compared with the Shor–Preskill bound (perfect error correction) and with a practical code efficiency f = 1.16.": '本模擬器實際的 Cascade＋Toeplitz 流程產生的祕密金鑰比例，對比 Shor–Preskill 界限（完美糾錯）與實際編碼效率 f = 1.16 的理論值。',
        'Sifted bits per point': '每點篩選後位元數',
        'Practical 1 − (1 + f)h(Q), f = 1.16': '實際 1 − (1 + f)h(Q)，f = 1.16',
        'Simulated Cascade + PA': '模擬 Cascade＋隱私放大',
        'Secret fraction after error correction and privacy amplification': '糾錯與隱私放大後的祕密金鑰比例',
        'Asymptotic key length ℓ = n[1 − h(Q)] − leak_EC, Q estimated from 10% of the sifted bits': '漸近金鑰長度 ℓ = n[1 − h(Q)] − leak_EC，Q 由 10% 篩選後位元估計',
        'Secret key / corrected bits': '祕密金鑰 / 修正後位元',
        'Press <b>Run simulation</b> to push real Cascade sessions through the pipeline.': '按 <b>執行模擬</b>，用真實的 Cascade 流程跑一遍。',
        'Measured Cascade efficiency: f = <b>{f}</b> on average (1.00 would be the Shannon limit). Every extra parity bit Cascade reveals is a bit privacy amplification must remove.': '實測 Cascade 平均效率 f = <b>{f}</b>（1.00 是 Shannon 極限）。Cascade 多公開一個同位位元，隱私放大就必須多移除一個位元。',
        'Pipeline · QBER {q}%': '流程 · QBER {q}%'
    };

    const norm = s => String(s).replace(/\s+/g, ' ').trim();
    const ZHN = {};
    Object.keys(ZH).forEach(k => { ZHN[norm(k)] = ZH[k]; });

    let lang = 'en';
    try { if (root.localStorage && root.localStorage.getItem('bb84-lang') === 'zh') lang = 'zh'; } catch (e) { /* storage unavailable */ }

    function fill(s, p) {
        return p ? s.replace(/\{(\w+)\}/g, (m, k) => (k in p ? p[k] : m)) : s;
    }
    function T(s, p) {
        if (lang === 'zh') {
            const zh = ZHN[norm(s)];
            if (zh !== undefined) return fill(zh, p);
        }
        return fill(s, p);
    }

    function applyStatic(scope) {
        if (typeof document === 'undefined') return;
        (scope || document).querySelectorAll('[data-i18n]').forEach(el => {
            if (el.dataset.en === undefined) el.dataset.en = norm(el.innerHTML);
            el.innerHTML = T(el.dataset.en);
        });
        ['placeholder', 'title'].forEach(attr => {
            (scope || document).querySelectorAll(`[data-i18n-${attr}]`).forEach(el => {
                el.setAttribute(attr, T(el.getAttribute(`data-i18n-${attr}`)));
            });
        });
        document.documentElement.lang = lang === 'zh' ? 'zh-Hant' : 'en';
        document.documentElement.dataset.lang = lang;
    }

    function setLang(l) {
        lang = l === 'zh' ? 'zh' : 'en';
        try { root.localStorage.setItem('bb84-lang', lang); } catch (e) { /* storage unavailable */ }
        applyStatic();
    }

    BB84.T = T;
    BB84.I18N = { get lang() { return lang; }, setLang, applyStatic };
})(typeof window !== 'undefined' ? window : globalThis);
