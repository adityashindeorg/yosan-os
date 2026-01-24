import { motion } from 'framer-motion';
import { ReactNode } from 'react';
import { AnimatedNumber } from './AnimatedNumber';
import { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: number;
  prefix?: string;
  suffix?: string;
  change?: number;
  changeLabel?: string;
  icon?: LucideIcon;
  iconColor?: string;
  delay?: number;
}

export function MetricCard({
  title,
  value,
  prefix = '',
  suffix = '',
  change,
  changeLabel,
  icon: Icon,
  iconColor = 'text-primary',
  delay = 0,
}: MetricCardProps) {
  const isPositive = change !== undefined && change >= 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="card-premium p-6"
    >
      <div className="flex items-start justify-between">
        <div className="space-y-3">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <div className="flex items-baseline gap-1">
            <AnimatedNumber
              value={value}
              prefix={prefix}
              suffix={suffix}
              className="text-3xl font-semibold text-foreground"
            />
          </div>
          {change !== undefined && (
            <div className="flex items-center gap-1.5">
              <span
                className={`text-xs font-medium ${
                  isPositive ? 'text-primary' : 'text-destructive'
                }`}
              >
                {isPositive ? '+' : ''}
                {change}%
              </span>
              {changeLabel && (
                <span className="text-xs text-muted-foreground">{changeLabel}</span>
              )}
            </div>
          )}
        </div>
        {Icon && (
          <div className={`rounded-xl bg-secondary p-3 ${iconColor}`}>
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>
    </motion.div>
  );
}
