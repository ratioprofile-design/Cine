import { Scene, BreakdownItem, Language } from '../types/production';
import { breakdownSceneWithGemini } from './gemini';

export interface BatchProgressState {
  isRunning: boolean;
  isPaused: boolean;
  totalScenes: number;
  completedCount: number;
  currentSceneNumber: string;
  currentSceneLocation: string;
  percent: number;
  startTime: number;
  estimatedSecondsRemaining: number;
  processedSceneIds: string[];
  failedSceneIds: string[];
}

type ProgressListener = (state: BatchProgressState) => void;
type SceneCompletedCallback = (updatedScene: Scene) => void;

class BatchBreakdownManager {
  private state: BatchProgressState = {
    isRunning: false,
    isPaused: false,
    totalScenes: 0,
    completedCount: 0,
    currentSceneNumber: '',
    currentSceneLocation: '',
    percent: 0,
    startTime: 0,
    estimatedSecondsRemaining: 0,
    processedSceneIds: [],
    failedSceneIds: [],
  };

  private listeners: Set<ProgressListener> = new Set();
  private abortController: AbortController | null = null;
  private queue: Scene[] = [];
  private onSceneCompletedCb: SceneCompletedCallback | null = null;
  private activeLanguage: Language = 'en';

  public getState(): BatchProgressState {
    return { ...this.state };
  }

  public subscribe(listener: ProgressListener): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    const currentState = this.getState();
    this.listeners.forEach((l) => l(currentState));
  }

  public async startBatch(
    scenesToProcess: Scene[],
    language: Language = 'en',
    onSceneCompleted: SceneCompletedCallback
  ) {
    if (this.state.isRunning) {
      console.warn('Batch breakdown is already running.');
      return;
    }

    if (!scenesToProcess || scenesToProcess.length === 0) return;

    this.queue = [...scenesToProcess];
    this.onSceneCompletedCb = onSceneCompleted;
    this.activeLanguage = language;
    this.abortController = new AbortController();

    this.state = {
      isRunning: true,
      isPaused: false,
      totalScenes: scenesToProcess.length,
      completedCount: 0,
      currentSceneNumber: scenesToProcess[0]?.sceneNumber || '',
      currentSceneLocation: scenesToProcess[0]?.location || '',
      percent: 0,
      startTime: Date.now(),
      estimatedSecondsRemaining: Math.ceil(scenesToProcess.length * 1.5),
      processedSceneIds: [],
      failedSceneIds: [],
    };

    this.notify();
    this.runQueue();
  }

  private async runQueue() {
    while (this.queue.length > 0 && this.state.isRunning) {
      if (this.state.isPaused) {
        await new Promise((resolve) => setTimeout(resolve, 500));
        continue;
      }

      if (this.abortController?.signal.aborted) {
        break;
      }

      const scene = this.queue.shift();
      if (!scene) break;

      this.state.currentSceneNumber = scene.sceneNumber;
      this.state.currentSceneLocation = scene.location;
      this.notify();

      const itemStartTime = Date.now();

      try {
        const result = await breakdownSceneWithGemini(scene, this.activeLanguage);

        const newItems: BreakdownItem[] = (result.items || []).map((item, idx) => ({
          id: `ai-batch-${Date.now()}-${idx}`,
          category: item.category,
          name: item.name,
          nameTa: item.nameTa || item.name,
          description: item.description,
          descriptionTa: item.descriptionTa,
          count: item.count || 1,
        }));

        const updatedScene: Scene = {
          ...scene,
          synopsis: this.activeLanguage === 'ta' && result.synopsisTa ? result.synopsisTa : result.synopsis || scene.synopsis,
          synopsisTa: result.synopsisTa || scene.synopsisTa,
          breakdownItems: newItems.length > 0 ? newItems : scene.breakdownItems,
        };

        if (this.onSceneCompletedCb) {
          this.onSceneCompletedCb(updatedScene);
        }

        this.state.processedSceneIds.push(scene.id);
      } catch (err) {
        console.error(`Error breaking down scene ${scene.sceneNumber}:`, err);
        this.state.failedSceneIds.push(scene.id);
      }

      this.state.completedCount++;
      const completed = this.state.completedCount;
      const total = this.state.totalScenes;
      this.state.percent = Math.round((completed / total) * 100);

      const elapsedMs = Date.now() - this.state.startTime;
      const avgTimePerSceneMs = elapsedMs / completed;
      const remainingScenes = total - completed;
      this.state.estimatedSecondsRemaining = Math.max(0, Math.ceil((remainingScenes * avgTimePerSceneMs) / 1000));

      this.notify();

      // Gentle pause between API calls to respect rate limits
      await new Promise((resolve) => setTimeout(resolve, 350));
    }

    // Finished
    this.state.isRunning = false;
    this.state.isPaused = false;
    this.state.estimatedSecondsRemaining = 0;
    this.notify();
  }

  public pause() {
    if (this.state.isRunning) {
      this.state.isPaused = true;
      this.notify();
    }
  }

  public resume() {
    if (this.state.isRunning && this.state.isPaused) {
      this.state.isPaused = false;
      this.notify();
    }
  }

  public cancel() {
    this.abortController?.abort();
    this.queue = [];
    this.state.isRunning = false;
    this.state.isPaused = false;
    this.notify();
  }
}

export const batchBreakdownManager = new BatchBreakdownManager();
