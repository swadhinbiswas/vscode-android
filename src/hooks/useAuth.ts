import { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { open } from '@tauri-apps/plugin-shell';
import type { GitHubUser, TokenData, CommandResponse } from '../types';

const GITHUB_CLIENT_ID = 'Iv1.8f12a7e0c0e0e0e0'; // Replace with your OAuth app client ID
const GITHUB_SCOPES = 'repo,codespace,workflow,user:email';

export function useAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<GitHubUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check for existing auth on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const stored = localStorage.getItem('vscode_android_auth');
        if (stored) {
          const auth = JSON.parse(stored);
          if (auth.isAuthenticated && auth.user) {
            setIsAuthenticated(true);
            setUser(auth.user);
          }
        }
      } catch (err) {
        console.error('Auth check error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  // Initiate GitHub OAuth login
  const login = useCallback(async () => {
    setError(null);
    
    try {
      // Generate state for CSRF protection
      const state = generateRandomState();
      localStorage.setItem('oauth_state', state);

      // Build OAuth URL
      const authUrl = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&scope=${GITHUB_SCOPES}&state=${state}`;

      // Open browser for OAuth flow
      await open(authUrl);

      // In production, you'd set up a custom URL scheme handler
      // For now, we'll poll for the callback
      return { success: true, state };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed';
      setError(message);
      return { success: false, error: message };
    }
  }, []);

  // Handle OAuth callback
  const handleCallback = useCallback(async (code: string, state: string) => {
    try {
      // Verify state
      const storedState = localStorage.getItem('oauth_state');
      if (storedState !== state) {
        throw new Error('Invalid OAuth state');
      }

      // Exchange code for token
      const result = await invoke<CommandResponse<TokenData>>('github_callback', {
        code,
        state,
      });

      if (!result.success) {
        throw new Error(result.error);
      }

      // Fetch user info
      await fetchUserInfo();

      // Clear state
      localStorage.removeItem('oauth_state');

      return { success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Callback failed';
      setError(message);
      return { success: false, error: message };
    }
  }, []);

  // Fetch current user info
  const fetchUserInfo = useCallback(async () => {
    try {
      const result = await invoke<CommandResponse<GitHubUser>>('get_github_user');

      if (result.success && result.data) {
        const userData = result.data;
        setUser(userData);
        setIsAuthenticated(true);

        // Store auth state
        localStorage.setItem(
          'vscode_android_auth',
          JSON.stringify({
            isAuthenticated: true,
            user: userData,
          })
        );

        return { success: true, user: userData };
      } else {
        throw new Error(result.error);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch user';
      setError(message);
      return { success: false, error: message };
    }
  }, []);

  // Logout
  const logout = useCallback(async () => {
    try {
      await invoke('logout');
      localStorage.removeItem('vscode_android_auth');
      setUser(null);
      setIsAuthenticated(false);
      return { success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Logout failed';
      setError(message);
      return { success: false, error: message };
    }
  }, []);

  // Simulate OAuth callback (for development)
  const simulateCallback = useCallback(async (state: string) => {
    // In development, simulate the OAuth flow
    const mockCode = 'mock_oauth_code';
    return handleCallback(mockCode, state);
  }, [handleCallback]);

  return {
    isAuthenticated,
    user,
    isLoading,
    error,
    login,
    logout,
    handleCallback,
    fetchUserInfo,
    simulateCallback,
  };
}

function generateRandomState(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(16).padStart(2, '0')).join('');
}
