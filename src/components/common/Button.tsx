import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  className = '',
  children,
  ...props
}) => {
  const variantClass = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    ghost: 'btn-ghost',
    danger: 'btn-primary bg-red-600 hover:bg-red-700',
  }[variant];

  const sizeStyles: Record<string, React.CSSProperties> = {
    sm: { padding: '8px 14px', fontSize: '13px' },
    md: { padding: '12px 20px', fontSize: '14.5px' },
    lg: { padding: '14px 24px', fontSize: '16px' },
  };

  return (
    <button
      className={`${variantClass} ${className}`}
      style={{
        ...sizeStyles[size],
        width: fullWidth ? '100%' : undefined,
      }}
      {...props}
    >
      {children}
    </button>
  );
};
