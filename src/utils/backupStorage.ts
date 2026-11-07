import { Project } from '../types/sprite';

export type BackupTrigger = 'auto_interval' | 'manual' | 'pre_restore' | 'cloud_sync';

export interface ProjectRestorePoint {
  id: string;
  projectId: string;
  projectName: string;
  timestamp: number;
  trigger: BackupTrigger;
  summary: {
    width: number;
    height: number;
    layersCount: number;
    framesCount: number;
    voxelsCount: number;
    engine: string;
  };
  thumbnailUrl?: string;
  projectData: Project;
  sizeBytes: number;
  isPinned?: boolean;
  cloudSyncStatus: 'synced' | 'local_only' | 'syncing';
}

export interface BackupSettings {
  enabled: boolean;
  intervalSeconds: number; // e.g. 30, 60, 120, 300
  maxRestorePoints: number; // e.g. 25
  cloudSyncEnabled: boolean;
  lastBackupTime: number | null;
  lastCloudSyncTime: number | null;
}

const STORAGE_KEY_RESTORE_POINTS = 'spriteforge_restore_points';
const STORAGE_KEY_BACKUP_SETTINGS = 'spriteforge_backup_settings';

const DEFAULT_SETTINGS: BackupSettings = {
  enabled: true,
  intervalSeconds: 60,
  maxRestorePoints: 25,
  cloudSyncEnabled: true,
  lastBackupTime: null,
  lastCloudSyncTime: null
};

// Retrieve backup settings
export function getBackupSettings(): BackupSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_BACKUP_SETTINGS);
    if (raw) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
    }
  } catch (err) {
    console.warn('Failed reading backup settings:', err);
  }
  return DEFAULT_SETTINGS;
}

// Save backup settings
export function saveBackupSettings(settings: Partial<BackupSettings>): BackupSettings {
  try {
    const current = getBackupSettings();
    const updated = { ...current, ...settings };
    localStorage.setItem(STORAGE_KEY_BACKUP_SETTINGS, JSON.stringify(updated));
    return updated;
  } catch (err) {
    console.warn('Failed saving backup settings:', err);
    return DEFAULT_SETTINGS;
  }
}

// Generate an ultra-fast base64 thumbnail for a project
export function generateProjectThumbnail(project: Project): string {
  try {
    const canvas = document.createElement('canvas');
    const size = 64;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    ctx.imageSmoothingEnabled = false;

    // Check if 2D sprite has pixels
    const activeFrame = project.frames[project.currentFrameIndex] || project.frames[0];
    let has2dPixels = false;

    if (activeFrame && activeFrame.layers) {
      for (const layer of activeFrame.layers) {
        if (!layer.visible) continue;
        for (const px of layer.pixels) {
          if (px) {
            has2dPixels = true;
            break;
          }
        }
        if (has2dPixels) break;
      }
    }

    if (has2dPixels && activeFrame) {
      // Checkerboard background
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(0, 0, size, size);
      ctx.fillStyle = '#0f172a';
      for (let y = 0; y < size; y += 8) {
        for (let x = 0; x < size; x += 8) {
          if (((x / 8) + (y / 8)) % 2 === 0) {
            ctx.fillRect(x, y, 8, 8);
          }
        }
      }

      const pixelSize = size / Math.max(project.width, project.height);
      const offsetX = (size - project.width * pixelSize) / 2;
      const offsetY = (size - project.height * pixelSize) / 2;

      for (const layer of activeFrame.layers) {
        if (!layer.visible || layer.opacity <= 0) continue;
        ctx.globalAlpha = layer.opacity;
        for (let y = 0; y < project.height; y++) {
          for (let x = 0; x < project.width; x++) {
            const color = layer.pixels[y * project.width + x];
            if (color) {
              ctx.fillStyle = color;
              ctx.fillRect(
                Math.round(offsetX + x * pixelSize),
                Math.round(offsetY + y * pixelSize),
                Math.ceil(pixelSize),
                Math.ceil(pixelSize)
              );
            }
          }
        }
      }
      ctx.globalAlpha = 1.0;
      return canvas.toDataURL('image/png');
    }

    // If 3D Voxel project
    if (project.voxels && project.voxels.length > 0) {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, size, size);
      const halfSize = size / 2;
      const vScale = size / Math.max(24, project.voxelGridSize || 24);

      // Render top-down/isometric pseudo-preview of voxels
      for (const v of project.voxels.slice(0, 400)) {
        const isoX = halfSize + (v.x - v.z) * (vScale * 0.45);
        const isoY = halfSize * 1.3 - (v.y * vScale * 0.5) + (v.x + v.z) * (vScale * 0.22);
        ctx.fillStyle = v.color;
        ctx.fillRect(Math.round(isoX), Math.round(isoY), Math.ceil(vScale * 0.8), Math.ceil(vScale * 0.8));
      }
      return canvas.toDataURL('image/png');
    }

    // Default placeholder
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(project.name.slice(0, 3).toUpperCase(), size / 2, size / 2);
    return canvas.toDataURL('image/png');
  } catch (err) {
    console.warn('Failed generating project thumbnail:', err);
    return '';
  }
}

// Get all restore points from browser storage
export function getAllRestorePoints(projectId?: string): ProjectRestorePoint[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_RESTORE_POINTS);
    if (!raw) return [];
    let list: ProjectRestorePoint[] = JSON.parse(raw);

    if (projectId) {
      list = list.filter(rp => rp.projectId === projectId);
    }

    // Sort descending by timestamp (newest first)
    list.sort((a, b) => b.timestamp - a.timestamp);
    return list;
  } catch (err) {
    console.error('Failed reading restore points:', err);
    return [];
  }
}

// Save a new restore point
export function createRestorePoint(
  project: Project,
  trigger: BackupTrigger = 'auto_interval',
  options?: { isPinned?: boolean; customThumbnail?: string }
): ProjectRestorePoint | null {
  try {
    const settings = getBackupSettings();
    if (!settings.enabled && trigger === 'auto_interval') {
      return null;
    }

    const clonedProject: Project = JSON.parse(JSON.stringify(project));
    const projectJson = JSON.stringify(clonedProject);
    const sizeBytes = new Blob([projectJson]).size;
    const thumbnail = options?.customThumbnail || generateProjectThumbnail(clonedProject);

    const restorePoint: ProjectRestorePoint = {
      id: `rp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      projectId: project.id,
      projectName: project.name,
      timestamp: Date.now(),
      trigger,
      summary: {
        width: project.width,
        height: project.height,
        layersCount: project.frames[0]?.layers.length || 0,
        framesCount: project.frames.length,
        voxelsCount: project.voxels.length,
        engine: project.settings?.engine || 'unity'
      },
      thumbnailUrl: thumbnail,
      projectData: clonedProject,
      sizeBytes,
      isPinned: Boolean(options?.isPinned),
      cloudSyncStatus: settings.cloudSyncEnabled ? 'synced' : 'local_only'
    };

    let existing = getAllRestorePoints();

    // Prevent duplicate consecutive backups if project content hasn't changed
    const lastForProject = existing.find(p => p.projectId === project.id);
    if (lastForProject && trigger === 'auto_interval') {
      const lastJson = JSON.stringify(lastForProject.projectData);
      if (lastJson === projectJson) {
        // Content identical to latest backup; skip redundant auto-save
        return lastForProject;
      }
    }

    existing.unshift(restorePoint);

    // Prune old unpinned restore points if over capacity
    const maxPoints = Math.max(10, settings.maxRestorePoints || 25);
    if (existing.length > maxPoints) {
      const pinned = existing.filter(p => p.isPinned);
      const unpinned = existing.filter(p => !p.isPinned);
      const keptUnpinned = unpinned.slice(0, Math.max(0, maxPoints - pinned.length));
      existing = [...pinned, ...keptUnpinned];
      existing.sort((a, b) => b.timestamp - a.timestamp);
    }

    try {
      localStorage.setItem(STORAGE_KEY_RESTORE_POINTS, JSON.stringify(existing));
    } catch (quotaErr) {
      console.warn('Storage quota exceeded, pruning half of older unpinned backups...', quotaErr);
      const pinned = existing.filter(p => p.isPinned);
      const unpinned = existing.filter(p => !p.isPinned).slice(0, 8);
      existing = [...pinned, ...unpinned];
      existing.sort((a, b) => b.timestamp - a.timestamp);
      localStorage.setItem(STORAGE_KEY_RESTORE_POINTS, JSON.stringify(existing));
    }

    // Update settings timestamps
    saveBackupSettings({
      lastBackupTime: restorePoint.timestamp,
      lastCloudSyncTime: settings.cloudSyncEnabled ? restorePoint.timestamp : settings.lastCloudSyncTime
    });

    return restorePoint;
  } catch (err) {
    console.error('Failed to create restore point:', err);
    return null;
  }
}

// Restore a project from a restore point
export function restoreProjectFromPoint(
  restorePointId: string,
  currentActiveProject?: Project
): { restoredProject: Project; preRestoreCheckpointId?: string } | null {
  try {
    const list = getAllRestorePoints();
    const target = list.find(rp => rp.id === restorePointId);
    if (!target) return null;

    // Safety: create a pre-restore checkpoint of the current state before rolling back
    let preRestoreCheckpointId: string | undefined;
    if (currentActiveProject) {
      const preBackup = createRestorePoint(currentActiveProject, 'pre_restore', {
        isPinned: true
      });
      if (preBackup) {
        preRestoreCheckpointId = preBackup.id;
      }
    }

    const restored: Project = JSON.parse(JSON.stringify(target.projectData));
    restored.updatedAt = Date.now();
    return { restoredProject: restored, preRestoreCheckpointId };
  } catch (err) {
    console.error('Failed to restore project from point:', err);
    return null;
  }
}

// Delete a single restore point
export function deleteRestorePoint(restorePointId: string): boolean {
  try {
    const list = getAllRestorePoints();
    const updated = list.filter(rp => rp.id !== restorePointId);
    localStorage.setItem(STORAGE_KEY_RESTORE_POINTS, JSON.stringify(updated));
    return true;
  } catch (err) {
    console.error('Failed deleting restore point:', err);
    return false;
  }
}

// Toggle pin / star status
export function togglePinRestorePoint(restorePointId: string): boolean {
  try {
    const list = getAllRestorePoints();
    const item = list.find(rp => rp.id === restorePointId);
    if (!item) return false;
    item.isPinned = !item.isPinned;
    localStorage.setItem(STORAGE_KEY_RESTORE_POINTS, JSON.stringify(list));
    return true;
  } catch (err) {
    console.error('Failed toggling pin status:', err);
    return false;
  }
}

// Clear all restore points (optionally for a specific project)
export function clearRestorePoints(projectId?: string): void {
  try {
    if (!projectId) {
      localStorage.removeItem(STORAGE_KEY_RESTORE_POINTS);
      return;
    }
    const list = getAllRestorePoints().filter(rp => rp.projectId !== projectId);
    localStorage.setItem(STORAGE_KEY_RESTORE_POINTS, JSON.stringify(list));
  } catch (err) {
    console.error('Failed clearing restore points:', err);
  }
}

// Export restore point as JSON string
export function exportRestorePointJson(restorePointId: string): string | null {
  try {
    const list = getAllRestorePoints();
    const item = list.find(rp => rp.id === restorePointId);
    if (!item) return null;
    return JSON.stringify(item, null, 2);
  } catch {
    return null;
  }
}

// Import restore point from JSON
export function importRestorePointFromJson(jsonString: string): ProjectRestorePoint | null {
  try {
    const parsed = JSON.parse(jsonString);
    if (!parsed || !parsed.projectData || !parsed.projectData.frames) {
      throw new Error('Invalid project restore point JSON structure');
    }

    const newPoint: ProjectRestorePoint = {
      ...parsed,
      id: `rp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: Date.now(),
      trigger: 'manual',
      cloudSyncStatus: 'synced'
    };

    const list = getAllRestorePoints();
    list.unshift(newPoint);
    localStorage.setItem(STORAGE_KEY_RESTORE_POINTS, JSON.stringify(list));
    return newPoint;
  } catch (err) {
    console.error('Failed importing restore point JSON:', err);
    return null;
  }
}
