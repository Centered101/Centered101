'use client'

import Image from 'next/image'
import { motion } from 'framer-motion'

type PortfolioBootScreenProps = {
  status?: string
  logoSrc?: string
  animatedExit?: boolean
}

export function PortfolioBootScreen({
  status = 'Loading portfolio data',
  logoSrc = '/api/portfolio/logo',
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
          className="relative grid size-30 place-items-center"
        >
          <span className="absolute size-30 rounded-[2rem] border border-[#409EFE]/15 bg-[#409EFE]/5 blur-[1px]" />
          <span className="absolute size-22 rounded-[1.45rem] border border-[#409EFE]/25 bg-[#409EFE]/10 shadow-[0_0_110px_10px_rgba(64,158,254,0.34)]" />
          <span className="absolute size-22 rounded-[1.45rem] border border-[#9bd7ff]/20 animate-ping" />
          <div className="relative size-17 overflow-hidden rounded-[1.1rem] border border-[#9bd7ff]/40 bg-white/10 p-1 shadow-[0_24px_90px_-38px_rgba(64,158,254,0.95)]">
            <Image
              src={logoSrc}
              alt="Centered101"
              fill
              sizes="64px"
              priority
              draggable={false}
              onContextMenu={(event) => event.preventDefault()}
              className="select-none object-cover"
            />
          </div>
        </motion.div>

        <motion.p
          variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}
          className="mt-7 text-[1.45rem] font-black uppercase leading-none text-[#f8fafc] drop-shadow-[0_12px_34px_rgba(0,0,0,0.32)]"
        >
          CENTERED101
        </motion.p>
        <motion.p
          variants={{ hidden: { opacity: 0 }, show: { opacity: 1 } }}
          className="mt-4 text-[0.72rem] font-bold uppercase tracking-[0.18em] text-[#9aa7b8]"
        >
          {status}
        </motion.p>
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
