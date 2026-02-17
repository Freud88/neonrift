'use client';

import { useRef, useEffect, useCallback } from 'react';

interface VirtualJoystickProps {
  onChange: (x: number, y: number) => void;  // normalized -1..1
}

export default function VirtualJoystick({ onChange }: VirtualJoystickProps) {
  const baseRef  = useRef<HTMLDivElement>(null);
  const stickRef = useRef<HTMLDivElement>(null);
  const touchId  = useRef<number | null>(null);
  const center   = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const RADIUS = 40; // max stick travel in px

  const resetStick = useCallback(() => {
    if (stickRef.current) {
      stickRef.current.style.transform = 'translate(-50%, -50%)';
    }
    onChange(0, 0);
    touchId.current = null;
  }, [onChange]);

  const handleMove = useCallback((clientX: number, clientY: number) => {
    const cx = center.current.x;
    const cy = center.current.y;
    let dx = clientX - cx;
    let dy = clientY - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > RADIUS) {
      dx = (dx / dist) * RADIUS;
      dy = (dy / dist) * RADIUS;
    }
    if (stickRef.current) {
      stickRef.current.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
    }
    onChange(dx / RADIUS, dy / RADIUS);
  }, [onChange]);

  useEffect(() => {
    const base = baseRef.current;
    if (!base) return;

    const onTouchStart = (e: TouchEvent) => {
      if (touchId.current !== null) return;
      const touch = e.changedTouches[0];
      touchId.current = touch.identifier;
      const rect = base.getBoundingClientRect();
      center.current = {
        x: rect.left + rect.width / 2,
        y: rect.top  + rect.height / 2,
      };
      handleMove(touch.clientX, touch.clientY);
    };

    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      for (const touch of Array.from(e.changedTouches)) {
        if (touch.identifier === touchId.current) {
          handleMove(touch.clientX, touch.clientY);
        }
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      for (const touch of Array.from(e.changedTouches)) {
        if (touch.identifier === touchId.current) {
          resetStick();
        }
      }
    };

    base.addEventListener('touchstart',  onTouchStart, { passive: false });
    base.addEventListener('touchmove',   onTouchMove,  { passive: false });
    base.addEventListener('touchend',    onTouchEnd,   { passive: false });
    base.addEventListener('touchcancel', onTouchEnd,   { passive: false });

    return () => {
      base.removeEventListener('touchstart',  onTouchStart);
      base.removeEventListener('touchmove',   onTouchMove);
      base.removeEventListener('touchend',    onTouchEnd);
      base.removeEventListener('touchcancel', onTouchEnd);
    };
  }, [handleMove, resetStick]);

  return (
    <div
      ref={baseRef}
      className="relative select-none"
      style={{
        width: 100,
        height: 100,
        borderRadius: '50%',
        border: '2px solid rgba(0,240,255,0.4)',
        background: 'rgba(0,0,0,0.5)',
        boxShadow: '0 0 16px rgba(0,240,255,0.2)',
        touchAction: 'none',
      }}
    >
      {/* Crosshair guides */}
      <div style={{ position: 'absolute', top: '50%', left: 10, right: 10, height: 1, background: 'rgba(0,240,255,0.15)', transform: 'translateY(-50%)' }} />
      <div style={{ position: 'absolute', left: '50%', top: 10, bottom: 10, width: 1, background: 'rgba(0,240,255,0.15)', transform: 'translateX(-50%)' }} />

      {/* Stick */}
      <div
        ref={stickRef}
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: 36,
          height: 36,
          borderRadius: '50%',
          background: 'rgba(0,240,255,0.3)',
          border: '2px solid #00f0ff',
          transform: 'translate(-50%, -50%)',
          boxShadow: '0 0 10px rgba(0,240,255,0.5)',
          transition: 'none',
          pointerEvents: 'none',
        }}
      />
    </div>
  );
}
