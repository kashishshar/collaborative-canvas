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
      stroke.isHidden = false;
      state.history.push(stroke);
      state.activeStrokes.delete(socket.id);
      
      // CRITICAL: Clear redo stack because a new action was taken
      state.userRedoStacks.set(socket.id, []);
      
      // 1. Tell everyone to remove this specific stroke from "Active/Pending"
      // This fixes the "Ghost Line" bug on Tab 1
      io.emit('remote_end', socket.id); 

      // 2. Send the new history to permanent storage
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

  // 4. Per-User Undo/Redo Logic
  socket.on('undo', () => {
    // 1. Find the MOST RECENT stroke by THIS user
    let matchIndex = -1;
    for (let i = state.history.length - 1; i >= 0; i--) {
      if (state.history[i].userId === socket.id) {
        matchIndex = i;
        break;
      }
    }

    if (matchIndex !== -1) {
      // 2. Remove it from history (Splice is safe here)
      const removedStroke = state.history.splice(matchIndex, 1)[0];
      
      // 3. Add to user's private redo stack
      if (!state.userRedoStacks.has(socket.id)) {
        state.userRedoStacks.set(socket.id, []);
      }
      state.userRedoStacks.get(socket.id).push(removedStroke);

      // 4. Broadcast global update
      io.emit('history_update', state.history);
    }
  });

  socket.on('redo', () => {
    const userStack = state.userRedoStacks.get(socket.id);

    if (userStack && userStack.length > 0) {
      // 1. Get the last undone stroke
      const strokeRestored = userStack.pop();
      
      // 2. Push it back to history. 
      // NOTE: In a shared whiteboard, "Redo" usually puts the line 
      // on top (newest layer) rather than inserting it back in the middle.
      // This prevents complex z-index issues.
      state.history.push(strokeRestored);

      // 3. Broadcast global update
      io.emit('history_update', state.history);
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
