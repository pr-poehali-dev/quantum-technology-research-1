import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Icon from "@/components/ui/icon";
import {
  RadarChart, PolarGrid, PolarAngleAxis, Radar,
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip,
} from "recharts";

interface MeasurementPoint {
  x: string; y: string; z: string;
  theta: string; phi: string;
  amplitude: string; phase: string;
}

interface CalcResult {
  pcX: number; pcY: number; pcZ: number;
  offsetX: number; offsetY: number; offsetZ: number; offsetMag: number;
  phaseVariation: number; phaseError: number;
  gain: number; beamwidth: number;
  radarData: { angle: string; value: number }[];
  phaseData: { theta: string; phase: number; ideal: number }[];
  tableData: { n: number; x: number; y: number; z: number; amp: number; phase: number; phaseErr: number }[];
}

interface Params {
  frequency: string; wavelength: string;
  antennaType: string; size: string;
  polarization: string; zone: string;
  distance: string; s11: string; vswr: string;
}

interface Props { open: boolean; onClose: () => void; }

const ANTENNA_TYPES = ["Патч (Patch)", "Диполь", "Рупор (Horn)", "Параболическая", "Спиральная", "Щелевая"];
const POLARIZATIONS = ["Линейная (вертикальная)", "Линейная (горизонтальная)", "Круговая (правая)", "Круговая (левая)", "Эллиптическая"];
const ZONES = ["Дальняя зона (Far-field)", "Ближняя зона (Near-field)", "Реактивная ближняя зона"];

function calcPhaseCenter(points: MeasurementPoint[], freq: number, geoCenter: [number, number, number]): CalcResult {
  const valid = points.filter(p => p.x && p.y && p.z && p.amplitude);
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

  // Фазовая погрешность — отклонение от идеальной сферической волны
  const phaseError = valid.length > 1
    ? valid.reduce((acc, p) => {
        const r = Math.sqrt(Math.pow(parseFloat(p.x) - pcX, 2) + Math.pow(parseFloat(p.y) - pcY, 2) + Math.pow(parseFloat(p.z) - pcZ, 2));
        const idealPhase = (k * r * 1e-3 * 180) / Math.PI;
        const measured = parseFloat(p.phase) || 0;
        return acc + Math.abs(measured - (idealPhase % 360));
      }, 0) / valid.length
    : 0;

  const maxAmp = valid.length ? Math.max(...valid.map(p => parseFloat(p.amplitude) || 1)) : 1;
  const gain = 10 * Math.log10(maxAmp * maxAmp + 1e-10);
  const beamwidth = Math.min(180, (lambda / (0.01 * k + 0.001)) * 10);

  // Вектор смещения от геометрического центра
  const offsetX = parseFloat((pcX - geoCenter[0]).toFixed(4));
  const offsetY = parseFloat((pcY - geoCenter[1]).toFixed(4));
  const offsetZ = parseFloat((pcZ - geoCenter[2]).toFixed(4));
  const offsetMag = parseFloat(Math.sqrt(offsetX ** 2 + offsetY ** 2 + offsetZ ** 2).toFixed(4));

  // Диаграмма направленности
  const angles = [0, 22.5, 45, 67.5, 90, 112.5, 135, 157.5, 180, 202.5, 225, 247.5, 270, 292.5, 315, 337.5];
  const radarData = angles.map(angle => {
    const base = valid.length
      ? valid.reduce((acc, p) => {
          const theta = parseFloat(p.theta) || 0;
          const amp = parseFloat(p.amplitude) || 1;
          return acc + amp * Math.cos(((angle - theta) * Math.PI) / 180);
        }, 0) / valid.length
      : Math.cos((angle * Math.PI) / 180);
    return { angle: `${angle}°`, value: Math.max(0, parseFloat((base * 10).toFixed(2))) };
  });

  // График фазы vs угол theta
  const sorted = [...valid].sort((a, b) => parseFloat(a.theta) - parseFloat(b.theta));
  const phaseData = sorted.map((p, i) => {
    const theta = parseFloat(p.theta) || 0;
    const r = Math.sqrt(Math.pow(parseFloat(p.x) - pcX, 2) + Math.pow(parseFloat(p.y) - pcY, 2) + Math.pow(parseFloat(p.z) - pcZ, 2));
    const idealPhase = parseFloat(((k * r * 1e-3 * 180) / Math.PI % 360).toFixed(1));
    return { theta: `${theta}°`, phase: parseFloat(p.phase) || 0, ideal: idealPhase };
  });
  if (phaseData.length === 0) {
    for (let t = -90; t <= 90; t += 15)
      phaseData.push({ theta: `${t}°`, phase: Math.cos((t * Math.PI) / 180) * 45, ideal: Math.cos((t * Math.PI) / 180) * 45 });
  }

  // Таблица точек
  const tableData = valid.map((p, i) => {
    const r = Math.sqrt(Math.pow(parseFloat(p.x) - pcX, 2) + Math.pow(parseFloat(p.y) - pcY, 2) + Math.pow(parseFloat(p.z) - pcZ, 2));
    const idealPhase = (k * r * 1e-3 * 180) / Math.PI % 360;
    return {
      n: i + 1,
      x: parseFloat(parseFloat(p.x).toFixed(3)),
      y: parseFloat(parseFloat(p.y).toFixed(3)),
      z: parseFloat(parseFloat(p.z).toFixed(3)),
      amp: parseFloat(parseFloat(p.amplitude).toFixed(3)),
      phase: parseFloat(parseFloat(p.phase || "0").toFixed(2)),
      phaseErr: parseFloat(Math.abs((parseFloat(p.phase) || 0) - idealPhase).toFixed(2)),
    };
  });

  return {
    pcX: parseFloat(pcX.toFixed(4)), pcY: parseFloat(pcY.toFixed(4)), pcZ: parseFloat(pcZ.toFixed(4)),
    offsetX, offsetY, offsetZ, offsetMag,
    phaseVariation: parseFloat(phaseVariation.toFixed(2)),
    phaseError: parseFloat(phaseError.toFixed(2)),
    gain: parseFloat(gain.toFixed(2)),
    beamwidth: parseFloat(beamwidth.toFixed(1)),
    radarData, phaseData, tableData,
  };
}

function exportCSV(params: Params, points: MeasurementPoint[], result: CalcResult) {
  const rows: string[][] = [
    ["PhaseCalc — Отчёт расчёта центра фазы антенны"],
    [""],
    ["Параметры антенны"],
    ["Частота (ГГц)", params.frequency], ["Длина волны (мм)", params.wavelength],
    ["Тип антенны", params.antennaType], ["Размер (мм)", params.size],
    ["Поляризация", params.polarization], ["Зона измерений", params.zone],
    ["Расстояние (м)", params.distance], ["S11 (дБ)", params.s11], ["КСВ", params.vswr],
    [""],
    ["Результаты"],
    ["Центр фазы X (мм)", String(result.pcX)], ["Центр фазы Y (мм)", String(result.pcY)], ["Центр фазы Z (мм)", String(result.pcZ)],
    ["Смещение от геом. центра (мм)", String(result.offsetMag)],
    ["Вектор смещения X", String(result.offsetX)], ["Вектор смещения Y", String(result.offsetY)], ["Вектор смещения Z", String(result.offsetZ)],
    ["Фазовая погрешность (°)", String(result.phaseError)],
    ["Вариация фазы (°)", String(result.phaseVariation)],
    ["Усиление (дБ)", String(result.gain)], ["Ширина луча (°)", String(result.beamwidth)],
    [""],
    ["Таблица точек измерений"],
    ["№", "X (мм)", "Y (мм)", "Z (мм)", "Амплитуда", "Фаза (°)", "Погрешность фазы (°)"],
    ...result.tableData.map(r => [String(r.n), String(r.x), String(r.y), String(r.z), String(r.amp), String(r.phase), String(r.phaseErr)]),
  ];
  const csv = rows.map(r => r.join(";")).join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `phasecalc_${Date.now()}.csv`; a.click();
  URL.revokeObjectURL(url);
}

const emptyPoint = (): MeasurementPoint => ({ x: "", y: "", z: "", theta: "", phi: "", amplitude: "", phase: "" });
const INPUT = "bg-[hsl(220,15%,6%)] border border-blue-900/40 text-white placeholder-neutral-600 px-3 py-2 text-sm focus:outline-none focus:border-blue-500 w-full";
const SELECT = "bg-[hsl(220,15%,6%)] border border-blue-900/40 text-white px-3 py-2 text-sm focus:outline-none focus:border-blue-500 w-full cursor-pointer";
const LABEL = "text-xs text-neutral-400 uppercase tracking-wider mb-1 block";
const STITLE = "text-xs uppercase tracking-widest text-blue-400 mb-4 font-semibold";
const STITLE_RED = "text-xs uppercase tracking-widest text-red-400 mb-4 font-semibold";

export default function CalcModal({ open, onClose }: Props) {
  const [step, setStep] = useState<"form" | "result">("form");
  const [params, setParams] = useState<Params>({
    frequency: "", wavelength: "", antennaType: ANTENNA_TYPES[0], size: "",
    polarization: POLARIZATIONS[0], zone: ZONES[0], distance: "", s11: "", vswr: "",
  });
  const [points, setPoints] = useState<MeasurementPoint[]>([emptyPoint(), emptyPoint(), emptyPoint()]);
  const [result, setResult] = useState<CalcResult | null>(null);
  const [geoCenter, setGeoCenter] = useState({ x: "0", y: "0", z: "0" });

  const setParam = (key: keyof Params, val: string) => {
    const updated = { ...params, [key]: val };
    if (key === "frequency" && val) { const f = parseFloat(val); if (!isNaN(f) && f > 0) updated.wavelength = (300 / f).toFixed(4); }
    if (key === "wavelength" && val) { const l = parseFloat(val); if (!isNaN(l) && l > 0) updated.frequency = (300 / l).toFixed(4); }
    setParams(updated);
  };

  const updatePoint = (i: number, key: keyof MeasurementPoint, val: string) => {
    const next = [...points]; next[i] = { ...next[i], [key]: val }; setPoints(next);
  };

  const handleCalculate = () => {
    const freq = parseFloat(params.frequency);
    if (!params.frequency || isNaN(freq)) return;
    setResult(calcPhaseCenter(points, freq, [parseFloat(geoCenter.x) || 0, parseFloat(geoCenter.y) || 0, parseFloat(geoCenter.z) || 0]));
    setStep("result");
  };

  const handleClose = () => { onClose(); setTimeout(() => { setStep("form"); setResult(null); }, 400); };

  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(0,0,0,0.88)" }}
          onClick={e => { if (e.target === e.currentTarget) handleClose(); }}>
          <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 40 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="w-full max-w-3xl max-h-[90vh] overflow-y-auto"
            style={{ background: "hsl(220,15%,9%)", border: "1px solid rgba(59,130,246,0.25)" }}>

            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 sticky top-0 z-10"
              style={{ background: "hsl(220,15%,9%)", borderBottom: "1px solid rgba(59,130,246,0.2)" }}>
              <div>
                <h2 className="text-base font-bold uppercase tracking-widest text-white">
                  {step === "form" ? "Расчёт центра фазы" : "Результаты расчёта"}
                </h2>
                <p className="text-xs text-blue-400 mt-0.5">PhaseCalc</p>
              </div>
              <button onClick={handleClose} className="text-neutral-500 hover:text-white transition-colors cursor-pointer p-1">
                <Icon name="X" size={18} />
              </button>
            </div>

            {/* ─── FORM ─── */}
            {step === "form" && (
              <div className="p-6 space-y-7">

                {/* Частота */}
                <section>
                  <p className={STITLE}>Частота и длина волны</p>
                  <div className="grid grid-cols-2 gap-4">
                    <label><span className={LABEL}>Частота, ГГц</span>
                      <input type="number" min="0" step="0.001" value={params.frequency}
                        onChange={e => setParam("frequency", e.target.value)} placeholder="напр. 2.4" className={INPUT} />
                    </label>
                    <label><span className={LABEL}>Длина волны, мм</span>
                      <input type="number" min="0" step="0.001" value={params.wavelength}
                        onChange={e => setParam("wavelength", e.target.value)} placeholder="авто" className={INPUT} />
                    </label>
                  </div>
                </section>

                {/* Геометрия */}
                <section>
                  <p className={STITLE}>Геометрия антенны</p>
                  <div className="grid grid-cols-2 gap-4">
                    <label><span className={LABEL}>Тип антенны</span>
                      <select value={params.antennaType} onChange={e => setParam("antennaType", e.target.value)} className={SELECT}>
                        {ANTENNA_TYPES.map(t => <option key={t} style={{ background: "hsl(220,15%,9%)" }}>{t}</option>)}
                      </select>
                    </label>
                    <label><span className={LABEL}>Характерный размер, мм</span>
                      <input type="number" min="0" value={params.size}
                        onChange={e => setParam("size", e.target.value)} placeholder="напр. 30" className={INPUT} />
                    </label>
                  </div>
                </section>

                {/* Поляризация */}
                <section>
                  <p className={STITLE}>Поляризация антенны</p>
                  <div className="grid grid-cols-1 gap-4">
                    <label><span className={LABEL}>Тип поляризации</span>
                      <select value={params.polarization} onChange={e => setParam("polarization", e.target.value)} className={SELECT}>
                        {POLARIZATIONS.map(t => <option key={t} style={{ background: "hsl(220,15%,9%)" }}>{t}</option>)}
                      </select>
                    </label>
                  </div>
                </section>

                {/* Зона измерений */}
                <section>
                  <p className={STITLE}>Условия измерений</p>
                  <div className="grid grid-cols-2 gap-4">
                    <label><span className={LABEL}>Зона измерений</span>
                      <select value={params.zone} onChange={e => setParam("zone", e.target.value)} className={SELECT}>
                        {ZONES.map(t => <option key={t} style={{ background: "hsl(220,15%,9%)" }}>{t}</option>)}
                      </select>
                    </label>
                    <label><span className={LABEL}>Расстояние до точки, м</span>
                      <input type="number" min="0" step="0.01" value={params.distance}
                        onChange={e => setParam("distance", e.target.value)} placeholder="напр. 10" className={INPUT} />
                    </label>
                  </div>
                </section>

                {/* S11 */}
                <section>
                  <p className={STITLE}>Коэффициент отражения S11</p>
                  <div className="grid grid-cols-2 gap-4">
                    <label><span className={LABEL}>S11, дБ</span>
                      <input type="number" step="0.1" value={params.s11}
                        onChange={e => setParam("s11", e.target.value)} placeholder="напр. -20" className={INPUT} />
                    </label>
                    <label><span className={LABEL}>КСВ (VSWR)</span>
                      <input type="number" min="1" step="0.01" value={params.vswr}
                        onChange={e => setParam("vswr", e.target.value)} placeholder="напр. 1.5" className={INPUT} />
                    </label>
                  </div>
                </section>

                {/* Геометрический центр */}
                <section>
                  <p className={STITLE}>Геометрический центр антенны</p>
                  <p className="text-xs text-neutral-500 mb-3">Для расчёта вектора смещения центра фазы</p>
                  <div className="grid grid-cols-3 gap-3">
                    {(["x", "y", "z"] as const).map(k => (
                      <label key={k}>
                        <span className={LABEL}>{k.toUpperCase()} (мм)</span>
                        <input type="number" value={geoCenter[k]}
                          onChange={e => setGeoCenter(prev => ({ ...prev, [k]: e.target.value }))}
                          placeholder="0" className={INPUT} />
                      </label>
                    ))}
                  </div>
                </section>

                {/* Точки измерений */}
                <section>
                  <div className="flex items-center justify-between mb-4">
                    <p className={STITLE + " mb-0"}>Точки измерений</p>
                    <button onClick={() => setPoints([...points, emptyPoint()])}
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
                            <button onClick={() => setPoints(points.filter((_, idx) => idx !== i))}
                              className="text-neutral-600 hover:text-red-500 transition-colors cursor-pointer">
                              <Icon name="Trash2" size={13} />
                            </button>
                          )}
                        </div>
                        <div className="grid grid-cols-3 gap-2 mb-2">
                          {(["x", "y", "z"] as const).map(k => (
                            <label key={k}>
                              <span className={LABEL}>{k.toUpperCase()} (мм)</span>
                              <input type="number" value={p[k]} placeholder="0"
                                onChange={e => updatePoint(i, k, e.target.value)} className={INPUT} />
                            </label>
                          ))}
                        </div>
                        <div className="grid grid-cols-4 gap-2">
                          {([["theta", "Theta °"], ["phi", "Phi °"], ["amplitude", "Амплитуда"], ["phase", "Фаза °"]] as [keyof MeasurementPoint, string][]).map(([k, label]) => (
                            <label key={k}>
                              <span className={LABEL}>{label}</span>
                              <input type="number" value={p[k]} placeholder="0"
                                onChange={e => updatePoint(i, k, e.target.value)} className={INPUT} />
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                <button onClick={handleCalculate} disabled={!params.frequency}
                  className="w-full bg-blue-600 text-white py-3 uppercase text-sm tracking-widest font-semibold hover:bg-blue-500 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed">
                  Рассчитать
                </button>
              </div>
            )}

            {/* ─── RESULT ─── */}
            {step === "result" && result && (
              <div className="p-6 space-y-6">

                {/* Центр фазы */}
                <div style={{ border: "1px solid rgba(59,130,246,0.3)", background: "hsl(220,15%,7%)" }} className="p-5">
                  <p className={STITLE}>Центр фазы антенны</p>
                  <div className="grid grid-cols-3 gap-4">
                    {(["pcX", "pcY", "pcZ"] as const).map((k, i) => (
                      <div key={k} className="text-center">
                        <div className="text-3xl font-bold text-white">{result[k]}</div>
                        <div className="text-xs text-blue-400 mt-1 uppercase tracking-widest">{["X", "Y", "Z"][i]}, мм</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Вектор смещения */}
                <div style={{ border: "1px solid rgba(239,68,68,0.3)", background: "hsl(220,15%,7%)" }} className="p-5">
                  <p className={STITLE_RED}>Вектор смещения от геометрического центра</p>
                  <div className="grid grid-cols-4 gap-3">
                    {[
                      { label: "ΔX, мм", value: result.offsetX, color: "text-white" },
                      { label: "ΔY, мм", value: result.offsetY, color: "text-white" },
                      { label: "ΔZ, мм", value: result.offsetZ, color: "text-white" },
                      { label: "|Δ|, мм", value: result.offsetMag, color: "text-red-400" },
                    ].map(m => (
                      <div key={m.label} className="text-center">
                        <div className={`text-2xl font-bold ${m.color}`}>{m.value}</div>
                        <div className="text-xs text-neutral-500 mt-1 uppercase tracking-wide">{m.label}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Метрики */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: "Фазовая погрешность", value: `${result.phaseError}°`, border: "border-t-2 border-red-500" },
                    { label: "Вариация фазы", value: `${result.phaseVariation}°`, border: "border-t-2 border-blue-500" },
                    { label: "Усиление", value: `${result.gain} дБ`, border: "border-t-2 border-white/20" },
                    { label: "Ширина луча", value: `${result.beamwidth}°`, border: "border-t-2 border-white/20" },
                  ].map(m => (
                    <div key={m.label} className={`${m.border} pt-3 px-4 pb-4`} style={{ background: "hsl(220,15%,7%)" }}>
                      <div className="text-xl font-bold text-white">{m.value}</div>
                      <div className="text-xs text-neutral-400 mt-1 uppercase tracking-wide">{m.label}</div>
                    </div>
                  ))}
                </div>

                {/* Диаграмма направленности */}
                <div style={{ border: "1px solid rgba(59,130,246,0.2)", background: "hsl(220,15%,7%)" }} className="p-4">
                  <p className={STITLE}>Диаграмма направленности</p>
                  <ResponsiveContainer width="100%" height={260}>
                    <RadarChart data={result.radarData}>
                      <PolarGrid stroke="rgba(59,130,246,0.2)" />
                      <PolarAngleAxis dataKey="angle" tick={{ fill: "#6b7280", fontSize: 10 }} />
                      <Radar name="Амплитуда" dataKey="value" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.25} strokeWidth={2} />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>

                {/* График фазы vs угол */}
                <div style={{ border: "1px solid rgba(239,68,68,0.2)", background: "hsl(220,15%,7%)" }} className="p-4">
                  <p className={STITLE_RED}>График фазы vs угол Theta</p>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={result.phaseData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                      <XAxis dataKey="theta" tick={{ fill: "#9ca3af", fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: "#9ca3af", fontSize: 11 }} axisLine={false} tickLine={false} unit="°" />
                      <Tooltip contentStyle={{ background: "hsl(220,15%,9%)", border: "1px solid rgba(59,130,246,0.3)", color: "#fff", fontSize: 12 }} />
                      <Line type="monotone" dataKey="phase" stroke="#ef4444" strokeWidth={2} dot={{ r: 3, fill: "#ef4444" }} name="Измеренная" />
                      <Line type="monotone" dataKey="ideal" stroke="#3b82f6" strokeWidth={1.5} strokeDasharray="4 4" dot={false} name="Идеальная" />
                    </LineChart>
                  </ResponsiveContainer>
                  <div className="flex gap-6 mt-3 justify-center">
                    <div className="flex items-center gap-2"><div className="w-6 h-0.5 bg-red-500" /><span className="text-xs text-neutral-400">Измеренная фаза</span></div>
                    <div className="flex items-center gap-2"><div className="w-6 h-0.5 bg-blue-500 border-dashed" style={{ borderTop: "2px dashed #3b82f6", background: "none" }} /><span className="text-xs text-neutral-400">Идеальная сфера</span></div>
                  </div>
                </div>

                {/* Таблица точек */}
                {result.tableData.length > 0 && (
                  <div style={{ border: "1px solid rgba(255,255,255,0.08)", background: "hsl(220,15%,7%)" }} className="p-4">
                    <p className="text-xs uppercase tracking-widest text-neutral-400 mb-4 font-semibold">Таблица точек измерений</p>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr style={{ borderBottom: "1px solid rgba(59,130,246,0.2)" }}>
                            {["№", "X, мм", "Y, мм", "Z, мм", "Амплитуда", "Фаза, °", "Погрешность, °"].map(h => (
                              <th key={h} className="text-left text-xs text-neutral-500 uppercase tracking-wide pb-2 pr-4">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {result.tableData.map(row => (
                            <tr key={row.n} style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                              <td className="py-2 pr-4 text-blue-400 font-medium">{row.n}</td>
                              <td className="py-2 pr-4 text-white">{row.x}</td>
                              <td className="py-2 pr-4 text-white">{row.y}</td>
                              <td className="py-2 pr-4 text-white">{row.z}</td>
                              <td className="py-2 pr-4 text-white">{row.amp}</td>
                              <td className="py-2 pr-4 text-white">{row.phase}</td>
                              <td className={`py-2 pr-4 font-medium ${row.phaseErr > 10 ? "text-red-400" : "text-green-400"}`}>{row.phaseErr}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Входные параметры */}
                <div style={{ border: "1px solid rgba(255,255,255,0.06)", background: "hsl(220,15%,7%)" }} className="p-4">
                  <p className="text-xs uppercase tracking-widest text-neutral-400 mb-3 font-semibold">Входные параметры</p>
                  <div className="grid grid-cols-2 gap-y-2 text-sm">
                    {[
                      ["Частота", `${params.frequency} ГГц`],
                      ["Длина волны", `${params.wavelength} мм`],
                      ["Тип антенны", params.antennaType],
                      ["Поляризация", params.polarization],
                      ["Зона", params.zone],
                      ["Расстояние", params.distance ? `${params.distance} м` : "—"],
                      ["S11", params.s11 ? `${params.s11} дБ` : "—"],
                      ["КСВ", params.vswr || "—"],
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
                  <button onClick={() => exportCSV(params, points, result)}
                    className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white py-3 uppercase text-sm tracking-widest font-semibold hover:bg-blue-500 transition-colors cursor-pointer">
                    <Icon name="Download" size={15} /> Скачать CSV
                  </button>
                  <button onClick={() => { setStep("form"); setResult(null); }}
                    className="flex items-center justify-center gap-2 text-neutral-300 px-5 py-3 uppercase text-sm tracking-wide hover:text-white transition-colors cursor-pointer"
                    style={{ border: "1px solid rgba(255,255,255,0.15)" }}>
                    <Icon name="RotateCcw" size={14} /> Новый расчёт
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
