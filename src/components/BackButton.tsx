import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigation } from '../context/NavigationContext';

export interface BackButtonProps {
  label?: string;
  fallbackLabel?: string;
  onClick?: () => void;
  variant?: 'pill' | 'minimal' | 'breadcrumb' | 'header';
  className?: string;
  showIcon?: boolean;
  destinationHint?: boolean;
  disabled?: boolean;
}

export const BackButton: React.FC<BackButtonProps> = ({
  label,
  fallbackLabel,
  onClick,
  variant = 'pill',
  className = '',
  showIcon = true,
  destinationHint = true,
  disabled = false,
}) => {
  const { goBack, getBackLabel, canGoBack } = useNavigation();

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (disabled) return;
    if (onClick) {
      onClick();
    } else {
      goBack();
    }
  };

  // Determine display label
  const resolvedLabel = label || (destinationHint ? getBackLabel(fallbackLabel) : fallbackLabel || 'Back');

  if (variant === 'breadcrumb') {
    return (
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled}
        className={`group flex items-center space-x-1 text-xs font-semibold text-slate-600 hover:text-blue-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg px-1.5 py-0.5 -ml-1.5 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
        aria-label={resolvedLabel}
        title={resolvedLabel}
      >
        {showIcon && (
          <ArrowLeft className="w-3.5 h-3.5 text-slate-500 group-hover:text-blue-600 group-hover:-translate-x-0.5 transition-transform" />
        )}
        <span>← {resolvedLabel.replace(/^Back to\s+/i, '').replace(/^←\s*/, '')}</span>
      </button>
    );
  }

  if (variant === 'minimal') {
    return (
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled}
        className={`group inline-flex items-center space-x-1.5 text-xs font-bold text-slate-600 hover:text-blue-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg py-1 px-2 -ml-2 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
        aria-label={resolvedLabel}
        title={resolvedLabel}
      >
        {showIcon && (
          <ArrowLeft className="w-4 h-4 text-slate-500 group-hover:text-blue-600 group-hover:-translate-x-0.5 transition-transform" />
        )}
        <span>{resolvedLabel}</span>
      </button>
    );
  }

  if (variant === 'header') {
    return (
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled}
        className={`group inline-flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-800 text-xs font-bold border border-slate-200/80 transition-all shadow-2xs focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
        aria-label={resolvedLabel}
        title={resolvedLabel}
      >
        {showIcon && (
          <ArrowLeft className="w-3.5 h-3.5 text-slate-600 group-hover:text-slate-900 group-hover:-translate-x-0.5 transition-transform" />
        )}
        <span className="truncate max-w-[180px] sm:max-w-none">{resolvedLabel}</span>
      </button>
    );
  }

  // Default 'pill' variant
  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      className={`group inline-flex items-center space-x-2 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-700 hover:text-slate-900 border border-slate-200 hover:border-slate-300 text-xs font-bold transition-all shadow-2xs focus:outline-none focus:ring-2 focus:ring-blue-500 shrink-0 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      aria-label={resolvedLabel}
      title={resolvedLabel}
    >
      {showIcon && (
        <ArrowLeft className="w-3.5 h-3.5 text-slate-500 group-hover:text-blue-600 group-hover:-translate-x-0.5 transition-transform" />
      )}
      <span className="truncate max-w-[180px] sm:max-w-none">{resolvedLabel}</span>
    </button>
  );
};
