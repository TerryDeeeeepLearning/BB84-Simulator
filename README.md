# BB84 Simulator v2

Open `index.html` in a browser. No build step and no server are needed.

## Tabs
- **Simulator**: a six-step BB84 session (Prepare → Transmit → Sift → Estimate → Correct → Amplify) on Alice's and Bob's grids. Click any cell to see its quantum state, the measurement bases and the Born-rule probabilities.
- **Lab · Data**: seven experiments that each pair theory with a photon-level Monte Carlo run. Every chart exports as a poster-ready PNG (3×), SVG or CSV. Set a seed so the figures can be reproduced.
- **Guide**: the protocol, the physics model, the security formulas, the simplifications made, and references.

- **English / 繁體中文**: the button next to Theme switches the whole site, charts included, and the choice is remembered.
- **How to explain** (`explainer.html`): a Traditional Chinese handbook. For every button and chart it describes what you see, the physics behind it and how to say it to an audience. It also has a 3-minute demo script and an FAQ.

## Files
| File | Role |
|---|---|
| `js/rng.js` | Seeded / crypto-seeded random numbers |
| `js/i18n.js` | English → Traditional Chinese dictionary and `T()` lookup |
| `js/quantum.js` | Photon qubits, Born rule, Poisson source, fiber loss, noise, Eve, detectors |
| `js/postprocess.js` | Sifting, QBER sampling, Cascade, Toeplitz privacy amplification, Eve's information over GF(2) |
| `js/theory.js` | Shor–Preskill, decoy-state (GLLP / Lo–Ma–Chen / Ma et al.), finite-key bounds |
| `js/charts.js` | SVG charts with hover readout, table view and export |
| `js/sim-ui.js`, `js/lab.js`, `js/main.js` | UI |
| `tools/run_on_qiskit.py` | Replays an exported session on Qiskit Aer or IBM Quantum hardware |

## Running a session on a quantum computer
1. In the Simulator, run at least the Transmit step, then click **session .json**.
2. Install the packages and run the script:
   ```
   pip install qiskit qiskit-aer qiskit-ibm-runtime
   python tools/run_on_qiskit.py bb84-session.json            # ideal simulator
   python tools/run_on_qiskit.py bb84-session.json --noise 0.02
   python tools/run_on_qiskit.py bb84-session.json --ibm      # needs a saved IBM Quantum account
   ```
