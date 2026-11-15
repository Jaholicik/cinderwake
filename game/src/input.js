// Keyboard and mouse state for CINDERWAKE. The game reads this, never the
// DOM events directly, so the loop and the screenshot hooks can drive the
// same input path.

import { VIEW } from './config.js';

export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.keys = new Set();
    this.mouseX = VIEW.w / 2;
    this.mouseY = VIEW.h / 2 - 160;
    this.mouseDown = false;
    this.pressed = new Set(); // keys pressed since last poll, for one-shot actions
    this.clicked = false; // mouse button pressed since last poll
    this._attach();
  }

  _attach() {
    window.addEventListener('keydown', (event) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) {
        event.preventDefault();
      }
      if (!event.repeat) this.pressed.add(event.code);
      this.keys.add(event.code);
    });
    window.addEventListener('keyup', (event) => this.keys.delete(event.code));
    window.addEventListener('blur', () => {
      this.keys.clear();
      this.mouseDown = false;
    });
    this.canvas.addEventListener('mousemove', (event) => {
      const rect = this.canvas.getBoundingClientRect();
      this.mouseX = ((event.clientX - rect.left) / rect.width) * VIEW.w;
      this.mouseY = ((event.clientY - rect.top) / rect.height) * VIEW.h;
    });
    this.canvas.addEventListener('mousedown', (event) => {
      if (event.button === 0) {
        this.mouseDown = true;
        this.clicked = true;
        this._updateMouse(event);
      }
    });
    window.addEventListener('mouseup', (event) => {
      if (event.button === 0) this.mouseDown = false;
    });
    this.canvas.addEventListener('contextmenu', (event) => event.preventDefault());
  }

  _updateMouse(event) {
    const rect = this.canvas.getBoundingClientRect();
    this.mouseX = ((event.clientX - rect.left) / rect.width) * VIEW.w;
    this.mouseY = ((event.clientY - rect.top) / rect.height) * VIEW.h;
  }

  down(...codes) {
    return codes.some((code) => this.keys.has(code));
  }

  // True once for a key pressed since the last endFrame() call.
  wasPressed(...codes) {
    return codes.some((code) => this.pressed.has(code));
  }

  wasClicked() {
    return this.clicked;
  }

  // Drive the mouse from code (screenshot hooks / play tests).
  setMouse(x, y, down = false) {
    this.mouseX = x;
    this.mouseY = y;
    this.mouseDown = down;
  }

  endFrame() {
    this.pressed.clear();
    this.clicked = false;
  }
}
