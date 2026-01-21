# Collaborative Drawing Canvas

A real-time, multi-user drawing application using Node.js, Socket.io, and the HTML5 Canvas API.

## Features
* **Real-time Sync:** See strokes as they are drawn.
* **Global Undo/Redo:** Collaborative state management.
* **User Presence:** Real-time cursors and user count.
* **Tools:** Brush, Eraser, Dynamic sizing & Colors.

## Quick Start

1.  **Install Dependencies:**
    ```bash
    npm install
    ```

2.  **Start Server:**
    ```bash
    npm start
    ```

3.  **Open Client:**
    Visit `http://localhost:3000` in multiple browser tabs.

## Known Limitations
* **Performance:** With extremely long sessions (10k+ strokes), the full-redraw strategy will slow down. Implementing chunking or off-screen bitmaps would solve this.
* **Latency:** Drawing events are 1:1 with network packets. On very poor networks, adding event batching (sending every 100ms) would improve bandwidth usage.