const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const state = require('./state'); // Import our state manager

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve static files from the client directory
app.use(express.static(path.join(__dirname, '../client')));

// WebSocket Connection Handling
io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  // 1. Initialize Client State
  // Assign a random color to the new user
  const userColor = '#' + Math.floor(Math.random()*16777215).toString(16);
  state.users.set(socket.id, { color: userColor, x: 0, y: 0 });

  // Send the current history to the *new* user only so they catch up
  socket.emit('init', {
    history: state.history,
    id: socket.id,
    color: userColor
  });

  // Broadcast to everyone that a new user joined (for cursor list)
  io.emit('user_update', Array.from(state.users.entries()));

  // 2. Handle Drawing Events

  // Initialize their personal redo stack
  state.userRedoStacks.set(socket.id, []);
  
  // User starts a stroke
  socket.on('start_stroke', (data) => {
    // Create a new stroke entry in memory
    const stroke = {
      id: Date.now() + Math.random(), // Unique ID
      userId: socket.id,
      points: [{ x: data.x, y: data.y }], // Start with first point
      color: data.color,
      size: data.size,
      type: data.type
    };
    
    // Save to active strokes
    state.activeStrokes.set(socket.id, stroke);
    
    // Broadcast "someone started drawing" to others
    socket.broadcast.emit('remote_start', { id: socket.id, stroke });
  });

  // User moves mouse while drawing
  socket.on('draw_point', (data) => {
    const stroke = state.activeStrokes.get(socket.id);
    if (stroke) {
      // Add point to server state
      stroke.points.push({ x: data.x, y: data.y });
      // Broadcast point to others so they see it in real-time
      socket.broadcast.emit('remote_point', { id: socket.id, x: data.x, y: data.y });
    }
  });

  // User finishes drawing
  socket.on('end_stroke', () => {
    const stroke = state.activeStrokes.get(socket.id);
    if (stroke) {
      stroke.isHidden = false; // Default visibility
      state.history.push(stroke);
      state.activeStrokes.delete(socket.id);
      
      // CRITICAL: If you draw something new, you break your Redo chain.
      // We clear ONLY this user's redo stack.
      state.userRedoStacks.set(socket.id, []);
      
      io.emit('history_update', state.history);
    }
  });

  // 3. Handle Cursor Movement (User Indicators)
  socket.on('cursor_move', (pos) => {
    const user = state.users.get(socket.id);
    if (user) {
      user.x = pos.x;
      user.y = pos.y;
      // Broadcast cursor only (volatile - okay to drop frames)
      socket.broadcast.emit('remote_cursor', { id: socket.id, x: pos.x, y: pos.y });
    }
  });

  // 4. Global Undo/Redo Logic
  socket.on('undo', () => {
    const myRedoStack = state.userRedoStacks.get(socket.id);
    
    // 1. Find the most recent stroke by THIS user that is NOT hidden
    // We iterate backwards through history
    let strokeToUndo = null;
    for (let i = state.history.length - 1; i >= 0; i--) {
      const stroke = state.history[i];
      if (stroke.userId === socket.id && !stroke.isHidden) {
        strokeToUndo = stroke;
        break;
      }
    }

    if (strokeToUndo) {
      // 2. Mark it as hidden (Soft Delete)
      strokeToUndo.isHidden = true;
      
      // 3. Add to user's redo stack so they can bring it back
      myRedoStack.push(strokeToUndo.id);
      
      // 4. Broadcast the change to EVERYONE (Syncs Tab 1 and Tab 2)
      io.emit('history_update', state.history);
    }
  });

  // --- PER-USER REDO ---
  socket.on('redo', () => {
    const myRedoStack = state.userRedoStacks.get(socket.id);
    
    if (myRedoStack && myRedoStack.length > 0) {
      // 1. Get the last stroke ID this user undid
      const strokeIdToRecover = myRedoStack.pop();
      
      // 2. Find it in the global history
      const stroke = state.history.find(s => s.id === strokeIdToRecover);
      
      if (stroke) {
        // 3. Make it visible again
        stroke.isHidden = false;
        io.emit('history_update', state.history);
      }
    }
  });

  // Cleanup
  socket.on('disconnect', () => {
    state.users.delete(socket.id);
    state.activeStrokes.delete(socket.id);
    io.emit('user_update', Array.from(state.users.entries()));
    console.log(`User disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));