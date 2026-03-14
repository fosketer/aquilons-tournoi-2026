// js/lib/polling.js
// Centralized polling coordinator with Visibility API integration.

class PollingCoordinator {
  constructor() {
    this.intervals = new Map(); // name → intervalId
    this.fns = new Map(); // name → { fn, interval }
    this.paused = false;

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.paused = true;
      } else {
        this.paused = false;
      }
    });
  }

  schedule(name, fn, interval) {
    if (this.intervals.has(name)) {
      console.warn(`[Polling] "${name}" already scheduled, skipping`);
      return;
    }

    const id = setInterval(() => {
      if (!this.paused) {
        fn();
      }
    }, interval);

    this.intervals.set(name, id);
    this.fns.set(name, { fn, interval });
  }

  cancel(name) {
    const id = this.intervals.get(name);
    if (id !== undefined) {
      clearInterval(id);
      this.intervals.delete(name);
      this.fns.delete(name);
    }
  }

  cancelAll() {
    for (const [name, id] of this.intervals) {
      clearInterval(id);
    }
    this.intervals.clear();
    this.fns.clear();
  }
}

export const polling = new PollingCoordinator();
