// ============================================================
//  MESSAGES
// ============================================================
import { CFG } from '../config.js';

let msgContainer = null;

export function initMessages(containerEl) {
  msgContainer = containerEl || document.getElementById('messages');
}

export function addMessage(text, cls = '') {
  if (!msgContainer) return;
  const el = document.createElement('div');
  el.className = 'msg ' + cls;
  el.textContent = text;
  msgContainer.prepend(el);
  // Trim old messages
  while (msgContainer.children.length > CFG.maxMessages) {
    msgContainer.lastChild.remove();
  }
  setTimeout(() => el.classList.add('fading'), CFG.messageDuration);
  setTimeout(() => el.remove(), CFG.messageDuration + 600);
}
