// Simple in-app dev logger that buffers console output for viewing in a DevTools overlay
// Only active in development builds

type LogLevel = 'log' | 'info' | 'warn' | 'error';

export interface DevLogEntry {
  level: LogLevel;
  message: string;
  args: any[];
  timestamp: number;
}

class DevLogger {
  private buffer: DevLogEntry[] = [];
  private max = 500;
  private attached = false;
  private original: Partial<Record<LogLevel, any>> = {};

  attach() {
    if (this.attached || !__DEV__) return;
    this.attached = true;

    (['log', 'info', 'warn', 'error'] as LogLevel[]).forEach((lvl) => {
      this.original[lvl] = console[lvl];
      console[lvl] = ((...args: any[]) => {
        try {
          const entry: DevLogEntry = {
            level: lvl,
            message: this.toMessage(args),
            args,
            timestamp: Date.now(),
          };
          this.buffer.push(entry);
          if (this.buffer.length > this.max) this.buffer.shift();
        } catch {}
        // Call original logger
        this.original[lvl]?.apply(console, args as any);
      }) as any;
    });
  }

  detach() {
    if (!this.attached) return;
    (['log', 'info', 'warn', 'error'] as LogLevel[]).forEach((lvl) => {
      if (this.original[lvl]) console[lvl] = this.original[lvl]!;
    });
    this.attached = false;
  }

  clear() {
    this.buffer = [];
  }

  getLogs(limit = 200): DevLogEntry[] {
    return this.buffer.slice(-limit);
  }

  private toMessage(args: any[]): string {
    try {
      return args
        .map((a) => (typeof a === 'string' ? a : JSON.stringify(a, null, 2)))
        .join(' ');
    } catch {
      return args.map(String).join(' ');
    }
  }
}

export const devLogger = new DevLogger();
