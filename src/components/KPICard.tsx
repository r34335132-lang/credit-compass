import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface KPICardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: LucideIcon;
  trend?: 'up' | 'down' | 'neutral';
  variant?: 'default' | 'good' | 'warning' | 'danger';
}

export function KPICard({ title, value, subtitle, icon: Icon, variant = 'default' }: KPICardProps) {
  const borderColors = {
    default: 'border-l-primary',
    good: 'border-l-risk-good',
    warning: 'border-l-risk-bad',
    danger: 'border-l-risk-critical',
  };

  const iconBg = {
    default: 'bg-accent text-accent-foreground',
    good: 'bg-risk-good-bg text-risk-good',
    warning: 'bg-risk-bad-bg text-risk-bad',
    danger: 'bg-risk-critical-bg text-risk-critical',
  };

  return (
    <Card className={cn(
      'border-l-4 p-5 animate-fade-in',
      borderColors[variant],
    )}>
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold tracking-tight tabular-nums">{value}</p>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        <div className={cn('rounded-lg p-2.5', iconBg[variant])}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </Card>
  );
}
