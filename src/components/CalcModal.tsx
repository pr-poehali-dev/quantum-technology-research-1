import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Icon from "@/components/ui/icon";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

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
  radarData: { angle: string; value: number }[];
  barData: { name: string; value: number }[];
}

interface Props {
  open: boolean;
  onClose: () => void;
}

const ANTENNA_TYPES = ["Патч (Patch)", "Диполь", "Рупор (Horn)", "Параболическая", "Спиральная", "Щелевая"];

function calcPhaseCenter(points: MeasurementPoint[], freq: number): CalcResult {
  const valid = points.filter(p => p.x && p.y && p.z && p.phase && p.amplitude);
  const lambda = 3e8 / (freq * 1e9);
  const k = (2 * Math.PI) / lambda;

  let sumW = 0, sumWX = 0, sumWY = 0, sumWZ = 0;
  const phases: number[] = [];

  for (const p of valid) {
    const amp = parseFloat(p.amplitude) || 1;
    const w = amp * amp;
    sumW += w;
    sumWX += w * parseFloat(p.x);
    sumWY += w * parseFloat(p.y);
    sumWZ += w * parseFloat(p.z);
    phases.push(parseFloat(p.phase) || 0);
  }

  const pcX = sumW > 0 ? sumWX / sumW : 0;
  const pcY = sumW > 0 ? sumWY / sumW : 0;
  const pcZ = sumW > 0 ? sumWZ / sumW : 0;

  const meanPhase = phases.length ? phases.reduce((a, b) => a + b, 0) / phases.length : 0;
  const phaseVariation = phases.length
    ? Math.sqrt(phases.reduce((acc, p) => acc + Math.pow(p - meanPhase, 2), 0) / phases.length)
    : 0;

  const maxAmp = valid.length ? Math.max(...valid.map(p => parseFloat(p.amplitude) || 1)) : 1;
  const gain = 10 * Math.log10(maxAmp * maxAmp + 1e-10);
  const beamwidth = Math.min(180, (lambda / (0.01 * k + 0.001)) * 10);

  // Polar diagram data (16 angles)
  const angles = [0, 22.5, 45, 67.5, 90, 112.5, 135, 157.5, 180, 202.5, 225, 247.5, 270, 292.5, 315, 337.5];
  const radarData = angles.map((angle) => {
    const rad = (angle * Math.PI) / 180;
    const base = valid.length
      ? valid.reduce((acc, p) => {
          const theta = parseFloat(p.theta) || 0;
          const amp = parseFloat(p.amplitude) || 1;
          return acc + amp * Math.cos(((angle - theta) * Math.PI) / 180);
        }, 0) / valid.length
      : Math.cos(rad);
    return { angle: `${angle}°`, value: Math.max(0, parseFloat((base * 10).toFixed(2))) };
  });

  // Amplitude per point bar chart
  const barData = valid.map((p, i) => ({
    name: `T${i + 1}`,
    value: parseFloat((parseFloat(p.amplitude) || 0).toFixed(3)),
  }));

  return {
    pcX: parseFloat(pcX.toFixed(4)),
    pcY: parseFloat(pcY.toFixed(4)),
    pcZ: parseFloat(pcZ.toFixed(4)),
    phaseVariation: parseFloat(phaseVariation.toFixed(2)),
    gain: parseFloat(gain.toFixed(2)),
    beamwidth: parseFloat(beamwidth.toFixed(1)),
    radarData,
    barData,
  };
}

function exportCSV(params: Record<string, string>, points: MeasurementPoint[], result: CalcResult) {
  const rows: string[][] = [
    ["PhaseCalc — Отчёт расчёта центра фазы антенны"],
    [""],
    ["Параметры антенны"],
    ["Частота (ГГц)", params.frequency],
    ["Длина волны (мм)", params.wavelength],
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

const INPUT = "bg-[hsl(220,15%,6%)] border border-blue-900/40 text-white placeholder-neutral-600 px-3 py-2 text-sm focus:outline-none focus:border-blue-500 w-full";
const SELECT = "bg-[hsl(220,15%,6%)] border border-blue-900/40 text-white px-3 py-2 text-sm focus:outline-none focus:border-blue-500 w-full";
const LABEL = "text-xs text-neutral-400 uppercase tracking-wider mb-1 block";
const SECTION_TITLE = "text-xs uppercase tracking-widest text-blue-400 mb-4 font-semibold";

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
    setResult(calcPhaseCenter(points, freq));
    setStep("result");
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
          style={{ backgroundColor: "rgba(0,0,0,0.85)" }}
          onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
        >
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            style={{ background: "hsl(220,15%,9%)", border: "1px solid rgba(59,130,246,0.25)" }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: "1px solid rgba(59,130,246,0.2)" }}>
              <div>
                <h2 className="text-base font-bold uppercase tracking-widest text-white">
                  {step === "form" ? "Расчёт центра фазы" : "Результаты расчёта"}
                </h2>
                <p className="text-xs text-blue-400 mt-0.5 tracking-wide">PhaseCalc</p>
              </div>
              <button onClick={handleClose} className="text-neutral-500 hover:text-white transition-colors cursor-pointer p-1">
                <Icon name="X" size={18} />
              </button>
            </div>

            {/* FORM */}
            {step === "form" && (
              <div className="p-6 space-y-7">
                {/* Частота */}
                <section>
                  <p className={SECTION_TITLE}>Частота и длина волны</p>
                  <div className="grid grid-cols-2 gap-4">
                    <label>
                      <span className={LABEL}>Частота, ГГц</span>
                      <input type="number" min="0" step="0.001" value={params.frequency}
                        onChange={e => setParam("frequency", e.target.value)}
                        placeholder="напр. 2.4" className={INPUT} />
                    </label>
                    <label>
                      <span className={LABEL}>Длина волны, мм</span>
                      <input type="number" min="0" step="0.001" value={params.wavelength}
                        onChange={e => setParam("wavelength", e.target.value)}
                        placeholder="авто" className={INPUT} />
                    </label>
                  </div>
                </section>

                {/* Геометрия */}
                <section>
                  <p className={SECTION_TITLE}>Геометрия антенны</p>
                  <div className="grid grid-cols-2 gap-4">
                    <label>
                      <span className={LABEL}>Тип антенны</span>
                      <select value={params.antennaType}
                        onChange={e => setParam("antennaType", e.target.value)}
                        className={SELECT}>
                        {ANTENNA_TYPES.map(t => <option key={t} style={{ background: "hsl(220,15%,9%)" }}>{t}</option>)}
                      </select>
                    </label>
                    <label>
                      <span className={LABEL}>Характерный размер, мм</span>
                      <input type="number" min="0" value={params.size}
                        onChange={e => setParam("size", e.target.value)}
                        placeholder="напр. 30" className={INPUT} />
                    </label>
                  </div>
                </section>

                {/* Точки */}
                <section>
                  <div className="flex items-center justify-between mb-4">
                    <p className={SECTION_TITLE + " mb-0"}>Точки измерений</p>
                    <button onClick={addPoint}
                      className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors cursor-pointer uppercase tracking-wide">
                      <Icon name="Plus" size={13} /> Добавить
                    </button>
                  </div>
                  <div className="space-y-3">
                    {points.map((p, i) => (
                      <div key={i} style={{ border: "1px solid rgba(59,130,246,0.15)", background: "hsl(220,15%,7%)" }} className="p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs text-blue-400 uppercase tracking-widest">Точка {i + 1}</span>
                          {points.length > 1 && (
                            <button onClick={() => removePoint(i)} className="text-neutral-600 hover:text-red-500 transition-colors cursor-pointer">
                              <Icon name="Trash2" size={13} />
                            </button>
                          )}
                        </div>
                        <div className="grid grid-cols-3 gap-2 mb-2">
                          {(["x", "y", "z"] as const).map(k => (
                            <label key={k}>
                              <span className={LABEL}>{k.toUpperCase()} (мм)</span>
                              <input type="number" value={p[k]} onChange={e => updatePoint(i, k, e.target.value)}
                                placeholder="0" className={INPUT} />
                            </label>
                          ))}
                        </div>
                        <div className="grid grid-cols-4 gap-2">
                          {([
                            ["theta", "Theta °"],
                            ["phi", "Phi °"],
                            ["amplitude", "Амплитуда"],
                            ["phase", "Фаза °"],
                          ] as [keyof MeasurementPoint, string][]).map(([k, label]) => (
                            <label key={k}>
                              <span className={LABEL}>{label}</span>
                              <input type="number" value={p[k]} onChange={e => updatePoint(i, k, e.target.value)}
                                placeholder="0" className={INPUT} />
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                <button
                  onClick={handleCalculate}
                  disabled={!params.frequency}
                  className="w-full bg-blue-600 text-white py-3 uppercase text-sm tracking-widest font-semibold hover:bg-blue-500 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  Рассчитать
                </button>
              </div>
            )}

            {/* RESULT */}
            {step === "result" && result && (
              <div className="p-6 space-y-6">
                {/* Координаты */}
                <div style={{ border: "1px solid rgba(59,130,246,0.3)", background: "hsl(220,15%,7%)" }} className="p-5">
                  <p className={SECTION_TITLE}>Центр фазы антенны</p>
                  <div className="grid grid-cols-3 gap-4">
                    {(["pcX", "pcY", "pcZ"] as const).map((k, i) => (
                      <div key={k} className="text-center">
                        <div className="text-3xl font-bold text-white">{result[k]}</div>
                        <div className="text-xs text-blue-400 mt-1 uppercase tracking-widest">{["X", "Y", "Z"][i]}, мм</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Метрики */}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: "Вариация фазы", value: `${result.phaseVariation}°`, color: "border-blue-500" },
                    { label: "Усиление", value: `${result.gain} дБ`, color: "border-red-500" },
                    { label: "Ширина луча", value: `${result.beamwidth}°`, color: "border-white/30" },
                  ].map(m => (
                    <div key={m.label} className={`border-t-2 ${m.color} pt-3`} style={{ background: "hsl(220,15%,7%)", padding: "12px 16px" }}>
                      <div className="text-xl font-bold text-white">{m.value}</div>
                      <div className="text-xs text-neutral-400 mt-1 uppercase tracking-wide">{m.label}</div>
                    </div>
                  ))}
                </div>

                {/* Полярная диаграмма */}
                <div style={{ border: "1px solid rgba(59,130,246,0.2)", background: "hsl(220,15%,7%)" }} className="p-4">
                  <p className={SECTION_TITLE}>Диаграмма направленности</p>
                  <ResponsiveContainer width="100%" height={260}>
                    <RadarChart data={result.radarData}>
                      <PolarGrid stroke="rgba(59,130,246,0.2)" />
                      <PolarAngleAxis dataKey="angle" tick={{ fill: "#6b7280", fontSize: 10 }} />
                      <Radar
                        name="Амплитуда"
                        dataKey="value"
                        stroke="#3b82f6"
                        fill="#3b82f6"
                        fillOpacity={0.25}
                        strokeWidth={2}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>

                {/* Амплитуды по точкам */}
                {result.barData.length > 0 && (
                  <div style={{ border: "1px solid rgba(239,68,68,0.2)", background: "hsl(220,15%,7%)" }} className="p-4">
                    <p className="text-xs uppercase tracking-widest text-red-400 mb-4 font-semibold">Амплитуда по точкам измерений</p>
                    <ResponsiveContainer width="100%" height={180}>
                      <BarChart data={result.barData} barSize={24}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                        <XAxis dataKey="name" tick={{ fill: "#9ca3af", fontSize: 11 }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fill: "#9ca3af", fontSize: 11 }} axisLine={false} tickLine={false} />
                        <Tooltip
                          contentStyle={{ background: "hsl(220,15%,9%)", border: "1px solid rgba(59,130,246,0.3)", borderRadius: 0, color: "#fff" }}
                          cursor={{ fill: "rgba(59,130,246,0.08)" }}
                        />
                        <Bar dataKey="value" fill="#ef4444" radius={0} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* Параметры */}
                <div style={{ border: "1px solid rgba(255,255,255,0.08)", background: "hsl(220,15%,7%)" }} className="p-4">
                  <p className="text-xs uppercase tracking-widest text-neutral-400 mb-3 font-semibold">Входные параметры</p>
                  <div className="grid grid-cols-2 gap-y-2 text-sm">
                    {[
                      ["Частота", `${params.frequency} ГГц`],
                      ["Длина волны", `${params.wavelength} мм`],
                      ["Тип антенны", params.antennaType],
                      ["Размер", `${params.size || "—"} мм`],
                      ["Точек измерений", String(points.filter(p => p.x).length)],
                    ].map(([k, v]) => (
                      <div key={k} className="contents">
                        <div className="text-neutral-500">{k}</div>
                        <div className="text-white font-medium">{v}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Кнопки */}
                <div className="flex gap-3">
                  <button
                    onClick={() => exportCSV(params, points, result)}
                    className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white py-3 uppercase text-sm tracking-widest font-semibold hover:bg-blue-500 transition-colors cursor-pointer"
                  >
                    <Icon name="Download" size={15} /> Скачать CSV
                  </button>
                  <button
                    onClick={() => { setStep("form"); setResult(null); }}
                    className="flex items-center justify-center gap-2 text-neutral-300 px-5 py-3 uppercase text-sm tracking-wide hover:text-white transition-colors cursor-pointer"
                    style={{ border: "1px solid rgba(255,255,255,0.15)" }}
                  >
                    <Icon name="RotateCcw" size={14} /> Новый
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