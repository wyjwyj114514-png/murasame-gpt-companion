// Reuse the MIT upstream DSH classic frame already rendered by the widget.
(() => {
  'use strict';
  let timeout = null, timedCard = null;
  function cancel(card) {
    if (card && card !== timedCard) return;
    if (timeout !== null) clearTimeout(timeout);
    timeout = null; timedCard = null;
  }
  function arm(card) {
    if (!card?.isConnected) return;
    cancel(); timedCard = card;
    const seconds = window.MurasameBubbleTimer?.seconds ?? 8;
    if (seconds > 0) timeout = setTimeout(() => {
      if (timedCard !== card) return;
      cancel();
      if (card.isConnected) window.WhaleAccountView?.close();
    }, seconds * 1000);
  }
  window.addEventListener('murasame-bubble-timeout-changed', () => { if (timedCard?.isConnected) arm(timedCard); });
  window.MurasameQuotaBubble = {
    arm, cancel,
    position(card, anchorRoot) {
      const root = anchorRoot?.matches?.('.dshwv-root') ? anchorRoot : document.querySelector('.dshwv-root');
      const pop = root?.querySelector('.dshwv-pop');
      if (!pop) return false;
      // Use the widget's own bubble bounds, so scaling, dragging and flipping
      // match DSH instead of treating the card as an unrelated floating panel.
      const rect = pop.getBoundingClientRect();
      const width = Math.min(rect.width, Math.max(1, innerWidth - 16), Math.max(1, innerHeight - 16) * 1026 / 700);
      const height = width * 700 / 1026;
      const left = Math.max(8, Math.min(innerWidth - width - 8, rect.left));
      const top = Math.max(8, Math.min(innerHeight - height - 8, rect.top));
      for (const [key, value] of Object.entries({width:width+'px',left:left+'px',top:top+'px'})) {
        if (card.style[key] !== value) card.style[key] = value;
      }
      card.classList.toggle('murasame-quota-mirrored', root.classList.contains('dshwv-left'));
      return true;
    },
    mount(card) {
      const svg = document.querySelector('.dshwv-pop svg');
      if (!svg) return;
      const frame = svg.cloneNode(true);
      for (const node of [frame, ...frame.querySelectorAll('*')]) {
        node.removeAttribute('class'); node.removeAttribute('style'); node.removeAttribute('id');
      }
      frame.classList.add('murasame-quota-frame');
      frame.setAttribute('aria-hidden', 'true');
      const panel = document.createElement('div'); panel.className = 'murasame-quota-panel';
      while (card.firstChild) panel.append(card.firstChild);
      card.classList.add('murasame-quota-bubble'); card.append(frame, panel);
      panel.addEventListener('click', () => arm(card));
    }
  };
})();
