import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Icon from "@/components/ui/icon";

interface MeasurementPoint {
  x: string;
  y: string;
  z: string;
  theta: string;
  phi: string;
  amplitude: string;
  phase: string;
}

interface CalcResult {
  pcX: number;
  pcY: number;
  pcZ: number;
  phaseVariation: number;
  gain: number;
  beamwidth: number;
}

interface Props {
  open: boolean;
  onClose: () => void;
}

const ANTENNA_TYPES = ["Патч (Patch)", "Диполь", "Рупор (Horn)", "Параболическая", "Спиральная", "Щелевая"];

function calcPhaseCenter(points: MeasurementPoint[], freq: number): CalcResult {
  const valid = points.filter(p => p.x && p.y && p.z && p.phase && p.amplitude);
  if (valid.length < 2) return { pcX: 0, pcY: 0, pcZ: 0, phaseVariation: 0, gain: 0, beamwidth: 0 };

  const lambda = 3e8 / (freq * 1e9);
  const k = (2 * Math.PI) / lambda;

  let sumW = 0, sumWX = 0, sumWY = 0, sumWZ = 0;
  const phases: number[] = [];

  for (const p of valid) {
    const amp = parseFloat(p.amplitude);
    const w = amp * amp;
    sumW += w;
    sumWX += w * parseFloat(p.x);
    sumWY += w * parseFloat(p.y);
    sumWZ += w * parseFloat(p.z);
    phases.push(parseFloat(p.phase));
  }

  const pcX = sumW > 0 ? sumWX / sumW : 0;
  const pcY = sumW > 0 ? sumWY / sumW : 0;
  const pcZ = sumW > 0 ? sumWZ / sumW : 0;

  const meanPhase = phases.reduce((a, b) => a + b, 0) / phases.length;
  const phaseVariation = Math.sqrt(
    phases.reduce((acc, p) => acc + Math.pow(p - meanPhase, 2), 0) / phases.length
  );

  const maxAmp = Math.max(...valid.map(p => parseFloat(p.amplitude)));
  const gain = 10 * Math.log10(maxAmp * maxAmp + 1e-10);
  const beamwidth = lambda / (0.01 * k + 0.001) * 10;

  return {
    pcX: parseFloat(pcX.toFixed(4)),
    pcY: parseFloat(pcY.toFixed(4)),
    pcZ: parseFloat(pcZ.toFixed(4)),
    phaseVariation: parseFloat(phaseVariation.toFixed(2)),
    gain: parseFloat(gain.toFixed(2)),
    beamwidth: parseFloat(Math.min(beamwidth, 180).toFixed(1)),
  };
}

function exportCSV(params: Record<string, string>, points: MeasurementPoint[], result: CalcResult) {
  const rows: string[][] = [
    ["PhaseCalc — Отчёт расчёта центра фазы антенны"],
    [""],
    ["Параметры антенны"],
    ["Частота (ГГц)", params.frequency],
    ["Длина волны (м)", params.wavelength],
    ["Тип антенны", params.antennaType],
    ["Размер (мм)", params.size],
    [""],
    ["Результаты"],
    ["Центр фазы X (мм)", String(result.pcX)],
    ["Центр фазы Y (мм)", String(result.pcY)],
    ["Центр фазы Z (мм)", String(result.pcZ)],
    ["Вариация фазы (°)", String(result.phaseVariation)],
    ["Усиление (дБ)", String(result.gain)],
    ["Ширина луча (°)", String(result.beamwidth)],
    [""],
    ["Точки измерений"],
    ["X (мм)", "Y (мм)", "Z (мм)", "Theta (°)", "Phi (°)", "Амплитуда", "Фаза (°)"],
    ...points.filter(p => p.x).map(p => [p.x, p.y, p.z, p.theta, p.phi, p.amplitude, p.phase]),
  ];

  const csv = rows.map(r => r.join(";")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `phasecalc_report_${Date.now()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

const emptyPoint = (): MeasurementPoint => ({ x: "", y: "", z: "", theta: "", phi: "", amplitude: "", phase: "" });

export default function CalcModal({ open, onClose }: Props) {
  const [step, setStep] = useState<"form" | "result">("form");
  const [params, setParams] = useState({ frequency: "", wavelength: "", antennaType: ANTENNA_TYPES[0], size: "" });
  const [points, setPoints] = useState<MeasurementPoint[]>([emptyPoint(), emptyPoint(), emptyPoint()]);
  const [result, setResult] = useState<CalcResult | null>(null);

  const setParam = (key: string, val: string) => {
    const updated = { ...params, [key]: val };
    if (key === "frequency" && val) {
      const f = parseFloat(val);
      if (!isNaN(f) && f > 0) updated.wavelength = (300 / f).toFixed(4);
    }
    if (key === "wavelength" && val) {
      const l = parseFloat(val);
      if (!isNaN(l) && l > 0) updated.frequency = (300 / l).toFixed(4);
    }
    setParams(updated);
  };

  const updatePoint = (i: number, key: keyof MeasurementPoint, val: string) => {
    const next = [...points];
    next[i] = { ...next[i], [key]: val };
    setPoints(next);
  };

  const addPoint = () => setPoints([...points, emptyPoint()]);
  const removePoint = (i: number) => setPoints(points.filter((_, idx) => idx !== i));

  const handleCalculate = () => {
    const freq = parseFloat(params.frequency);
    if (!params.frequency || isNaN(freq)) return;
    const res = calcPhaseCenter(points, freq);
    setResult(res);
    setStep("result");
  };

  const handleReset = () => {
    setStep("form");
    setResult(null);
  };

  const handleClose = () => {
    onClose();
    setTimeout(() => { setStep("form"); setResult(null); }, 400);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(0,0,0,0.75)" }}
          onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
        >
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="bg-white w-full max-w-2xl max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between p-6 border-b border-neutral-200">
              <div>
                <h2 className="text-xl font-bold uppercase tracking-tight text-neutral-900">
                  {step === "form" ? "Расчёт центра фазы" : "Результаты расчёта"}
                </h2>
                <p className="text-sm text-neutral-500 mt-0.5">PhaseCalc</p>
              </div>
              <button onClick={handleClose} className="text-neutral-400 hover:text-neutral-900 transition-colors cursor-pointer">
                <Icon name="X" size={20} />
              </button>
            </div>

            {step === "form" && (
              <div className="p-6 space-y-8">
                <section>
                  <h3 className="text-xs uppercase tracking-widest text-neutral-400 mb-4">Частота и длина волны</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <label className="flex flex-col gap-1">
                      <span className="text-xs text-neutral-500">Частота, ГГц</span>
                      <input
                        type="number" min="0" step="0.001"
                        value={params.frequency}
                        onChange={e => setParam("frequency", e.target.value)}
                        placeholder="напр. 2.4"
                        className="border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:border-neutral-900"
                      />
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="text-xs text-neutral-500">Длина волны, мм</span>
                      <input
                        type="number" min="0" step="0.001"
                        value={params.wavelength}
                        onChange={e => setParam("wavelength", e.target.value)}
                        placeholder="авто"
                        className="border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:border-neutral-900"
                      />
                    </label>
                  </div>
                </section>

                <section>
                  <h3 className="text-xs uppercase tracking-widest text-neutral-400 mb-4">Геометрия антенны</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <label className="flex flex-col gap-1">
                      <span className="text-xs text-neutral-500">Тип антенны</span>
                      <select
                        value={params.antennaType}
                        onChange={e => setParam("antennaType", e.target.value)}
                        className="border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:border-neutral-900 bg-white"
                      >
                        {ANTENNA_TYPES.map(t => <option key={t}>{t}</option>)}
                      </select>
                    </label>
                    <label className="flex flex-col gap-1">
                      <span className="text-xs text-neutral-500">Характерный размер, мм</span>
                      <input
                        type="number" min="0"
                        value={params.size}
                        onChange={e => setParam("size", e.target.value)}
                        placeholder="напр. 30"
                        className="border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:border-neutral-900"
                      />
                    </label>
                  </div>
                </section>

                <section>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xs uppercase tracking-widest text-neutral-400">Точки измерений</h3>
                    <button
                      onClick={addPoint}
                      className="flex items-center gap-1 text-xs text-neutral-600 hover:text-neutral-900 transition-colors cursor-pointer uppercase tracking-wide"
                    >
                      <Icon name="Plus" size={14} /> Добавить точку
                    </button>
                  </div>
                  <div className="space-y-3">
                    {points.map((p, i) => (
                      <div key={i} className="border border-neutral-200 p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs text-neutral-400 uppercase">Точка {i + 1}</span>
                          {points.length > 1 && (
                            <button onClick={() => removePoint(i)} className="text-neutral-300 hover:text-red-500 transition-colors cursor-pointer">
                              <Icon name="Trash2" size={14} />
                            </button>
                          )}
                        </div>
                        <div className="grid grid-cols-3 gap-2 mb-2">
                          {(["x", "y", "z"] as const).map(k => (
                            <label key={k} className="flex flex-col gap-1">
                              <span className="text-xs text-neutral-400">{k.toUpperCase()} (мм)</span>
                              <input type="number" value={p[k]} onChange={e => updatePoint(i, k, e.target.value)}
                                placeholder="0"
                                className="border border-neutral-200 px-2 py-1.5 text-xs focus:outline-none focus:border-neutral-900" />
                            </label>
                          ))}
                        </div>
                        <div className="grid grid-cols-4 gap-2">
                          <label className="flex flex-col gap-1">
                            <span className="text-xs text-neutral-400">Theta (°)</span>
                            <input type="number" value={p.theta} onChange={e => updatePoint(i, "theta", e.target.value)}
                              placeholder="0"
                              className="border border-neutral-200 px-2 py-1.5 text-xs focus:outline-none focus:border-neutral-900" />
                          </label>
                          <label className="flex flex-col gap-1">
                            <span className="text-xs text-neutral-400">Phi (°)</span>
                            <input type="number" value={p.phi} onChange={e => updatePoint(i, "phi", e.target.value)}
                              placeholder="0"
                              className="border border-neutral-200 px-2 py-1.5 text-xs focus:outline-none focus:border-neutral-900" />
                          </label>
                          <label className="flex flex-col gap-1">
                            <span className="text-xs text-neutral-400">Амплитуда</span>
                            <input type="number" value={p.amplitude} onChange={e => updatePoint(i, "amplitude", e.target.value)}
                              placeholder="1.0"
                              className="border border-neutral-200 px-2 py-1.5 text-xs focus:outline-none focus:border-neutral-900" />
                          </label>
                          <label className="flex flex-col gap-1">
                            <span className="text-xs text-neutral-400">Фаза (°)</span>
                            <input type="number" value={p.phase} onChange={e => updatePoint(i, "phase", e.target.value)}
                              placeholder="0"
                              className="border border-neutral-200 px-2 py-1.5 text-xs focus:outline-none focus:border-neutral-900" />
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                <button
                  onClick={handleCalculate}
                  disabled={!params.frequency}
                  className="w-full bg-neutral-900 text-white py-3 uppercase text-sm tracking-wide hover:bg-neutral-700 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Рассчитать
                </button>
              </div>
            )}

            {step === "result" && result && (
              <div className="p-6 space-y-6">
                <div className="bg-neutral-50 border border-neutral-200 p-5">
                  <h3 className="text-xs uppercase tracking-widest text-neutral-400 mb-4">Центр фазы антенны</h3>
                  <div className="grid grid-cols-3 gap-4">
                    {(["pcX", "pcY", "pcZ"] as const).map((k, i) => (
                      <div key={k} className="text-center">
                        <div className="text-2xl font-bold text-neutral-900">{result[k]}</div>
                        <div className="text-xs text-neutral-400 mt-1">{["X", "Y", "Z"][i]}, мм</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="border border-neutral-200 p-4 text-center">
                    <div className="text-xl font-bold text-neutral-900">{result.phaseVariation}°</div>
                    <div className="text-xs text-neutral-400 mt-1">Вариация фазы</div>
                  </div>
                  <div className="border border-neutral-200 p-4 text-center">
                    <div className="text-xl font-bold text-neutral-900">{result.gain} дБ</div>
                    <div className="text-xs text-neutral-400 mt-1">Усиление</div>
                  </div>
                  <div className="border border-neutral-200 p-4 text-center">
                    <div className="text-xl font-bold text-neutral-900">{result.beamwidth}°</div>
                    <div className="text-xs text-neutral-400 mt-1">Ширина луча</div>
                  </div>
                </div>

                <div className="border border-neutral-200 p-4">
                  <h3 className="text-xs uppercase tracking-widest text-neutral-400 mb-3">Входные параметры</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="text-neutral-500">Частота</div><div className="text-neutral-900">{params.frequency} ГГц</div>
                    <div className="text-neutral-500">Длина волны</div><div className="text-neutral-900">{params.wavelength} мм</div>
                    <div className="text-neutral-500">Тип антенны</div><div className="text-neutral-900">{params.antennaType}</div>
                    <div className="text-neutral-500">Размер</div><div className="text-neutral-900">{params.size || "—"} мм</div>
                    <div className="text-neutral-500">Точек измерений</div><div className="text-neutral-900">{points.filter(p => p.x).length}</div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => exportCSV(params, points, result)}
                    className="flex-1 flex items-center justify-center gap-2 bg-neutral-900 text-white py-3 uppercase text-sm tracking-wide hover:bg-neutral-700 transition-colors cursor-pointer"
                  >
                    <Icon name="Download" size={16} /> Скачать CSV-отчёт
                  </button>
                  <button
                    onClick={handleReset}
                    className="flex items-center justify-center gap-2 border border-neutral-300 text-neutral-700 px-5 py-3 uppercase text-sm tracking-wide hover:border-neutral-900 transition-colors cursor-pointer"
                  >
                    <Icon name="RotateCcw" size={16} /> Новый расчёт
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
