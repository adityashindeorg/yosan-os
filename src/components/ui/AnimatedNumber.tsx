import { useEffect, useRef, useState } from 'react';
import { motion, useSpring, useTransform } from 'framer-motion';

interface AnimatedNumberProps {
  value: number;
  prefix?: string;
  suffix?: string;
  duration?: number;
  className?: string;
}

export function AnimatedNumber({ 
  value, 
  prefix = '', 
  suffix = '',
  duration = 0.8,
  className = ''
}: AnimatedNumberProps) {
  const [displayValue, setDisplayValue] = useState(0);
  const prevValue = useRef(0);
  
  const spring = useSpring(0, {
    stiffness: 100,
    damping: 30,
    duration: duration * 1000,
  });

  const display = useTransform(spring, (latest) => {
    return Math.round(latest).toLocaleString('en-IN');
  });

  useEffect(() => {
    spring.set(value);
  }, [value, spring]);

  useEffect(() => {
    const unsubscribe = display.on('change', (v) => {
      setDisplayValue(parseFloat(v.replace(/,/g, '')) || 0);
    });
    return unsubscribe;
  }, [display]);

  return (
    <motion.span className={className}>
      {prefix}
      <motion.span>{display}</motion.span>
      {suffix}
    </motion.span>
  );
}
