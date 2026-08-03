import { ReactNode } from "react";
import { motion } from "framer-motion";

const LOGO_URL =
  "https://blogger.googleusercontent.com/img/b/R29vZ2xl/AVvXsEh8iH2aqvCzmEns7KC2YENagCnERIJOCzCHQk5ZkHIoGpf3pBNUwRj2LlMXr8r7NI2JFNWClKqPqtUoIu3kfxW-iYfogd0JPiZP9C5zm0gGkhUFRT-2fAmjmB3izc1mj2JzPQ0Jw0pK4aMGrMV-_J5vSbl3wh1IqshyaIDUDZ_TFNZVDajmZ6gCr9zSj10/s320/%D9%A2%D9%A0%D9%A2%D9%A6%D9%A0%D9%A7%D9%A0%D9%A3_%D9%A2%D9%A1%D9%A4%D9%A2%D9%A0%D9%A3.png";

/** Decorative blue/red swooshes matching the KAIAN brand artwork. */
function Swooshes() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute -top-40 -start-52 h-[34rem] w-[34rem] rounded-full bg-primary/25 blur-3xl" />
      <div className="absolute -top-24 -start-24 h-72 w-72 rounded-full bg-primary/40 blur-2xl" />
      <div className="absolute -bottom-48 -end-40 h-[32rem] w-[32rem] rounded-full bg-destructive/25 blur-3xl" />
      <div className="absolute -bottom-24 -end-16 h-64 w-64 rounded-full bg-destructive/35 blur-2xl" />
      <div className="absolute bottom-0 start-0 h-56 w-full bg-brand-gradient opacity-[0.14] blur-2xl" />
    </div>
  );
}

export function AuthBrand() {
  return (
    <div className="flex flex-col items-center text-center">
      <img src={LOGO_URL} alt="شعار KAIAN" className="h-20 w-auto object-contain sm:h-24" />
      <span className="mt-2 text-3xl font-black tracking-[0.2em] text-brand-gradient sm:text-4xl">KAIAN</span>
      <div className="mt-2 flex items-center gap-2">
        <span className="h-px w-8 bg-border" />
        <span className="h-1.5 w-1.5 rounded-full bg-primary" />
        <span className="text-xs font-semibold text-muted-foreground sm:text-sm">منصة التواصل الإجتماعي</span>
        <span className="h-1.5 w-1.5 rounded-full bg-destructive" />
        <span className="h-px w-8 bg-border" />
      </div>
    </div>
  );
}

export function AuthShell({ children, topBar }: { children: ReactNode; topBar?: ReactNode }) {
  return (
    <div dir="rtl" className="relative min-h-screen auth-canvas px-4 py-6 sm:px-6 sm:py-10">
      <Swooshes />
      <div className="relative mx-auto w-full max-w-lg">
        {topBar}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="auth-card mt-4 rounded-[2rem] p-5 sm:p-8"
        >
          {children}
        </motion.div>
      </div>
    </div>
  );
}

export { LOGO_URL };
