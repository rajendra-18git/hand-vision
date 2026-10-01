/**
 * Undo / Redo Manager for canvas strokes
 */
export class UndoManager {
  constructor(maxHistory = 30) {
    this.history = [];
    this.redoStack = [];
    this.maxHistory = maxHistory;
    this.listeners = new Set();
  }

  push(stroke) {
    this.history.push(stroke);
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }
    this.redoStack = [];
    this.notify();
  }

  undo() {
    if (this.history.length === 0) return null;
    const undone = this.history.pop();
    this.redoStack.push(undone);
    this.notify();
    return undone;
  }

  redo() {
    if (this.redoStack.length === 0) return null;
    const redone = this.redoStack.pop();
    this.history.push(redone);
    this.notify();
    return redone;
  }

  clear() {
    if (this.history.length === 0) return;
    this.history = [];
    this.redoStack = [];
    this.notify();
  }

  getStrokes() {
    return this.history;
  }

  canUndo() {
    return this.history.length > 0;
  }

  canRedo() {
    return this.redoStack.length > 0;
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify() {
    for (const listener of this.listeners) {
      listener({
        canUndo: this.canUndo(),
        canRedo: this.canRedo(),
        count: this.history.length
      });
    }
  }
}
