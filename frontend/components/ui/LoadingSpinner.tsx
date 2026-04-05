interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  color?: 'blue' | 'gray' | 'white';
  message?: string;
}

export const LoadingSpinner = ({ 
  size = 'md', 
  color = 'blue', 
  message 
}: LoadingSpinnerProps) => {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8', 
    lg: 'h-12 w-12'
  };

  const colorClasses = {
    blue: 'border-blue-600',
    gray: 'border-gray-600',
    white: 'border-white'
  };

  return (
    <div className="flex flex-col items-center justify-center gap-3">
      <div 
        className={`animate-spin rounded-full border-2 border-t-transparent ${sizeClasses[size]} ${colorClasses[color]}`}
        role="status"
        aria-label={message || "Loading"}
      />
      {message && (
        <p className="text-sm text-gray-600 dark:text-gray-400 animate-pulse">
          {message}
        </p>
      )}
    </div>
  );
};

interface LoadingPageProps {
  message?: string;
}

export const LoadingPage = ({ message = "Loading..." }: LoadingPageProps) => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
    <LoadingSpinner size="lg" message={message} />
  </div>
);