"""Replay a BB84 Simulator session on a quantum computer (or a noisy simulator).

Export a session from the Simulator tab ("session .json"), then:

    pip install qiskit qiskit-aer                     # simulator only
    pip install qiskit qiskit-aer qiskit-ibm-runtime  # plus real IBM hardware

    python run_on_qiskit.py bb84-session.json                     # ideal simulator
    python run_on_qiskit.py bb84-session.json --noise 0.01        # depolarising + readout noise
    python run_on_qiskit.py bb84-session.json --ibm               # least-busy IBM backend
    python run_on_qiskit.py bb84-session.json --ibm --backend ibm_torino

One qubit is reused for every pulse: reset -> Alice prepares -> (Eve measures in her
basis and the collapsed state travels on) -> Bob measures. Photon loss and multi-photon
pulses are not part of the circuit; the processor's own errors act as the channel noise.
"""
import argparse
import json
import math

from qiskit import ClassicalRegister, QuantumCircuit, QuantumRegister, transpile


def build_circuit(session):
    n = session["pulses"]
    a_bases, a_bits = session["alice"]["bases"], session["alice"]["bits"]
    e_bases = session["eve"]["bases"]
    b_bases = session["bob"]["bases"]

    q = QuantumRegister(1, "q")
    bob = ClassicalRegister(n, "bob")
    regs = [q, bob]
    eve = None
    if any(b >= 0 for b in e_bases):
        eve = ClassicalRegister(n, "eve")
        regs.append(eve)
    qc = QuantumCircuit(*regs)

    for i in range(n):
        qc.reset(q[0])
        if a_bits[i]:
            qc.x(q[0])
        if a_bases[i]:          # diagonal basis: |0>,|1> -> |+>,|->
            qc.h(q[0])
        if e_bases[i] >= 0:     # intercept-resend: the post-measurement state is what she resends
            if e_bases[i]:
                qc.h(q[0])
            qc.measure(q[0], eve[i])
            if e_bases[i]:
                qc.h(q[0])
        if b_bases[i]:
            qc.h(q[0])
        qc.measure(q[0], bob[i])
    return qc


def h2(x):
    return 0.0 if x <= 0 or x >= 1 else -x * math.log2(x) - (1 - x) * math.log2(1 - x)


def noise_model(p):
    from qiskit_aer.noise import NoiseModel, ReadoutError, depolarizing_error

    model = NoiseModel()
    model.add_all_qubit_quantum_error(depolarizing_error(p, 1), ["x", "h"])
    model.add_all_qubit_readout_error(ReadoutError([[1 - p, p], [p, 1 - p]]))
    return model


def run(qc, args):
    if args.ibm:
        from qiskit_ibm_runtime import QiskitRuntimeService, SamplerV2

        service = QiskitRuntimeService()
        backend = service.backend(args.backend) if args.backend else service.least_busy(operational=True, simulator=False)
        print(f"Running on IBM backend: {backend.name}")
        sampler = SamplerV2(mode=backend)
    else:
        from qiskit_aer import AerSimulator
        from qiskit_aer.primitives import SamplerV2

        backend = AerSimulator(noise_model=noise_model(args.noise)) if args.noise > 0 else AerSimulator()
        print("Running on Qiskit Aer" + (f" with {args.noise:.1%} depolarising + readout noise" if args.noise > 0 else " (ideal)"))
        sampler = SamplerV2(options={"backend_options": {"noise_model": noise_model(args.noise)}} if args.noise > 0 else None)
    isa = transpile(qc, backend=backend, optimization_level=1)
    result = sampler.run([isa], shots=1).result()[0]
    # bitstrings are little-endian: classical bit i is character n-1-i
    bob = result.data.bob.get_bitstrings()[0][::-1]
    return [int(c) for c in bob]


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("session", help="bb84-session.json exported from the simulator")
    ap.add_argument("--noise", type=float, default=0.0, help="Aer depolarising/readout error probability")
    ap.add_argument("--ibm", action="store_true", help="run on IBM Quantum hardware (needs a saved account)")
    ap.add_argument("--backend", help="IBM backend name (default: least busy)")
    ap.add_argument("--qasm", help="also write the circuit as OpenQASM 2 to this path")
    args = ap.parse_args()

    with open(args.session, encoding="utf-8") as f:
        session = json.load(f)
    qc = build_circuit(session)
    if args.qasm:
        from qiskit import qasm2

        with open(args.qasm, "w", encoding="utf-8") as f:
            f.write(qasm2.dumps(qc))
    bob_bits = run(qc, args)

    a_bases, a_bits, b_bases = session["alice"]["bases"], session["alice"]["bits"], session["bob"]["bases"]
    sifted = [i for i in range(session["pulses"]) if a_bases[i] == b_bases[i]]
    errors = sum(1 for i in sifted if a_bits[i] != bob_bits[i])
    qber = errors / len(sifted) if sifted else 0.0
    print(f"Pulses: {session['pulses']}   sifted: {len(sifted)}   errors: {errors}   QBER: {qber:.2%}")
    print(f"Asymptotic secret fraction 1 - 2h(Q): {max(0.0, 1 - 2 * h2(qber)):.3f}")
    print("ABORT: QBER above 11% - eavesdropping suspected." if qber > 0.11 else "QBER below 11% - a key can be distilled.")


if __name__ == "__main__":
    main()
