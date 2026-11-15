const tabs = [...document.querySelectorAll('[data-model-tab]')];
const bodyPanel = document.getElementById('body-panel');
const dentalPanel = document.getElementById('dental-panel');
const dentalFrame = document.getElementById('dental-model');

function tellDentalVisibility() {
  if (!dentalFrame.hasAttribute('src')) return;
  dentalFrame.contentWindow?.postMessage({
    type: 'volunteerthing:model-visibility',
    visible: !dentalPanel.hidden && !document.hidden,
  }, window.location.origin);
}

function selectModel(model, focus = false) {
  const dental = model === 'dental';
  bodyPanel.hidden = dental;
  dentalPanel.hidden = !dental;
  for (const tab of tabs) {
    const selected = tab.dataset.modelTab === model;
    tab.setAttribute('aria-selected', String(selected));
    tab.tabIndex = selected ? 0 : -1;
    if (selected && focus) tab.focus();
  }
  // Load the dental viewer once; retaining both panels preserves their annotations.
  if (dental && !dentalFrame.hasAttribute('src')) {
    dentalFrame.src = dentalFrame.dataset.src;
  }
  tellDentalVisibility();
}

for (const tab of tabs) {
  tab.addEventListener('click', () => selectModel(tab.dataset.modelTab));
  tab.addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const index = tabs.indexOf(tab);
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1
      : (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
    selectModel(tabs[next].dataset.modelTab, true);
  });
}
dentalFrame.addEventListener('load', tellDentalVisibility);
document.addEventListener('visibilitychange', tellDentalVisibility);
