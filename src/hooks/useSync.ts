import { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import type { SyncStatus, FileChange } from '../types';

interface UseSyncOptions {
  autoSync?: boolean;
  syncInterval?: number;
  debounceMs?: number;
}

export function useSync(options: UseSyncOptions = {}) {
  const {
    autoSync = true,
    syncInterval = 5000,
    debounceMs = 300,
  } = options;

  const [syncStatus, setSyncStatus] = useState<SyncStatus | null>(null);
  const [pendingChanges, setPendingChanges] = useState<FileChange[]>([]);
  const [isOnline, setIsOnline] = useState(true);
  const [lastSyncTime, setLastSyncTime] = useState<number | null>(null);

  // Debounce timer ref
  const debounceTimer = React.useRef<NodeJS.Timeout | null>(null);

  // Fetch sync status
  const fetchSyncStatus = useCallback(async () => {
    try {
      const status = await invoke<SyncStatus>('get_sync_status');
      setSyncStatus(status);
      setIsOnline(status.is_online);
      setLastSyncTime(status.last_sync_time || null);
    } catch (error) {
      console.error('Failed to fetch sync status:', error);
    }
  }, []);

  // Queue a file change for sync
  const queueChange = useCallback((change: FileChange) => {
    setPendingChanges((prev) => [...prev, change]);

    // Debounce auto-sync
    if (autoSync && debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    if (autoSync) {
      debounceTimer.current = setTimeout(() => {
        flushChanges();
      }, debounceMs);
    }
  }, [autoSync, debounceMs]);

  // Flush pending changes to codespace
  const flushChanges = useCallback(async () => {
    if (pendingChanges.length === 0 || !isOnline) return;

    try {
      // Push all changes
      await invoke('push_all_changes');
      setPendingChanges([]);
      await fetchSyncStatus();
    } catch (error) {
      console.error('Failed to flush changes:', error);
    }
  }, [pendingChanges, isOnline, fetchSyncStatus]);

  // Pull changes from codespace
  const pullChanges = useCallback(async () => {
    try {
      await invoke('pull_all_changes');
      await fetchSyncStatus();
    } catch (error) {
      console.error('Failed to pull changes:', error);
    }
  }, [fetchSyncStatus]);

  // Manual sync
  const syncNow = useCallback(async () => {
    await flushChanges();
    await pullChanges();
  }, [flushChanges, pullChanges]);

  // Clear sync queue
  const clearQueue = useCallback(async () => {
    try {
      await invoke('clear_sync_queue');
      setPendingChanges([]);
    } catch (error) {
      console.error('Failed to clear queue:', error);
    }
  }, []);

  // Poll sync status
  useEffect(() => {
    if (!autoSync) return;

    const interval = setInterval(fetchSyncStatus, syncInterval);
    return () => clearInterval(interval);
  }, [autoSync, syncInterval, fetchSyncStatus]);

  // Network status listener
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      // Auto-sync on reconnect
      if (pendingChanges.length > 0) {
        flushChanges();
      }
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [pendingChanges.length, flushChanges]);

  // Cleanup debounce timer
  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, []);

  return {
    syncStatus,
    pendingChanges,
    isOnline,
    lastSyncTime,
    queueChange,
    flushChanges,
    pullChanges,
    syncNow,
    clearQueue,
  };
}

// Fix for React reference
import React from 'react';

// Real-time synchronization

/**
 * @returns Sync state and operations
 */
