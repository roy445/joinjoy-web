"use client";

import { motion } from "framer-motion";

export function StaggerGrid({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <motion.div initial="hidden" animate="show" variants={{ hidden: {}, show: { transition: { staggerChildren: 0.07 } } }} className={className}>{children}</motion.div>;
}
