// ============================================================
//  PANEL MANAGER — slide-in sidebar panels
// ============================================================
import { Input } from '../engine/input.js';
import { isTouchDevice } from './touch.js';

let activePanel = null;
const panels = {};

/**
 * Register a panel element by name.
 */
export function registerPanel(name, element) {
  panels[name] = element;

  // Wire up close button
  const closeBtn = element.querySelector('.panel-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      closePanel();
    });
    closeBtn.addEventListener('touchend', (e) => {
      e.preventDefault();
      e.stopPropagation();
      closePanel();
    });
  }
}

/**
 * Open a panel by name. Closes any currently open panel first.
 */
export function openPanel(name) {
  if (!panels[name]) return;
  closePanel();
  activePanel = name;
  panels[name].classList.add('panel-open');
  // Release pointer lock and show cursor on desktop
  if (!isTouchDevice() && document.pointerLockElement) {
    document.exitPointerLock();
  }
}

/**
 * Close the currently open panel.
 */
export function closePanel() {
  if (activePanel && panels[activePanel]) {
    panels[activePanel].classList.remove('panel-open');
  }
  activePanel = null;
}

/**
 * Toggle a panel open/closed.
 */
export function togglePanel(name) {
  if (activePanel === name) {
    closePanel();
  } else {
    openPanel(name);
  }
}

/**
 * Returns true if any panel is currently open.
 */
export function isAnyPanelOpen() {
  return activePanel !== null;
}

/**
 * Returns the name of the active panel, or null.
 */
export function getActivePanel() {
  return activePanel;
}
