/**
 * socket.js
 * Handles all network communication.
 */
export class SocketClient {
  constructor(canvasManager, uiCallback) {
    this.socket = io();
    this.canvas = canvasManager;
    this.uiCallback = uiCallback; // Update user count, etc.
    
    this.setupListeners();
  }

  setupListeners() {
    // Init: Receive current state when joining
    this.socket.on('init', (data) => {
      this.canvas.setHistory(data.history);
      this.myId = data.id;
      this.myColor = data.color; // Assigned by server
      this.uiCallback('setColor', data.color);
    });

    // History Update (happens on End Stroke, Undo, Redo)
    this.socket.on('history_update', (history) => {
      this.canvas.setHistory(history);
    });

    // Remote User Actions
    this.socket.on('remote_start', ({ id, stroke }) => {
      this.canvas.startRemoteStroke(id, stroke);
    });

    this.socket.on('remote_point', ({ id, x, y }) => {
      this.canvas.updateRemoteStroke(id, x, y);
    });

    // Remote cursors
    this.socket.on('remote_cursor', ({ id, x, y }) => {
      // We look up color in the user map, managed below
      const user = this.users?.find(u => u[0] === id);
      const color = user ? user[1].color : 'black';
      this.canvas.updateRemoteCursor(id, x, y, color);
    });

    // User Management
    this.socket.on('user_update', (users) => {
      this.users = users; // Array of [id, data]
      this.uiCallback('userCount', users.length);
    });
  }

  // Emitters
  emitStart(strokeData) { this.socket.emit('start_stroke', strokeData); }
  emitPoint(x, y) { this.socket.emit('draw_point', { x, y }); }
  emitEnd() { this.socket.emit('end_stroke'); }
  emitCursor(x, y) { this.socket.emit('cursor_move', { x, y }); }
  emitUndo() { this.socket.emit('undo'); }
  emitRedo() { this.socket.emit('redo'); }
}