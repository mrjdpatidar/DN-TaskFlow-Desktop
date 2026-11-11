import React from 'react';

interface AvatarProps {
  name: string;
  avatarUrl?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showOnline?: boolean;
}

const sizeClasses = {
  xs: 'w-5 h-5 text-[10px]',
  sm: 'w-7 h-7 text-xs',
  md: 'w-8 h-8 text-xs',
  lg: 'w-10 h-10 text-sm',
  xl: 'w-14 h-14 text-base font-semibold',
};

export const Avatar: React.FC<AvatarProps> = ({
  name,
  avatarUrl,
  size = 'md',
  className = '',
  showOnline = false,
}) => {
  const [imageError, setImageError] = React.useState(false);

  const getInitials = (n: string) => {
    if (!n) return 'TF';
    const parts = n.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return n.slice(0, 2).toUpperCase();
  };

  // Consistent pleasant color generation based on name
  const colors = [
    'from-indigo-500 to-purple-600',
    'from-cyan-500 to-blue-600',
    'from-emerald-500 to-teal-600',
    'from-amber-500 to-orange-600',
    'from-rose-500 to-pink-600',
    'from-violet-500 to-fuchsia-600',
  ];
  const charCodeSum = (name || '').split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const colorGradient = colors[charCodeSum % colors.length];

  return (
    <div className={`relative inline-flex shrink-0 ${className}`}>
      {avatarUrl && !imageError ? (
        <img
          src={avatarUrl}
          alt={name}
          onError={() => setImageError(true)}
          className={`${sizeClasses[size]} rounded-full object-cover ring-1 ring-white/10 dark:ring-white/15 shadow-sm`}
        />
      ) : (
        <div
          className={`${sizeClasses[size]} rounded-full bg-gradient-to-tr ${colorGradient} text-white flex items-center justify-center font-medium shadow-sm ring-1 ring-white/10`}
        >
          {getInitials(name)}
        </div>
      )}
      {showOnline && (
        <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-[#0b0f19]" />
      )}
    </div>
  );
};
