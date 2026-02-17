'use client';

import { motion } from 'framer-motion';

type Variant = 'cyan' | 'magenta' | 'yellow' | 'ghost';

interface NeonButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: Variant;
  disabled?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const VARIANT_STYLES: Record<Variant, { border: string; glow: string; text: string }> = {
  cyan:    { border: '#00f0ff', glow: '0 0 12px #00f0ff, 0 0 24px rgba(0,240,255,0.4)', text: '#00f0ff' },
  magenta: { border: '#ff00aa', glow: '0 0 12px #ff00aa, 0 0 24px rgba(255,0,170,0.4)', text: '#ff00aa' },
  yellow:  { border: '#ffe600', glow: '0 0 12px #ffe600, 0 0 24px rgba(255,230,0,0.4)', text: '#ffe600' },
  ghost:   { border: '#333355', glow: 'none', text: '#555577' },
};

const SIZE_STYLES = {
  sm: 'px-4 py-2 text-xs',
  md: 'px-6 py-3 text-sm',
  lg: 'px-8 py-4 text-base',
};

export default function NeonButton({
  children,
  onClick,
  variant = 'cyan',
  disabled = false,
  className = '',
  size = 'md',
}: NeonButtonProps) {
  const v = disabled ? VARIANT_STYLES.ghost : VARIANT_STYLES[variant];

  return (
    <motion.button
      onClick={disabled ? undefined : onClick}
      className={`relative font-mono font-bold tracking-widest uppercase border transition-all select-none ${SIZE_STYLES[size]} ${className}`}
      style={{
        borderColor: v.border,
        color: v.text,
        background: 'rgba(0,0,0,0.6)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.4 : 1,
        minWidth: 44,
        minHeight: 44,
      }}
      whileHover={
        disabled
          ? {}
          : {
              boxShadow: v.glow,
              scale: 1.03,
              transition: { duration: 0.15 },
            }
      }
      whileTap={disabled ? {} : { scale: 0.97 }}
    >
      {/* Corner accents */}
      <span
        className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2"
        style={{ borderColor: v.border }}
      />
      <span
        className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2"
        style={{ borderColor: v.border }}
      />
      <span
        className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2"
        style={{ borderColor: v.border }}
      />
      <span
        className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2"
        style={{ borderColor: v.border }}
      />
      {children}
    </motion.button>
  );
}
