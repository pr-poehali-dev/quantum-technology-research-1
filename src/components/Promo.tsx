import { useScroll, useTransform, motion } from "framer-motion";
import { useRef } from "react";

export default function Promo() {
  const container = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: container,
    offset: ["start end", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], ["-10vh", "10vh"]);

  return (
    <div
      ref={container}
      className="relative flex items-center justify-center h-screen overflow-hidden"
      style={{ clipPath: "polygon(0% 0, 100% 0%, 100% 100%, 0 100%)" }}
    >
      <div className="fixed top-[-10vh] left-0 h-[120vh] w-full">
        <motion.div style={{ y }} className="relative w-full h-full">
          <img
            src="https://cdn.poehali.dev/projects/f28b87c4-ded9-4c87-a70e-35b53962fcd5/files/f7967a3e-348d-4190-b822-528dda67ead1.jpg"
            alt="Радарный сигнал антенны"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0" style={{ background: "rgba(0,0,0,0.55)" }} />
        </motion.div>
      </div>

      {/* Верхний лейбл */}
      <div className="absolute top-12 left-6 z-10 flex items-center gap-3">
        <div className="w-px h-8 bg-red-500" />
        <span className="text-red-400 text-xs uppercase tracking-widest font-semibold">Физика в деталях</span>
      </div>

      {/* Основной текст */}
      <p className="absolute bottom-16 left-6 right-6 text-white font-bold z-10
        text-2xl sm:text-3xl md:text-4xl lg:text-5xl
        max-w-3xl leading-tight">
        Центр фазы — ключевой параметр антенны.{" "}
        <span className="text-blue-400">Определите его точно</span>, и ваши системы навигации, связи и радиолокации заработают на полную мощность.
      </p>
    </div>
  );
}
