/**
 * Small typed adapter for the official @ffmpeg/ffmpeg worker protocol.
 *
 * The package's main-thread classes.js constructs a Worker from a runtime URL
 * expression that Next/Turbopack cannot statically analyse. The worker itself
 * and protocol implementation are vendored unmodified from @ffmpeg/ffmpeg;
 * this adapter uses a fixed same-origin URL.
 */
type EventKind = 'log' | 'progress';
type LogPayload = { message?: string };
type ProgressPayload = { progress?: number; time?: number };
type EventPayload = { log: LogPayload; progress: ProgressPayload };
type Message = { id: number; type: string; data: unknown };
type Waiter = { resolve: (v: unknown) => void; reject: (e: Error) => void };

export class FFmpeg {
  private worker: Worker | null = null;
  private nextId = 0;
  private waiters = new Map<number, Waiter>();
  private callbacks: { log: ((data: LogPayload) => void)[]; progress: ((data: ProgressPayload) => void)[] } = { log: [], progress: [] };
  loaded = false;

  on<K extends EventKind>(event: K, callback: (data: EventPayload[K]) => void) { this.callbacks[event].push(callback as never); }
  off<K extends EventKind>(event: K, callback: (data: EventPayload[K]) => void) { this.callbacks[event] = this.callbacks[event].filter((x) => x !== callback) as never; }

  private send(type: string, data?: unknown, transfer: Transferable[] = []): Promise<unknown> {
    if (!this.worker) return Promise.reject(new Error('FFmpeg worker is not loaded.'));
    const id = ++this.nextId;
    return new Promise((resolve, reject) => {
      this.waiters.set(id, { resolve, reject });
      this.worker!.postMessage({ id, type, data }, transfer);
    });
  }

  async load(config: { coreURL: string; wasmURL: string; classWorkerURL?: string }): Promise<boolean> {
    if (this.loaded) return false;
    if (!this.worker) {
      const base = typeof location !== 'undefined' ? location.origin : 'http://localhost';
      this.worker = new Worker(new URL('/vendor/ffmpeg/esm/worker.js', base), { type: 'module', name: 'convertflow-ffmpeg' });
      this.worker.onmessage = ({ data }: MessageEvent<Message>) => {
        if (data.type === 'LOG') { this.callbacks.log.forEach((fn) => fn(data.data as LogPayload)); return; }
        if (data.type === 'PROGRESS') { this.callbacks.progress.forEach((fn) => fn(data.data as ProgressPayload)); return; }
        const waiter = this.waiters.get(data.id);
        if (!waiter) return;
        this.waiters.delete(data.id);
        if (data.type === 'ERROR') waiter.reject(new Error(String(data.data)));
        else waiter.resolve(data.data);
      };
      this.worker.onerror = (event) => {
        for (const waiter of this.waiters.values()) waiter.reject(new Error(event.message || 'FFmpeg worker failed.'));
        this.waiters.clear();
      };
    }
    try {
      await this.send('LOAD', { coreURL: config.coreURL, wasmURL: config.wasmURL });
      this.loaded = true;
      return true;
    } catch (error) { this.terminate(); throw error; }
  }

  async exec(args: string[], timeout = -1): Promise<number> { return Number(await this.send('EXEC', { args, timeout })); }
  async writeFile(path: string, data: Uint8Array): Promise<boolean> {
    const bytes = Uint8Array.from(data);
    return Boolean(await this.send('WRITE_FILE', { path, data: bytes }, [bytes.buffer]));
  }
  async readFile(path: string, encoding: 'binary' | 'utf8' = 'binary'): Promise<Uint8Array | string> {
    return await this.send('READ_FILE', { path, encoding }) as Uint8Array | string;
  }
  async deleteFile(path: string): Promise<boolean> { return Boolean(await this.send('DELETE_FILE', { path })); }

  terminate() {
    for (const waiter of this.waiters.values()) waiter.reject(new Error('FFmpeg worker terminated.'));
    this.waiters.clear();
    this.worker?.terminate();
    this.worker = null;
    this.loaded = false;
  }
}
