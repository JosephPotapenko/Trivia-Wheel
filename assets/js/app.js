/* Spin The Wheel Trivia - Main Script */
// State
let defaultPoints = 100;
let questionCount = 15;
let teamCount = 4;
let currentTeam = 0;
let scores = new Array(teamCount).fill(0);
let teamMembers = new Array(teamCount).fill(null).map(()=>[]);
let activeIndex = null;
let winnerShown = false;
const qa = {};
for(let i=1;i<=40;i++){ qa['t'+i] = { q: 'Question ' + i, a: 'Answer ' + i, used: false }; }

// Elements
const board = document.getElementById('board');
const overlay = document.getElementById('overlay');
const turnLabel = document.getElementById('turnLabel');
const qText = document.getElementById('qText');
const aText = document.getElementById('aText');
const revealBtn = document.getElementById('revealBtn');
const correctBtn = document.getElementById('correctBtn');
const wrongBtn = document.getElementById('wrongBtn');
const closeCard = document.getElementById('closeCard');
const manualPoints = document.getElementById('manualPoints');
const teamsWrap = document.getElementById('teams');
const stealWrap = document.getElementById('stealWrap');
const editBtn = document.getElementById('editBtn');
const startBtn = document.getElementById('startBtn');
const spinBtn = document.getElementById('spinBtn');
const questionNumber = document.getElementById('questionNumber');

// Language mode: Russian-only when true, English-only when false
let ruMode = true;
function lang(en, ru){ return ruMode ? ru : en; }

function parseQAFromText(text){
  const lines = text.split(/\r?\n/).map(l=>l.trim()).filter(Boolean);
  const items = [];
  for(const line of lines){
    let q = '', a = '';
    if(line.includes('||')){
      const [qq, aa] = line.split('||');
      q = (qq||'').trim(); a = (aa||'').trim();
    } else if(line.includes('|')){
      const [qq, aa] = line.split('|');
      q = (qq||'').trim(); a = (aa||'').trim();
    } else {
      q = line; a = '';
    }
    items.push({q, a});
  }
  return items;
}

function isRussian(text){ return /[\u0400-\u04FF]/.test(text || ''); }
async function translateGeneric(text, target){
  const t = (text || '').trim();
  if(!t) return '';
  const source = target === 'ru' ? 'en' : 'ru';
  const endpoints = [
    'https://libretranslate.de/translate',
    'https://libretranslate.com/translate',
    'https://translate.argosopentech.com/translate'
  ];
  // 1) Try MyMemory (GET, often CORS-friendly)
  try{
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(t)}&langpair=${source}|${target}`;
    const res = await fetch(url, { method: 'GET', headers: { 'Accept':'application/json' } });
    if(res.ok){
      const data = await res.json();
      const out = (data && data.responseData && data.responseData.translatedText) || '';
      if(out) return out;
    }
  }catch(e){ /* ignore and continue */ }
  // MyMemory via CORS proxy
  try{
    const url = `https://cors.isomorphic-git.org/https://api.mymemory.translated.net/get?q=${encodeURIComponent(t)}&langpair=${source}|${target}`;
    const res = await fetch(url, { method: 'GET', headers: { 'Accept':'application/json' } });
    if(res.ok){
      const data = await res.json();
      const out = (data && data.responseData && data.responseData.translatedText) || '';
      if(out) return out;
    }
  }catch(e){ /* ignore and continue */ }
  // 2) Try Lingva (Google-compatible front-end)
  try{
    const url = `https://lingva.ml/api/v1/${source}/${target}/${encodeURIComponent(t)}`;
    const res = await fetch(url, { method: 'GET', headers: { 'Accept':'application/json' } });
    if(res.ok){
      const data = await res.json();
      const out = (data && data.translation) || '';
      if(out) return out;
    }
  }catch(e){ /* ignore and continue */ }
  // Lingva via CORS proxy
  try{
    const url = `https://cors.isomorphic-git.org/https://lingva.ml/api/v1/${source}/${target}/${encodeURIComponent(t)}`;
    const res = await fetch(url, { method: 'GET', headers: { 'Accept':'application/json' } });
    if(res.ok){
      const data = await res.json();
      const out = (data && data.translation) || '';
      if(out) return out;
    }
  }catch(e){ /* ignore and continue */ }
  // 3) Try LibreTranslate instances (POST)
  for(const endpoint of endpoints){
    try{
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ q: t, source, target, format: 'text' })
      });
      if(res.ok){
        const data = await res.json();
        const out = (data && data.translatedText) || '';
        if(out){ return out; }
      }
    }catch(e){ /* try proxy below */ }
    try{
      const proxied = 'https://cors.isomorphic-git.org/' + endpoint;
      const res = await fetch(proxied, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ q: t, source, target, format: 'text' })
      });
      if(res.ok){
        const data = await res.json();
        const out = (data && data.translatedText) || '';
        if(out){ return out; }
      }
    }catch(e){ /* try next endpoint */ }
  }
  return '';
}

async function importQAFromFile(){
  const input = document.createElement('input');
  input.type = 'file'; input.accept = '.txt,text/plain';
  input.onchange = async ()=>{
    const file = input.files && input.files[0];
    if(!file) return;
    const text = await file.text();
    const items = parseQAFromText(text);
    questionCount = Math.min(40, Math.max(1, items.length));
    for(let i=1;i<=40;i++){
      const it = items[i-1];
      if(it){
        qa['t'+i].q = it.q || ('Question ' + i);
        qa['t'+i].a = it.a || ('Answer ' + i);
        qa['t'+i].used = false;
      } else {
        qa['t'+i].q = 'Question ' + i;
        qa['t'+i].a = 'Answer ' + i;
        qa['t'+i].used = true;
      }
    }
    persistState();
    renderBoard();
    buildWheel();
    renderTeams();
    try{ if(editor && editor.style.display==='block') populateEditor(); }catch(e){}
    alert('Questions imported: ' + items.length);
  };
  input.click();
}

const backtrack1 = document.getElementById('backtrack1');
const backtrack2 = document.getElementById('backtrack2');
const backtrack3 = document.getElementById('backtrack3');
const sfxTick = document.getElementById('sfx-tick');

/* Build wheel */
function buildWheel(){
  const wheel = document.getElementById('wheel');
  if(!wheel) return;
  wheel.innerHTML='';
  const step = 360 / questionCount;
  const size = Math.min(720, Math.floor(window.innerWidth*0.92));
  const radius = Math.round(size * 0.33);
  const bandHeight = Math.max(24, Math.round((2 * Math.PI * radius) / questionCount));
  for(let i=1;i<=questionCount;i++){
    const face = document.createElement('div');
    const used = qa['t'+i].used;
    face.textContent = ruMode ? `Question / Вопрос ${i}` : `Question ${i}`;
    face.style.cssText = `position:absolute;left:50%;top:50%;width:92%;height:${bandHeight}px;margin:-${Math.round(bandHeight/2)}px 0 0 -46%;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:16px;border-radius:8px;background:${used?'#f2f7fc':'#ffffff'};border:1px solid var(--border);color:${used?'#9fb2c6':'#0b1b2b'};box-shadow:${used?'none':'0 6px 16px rgba(23,43,77,.08)'};transform:rotateX(${(i-1)*step}deg) translateZ(${radius}px)`;
    wheel.appendChild(face);
  }
}

/* Build board */
function renderBoard(){
  board.innerHTML='';
  for(let i=1;i<=questionCount;i++){
    const t = document.createElement('div');
    t.className = 'tile' + (qa['t'+i].used ? ' disabled' : '');
    t.dataset.id = 't'+i;
    t.innerHTML = ruMode ? `<div class="label">Question / Вопрос ${i}</div><div class="points">$${defaultPoints}</div>` : `<div class="label">Question ${i}</div><div class="points">$${defaultPoints}</div>`;
    t.onclick = ()=>{ if(qa['t'+i].used) return; openCard(i); };
    board.appendChild(t);
  }
}

/* Audio context for instant tick sound */
let audioCtx = null;
function playTickTone(){
  try{
    if(!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.frequency.value = 800;
    osc.type = 'sine';
    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
    osc.start(now);
    osc.stop(now + 0.1);
  }catch(e){}
}

function spin(){
  playTickTone();
  const available = [];
  for(let i=1;i<=questionCount;i++){ if(!qa['t'+i].used) available.push(i); }
  if(!available.length){ alert('No questions left'); return; }
  // Prefer questions whose answer is NOT a team member name
  const normalize = (s)=> String(s||'').trim().toLowerCase();
  const nameSet = new Set();
  (teamMembers||[]).forEach(arr=>{ (arr||[]).forEach(n=>{ const v = normalize(n); if(v) nameSet.add(v); }); });
  const nonTeamPool = available.filter(i=>{
    const ans = normalize(qa['t'+i].a);
    if(!ans) return true;
    return !nameSet.has(ans);
  });
  const pickPool = nonTeamPool.length ? nonTeamPool : available;
  const targetIdx = pickPool[Math.floor(Math.random()*pickPool.length)];
  const step = 360 / questionCount;
  const spins = 4 * 360;
  const wheel = document.getElementById('wheel');
  if(!wheel) return;
  const current = (parseFloat(wheel.dataset.rot)||0);
  const target = current + spins + ((targetIdx-1)*step);
  const start = current;
  const duration = 2800;
  const startTime = performance.now();
  function easeOut(t){ return 1 - Math.pow(1-t, 3); }
  let prevTick = Math.floor(start / step);
  function animate(now){
    const t = Math.min((now-startTime)/duration,1);
    const rot = start + (target-start)*easeOut(t);
    wheel.style.transform = `rotateX(-${rot}deg)`;
    wheel.dataset.rot = String(rot);
    const curTick = Math.floor(rot / step);
    if(curTick > prevTick){ prevTick = curTick; playTickTone(); }
    if(t<1) requestAnimationFrame(animate); else finishSpin(targetIdx);
  }
  requestAnimationFrame(animate);
}
function finishSpin(targetIdx){
  const wheel = document.getElementById('wheel');
  const rot = parseFloat(wheel.dataset.rot) || 0;
  const step = 360 / questionCount;
  const normalizedRot = ((rot % 360) + 360) % 360;
  const faceIdx = Math.round(normalizedRot / step) % questionCount;
  const selectedIdx = (faceIdx % questionCount) + 1;
  if(qa['t'+selectedIdx].used){
    let next = selectedIdx;
    let found = false;
    for(let attempt = 0; attempt < questionCount; attempt++){
      next = (next % questionCount) + 1;
      if(!qa['t'+next].used){ found = true; break; }
    }
    if(!found){ openCard(selectedIdx); return; }
    const current = rot;
    const stepsAhead = (next - selectedIdx + questionCount) % questionCount;
    const delta = stepsAhead * step;
    const target = current + delta;
    const start = current;
    const duration = Math.max(400, Math.min(1200, delta * 6));
    function easeOut(t){ return 1 - Math.pow(1-t, 3); }
    playTickTone();
    function animate(now){
      const t = Math.min((now-(performance.now()-duration))/duration,1);
      const newRot = start + (target-start)*easeOut(t);
      wheel.style.transform = `rotateX(-${newRot}deg)`;
      wheel.dataset.rot = String(newRot);
      if(t<1) requestAnimationFrame(animate); else openCard(next);
    }
    requestAnimationFrame(animate);
    return;
  }
  openCard(selectedIdx);
}
if(spinBtn){ spinBtn.onclick = spin; }

/* Start button: chain backtracks */
function startBacktracks(){
  if(!backtrack1 || !backtrack2 || !backtrack3) return;
  try{
    [backtrack1, backtrack2, backtrack3].forEach(a=>{ a.pause(); a.currentTime = 0; a.loop = false; a.onended = null; a.onerror = null; });
    backtrack1.volume = 0.9; backtrack2.volume = 0.9; backtrack3.volume = 0.9;
    backtrack1.onended = ()=>{ backtrack2.currentTime = 0; backtrack2.play().catch(()=>{}); };
    backtrack2.onended = ()=>{ backtrack3.currentTime = 0; backtrack3.loop = true; backtrack3.play().catch(()=>{}); };
    backtrack1.onerror = ()=>{ backtrack3.currentTime = 0; backtrack3.loop = true; backtrack3.play().catch(()=>{}); };
    backtrack2.onerror = ()=>{ backtrack3.currentTime = 0; backtrack3.loop = true; backtrack3.play().catch(()=>{}); };
    backtrack1.currentTime = 0;
    backtrack1.play().catch(()=>{ backtrack3.currentTime = 0; backtrack3.loop = true; backtrack3.play().catch(()=>{}); });
  }catch(e){ try{ backtrack3.currentTime = 0; backtrack3.loop = true; backtrack3.play(); }catch(_){} }
}
if(startBtn){ startBtn.onclick = startBacktracks; }

/* Teams */
function renderTeams(){
  teamsWrap.innerHTML='';
  for(let i=0;i<teamCount;i++){
    const team = document.createElement('div');
    team.className = 'team' + (i===currentTeam ? ' current' : '');
    team.innerHTML = `
      <h3>Team ${i+1}</h3>
      <div class="score" contenteditable="true" id="score${i}">$${scores[i]}</div>
      <div class="members">
        <button class="btn ghost" type="button" data-toggle="members" data-team="${i}">Members</button>
        <div class="members-body" id="members${i}" style="display:none;margin-top:8px"></div>
      </div>
    `;
    teamsWrap.appendChild(team);
  }
  Array.from(document.querySelectorAll('.score')).forEach((el, idx)=>{
    el.addEventListener('blur', ()=>{
      const num = parseInt(el.textContent.replace(/[^0-9-]/g,''), 10);
      scores[idx] = isNaN(num) ? scores[idx] : num;
      el.textContent = '$' + scores[idx];
    });
    el.addEventListener('keydown', (e)=>{ if(e.key==='Enter'){ e.preventDefault(); el.blur(); } });
  });
  // Populate members UI
  for(let i=0;i<teamCount;i++){
    const body = document.getElementById(`members${i}`);
    if(!body) continue;
    body.innerHTML = '';
    const list = document.createElement('div');
    list.style.display = 'flex';
    list.style.flexDirection = 'column';
    list.style.gap = '6px';
    (teamMembers[i]||[]).forEach((name, idx)=>{
      const row = document.createElement('div');
      row.style.display = 'flex'; row.style.gap = '6px'; row.style.alignItems = 'center';
      const input = document.createElement('input');
      input.type = 'text'; input.value = name || '';
      input.placeholder = 'Member name';
      input.style.flex = '1'; input.style.padding = '8px';
      input.addEventListener('blur', ()=>{
        const v = input.value.trim();
        teamMembers[i][idx] = v;
        teamMembers[i] = teamMembers[i].filter(n => (n||'').trim().length>0);
        persistState();
      });
      const remove = document.createElement('button');
      remove.className = 'btn ghost'; remove.textContent = 'Remove';
      remove.addEventListener('click', ()=>{
        teamMembers[i].splice(idx,1);
        persistState();
        renderTeams();
      });
      row.appendChild(input);
      row.appendChild(remove);
      list.appendChild(row);
    });
    body.appendChild(list);
    const add = document.createElement('button');
    add.className = 'btn secondary'; add.textContent = 'Add member';
    add.addEventListener('click', ()=>{
      teamMembers[i] = teamMembers[i] || [];
      teamMembers[i].push('');
      persistState();
      renderTeams();
      const body2 = document.getElementById(`members${i}`);
      if(body2) body2.style.display = 'block';
    });
    body.appendChild(add);
  }
  // Toggle handlers
  Array.from(document.querySelectorAll('[data-toggle="members"]')).forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const idx = Number(btn.getAttribute('data-team'));
      const body = document.getElementById(`members${idx}`);
      if(!body) return;
      const show = body.style.display === 'none' || body.style.display === '';
      body.style.display = show ? 'block' : 'none';
    });
  });
  updateTurnLabel();
}
function nextTeam(){ currentTeam = (currentTeam + 1) % teamCount; renderTeams(); }
function updateTurnLabel(){ turnLabel.textContent = ruMode ? `Team / Команда ${currentTeam+1} — $${defaultPoints}` : `Team ${currentTeam+1} — $${defaultPoints}`; }

/* Card flow */
function openCard(i){
  activeIndex = i;
  qText.textContent = qa['t'+i].q;
  aText.textContent = qa['t'+i].a;
  aText.classList.remove('show');
  revealBtn.disabled = false;
  correctBtn.disabled = true;
  wrongBtn.disabled = true;
  manualPoints.value = '';
  if(questionNumber) questionNumber.textContent = ruMode ? `Question / Вопрос ${i}` : `Question ${i}`;
  overlay.style.display = 'flex';
}
function closeOverlay(){ overlay.style.display = 'none'; activeIndex=null; }
closeCard.onclick = closeOverlay;
window.addEventListener('keydown', (e)=>{ if(e.key==='Escape' && overlay.style.display==='flex') closeOverlay(); });

revealBtn.onclick = ()=>{ aText.classList.add('show'); revealBtn.disabled=true; correctBtn.disabled=false; wrongBtn.disabled=false; };
correctBtn.onclick = ()=>{
  let pts = Number(manualPoints.value);
  if(!pts || isNaN(pts) || pts <= 0) pts = defaultPoints;
  scores[currentTeam] += pts;
  qa['t'+activeIndex].used = true;
  playCorrect();
  renderTeams();
  renderBoard();
  buildWheel();
  closeOverlay();
  nextTeam();
  checkGameEnd();
};
wrongBtn.onclick = ()=>{
  playWrong();
  stealWrap.style.display = 'flex';
  stealWrap.innerHTML = '';
  for(let i=0;i<teamCount;i++){
    if(i===currentTeam) continue;
    const b = document.createElement('button');
    b.className = 'btn secondary';
    b.textContent = `Team ${i+1} steals`;
    b.onclick = ()=>{
      let pts = Number(manualPoints.value);
      if(!pts || isNaN(pts) || pts <= 0) pts = defaultPoints;
      scores[i] += Math.round(pts/2);
      qa['t'+activeIndex].used = true;
      renderTeams();
      renderBoard();
      buildWheel();
      closeOverlay();
      nextTeam();
      checkGameEnd();
    };
    stealWrap.appendChild(b);
  }
  const none = document.createElement('button');
  none.className = 'btn ghost';
  none.textContent = 'Not stolen';
  none.onclick = ()=>{ qa['t'+activeIndex].used=true; renderBoard(); buildWheel(); closeOverlay(); nextTeam(); checkGameEnd(); };
  stealWrap.appendChild(none);
};

/* Game end */
function allQuestionsUsed(){ for(let i=1;i<=questionCount;i++){ if(!qa['t'+i].used) return false; } return true; }
function playConfetti(){
  const confettiPieces = 80;
  for(let i=0;i<confettiPieces;i++){
    const piece = document.createElement('div');
    piece.style.cssText = `position:fixed;left:${Math.random()*window.innerWidth}px;top:-10px;width:${5+Math.random()*10}px;height:${5+Math.random()*10}px;background:${['#4fb3ff','#2fbf71','#e15757','#f4f7fb'][Math.floor(Math.random()*4)]};opacity:1;pointer-events:none;z-index:999;border-radius:50%;animation:fall ${2+Math.random()*2}s linear forwards;`;
    document.body.appendChild(piece);
    setTimeout(()=>piece.remove(), 4000);
  }
}
const style = document.createElement('style');
style.textContent = `@keyframes fall { to { transform: translateY(${window.innerHeight+100}px) rotate(360deg); opacity:0; } }`;
document.head.appendChild(style);
function showWinner(){
  if(winnerShown) return;
  winnerShown = true;
  const winnerTeam = scores.reduce((maxIdx, score, idx, arr)=> score > arr[maxIdx] ? idx : maxIdx, 0);
  const modal = document.createElement('div');
  modal.id = 'winnerModal';
  modal.style.cssText = `position:fixed;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.7);z-index:50;`;
  modal.innerHTML = `
    <div style="background:linear-gradient(180deg,#ffffff,#f6fbff);border:2px solid var(--accent-2);border-radius:24px;padding:40px;text-align:center;box-shadow:0 30px 100px rgba(23,43,77,.3)">
      <div style="font-family:'Chewy',cursive;font-size:48px;color:var(--accent-2);margin-bottom:20px">🎉</div>
      <div style="font-family:'Baloo 2',cursive;font-size:36px;font-weight:900;color:var(--text);margin-bottom:30px">Team ${winnerTeam+1} Wins!</div>
      <div style="font-size:24px;color:var(--sub);margin-bottom:30px">Final Score: $${scores[winnerTeam]}</div>
      <div style="display:flex;gap:10px;justify-content:center">
        <button class="btn secondary" onclick="(function(){var m=document.getElementById('winnerModal'); if(m){ m.remove(); } })()" style="padding:12px 30px;font-size:16px">Confirm</button>
        <button class="btn" onclick="location.reload()" style="padding:12px 30px;font-size:16px">Play Again</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  playConfetti();
}
function checkGameEnd(){ if(allQuestionsUsed() && !winnerShown){ setTimeout(showWinner, 500); } }

// Toast notifications
function showToast(text){
  try{
    const toast = document.createElement('div');
    toast.textContent = text;
    toast.style.cssText = `position:fixed;right:16px;bottom:16px;max-width:60%;background:#0b1b2b;color:#ffffff;border:1px solid var(--border);border-radius:10px;padding:10px 14px;font-weight:800;font-size:14px;box-shadow:0 12px 30px rgba(23,43,77,.22);z-index:1000;opacity:0;transition:opacity .2s;`;
    document.body.appendChild(toast);
    requestAnimationFrame(()=>{ toast.style.opacity = '1'; });
    setTimeout(()=>{ toast.style.opacity='0'; setTimeout(()=>{ toast.remove(); }, 250); }, 2800);
  }catch(e){}
}

// Editor
const editor = document.createElement('aside');
editor.className = 'editor';
editor.innerHTML = `
  <h4>Edit Game</h4>
  <div class="row">
    <input id="titleEditor" type="text" value="Trivia" style="flex:1"/>
    <input id="subtitleEditor" type="text" value="Minimal modern board" style="flex:1"/>
    <button class="btn" id="applyTitle">Update</button>
  </div>
  <div class="row">
    <input id="defaultPointsEditor" type="number" value="100" style="width:120px"/>
    <input id="questionCountEditor" type="number" min="1" max="40" value="15" style="width:120px"/>
    <input id="teamCountEditor" type="number" min="1" max="8" value="4" style="width:120px"/>
    <button class="btn" id="applyConfig">Apply</button>
  </div>
  <div class="row" style="align-items:center;gap:8px">
    <label style="font-size:12px;color:var(--sub);display:flex;align-items:center;gap:8px">
      <input id="ruModeToggle" type="checkbox" checked />
      <span>Russian Mode (RU-only)</span>
    </label>
  </div>
  <div class="row" style="justify-content:flex-start">
    <button class="btn secondary" id="importTxtBtn">Import submissions</button>
    <button class="btn ghost" id="clearImportBtn">Clear import</button>
    <span style="font-size:12px;color:var(--sub)"></span>
    <div id="importExplain" style="font-size:12px;color:var(--sub);margin-top:6px;max-width:780px"></div>
  </div>
  <div class="qa" id="qaList"></div>
  <div class="row" style="justify-content:flex-end">
    <button class="btn" id="saveQA" style="color:#0b1b2b">Save</button>
    <button class="btn ghost" id="clearQuestionsBtn" style="color:#0b1b2b">Clear Questions</button>
    <button class="btn secondary" id="closeEditor">Close</button>
  </div>
`;
document.body.appendChild(editor);

const qaList = editor.querySelector('#qaList');
const titleEditor = editor.querySelector('#titleEditor');
const subtitleEditor = editor.querySelector('#subtitleEditor');
const applyTitle = editor.querySelector('#applyTitle');
const defaultPointsEditor = editor.querySelector('#defaultPointsEditor');
const questionCountEditor = editor.querySelector('#questionCountEditor');
const teamCountEditor = editor.querySelector('#teamCountEditor');
const applyConfig = editor.querySelector('#applyConfig');
const saveQA = editor.querySelector('#saveQA');
const clearQuestionsBtn = editor.querySelector('#clearQuestionsBtn');
const closeEditor = editor.querySelector('#closeEditor');
const importTxtBtn = editor.querySelector('#importTxtBtn');
const clearImportBtn = editor.querySelector('#clearImportBtn');
const ruModeToggle = editor.querySelector('#ruModeToggle');
if(importTxtBtn){ importTxtBtn.onclick = importQA; }
if(clearImportBtn){ clearImportBtn.onclick = clearImportedSubmissions; }
if(ruModeToggle){
  ruModeToggle.checked = true;
  ruModeToggle.addEventListener('change', ()=>{
    ruMode = !!ruModeToggle.checked;
    try{ localStorage.setItem('twRuMode', JSON.stringify({ ruMode })); }catch(e){}
    updateLanguageUI();
    buildWheel();
    renderBoard();
  });
}

function populateEditor(){
  qaList.innerHTML='';
  for(let i=1;i<=questionCount;i++){
    const row = document.createElement('div'); row.className='item';
    row.innerHTML = `<div>Q${i}</div><textarea class="q">${qa['t'+i].q}</textarea><textarea class="a">${qa['t'+i].a}</textarea>`;
    row.dataset.id = 't'+i;
    qaList.appendChild(row);
  }
}

async function importQA(){
  try{
    const res = await fetch('/api/import?ru=' + (ruMode ? 'true' : 'false'));
    if(res.ok){
      const data = await res.json();
      if(data && data.ok && Array.isArray(data.items) && data.items.length){
        const items = data.items;
        const capped = Math.min(40, items.length);
        questionCount = capped;
        for(let i=1;i<=40;i++){
          const it = items[i-1];
          if(it){
            qa['t'+i].q = (it.q || ('Question ' + i));
            qa['t'+i].a = (it.a || ('Answer ' + i));
            qa['t'+i].used = false;
          } else {
            qa['t'+i].q = lang('Question','Вопрос') + ' ' + i;
            qa['t'+i].a = lang('Answer','Ответ') + ' ' + i;
            qa['t'+i].used = true;
          }
        }
        persistState();
        renderBoard();
        buildWheel();
        renderTeams();
        showToast('Imported ' + items.length + ' submissions from server (' + (ruMode ? 'RU' : 'EN') + ' mode).');
        try{
          if(editor && editor.style.display==='block'){
            const questionCountEditor = editor.querySelector('#questionCountEditor');
            if(questionCountEditor) questionCountEditor.value = String(questionCount);
            const qaList = editor.querySelector('#qaList');
            if(qaList) qaList.innerHTML = '';
            editor.style.display = 'none';
          }
        }catch(e){}
        alert('Imported ' + items.length + ' submissions from server; wheel set to ' + capped + (items.length>40 ? ' (capped at 40).' : '.') + '\nEditor closed to preserve anonymity.');
        return;
      }
    }
  }catch(e){ /* server not reachable, fall back */ }
  showToast('Server unreachable. Using local import.');
  return importQAFromLocal();
}

async function importQAFromLocal(){
  try{
    const text = localStorage.getItem('twSubmissionsText') || '';
    if(!text){ alert('No submissions found in localStorage.'); return; }
    const items = parseQAFromText(text);
    if(items.length === 0){ alert('No valid submissions found.'); return; }
    const capped = Math.min(40, items.length);
    questionCount = capped;
    let attempts = 0, successes = 0;
    for(let i=1;i<=40;i++){
      const it = items[i-1];
      if(it){
        let q = it.q || ('Question ' + i);
        let a = (typeof it.a === 'string' ? it.a : '') || ('Answer ' + i);
        if(ruMode){
          let qFinal = q, aFinal = a;
          if(!isRussian(q)){
            attempts++;
            const t = await translateGeneric(q,'ru');
            if(t){ qFinal = t; successes++; } else { qFinal = q; }
          }
          if(!isRussian(a)){
            attempts++;
            const t = await translateGeneric(a,'ru');
            if(t){ aFinal = t; successes++; } else { aFinal = a; }
          }
          qa['t'+i].q = qFinal;
          qa['t'+i].a = aFinal;
        } else {
          let qFinal = q, aFinal = a;
          if(isRussian(q)){
            attempts++;
            const t = await translateGeneric(q,'en');
            if(t){ qFinal = t; successes++; } else { qFinal = q; }
          }
          if(isRussian(a)){
            attempts++;
            const t = await translateGeneric(a,'en');
            if(t){ aFinal = t; successes++; } else { aFinal = a; }
          }
          qa['t'+i].q = qFinal;
          qa['t'+i].a = aFinal;
        }
        qa['t'+i].used = false;
      } else {
        qa['t'+i].q = lang('Question','Вопрос') + ' ' + i;
        qa['t'+i].a = lang('Answer','Ответ') + ' ' + i;
        qa['t'+i].used = true;
      }
    }
    persistState();
    renderBoard();
    buildWheel();
    renderTeams();
    showToast('Imported ' + items.length + ' submissions from local storage (' + (ruMode ? 'RU' : 'EN') + ' mode).');
    if(attempts > 0 && successes === 0){ showToast('Translation service unreachable. Showing original text.'); alert('Imported, but the translation service was unreachable. Showing original text.'); }
    try{
      if(editor && editor.style.display==='block'){
        const questionCountEditor = editor.querySelector('#questionCountEditor');
        if(questionCountEditor) questionCountEditor.value = String(questionCount);
        const qaList = editor.querySelector('#qaList');
        if(qaList) qaList.innerHTML = '';
        editor.style.display = 'none';
      }
    }catch(e){}
    alert('Imported ' + items.length + ' submissions; wheel set to ' + capped + (items.length>40 ? ' (capped at 40).' : '.') + '\nEditor closed to preserve anonymity.');
  }catch(e){ alert('Failed to import: ' + (e && e.message ? e.message : 'unknown error')); }
}

function clearImportedSubmissions(){ try{ localStorage.removeItem('twSubmissionsText'); localStorage.removeItem('twImportedRaw'); alert('Cleared imported submissions from localStorage.'); }catch(e){ alert('Failed to clear imports.'); }}
function toggleEditor(){
  if(editor.style.display==='none' || editor.style.display===''){
    defaultPointsEditor.value = String(defaultPoints);
    questionCountEditor.value = String(questionCount);
    teamCountEditor.value = String(teamCount);
    populateEditor();
    editor.style.display='block';
  } else {
    editor.style.display='none';
  }
}
editBtn.onclick = toggleEditor;
closeEditor.onclick = ()=> editor.style.display='none';
applyTitle.onclick = ()=>{
  try{
    const tEl = document.getElementById('gameTitle');
    const sEl = document.getElementById('gameSubtitle');
    if(tEl) tEl.textContent = titleEditor.value || 'Trivia';
    if(sEl) sEl.textContent = subtitleEditor.value || 'Minimal modern board';
  }catch(e){}
  try{ localStorage.setItem('twTitle', titleEditor.value||''); localStorage.setItem('twSubtitle', subtitleEditor.value||''); }catch(e){}
};
applyConfig.onclick = ()=>{
  defaultPoints = Math.max(1, Number(defaultPointsEditor.value)||100);
  questionCount = Math.min(40, Math.max(1, Number(questionCountEditor.value)||15));
  const newTeamCount = Math.min(8, Math.max(1, Number(teamCountEditor.value)||4));
  if(newTeamCount !== teamCount){
    const old = scores.slice();
    teamCount = newTeamCount;
    scores = new Array(teamCount).fill(0);
    for(let i=0;i<Math.min(old.length, scores.length); i++){ scores[i] = old[i]; }
    if(currentTeam >= teamCount) currentTeam = 0;
    const oldMembers = teamMembers.slice();
    teamMembers = new Array(teamCount).fill(null).map(()=>[]);
    for(let i=0;i<Math.min(oldMembers.length, teamMembers.length); i++){
      teamMembers[i] = (oldMembers[i]||[]).slice();
    }
  }
  renderTeams();
  renderBoard();
  buildWheel();
  populateEditor();
  persistState();
};
function persistState(){
  try{
    const cfg = { defaultPoints, questionCount, teamCount };
    localStorage.setItem('twConfig', JSON.stringify(cfg));
    try{ localStorage.setItem('twRuMode', JSON.stringify({ ruMode })); }catch(e){}
    const qaSave = {};
    for(let i=1;i<=40;i++){ const key = 't'+i; qaSave[key] = { q: qa[key].q, a: qa[key].a, used: !!qa[key].used }; }
    localStorage.setItem('twQA', JSON.stringify(qaSave));
    try{ const raw = localStorage.getItem('twSubmissionsText'); if(raw){ localStorage.setItem('twImportedRaw', raw); } }catch(e){}
    try{ localStorage.setItem('twTeamMembers', JSON.stringify(teamMembers)); }catch(e){}
  }catch(e){}
}
function loadState(){
  try{
    const cfgRaw = localStorage.getItem('twConfig');
    if(cfgRaw){ const cfg = JSON.parse(cfgRaw); if(typeof cfg.defaultPoints==='number') defaultPoints = cfg.defaultPoints; if(typeof cfg.questionCount==='number') questionCount = Math.min(40, Math.max(1, cfg.questionCount)); if(typeof cfg.teamCount==='number') teamCount = Math.min(8, Math.max(1, cfg.teamCount)); scores = new Array(teamCount).fill(0); if(currentTeam >= teamCount) currentTeam = 0; }
    const langRaw = localStorage.getItem('twRuMode');
    if(langRaw){ try{ const obj = JSON.parse(langRaw); if(typeof obj.ruMode === 'boolean') ruMode = obj.ruMode; }catch(e){} }
    const qaRaw = localStorage.getItem('twQA');
    if(qaRaw){ const saved = JSON.parse(qaRaw); for(let i=1;i<=40;i++){ const key = 't'+i; if(saved[key]){ qa[key].q = saved[key].q || qa[key].q; qa[key].a = saved[key].a || qa[key].a; qa[key].used = !!saved[key].used; } } }
    const tmRaw = localStorage.getItem('twTeamMembers');
    if(tmRaw){
      try{
        const savedTM = JSON.parse(tmRaw);
        teamMembers = new Array(teamCount).fill(null).map(()=>[]);
        for(let i=0;i<Math.min(savedTM.length, teamMembers.length); i++){
          const arr = Array.isArray(savedTM[i]) ? savedTM[i] : [];
          teamMembers[i] = arr.map(n => String(n||'').trim()).filter(n=>n.length>0);
        }
      }catch(e){ teamMembers = new Array(teamCount).fill(null).map(()=>[]); }
    } else {
      teamMembers = new Array(teamCount).fill(null).map(()=>[]);
    }
    const t = localStorage.getItem('twTitle'); const s = localStorage.getItem('twSubtitle');
    if(t){ try{ const el = document.getElementById('gameTitle'); if(el) el.textContent = t; }catch(e){} }
    if(s){ try{ const el = document.getElementById('gameSubtitle'); if(el) el.textContent = s; }catch(e){} }
  }catch(e){}
}
function updateLanguageUI(){
  editBtn.textContent = 'Edit';
  startBtn.textContent = 'Start';
  const spinSpan = document.querySelector('#spinBtn span'); if(spinSpan) spinSpan.textContent = 'Spin';
  closeCard.textContent = 'Close';
  revealBtn.textContent = 'Reveal';
  correctBtn.textContent = 'Correct';
  wrongBtn.textContent = 'Wrong';
  applyTitle.textContent = 'Update';
  applyConfig.textContent = 'Apply';
  importTxtBtn.textContent = 'Import submissions';
  clearImportBtn.textContent = 'Clear import';
  saveQA.textContent = 'Save';
  clearQuestionsBtn.textContent = 'Clear Questions';
  closeEditor.textContent = 'Close';
  const explain = document.getElementById('importExplain');
  if(explain){
    if(ruMode){
      explain.innerHTML = 'Import submissions loads questions from this browser\'s storage and automatically closes the editor to keep entries unseen. When you\'re finished playing, please click <strong>Clear import</strong> to remove stored submissions so future users start fresh.' +
        '<br/>' +
        'Импорт загружает вопросы из локального хранилища этого браузера и автоматически закрывает редактор, чтобы никто не видел записи. По завершении игры, пожалуйста, нажмите <strong>Очистить импорт</strong>, чтобы удалить сохранённые ответы и начать заново для следующих пользователей.';
    } else {
      explain.textContent = 'Import submissions loads questions from this browser\'s storage and automatically closes the editor to keep entries unseen. When you\'re finished playing, please click Clear import to remove stored submissions so future users start fresh.';
    }
  }
}
saveQA.onclick = ()=>{
  defaultPoints = Math.max(1, Number(defaultPointsEditor.value)||100);
  const newQuestionCount = Math.min(40, Math.max(1, Number(questionCountEditor.value)||15));
  const newTeamCount = Math.min(8, Math.max(1, Number(teamCountEditor.value)||4));
  let teamChanged = false;
  if(newTeamCount !== teamCount){
    const old = scores.slice();
    teamCount = newTeamCount;
    scores = new Array(teamCount).fill(0);
    for(let i=0;i<Math.min(old.length, scores.length); i++){ scores[i] = old[i]; }
    if(currentTeam >= teamCount) currentTeam = 0;
    teamChanged = true;
  }
  questionCount = newQuestionCount;
  Array.from(qaList.children).forEach(row=>{
    const id = row.dataset.id;
    const q = row.querySelector('.q').value.trim();
    const a = row.querySelector('.a').value.trim();
    qa[id].q = q || qa[id].q;
    qa[id].a = a || qa[id].a;
  });
  persistState();
  renderTeams();
  renderBoard();
  buildWheel();
  if(teamChanged) populateEditor();
  editor.style.display='none';
};

if(clearQuestionsBtn){
  clearQuestionsBtn.onclick = ()=>{
    if(!confirm('Clear all questions and answers? This resets to defaults.')) return;
    for(let i=1;i<=40;i++){ qa['t'+i].q = 'Question ' + i; qa['t'+i].a = 'Answer ' + i; qa['t'+i].used = false; }
    persistState();
    renderBoard();
    buildWheel();
    populateEditor();
    alert('All questions were reset to defaults.');
  };
}

/* Audio placeholders */
function playCorrect(){}
function playWrong(){}

/* Init */
loadState();
updateLanguageUI();
buildWheel();
renderBoard();
renderTeams();
