# Collaborative Canvas Architecture

## 1. Data Flow & Synchronization

The application uses a **Server-Authoritative** model for history state, but a **Client-Optimistic** model for real-time drawing.

### The Event Loop:
1.  **Start:** User A clicks. Client creates a temporary "local" stroke and immediately renders it (Zero Latency). Simultaneously emits `start_stroke` to Server.
2.  **Draw:** User A moves mouse. Client updates "local" stroke. Emits `draw_point` (stream of coordinates).
3.  **Broadcast:** Server relays these events to User B. User B's client adds them to `activeStrokes` map and renders them in the next animation frame.
4.  **End:** User A releases mouse. Emits `end_stroke`.
5.  **Commit:** Server moves stroke from `activeStrokes` to `history` array. Server clears `redoStack` (breaking future history). Server broadcasts `history_update`.
6.  **Sync:** Clients receive `history_update`, replace their local history, and trigger a full re-render.

## 2. Global Undo/Redo Strategy

Undo/Redo in a multi-user environment is complex. We chose a **Global Linear History** approach.

* **Logic:** The server maintains a global array of stroke objects (`history`).
* **Undo:** Removes the last element of `history` and pushes it to `redoStack`. Broadcasts new history.
* **Redo:** Pops `redoStack` and pushes back to `history`.
* **Conflict Resolution:** If User A draws, User B draws, and User A clicks Undo, User B's stroke is removed. This is the intended behavior for "Global" undo.
* **Edge Case:** If User A Undoes, then User B draws a new line, the `redoStack` is cleared. You cannot redo a timeline that has been overwritten.

## 3. Canvas Optimization

We avoid utilizing heavy Canvas libraries to demonstrate raw API mastery.

* **Quadratic Curves:** Instead of `lineTo` connecting raw mouse points (which results in jagged, robotic lines), we use `quadraticCurveTo` using the midpoint between captured events as control points. This creates organic, smooth strokes.
* **Render Loop:** We use `requestAnimationFrame` and a clear-redraw strategy.
    * *Trade-off:* Clearing the whole canvas every frame becomes expensive with thousands of strokes.
    * *Next Step:* A production version would use an **Off-screen Canvas** to cache the static history, only redrawing the active strokes on the main canvas.

## 4. WebSocket Protocol

| Event | Payload | Purpose |
| :--- | :--- | :--- |
| `init` | `{ history, id, color }` | Initial state load |
| `start_stroke` | `{ color, size, type }` | Begin drawing |
| `draw_point` | `{ x, y }` | Stream coordinates |
| `history_update` | `[Stroke, Stroke...]` | Sync source of truth |
| `cursor_move` | `{ x, y }` | Visual user presence |