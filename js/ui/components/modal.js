import { el } from './dom.js';

export function showModal({ title, body, buttons = [] }) {
  function close() {
    overlay.remove();
  }

  const bodyNode = typeof body === 'string' ? el('p', { className: 'subtitle', text: body }) : body;

  const btnRow = el('div', { className: 'row' }, buttons.map((btnDef) => el('button', {
    className: btnDef.className || 'btn',
    text: btnDef.label,
    disabled: btnDef.disabled,
    onClick: () => {
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
