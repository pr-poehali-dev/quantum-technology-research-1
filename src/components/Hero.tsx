import { useScroll, useTransform, motion } from "framer-motion";
import { useRef, useState } from "react";
import CalcModal from "@/components/CalcModal";

export default function Hero() {
  const container = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: container,
    offset: ["start start", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], ["0vh", "50vh"]);
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <div
        ref={container}
        className="relative flex items-center justify-center h-screen overflow-hidden"
      >
        <motion.div
          style={{ y }}
          className="absolute inset-0 w-full h-full"
        >
          <img
            src="https://cdn.poehali.dev/projects/f28b87c4-ded9-4c87-a70e-35b53962fcd5/files/aa61e4cc-f69e-4521-88f0-a7002e7a9552.jpg"
            alt="Радиотелескоп ночью"
            className="w-full h-full object-cover"
          />
        </motion.div>

        <div className="relative z-10 text-center text-white">
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight mb-6">
            АНТЕННА
          </h1>
          <p className="text-lg md:text-xl max-w-2xl mx-auto px-6 opacity-90">
            Точный расчёт центра фазы антенны для инженеров и исследователей
          </p>
          <button
            onClick={() => setModalOpen(true)}
            className="mt-8 px-8 py-3 border border-white text-white uppercase text-sm tracking-wide hover:bg-white hover:text-black transition-all duration-300 cursor-pointer"
          >
            Начать расчёт
          </button>
        </div>
      </div>

      <CalcModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
}