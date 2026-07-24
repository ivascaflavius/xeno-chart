import { el } from './dom.js';

export function showModal({ title, body, buttons = [] }) {
  const openedAt = performance.now();
  // A tap that opens this modal (e.g. a starmap marker) can leave a trailing
  // synthetic "click" in flight — on touch devices the browser dispatches it
  // just after pointerup, targeting whatever now sits at those same screen
  // coordinates. If a modal button lands there (easily happens when the
  // modal's content is short), that ghost click fires it immediately,
  // skipping the review the modal exists to provide. Swallowing clicks in
  // the first instant after mount is imperceptible to a real tap but eats
  // the ghost one.
  const GHOST_CLICK_GUARD_MS = 350;

  function close() {
    overlay.remove();
  }

  const bodyNode = typeof body === 'string' ? el('p', { className: 'subtitle', text: body }) : body;

  const btnRow = el('div', { className: 'row' }, buttons.map((btnDef) => el('button', {
    className: btnDef.className || 'btn',
    text: btnDef.label,
    disabled: btnDef.disabled,
    onClick: () => {
      if (performance.now() - openedAt < GHOST_CLICK_GUARD_MS) return;
      btnDef.onClick?.(close);
      if (btnDef.closeOnClick !== false) close();
    },
  })));

  const modal = el('div', { className: 'modal stack' }, [
    title ? el('p', { className: 'title', text: title }) : null,
    bodyNode,
    btnRow,
  ]);

  const overlay = el('div', { className: 'modal-overlay' }, [modal]);
  document.body.appendChild(overlay);
  return { close };
}

export function confirmModal({ title, body, confirmLabel = 'Confirm', cancelLabel = 'Cancel', onConfirm }) {
  return showModal({
    title,
    body,
    buttons: [
      { label: cancelLabel, className: 'btn' },
      { label: confirmLabel, className: 'btn btn-danger', onClick: onConfirm },
    ],
  });
}
