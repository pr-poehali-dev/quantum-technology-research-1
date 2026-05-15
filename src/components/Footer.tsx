export default function Footer() {
  return (
    <div
      className="relative h-[400px] sm:h-[600px] lg:h-[800px] max-h-[800px]"
      style={{ clipPath: "polygon(0% 0, 100% 0%, 100% 100%, 0 100%)" }}
    >
      <div className="relative h-[calc(100vh+400px)] sm:h-[calc(100vh+600px)] lg:h-[calc(100vh+800px)] -top-[100vh]">
        <div className="h-[400px] sm:h-[600px] lg:h-[800px] sticky top-[calc(100vh-400px)] sm:top-[calc(100vh-600px)] lg:top-[calc(100vh-800px)]">
          <div className="py-4 sm:py-6 lg:py-8 px-4 sm:px-6 h-full w-full flex flex-col justify-between"
            style={{ background: "hsl(220,15%,4%)", borderTop: "1px solid rgba(59,130,246,0.2)" }}>

            <div className="flex shrink-0 gap-8 sm:gap-12 lg:gap-20">
              <div className="flex flex-col gap-1 sm:gap-2">
                <h3 className="mb-2 uppercase text-blue-500 text-xs tracking-widest font-semibold">Программа</h3>
                {["О программе", "Возможности", "Связаться"].map(link => (
                  <a key={link} href="#" className="text-neutral-400 hover:text-white transition-colors duration-300 text-sm">
                    {link}
                  </a>
                ))}
              </div>
              <div className="flex flex-col gap-1 sm:gap-2">
                <h3 className="mb-2 uppercase text-red-500 text-xs tracking-widest font-semibold">Документация</h3>
                {["Теория", "Примеры расчётов", "Публикации"].map(link => (
                  <a key={link} href="#" className="text-neutral-400 hover:text-white transition-colors duration-300 text-sm">
                    {link}
                  </a>
                ))}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 sm:gap-0">
              <h1
                className="text-[18vw] sm:text-[16vw] lg:text-[14vw] leading-[0.8] mt-4 sm:mt-6 lg:mt-10 font-bold tracking-tight select-none"
                style={{ color: "transparent", WebkitTextStroke: "1px rgba(59,130,246,0.5)" }}
              >
                PHASECALC
              </h1>
              <p className="text-neutral-600 text-sm">{new Date().getFullYear()} © PhaseCalc</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
