/**
 * Global Web Audio context — created once, never destroyed.
 * The MediaElementSourceNode is created once per audio element and cached here.
 * Visualizers may connect/disconnect their own AnalyserNodes freely.
 */

let _audioCtx = null;
let _sourceNode = null;

export function getOrCreateAudioContext(audioElement) {
  // Already set up — just resume if suspended
  if (_audioCtx && _sourceNode) {
    if (_audioCtx.state === "suspended") _audioCtx.resume();
    return { audioCtx: _audioCtx, sourceNode: _sourceNode };
  }

  try {
    _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    // createMediaElementSource can only be called ONCE per audio element
    _sourceNode = _audioCtx.createMediaElementSource(audioElement);
    // Always wire source → speakers so audio is audible
    _sourceNode.connect(_audioCtx.destination);
    if (_audioCtx.state === "suspended") _audioCtx.resume();
  } catch (e) {
    console.warn("[audioContext] setup failed:", e);
    _audioCtx = null;
    _sourceNode = null;
  }

  return { audioCtx: _audioCtx, sourceNode: _sourceNode };
}

export function resumeAudioContext() {
  if (_audioCtx?.state === "suspended") _audioCtx.resume();
}