// We never remove items from here, only mark them as hidden.
const history = []; 

// Map<SocketID, Array<StrokeID>>
// Tracks which strokes a specific user has undone (so they can redo them).
const userRedoStacks = new Map();

// Map<SocketID, Stroke>
const activeStrokes = new Map();

const users = new Map();

module.exports = {
  history,
  userRedoStacks,
  activeStrokes,
  users
};
