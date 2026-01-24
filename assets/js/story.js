// Story Submission Page Script
let ruMode = true;
function lang(en, ru){ return ruMode ? ru : en; }
try{ const raw = localStorage.getItem('twRuMode'); if(raw){ const obj = JSON.parse(raw); if(typeof obj.ruMode === 'boolean') ruMode = obj.ruMode; } }catch(e){}
const titleText = document.getElementById('titleText');
const subText = document.getElementById('subText');
const storyLabel = document.getElementById('storyLabel');
const nameLabel = document.getElementById('nameLabel');
const submitBtn = document.getElementById('submitBtn');
function updateLanguageUI(){
  titleText.textContent = 'Share A Story / Поделитесь историей';
  subText.textContent = "One story at a time. Once you've submitted- there's no going back, so please be careful! / Пожалуйста, отправляйте одну историю за раз. После отправки вернуться нельзя, будьте осторожны!";
  storyLabel.textContent = 'Tell a funny story about your life… (the funnier the better) / Расскажите забавную историю из вашей жизни (чем смешнее, тем лучше)';
  nameLabel.textContent = 'Submit your name… / Укажите своё имя';
  submitBtn.textContent = 'Submit';
}
updateLanguageUI();
const storyEl = document.getElementById('story');
const nameEl = document.getElementById('name');
const exportBtn = document.getElementById('exportBtn');

submitBtn.addEventListener('click', async ()=>{
  if(submitBtn.classList.contains('disabled')) return;
  const story = storyEl.value.trim();
  const name = nameEl.value.trim();
  if(!story){ alert('Please enter your story.'); return; }
  if(!name){ alert('Please enter your name.'); return; }
  submitBtn.textContent = 'Saving…'; submitBtn.classList.add('disabled');
  const line = `${story}||${name}\n`;
  try{ const prev = localStorage.getItem('twSubmissionsText') || ''; localStorage.setItem('twSubmissionsText', prev + line); }catch(e){}
  try{
    await fetch('/api/submit', { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify({ story, name }) });
  }catch(e){ /* server not running; ignore */ }
  storyEl.value = '';
  nameEl.value = '';
  submitBtn.textContent = 'Submit';
  submitBtn.classList.remove('disabled');
  alert('Your story has been submitted.');
});

exportBtn.addEventListener('click', async ()=>{
  const text = localStorage.getItem('twSubmissionsText') || '';
  if(!text){ alert('No submissions found to export.'); return; }
  exportBtn.textContent = 'Exporting…'; exportBtn.classList.add('disabled');
  try{
    const res = await fetch('/api/export-submissions', { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify({ text }) });
    if(res.ok){ alert('Exported submissions to server.'); } else { alert('Failed to export: server error.'); }
  }catch(e){ alert('Failed to export: server not reachable.'); }
  finally{ exportBtn.textContent = 'Export to Server'; exportBtn.classList.remove('disabled'); }
});

function clearInputs(){ try{ storyEl.value=''; nameEl.value=''; }catch(e){} }
window.addEventListener('pagehide', clearInputs);
document.addEventListener('visibilitychange', ()=>{ if(document.visibilityState === 'hidden') clearInputs(); });
window.addEventListener('pageshow', clearInputs);
