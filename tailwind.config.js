/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // VS Code Dark Theme Colors
        'vscode-bg': '#1e1e1e',
        'vscode-sidebar': '#252526',
        'vscode-activity-bar': '#333333',
        'vscode-status-bar': '#007acc',
        'vscode-status-bar-offline': '#6c9fbb',
        'vscode-title-bar': '#3c3c3c',
        'vscode-border': '#454545',
        'vscode-foreground': '#cccccc',
        'vscode-text': '#d4d4d4',
        'vscode-selection': '#264f78',
        'vscode-line-highlight': '#2b2b2b',
        'vscode-gutter': '#1e1e1e',
        'vscode-gutter-foreground': '#858585',
        
        // VS Code Light Theme Colors
        'vscode-light-bg': '#ffffff',
        'vscode-light-sidebar': '#f3f3f3',
        'vscode-light-activity-bar': '#2c2c2c',
        'vscode-light-status-bar': '#007acc',
        'vscode-light-border': '#e5e5e5',
        
        // Accent colors
        'vscode-blue': '#007acc',
        'vscode-green': '#4ec9b0',
        'vscode-orange': '#ce9178',
        'vscode-purple': '#c586c0',
        'vscode-yellow': '#dcdcaa',
        'vscode-red': '#f44747',
        
        // Sync status colors
        'sync-success': '#4caf50',
        'sync-warning': '#ff9800',
        'sync-error': '#f44336',
        'sync-pending': '#2196f3',
      },
      fontFamily: {
        mono: ['Consolas', 'Monaco', 'Courier New', 'monospace'],
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      fontSize: {
        'editor': ['14px', { lineHeight: '1.5' }],
        'sidebar': ['13px', { lineHeight: '1.4' }],
        'status': ['12px', { lineHeight: '1.3' }],
      },
      spacing: {
        'sidebar': '250px',
        'activity-bar': '48px',
        'status-bar': '22px',
        'title-bar': '30px',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'spin-slow': 'spin 2s linear infinite',
        'sync-pulse': 'syncPulse 1.5s ease-in-out infinite',
      },
      keyframes: {
        syncPulse: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
      },
    },
  },
  plugins: [],
}
