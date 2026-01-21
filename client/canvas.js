/**
 * canvas.js
 * Encapsulates all drawing logic.
 */
export class CanvasManager {
  constructor(canvasElement) {
    this.canvas = canvasElement;
    this.ctx = this.canvas.getContext('2d', { alpha: false }); // Optimize for non-transparent background
    
    // State
    this.history = []; // Completed strokes
    this.activeStrokes = new Map(); // Remote users drawing NOW
    this.cursors = new Map(); // Remote cursors
    
    // Viewport management
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    // Handle High DPI displays (Retina) for crisp lines
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = window.innerWidth * dpr;
    this.canvas.height = window.innerHeight * dpr;
    this.canvas.style.width = `${window.innerWidth}px`;
    this.canvas.style.height = `${window.innerHeight}px`;
    
    this.ctx.scale(dpr, dpr);
    this.ctx.lineCap = 'round'; // Smooth line endings
    this.ctx.lineJoin = 'round'; // Smooth corners
    
    // Force a redraw after resize
    this.render(); 
  }

  // --- Core Drawing Primitives ---

  /**
   * Draws a single path based on a set of points.
   * We use Quadratic curves for smoothing, rather than straight lines.
   */
  drawStroke(stroke) {
    const { points, color, size, type } = stroke;
    if (points.length < 2) return;

    this.ctx.beginPath();
    this.ctx.strokeStyle = type === 'eraser' ? '#ffffff' : color;
    this.ctx.lineWidth = size;

    // Start at the first point
    this.ctx.moveTo(points[0].x, points[0].y);

    // Smooth curve strategy:
    // Draw to the midpoint between current and next point
    for (let i = 1; i < points.length - 1; i++) {
      const p1 = points[i];
      const p2 = points[i + 1];
      const midPoint = {
        x: (p1.x + p2.x) / 2,
        y: (p1.y + p2.y) / 2
      };
      this.ctx.quadraticCurveTo(p1.x, p1.y, midPoint.x, midPoint.y);
    }

    // Connect the last point specifically
    const lastPoint = points[points.length - 1];
    this.ctx.lineTo(lastPoint.x, lastPoint.y);
    
    this.ctx.stroke();
  }

  // --- Rendering Loop ---

  /**
   * Clears and redraws everything.
   * Optimization: In a real app, we would cache the 'history' to an offscreen canvas
   * and only redraw the 'activeStrokes' every frame.
   */
  render() {
    // 1. Clear Screen
    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // 2. Draw Committed History
    this.history.forEach(stroke => {
      // FILTER: Only draw if NOT hidden
      if (!stroke.isHidden) {
        this.drawStroke(stroke);
      }
    });

    // 3. Draw Active Strokes (Real-time)
    this.activeStrokes.forEach(stroke => this.drawStroke(stroke));

    // 4. Draw Cursors (User Indicators)
    this.cursors.forEach((pos, id) => {
      this.ctx.fillStyle = pos.color || 'black';
      this.ctx.beginPath();
      this.ctx.arc(pos.x, pos.y, 5, 0, Math.PI * 2); // Simple circle cursor
      this.ctx.fill();
      
      // Add text label
      this.ctx.font = '10px Arial';
      this.ctx.fillText(id.substr(0, 4), pos.x + 8, pos.y);
    });
  }

  // --- State Updates ---

  setHistory(newHistory) {
    this.history = newHistory;
    requestAnimationFrame(() => this.render());
  }

  updateRemoteCursor(id, x, y, color) {
    this.cursors.set(id, { x, y, color });
    requestAnimationFrame(() => this.render());
  }

  startRemoteStroke(id, stroke) {
    this.activeStrokes.set(id, stroke);
  }

  updateRemoteStroke(id, x, y) {
    const stroke = this.activeStrokes.get(id);
    if (stroke) {
      stroke.points.push({ x, y });
      requestAnimationFrame(() => this.render());
    }
  }

  endRemoteStroke(id) {
    // When a remote user finishes, we don't add to history here.
    // We wait for the server 'history_update' event to ensure synchronization.
    this.activeStrokes.delete(id);
    requestAnimationFrame(() => this.render());
  }
}