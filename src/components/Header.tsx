interface HeaderProps {
  className?: string;
}

export default function Header({ className }: HeaderProps) {
  return (
    <header className={`absolute top-0 left-0 right-0 z-10 px-6 py-5 ${className ?? ""}`}
      style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, transparent 100%)" }}>
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-blue-500" />
          <span className="text-white text-sm uppercase tracking-widest font-bold">PhaseCalc</span>
        </div>
        <nav className="flex gap-8">
          <a href="#about" className="text-neutral-300 hover:text-white transition-colors duration-300 uppercase text-xs tracking-widest">
            О программе
          </a>
          <a href="#contact" className="text-neutral-300 hover:text-white transition-colors duration-300 uppercase text-xs tracking-widest">
            Контакты
          </a>
        </nav>
      </div>
    </header>
  );
}
