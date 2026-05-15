export default function Featured() {
  return (
    <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center min-h-screen px-6 py-12 lg:py-0"
      style={{ background: "hsl(220,15%,6%)" }}>
      <div className="flex-1 h-[400px] lg:h-[800px] mb-8 lg:mb-0 lg:order-2 relative overflow-hidden">
        <img
          src="https://cdn.poehali.dev/projects/f28b87c4-ded9-4c87-a70e-35b53962fcd5/files/02861745-2be4-434d-8ba4-92345ed22fa8.jpg"
          alt="Антенная решётка ночью"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0" style={{ background: "linear-gradient(to left, transparent 40%, hsl(220,15%,6%))" }} />
      </div>

      <div className="flex-1 text-left lg:h-[800px] flex flex-col justify-center lg:mr-16 lg:order-1">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-8 h-px bg-blue-500" />
          <span className="text-blue-400 text-xs uppercase tracking-widest font-semibold">Инструмент для профессионалов</span>
        </div>

        <p className="text-3xl lg:text-5xl mb-8 text-white leading-tight font-bold">
          Рассчитайте центр фазы антенны с высокой точностью
        </p>

        <p className="text-neutral-400 text-base mb-10 leading-relaxed max-w-md">
          Поддержка патч-, диполь-, рупорных и параболических антенн. Диаграммы направленности, экспорт в CSV.
        </p>

        <div className="flex gap-8 mb-10">
          <div>
            <div className="text-2xl font-bold text-white">±0.001</div>
            <div className="text-xs text-neutral-500 uppercase tracking-wide mt-0.5">мм точность</div>
          </div>
          <div className="w-px bg-neutral-700" />
          <div>
            <div className="text-2xl font-bold text-red-400">6</div>
            <div className="text-xs text-neutral-500 uppercase tracking-wide mt-0.5">типов антенн</div>
          </div>
          <div className="w-px bg-neutral-700" />
          <div>
            <div className="text-2xl font-bold text-white">CSV</div>
            <div className="text-xs text-neutral-500 uppercase tracking-wide mt-0.5">экспорт</div>
          </div>
        </div>

        <button className="w-fit px-8 py-3 bg-blue-600 text-white text-sm uppercase tracking-widest font-semibold hover:bg-blue-500 transition-colors cursor-pointer">
          Попробовать
        </button>
      </div>
    </div>
  );
}
