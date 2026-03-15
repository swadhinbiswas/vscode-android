import { useState } from 'react';
import { useSetAtom } from 'jotai';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-shell';
import { Github, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  isAuthenticatedAtom,
  githubUserAtom,
  type GitHubUser,
} from '../App';
import type { CommandResponse, TokenData } from '../types';

interface AuthScreenProps {
  onAuthComplete: () => void;
}

export function AuthScreen({ onAuthComplete }: AuthScreenProps) {
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const setIsAuthenticated = useSetAtom(isAuthenticatedAtom);
  const setGithubUser = useSetAtom(githubUserAtom);

  const handleGitHubLogin = async () => {
    setIsAuthenticating(true);
    
    try {
      // Initiate OAuth flow
      const state = await invoke<string>('github_login');
      
      // Store state for callback verification
      localStorage.setItem('oauth_state', state);
      
      // Note: In a real app, you'd set up a custom URL scheme handler
      // For now, we'll simulate the callback
      toast.success('Opening GitHub for authentication...');
      
      // Simulate OAuth callback (in production, this would be handled by a deep link)
      setTimeout(() => {
        handleOAuthCallback(state);
      }, 2000);
    } catch (error) {
      console.error('Login error:', error);
      toast.error('Failed to initiate login');
      setIsAuthenticating(false);
    }
  };

  const handleOAuthCallback = async (state: string) => {
    try {
      // In production, you'd get these from the deep link callback
      const code = 'mock_code'; // This would come from the OAuth callback
      
      const result = await invoke<CommandResponse<TokenData>>('github_callback', {
        code,
        state,
      });

      if (result.success) {
        // Fetch user info
        await fetchUserInfo();
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('OAuth callback error:', error);
      toast.error('Authentication failed');
      setIsAuthenticating(false);
    }
  };

  const fetchUserInfo = async () => {
    try {
      const result = await invoke<CommandResponse<GitHubUser>>('get_github_user');
      
      if (result.success && result.data) {
        const user = result.data;
        setIsAuthenticated(true);
        setGithubUser(user);
        
        // Store auth state
        localStorage.setItem(
          'vscode_android_auth',
          JSON.stringify({
            isAuthenticated: true,
            user,
          })
        );
        
        toast.success(`Welcome, ${user.login}!`);
        onAuthComplete();
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Fetch user error:', error);
      toast.error('Failed to fetch user info');
      setIsAuthenticating(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen w-screen bg-vscode-bg">
      {/* Logo */}
      <div className="mb-8">
        <svg
          className="w-20 h-20 text-vscode-blue"
          viewBox="0 0 100 100"
          fill="currentColor"
        >
          <path d="M20 20 L80 50 L20 80 Z" />
          <path d="M30 35 L65 50 L30 65 Z" fill="#1e1e1e" />
        </svg>
      </div>

      {/* Title */}
      <h1 className="text-3xl font-bold text-vscode-foreground mb-2">
        VSCode Android
      </h1>
      <p className="text-vscode-gutter-foreground text-center mb-8 max-w-sm">
        Sign in with GitHub to access your Codespaces and start coding
      </p>

      {/* Login Button */}
      <button
        onClick={handleGitHubLogin}
        disabled={isAuthenticating}
        className="flex items-center gap-3 bg-vscode-blue text-white px-6 py-3 rounded-lg 
                   hover:bg-opacity-90 transition-all duration-200 disabled:opacity-50 
                   disabled:cursor-not-allowed min-h-[48px] min-w-[200px] 
                   justify-center"
      >
        {isAuthenticating ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Connecting...</span>
          </>
        ) : (
          <>
            <Github className="w-5 h-5" />
            <span>Sign in with GitHub</span>
          </>
        )}
      </button>

      {/* Features */}
      <div className="mt-12 space-y-3 text-sm text-vscode-gutter-foreground">
        <div className="flex items-center gap-2">
          <CheckIcon />
          <span>Access your GitHub Codespaces</span>
        </div>
        <div className="flex items-center gap-2">
          <CheckIcon />
          <span>Real-time sync with remote</span>
        </div>
        <div className="flex items-center gap-2">
          <CheckIcon />
          <span>Full Monaco Editor experience</span>
        </div>
        <div className="flex items-center gap-2">
          <CheckIcon />
          <span>Offline mode support</span>
        </div>
      </div>

      {/* Privacy note */}
      <p className="mt-8 text-xs text-vscode-gutter-foreground text-center max-w-xs">
        Your tokens are stored securely on your device. 
        We never send your code to our servers.
      </p>
    </div>
  );
}

function CheckIcon() {
  return (
    <svg
      className="w-4 h-4 text-vscode-green"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M5 13l4 4L19 7"
      />
    </svg>
  );
}
