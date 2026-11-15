import {activeModel,dental,setDentalReadOnly,notifyModelVisibility} from './model-switcher.js';
import {FIELDS,statementFor,escapeHTML} from './symptoms.js';
import {REGIONS,regionLabel,regionText} from './regions.js';
const $ = id => document.getElementById(id);
let messages = [], regions = [], ai = false, busy = false, step = 1, valid = false;
let reviewVersion = 0, summaryVersion = -1, manualDrawing = false, mapKey = null, mapJob = 0;
let lastUserBubble = null, interpretationFailed = false;
const details = Object.fromEntries(Object.keys(FIELDS).map(key => [key, '']));
const translations = [];
const notice = text => { $('notice').textContent = text; };
function locationLabels(){
  const body = regions.map(regionText);
  const teeth = (dental()?.getState().selections || []).map(s => `Tooth ${s.tooth} (${s.label})${s.includesGum ? ' and adjacent gum' : ''}`);
  return [...body,...teeth];
}
function updateModelCaption(){
  const isDental = activeModel() === 'dental';
  $('map-title').textContent = isDental ? 'Your dental map' : 'Your body map';
  $('map-caption').textContent = step === 3 ? 'Your reviewed markings. Drag to rotate.' : isDental ? 'Select a tooth, or include its adjacent gum.' : 'Paint what you feel. You’re in control.';
}
document.addEventListener('modelchange',updateModelCaption);
document.addEventListener('dentalchange',invalidate);

function painterRoot() { return $('painter').contentDocument?.getElementById('skin-paint'); }
function painter() { return painterRoot()?.skinPaint; }
function invalidate() {
  reviewVersion++;
  $('confirmed').checked = false;
  $('to-summary').disabled = true;
  updateNavigation();
}
function updateNavigation() {
  $('to-body').disabled = busy || !valid;
  document.querySelectorAll('[data-step]').forEach(button => {
    const next = +button.dataset.step;
    button.disabled = busy || next === 2 && !valid || next === 3 && (!valid || !$('confirmed').checked);
    if (next === step) button.setAttribute('aria-current', 'step');
    else button.removeAttribute('aria-current');
  });
}
for (const [key, label] of Object.entries(FIELDS)) {
  const wrap = document.createElement('label');
  wrap.textContent = label;
  const input = document.createElement('input');
  input.id = `field-${key}`;
  input.maxLength = 800;
  input.placeholder = 'Not specified';
  input.oninput = () => { details[key] = input.value; invalidate(); };
  wrap.append(input);
  $('fields').append(wrap);
}
for (const region of REGIONS) {
  const option = document.createElement('option');
  option.value = region;
  option.textContent = regionLabel(region);
  $('region').append(option);
}
function bubble(role, text) {
  const div = document.createElement('div');
  div.className = `message ${role}`;
  div.dir = 'auto';
  div.textContent = text;
  $('messages').append(div);
  $('messages').scrollTop = $('messages').scrollHeight;
  return div;
}
function showTranslation(text) {
  const disclosure = document.createElement('details');
  disclosure.className = 'message-translation';
  disclosure.open = true;
  const label = document.createElement('summary');
  label.textContent = 'English translation';
  const content = document.createElement('p');
  content.dir = 'ltr';
  content.textContent = text;
  disclosure.append(label, content);
  lastUserBubble?.append(disclosure);
}
function renderRegions() {
  $('regions').replaceChildren();
  regions.forEach((region, index) => {
    const button = document.createElement('button');
    button.textContent = `${regionText(region)} ×`;
    button.setAttribute('aria-label', `Remove ${regionText(region)}`);
    button.onclick = () => {
      regions.splice(index, 1);
      renderRegions();
      void syncMap();
    };
    $('regions').append(button);
  });
  invalidate();
}
function bindPainter() {
  const root = painterRoot();
  if (!root || root.dataset.flowBound) return;
  root.dataset.flowBound = 'true';
  root.addEventListener('paintchange', event => {
    if (event.detail.source !== 'automatic') {
      manualDrawing = true;
      invalidate();
    }
  });
  root.addEventListener('skinpaint-ready', () => {
    if (step !== 1) void syncMap();
  });
}
$('painter').addEventListener('load', bindPainter);
bindPainter();
async function syncMap(force = false) {
  if (step === 1) return;
  const key = JSON.stringify(regions);
  const job = ++mapJob;
  // A slow GLB load must not silently drop the first automatic annotation.
  for (let attempt = 0; !painter() && attempt < 150; attempt++) {
    if (painterRoot()?.dataset.error) break;
    $('map-status').textContent = 'Loading the body before adding your markings…';
    await new Promise(resolve => setTimeout(resolve, 100));
    if (job !== mapJob || step === 1) return;
    bindPainter();
  }
  const api = painter();
  if (!api) {
    $('map-status').textContent = 'Body model unavailable. Your location labels and statement are still usable. Reload to try the model again.';
    return;
  }
  api.setReadOnly(step === 3);
  if (!force && key === mapKey) return;
  if (!force && manualDrawing) {
    $('map-status').textContent = 'Your locations changed. Your hand-drawn corrections are kept. Choose “Replace drawing” to use the new suggested areas.';
    return;
  }
  const result = api.markRegions(regions);
  mapKey = key;
  manualDrawing = false;
  invalidate();
  $('map-status').textContent = result.missing.length
    ? `Could not mark ${result.missing.map(regionText).join(', ')}. Please paint those areas yourself.`
    : result.marked.length
      ? `${result.marked.length} area${result.marked.length === 1 ? '' : 's'} painted on the model. Check the side and exact position, then draw or erase to adjust.`
      : 'No specific body location reported. You can leave the model unmarked or draw a location yourself.';
}
function changeStep(next) {
  if (busy || next !== 1 && !valid || next === 3 && !$('confirmed').checked) return;
  step = next;
  notice('');
  for (const [id, visible] of Object.entries({conversation:next === 1, welcome:next === 1, details:next === 2, summary:next === 3, 'model-card':next !== 1})) $(id).hidden = !visible;
  $('page-title').textContent = ['', 'How are you feeling?', 'Let’s put a place to the feeling.', 'Your words, ready to be heard.'][next];
  $('page-subtitle').textContent = ['', 'Tell us what’s bothering you, in whatever language feels easiest.', 'Check the English description and the painted areas. Correct anything we missed.', 'Your own account, ready for a conversation with a clinician.'][next];
  $('map-caption').textContent = next === 3 ? 'Your reviewed markings. Drag to rotate.' : 'Paint what you feel. You’re in control.';
  updateModelCaption();
  setDentalReadOnly(next === 3);
  notifyModelVisibility();
  updateNavigation();
  if (next !== 1) void syncMap();
  window.scrollTo({top:0, behavior:'smooth'});
}
$('apply-marks').onclick = () => { void syncMap(true); };
$('add-region').onclick = () => {
  const region = {region:$('region').value, side:$('side').value, surface:$('surface').value};
  if (!regions.some(r => JSON.stringify(r) === JSON.stringify(region))) {
    regions.push(region);
    renderRegions();
    void syncMap();
  }
};
$('review-english').oninput = invalidate;
$('confirmed').onchange = () => {
  $('to-summary').disabled = !$('confirmed').checked;
  updateNavigation();
};
$('to-body').onclick = () => changeStep(2);
function showSummary() {
  if (!valid || !$('confirmed').checked) return;
  if (summaryVersion !== reviewVersion) {
    $('statement').value = $('review-english').value.trim() || statementFor(details, regions);
    summaryVersion = reviewVersion;
  }
  $('original').textContent = translations.map(item => `${item.original}${item.english ? '\nEnglish: '+item.english : '\n(Not translated)'}`).join('\n\n');
  $('summary-locations').textContent = locationLabels().join(' · ') || 'No specific location reported';
  changeStep(3);
}
$('to-summary').onclick = showSummary;
document.querySelectorAll('[data-step]').forEach(button => button.onclick = () => +button.dataset.step === 3 ? showSummary() : changeStep(+button.dataset.step));
document.querySelectorAll('[data-back]').forEach(button => button.onclick = () => changeStep(+button.dataset.back));
function setBusy(value) {
  busy = value;
  $('send').disabled = value;
  $('retry').disabled = value;
  $('use-manual').disabled = value;
  $('description').disabled = value;
  $('send').textContent = value ? 'Listening…' : 'Send message ↗';
  $('thinking').hidden = !value;
  updateNavigation();
}
async function interpret() {
  setBusy(true);
  valid = false;
  invalidate();
  $('retry').hidden = true;
  notice('');
  try {
    const response = await fetch('/api/interpret', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body:JSON.stringify({messages}), signal:AbortSignal.timeout(65000),
    });
    const data = await response.json();
    if (!response.ok) throw Error(data.error || 'Interpretation unavailable.');
    translations.at(-1).english = data.translation;
    showTranslation(data.translation);
    $('review-english').value = data.statement;
    for (const key of Object.keys(FIELDS)) {
      details[key] = data.details[key] || '';
      $(`field-${key}`).value = details[key];
    }
    regions = data.regions;
    renderRegions();
    bubble('assistant', data.reply);
    messages.push({role:'assistant', content:data.reply});
    valid = Boolean(data.statement.trim());
    interpretationFailed = false;
    $('to-body').textContent = data.ready ? 'Review my description →' : 'Review so far →';
    $('chat-progress').textContent = valid ? 'Add more details, or review whenever you’re ready.' : 'Tell us a little about how you’re feeling to get started.';
  } catch (error) {
    interpretationFailed = true;
    $('retry').hidden = false;
    notice(error.name === 'TimeoutError' ? 'That took too long. Retry your last message, or continue without AI.' : error.message);
    $('chat-progress').textContent = 'Your latest message has not been translated. Retry before reviewing.';
  } finally {
    setBusy(false);
    $('messages').scrollTop = $('messages').scrollHeight;
  }
}
$('retry').onclick = () => { if (!busy) void interpret(); };
$('chat-form').onsubmit = async event => {
  event.preventDefault();
  if (busy) return;
  const text = $('description').value.trim();
  if (!text) return;
  if (ai && !$('consent').checked) {
    notice('Please allow translation below, or choose “Continue without AI interpretation”.');
    $('consent').focus();
    return;
  }
  if (messages.length >= 30) { notice('This conversation is full. Please review your description.'); return; }
  messages.push({role:'user', content:text});
  translations.push({original:text, english:''});
  lastUserBubble = bubble('user', text);
  $('description').value = '';
  if (ai) await interpret();
  else {
    valid = true;
    invalidate();
    bubble('assistant', 'I’ve kept your words. Without AI, I can’t translate them, but you can mark the body and write an English description on the next step.');
    updateNavigation();
  }
};
$('copy').onclick = async () => {
  try { await navigator.clipboard.writeText($('statement').value); notice('Statement copied.'); }
  catch { notice('Select the statement and copy it manually.'); }
};
$('download').onclick = () => {
  const isDental = activeModel() === 'dental';
  const snapshot = isDental ? dental()?.snapshot() : painter()?.snapshot();
  const original = translations.map(item => `${item.original}\n${item.english ? 'English: '+item.english : '(Not translated)'}`).join('\n\n');
  const modelCredit = isDental && snapshot ? '<p><small>Dental anatomy: BodyParts3D / Anatomography © DBCLS, via OrganUI. Adapted geometry and materials. <a href="https://creativecommons.org/licenses/by-sa/2.1/jp/deed.en">CC BY-SA 2.1 Japan</a>. The dental model image is shared under the same license.</small></p>' : '';
  const html = `<!doctype html><html lang="en"><meta charset="utf-8"><title>My symptom notes</title><style>body{font:17px/1.7 system-ui;max-width:900px;margin:40px auto;padding:24px;color:#294339}article{display:flex;gap:24px}p{white-space:pre-wrap}img{width:280px;object-fit:contain}small{color:#68776d}</style><h1>My symptom notes</h1><small>Patient-reviewed communication aid · Not a diagnosis</small><article><div><h2>My statement</h2><p>${escapeHTML($('statement').value)}</p><h2>Marked locations</h2><p>${escapeHTML(locationLabels().join(', ') || 'Not specified')}</p><h2>My original words & translations</h2><p dir="auto">${escapeHTML(original)}</p></div>${snapshot ? `<img alt="${isDental ? 'Patient-selected dental locations' : 'Patient-annotated body'}, current view" src="${snapshot}">` : '<p>Model image unavailable.</p>'}</article>${modelCredit}</html>`;
  const url = URL.createObjectURL(new Blob([html], {type:'text/html'}));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'my-symptom-notes.html';
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  notice('Notes downloaded, including your original words and their translations.');
};
function configureMode() {
  $('use-manual').hidden = !ai;
  $('connection').textContent = ai ? 'LANGUAGE SUPPORT ON' : 'MANUAL MODE';
  $('consent-row').hidden = !ai;
  $('fields').hidden = ai;
  $('review-note').textContent = ai ? 'This is your full English account, including corrections. Compare it with the translations in chat and edit anything that doesn’t match.' : 'Write an English description, or fill in the optional details below. Your original words remain available; manual mode does not translate them.';
  $('privacy').textContent = ai ? 'With your permission, symptom text is sent to OpenAI to translate. Drawings stay in this browser.' : 'Manual mode: no automatic translation. Notes stay in this tab and clear on refresh.';
}
$('use-manual').onclick = () => {
  if (busy) return;
  ai = false;
  if (interpretationFailed) {
    // Do not pass a stale interpretation off as the translation of new input.
    $('review-english').value = '';
    for (const key of Object.keys(details)) { details[key] = ''; $(`field-${key}`).value = ''; }
    regions = [];
    renderRegions();
  }
  $('retry').hidden = true;
  valid = messages.some(message => message.role === 'user');
  configureMode();
  updateNavigation();
  notice('Manual mode is on. You can review and enter your own English description.');
};
try {
  const response = await fetch('/api/config', {signal:AbortSignal.timeout(5000)});
  if (response.ok) ai = (await response.json()).ai === true;
} catch {}
configureMode();
setBusy(false);
