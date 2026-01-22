# Collaborative Drawing Canvas

![Node.js](https://img.shields.io/badge/Node.js-18.x-green.svg)
![Socket.io](https://img.shields.io/badge/Socket.io-4.x-black.svg)
![License](https://img.shields.io/badge/license-MIT-blue.svg)
![CI](https://github.com/kashishshar/collaborative-canvas/actions/workflows/node-ci.yml/badge.svg)



A real-time, multi-user whiteboard application built with **Node.js**, **Socket.io**, and the native **HTML5 Canvas API**. 

It features synchronized drawing, live user cursors, and a complex **per-user undo/redo** system that maintains global state consistency.

###  [Live Demo](https://collaborative-canvas-kashishshar.onrender.com)


---

## Features

* **Real-time Collaboration:** See strokes from other users instantly as they draw.
* **Global Synchronization:** Every user sees the exact same board state.
* **Per-User Undo/Redo:** Users can undo *their own* actions without removing the work of others, while maintaining a consistent history for everyone.
* **Live Presence:** See other users' cursors moving in real-time.
* **Dynamic Tools:** Change brush color, size, or switch to eraser.
* **Smooth Rendering:** Uses Quadratic Curve interpolation for smooth, organic lines (not jagged polygon lines).

## Tech Stack

* **Backend:** Node.js, Express
* **Real-time Engine:** Socket.io (WebSockets)
* **Frontend:** Vanilla JavaScript (ES6+)
* **Graphics:** HTML5 Canvas API (2D Context)
* **Deployment:** Compatible with Render, Heroku, or Railway.

## Getting Started

### Prerequisites
* Node.js (v14 or higher)
* npm (Node Package Manager)

### Installation

1.  **Clone the repository**
    ```bash
    git clone (https://github.com/kashishshar/collaborative-canvas.git)
    cd collaborative-canvas
    ```

2.  **Install dependencies**
    ```bash
    npm install
    ```

3.  **Start the server**
    ```bash
    npm start
    ```

4.  **Open the application**
    Visit `http://localhost:3000` in your browser. Open it in a second tab (or an Incognito window) to test the collaborative features.

## Architecture Overview

This application follows a **Server-Authoritative** model for history state, but uses a **Client-Optimistic** approach for real-time drawing to ensure zero latency.

1.  **Event Loop:**
    * **Draw:** Client emits `draw_point` events.
    * **Broadcast:** Server relays points to all other clients immediately.
    * **Commit:** On `end_stroke`, the server saves the stroke to a global `history` array and broadcasts a sync event.

2.  **Undo/Redo Logic:**
    * The server tracks which stroke belongs to which user.
    * When a user clicks "Undo", the server scans history *backwards* to find that specific user's last action, removes it, and triggers a global re-render.

## Deployment

This project is set up for easy deployment on **Render**.

## 📄 License 
This project is licensed under the MIT License - see the LICENSE file for details.
