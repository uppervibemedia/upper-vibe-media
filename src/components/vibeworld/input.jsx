export function setupInputListeners(canvas, animationState, onRemoteAvatarClick) {
    const onDown = (e) => {
      if (e.target === canvas) {
        animationState.mouse.down = true;
        animationState.mouse.button = e.button;
      }
    };
    const onUp = () => { animationState.mouse.down = false; animationState.mouse.button = 0; };
    const onMove = (e) => {
      if (animationState.mouse.down) {
        animationState.mouse.dx += e.movementX;
        animationState.mouse.dy += e.movementY;
      }
    };
    const onContext = (e) => {
      if (e.target === canvas) e.preventDefault();
    };

    window.addEventListener("mousedown", onDown);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("contextmenu", onContext);

    const onKeyDown = (e) => { animationState.keys[e.key.toLowerCase()] = true; };
    const onKeyUp = (e) => { animationState.keys[e.key.toLowerCase()] = false; };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    const handleClick = (e) => {
        // Raycasting logic for remote avatar clicks
    };
    canvas.addEventListener("click", handleClick);

    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("contextmenu", onContext);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      canvas.removeEventListener("click", handleClick);
    };
}