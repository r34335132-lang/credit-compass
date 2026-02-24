import { RiskLevel } from '@/types';
import { getRiskLabel, getRiskColor } from '@/lib/kpi';
import { cn } from '@/lib/utils';

interface RiskBadgeProps {
  risk: RiskLevel;
  size?: 'sm' | 'md' | 'lg';
  dpd?: number;
}

export function RiskBadge({ risk, size = 'md', dpd }: RiskBadgeProps) {
  const color = getRiskColor(risk);
  const label = getRiskLabel(risk);

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-sm px-3 py-1.5 font-semibold',
  };

  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 rounded-full font-medium',
      sizeClasses[size],
    )}
    style={{
      backgroundColor: `hsl(var(--${color}-bg))`,
      color: `hsl(var(--${color}))`,
    }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: `hsl(var(--${color}))` }} />
      {label}{dpd !== undefined && ` · ${dpd}d`}
    </span>
  );
}
