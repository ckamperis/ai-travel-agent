'use client';

interface ActionButtonProps {
  label: string;
  icon?: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
  size?: 'normal' | 'large';
}

export default function ActionButton({
  label,
  icon,
  onClick,
  variant = 'primary',
  disabled = false,
  size = 'normal',
}: ActionButtonProps) {
  const baseClasses =
    'inline-flex items-center justify-center gap-3 rounded-xl font-semibold tracking-wide transition-all duration-300 cursor-pointer select-none';

  const sizeClasses =
    size === 'large'
      ? 'px-10 py-5 text-xl'
      : 'px-7 py-3.5 text-base';

  const variantClasses =
    variant === 'primary'
      ? 'bg-gradient-to-r from-teal to-cyan text-navy-deep shadow-lg shadow-teal/25 hover:shadow-xl hover:shadow-teal/40 hover:scale-105 active:scale-95'
      : 'bg-card border border-card-border text-foreground hover:border-teal/40 hover:bg-navy-light hover:scale-105 active:scale-95';

  const disabledClasses = disabled
    ? 'opacity-40 pointer-events-none'
    : '';

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${baseClasses} ${sizeClasses} ${variantClasses} ${disabledClasses}`}
    >
      {icon && <span className="text-2xl">{icon}</span>}
      {label}
    </button>
  );
}
