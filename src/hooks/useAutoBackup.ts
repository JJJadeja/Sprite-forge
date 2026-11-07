import { useEffect, useRef, useState, useCallback } from 'react';
import { Project } from '../types/sprite';
import { 
  createRestorePoint, 
  getBackupSettings, 
  saveBackupSettings, 
  BackupSettings, 
  ProjectRestorePoint,
  getAllRestorePoints
} from '../utils/backupStorage';

interface UseAutoBackupOptions {
  project: Project;
  onBackupSuccess?: (point: ProjectRestorePoint) => void;
}

export function useAutoBackup({ project, onBackupSuccess }: UseAutoBackupOptions) {
  const [settings, setSettings] = useState<BackupSettings>(() => getBackupSettings());
  const [isBackingUp, setIsBackingUp] = useState<boolean>(false);
  const [lastBackupTime, setLastBackupTime] = useState<number | null>(settings.lastBackupTime);
  const [backupCount, setBackupCount] = useState<number>(0);
  const [recentNotification, setRecentNotification] = useState<string | null>(null);

  const lastProjectStateRef = useRef<string>(JSON.stringify(project));
  const projectRef = useRef<Project>(project);
  projectRef.current = project;

  // Refresh backup count
  const refreshStats = useCallback(() => {
    const list = getAllRestorePoints(project.id);
    setBackupCount(list.length);
  }, [project.id]);

  useEffect(() => {
    refreshStats();
  }, [refreshStats]);

  // Update backup settings
  const updateSettings = useCallback((newSettings: Partial<BackupSettings>) => {
    const updated = saveBackupSettings(newSettings);
    setSettings(updated);
  }, []);

  // Manual backup trigger
  const triggerManualBackup = useCallback(async (customName?: string): Promise<ProjectRestorePoint | null> => {
    setIsBackingUp(true);
    try {
      const targetProj = projectRef.current;
      const point = createRestorePoint(targetProj, 'manual');
      if (point) {
        setLastBackupTime(point.timestamp);
        refreshStats();
        onBackupSuccess?.(point);
        const msg = `Backup created for "${targetProj.name}"`;
        setRecentNotification(msg);
        setTimeout(() => setRecentNotification(null), 3500);
        return point;
      }
    } finally {
      setIsBackingUp(false);
    }
    return null;
  }, [onBackupSuccess, refreshStats]);

  // Scheduled Interval Auto-Backup loop
  useEffect(() => {
    if (!settings.enabled || settings.intervalSeconds <= 0) return;

    const intervalMs = settings.intervalSeconds * 1000;

    const timer = setInterval(() => {
      const currentJson = JSON.stringify(projectRef.current);
      // Only backup if project content has actually changed since last check
      if (currentJson !== lastProjectStateRef.current) {
        setIsBackingUp(true);
        const point = createRestorePoint(projectRef.current, 'auto_interval');
        lastProjectStateRef.current = currentJson;
        setIsBackingUp(false);

        if (point) {
          setLastBackupTime(point.timestamp);
          refreshStats();
          onBackupSuccess?.(point);
          const timeStr = new Date(point.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          const msg = `Auto-saved restore point (${timeStr})`;
          setRecentNotification(msg);
          setTimeout(() => setRecentNotification(null), 3000);
        }
      }
    }, intervalMs);

    return () => clearInterval(timer);
  }, [settings.enabled, settings.intervalSeconds, onBackupSuccess, refreshStats]);

  return {
    settings,
    updateSettings,
    isBackingUp,
    lastBackupTime,
    backupCount,
    recentNotification,
    triggerManualBackup,
    refreshStats
  };
}
