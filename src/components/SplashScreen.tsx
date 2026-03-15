import { useEffect, useState } from 'react';

export function SplashScreen() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer);
          return 100;
        }
        return prev + 10;
      });
    }, 100);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center h-screen w-screen bg-vscode-bg">
      {/* Logo */}
      <div className="mb-8">
        <svg
          className="w-24 h-24 text-vscode-blue"
          viewBox="0 0 100 100"
          fill="currentColor"
        >
          <path d="M20 20 L80 50 L20 80 Z" />
          <path d="M30 35 L65 50 L30 65 Z" fill="#1e1e1e" />
        </svg>
      </div>

      {/* Title */}
      <h1 className="text-2xl font-bold text-vscode-foreground mb-2">
        VSCode Android
      </h1>
      <p className="text-vscode-gutter-foreground text-sm mb-8">
        Code anywhere, sync everywhere
      </p>

      {/* Loading spinner */}
      <div className="relative w-16 h-16 mb-4">
        <div className="absolute inset-0 border-4 border-vscode-border rounded-full"></div>
        <div
          className="absolute inset-0 border-4 border-vscode-blue rounded-full border-t-transparent animate-spin"
          style={{
            animationDuration: '1s',
          }}
        ></div>
      </div>

      {/* Progress bar */}
      <div className="w-64 h-1 bg-vscode-border rounded-full overflow-hidden">
        <div
          className="h-full bg-vscode-blue transition-all duration-200"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Version */}
      <p className="text-vscode-gutter-foreground text-xs mt-4">v1.0.0</p>
    </div>
  );
}
