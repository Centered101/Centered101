'use client'

import { motion } from 'framer-motion'

type PortfolioBootScreenProps = {
  status?: string
  logoSrc?: string
  animatedExit?: boolean
}

export function PortfolioBootScreen({
  status = 'Loading portfolio data',
  animatedExit = true,
}: PortfolioBootScreenProps) {
  const content = (
    <>
      <div className="absolute inset-0 bg-[#03070d]" />
      <div
        className="absolute inset-0 opacity-[0.28]"
        style={{
          backgroundImage:
            'linear-gradient(to right, rgba(97,159,219,0.16) 1px, transparent 1px), linear-gradient(to bottom, rgba(97,159,219,0.16) 1px, transparent 1px)',
          backgroundSize: '76px 76px',
        }}
      />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_48%,rgba(64,158,254,0.28),rgba(11,27,45,0.34)_18rem,transparent_36rem)]" />

      <motion.div
        initial="hidden"
        animate="show"
        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.12, delayChildren: 0.05 } } }}
        className="relative flex flex-col items-center text-center"
      >
        <motion.div
          variants={{ hidden: { opacity: 0, scale: 0.82 }, show: { opacity: 1, scale: 1 } }}
          transition={{ type: 'spring', stiffness: 220, damping: 19 }}
          className="relative grid size-20 place-items-center overflow-hidden rounded-2xl border border-[rgba(132,212,250,0.26)] bg-[rgba(64,158,254,0.08)] shadow-[0_18px_70px_-46px_rgba(64,158,254,0.9)]"
        >
          <img
            src="/api/portfolio/logo"
            alt=""
            draggable={false}
            className="size-14 rounded-xl object-cover"
          />
        </motion.div>

      </motion.div>
    </>
  )

  if (!animatedExit) {
    return <div className="fixed inset-0 z-[999] grid place-items-center overflow-hidden">{content}</div>
  }

  return (
    <motion.div
      initial={{ y: 0, opacity: 1 }}
      exit={{ y: '-100%', opacity: 1 }}
      transition={{ duration: 0.75, ease: [0.76, 0, 0.24, 1] }}
      className="fixed inset-0 z-[999] grid place-items-center overflow-hidden"
    >
      {content}
    </motion.div>
  )
}
