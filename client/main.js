import { CanvasManager } from './canvas.js';
import { SocketClient } from './socket.js';

const canvasEl = document.getElementById('drawingCanvas');
const canvasManager = new CanvasManager(canvasEl);

// State
let isDrawing = false;
let currentTool = 'brush';
let currentColor = '#000000';
let currentSize = 5;

// UI Helpers
const uiHandler = (type, value) => {
  if (type === 'userCount') document.getElementById('userCount').innerText = value;
  if (type === 'setColor') {
      currentColor = value;
      document.getElementById('colorPicker').value = value;
  }
};

const socket = new SocketClient(canvasManager, uiHandler);

// --- Input Handling ---

// 1. Mouse/Touch Events
const getPos = (e) => {
  // Normalize touch and mouse coordinates
  const rect = canvasEl.getBoundingClientRect();
  const clientX = e.touches ? e.touches[0].clientX : e.clientX;
  const clientY = e.touches ? e.touches[0].clientY : e.clientY;
  return {
    x: clientX - rect.left,
    y: clientY - rect.top
  };
};

const startDrawing = (e) => {
  e.preventDefault(); // Prevent scrolling on touch
  isDrawing = true;
  const { x, y } = getPos(e);
  
  // Create local stroke immediately for low latency feeling
  const stroke = {
    points: [{x, y}],
    color: currentColor,
    size: currentSize,
    type: currentTool
  };
  
  // We utilize the same "remote" pipeline for local drawing 
  // to ensure consistency, but store it as "local" ID temporarily
  canvasManager.startRemoteStroke('local', stroke);
  
  // Send to server
  socket.emitStart({ x, y, color: currentColor, size: currentSize, type: currentTool });
};

const draw = (e) => {
  const { x, y } = getPos(e);
  
  // Always emit cursor even if not drawing
  socket.emitCursor(x, y);

  if (!isDrawing) return;
  e.preventDefault();
  
  // Update local visual immediately
  canvasManager.updateRemoteStroke('local', x, y);
  
  // Throttle could be added here, but direct emit is smoother for LAN/low-latency
  socket.emitPoint(x, y);
};

const stopDrawing = () => {
  if (!isDrawing) return;
  isDrawing = false;
  
  canvasManager.endRemoteStroke('local');
  socket.emitEnd();
};

// Listeners
canvasEl.addEventListener('mousedown', startDrawing);
canvasEl.addEventListener('mousemove', draw);
canvasEl.addEventListener('mouseup', stopDrawing);
canvasEl.addEventListener('mouseout', stopDrawing);

// Touch support (Bonus)
canvasEl.addEventListener('touchstart', startDrawing);
canvasEl.addEventListener('touchmove', draw);
canvasEl.addEventListener('touchend', stopDrawing);

// 2. Toolbar Interaction
document.getElementById('colorPicker').addEventListener('change', (e) => currentColor = e.target.value);
document.getElementById('brushSize').addEventListener('input', (e) => currentSize = parseInt(e.target.value));

document.getElementById('btnBrush').addEventListener('click', (e) => {
  currentTool = 'brush';
  e.target.classList.add('active');
  document.getElementById('btnEraser').classList.remove('active');
});

document.getElementById('btnEraser').addEventListener('click', (e) => {
  currentTool = 'eraser';
  e.target.classList.add('active');
  document.getElementById('btnBrush').classList.remove('active');
});

document.getElementById('btnUndo').addEventListener('click', () => socket.emitUndo());
document.getElementById('btnRedo').addEventListener('click', () => socket.emitRedo());