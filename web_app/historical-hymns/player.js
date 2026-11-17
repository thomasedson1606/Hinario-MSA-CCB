(()=>{
 const screen=document.getElementById('historicalHymnalLanding'),home=document.getElementById('mobileHome');
 const key='historicalHymnsLibraryV2',state={active:false,items:[],query:'',lastId:'',snapshot:null,ensemble:'orquestra-oitavada',dynamics:false};
 const HISTORICAL_PLAYER={active:false,snapshot:null,currentId:'',request:0};
 const el=id=>document.getElementById(id),esc=value=>String(value||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const origin=item=>item.book==='harpa'?'Harpa Cristã':`Hinário ${item.book}`;
 const normalize=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 try{state.lastId=JSON.parse(localStorage.getItem(key)||'{}').lastId||'';}catch(e){}
 async function ensureCatalog(){if(state.items.length)return;const r=await fetch('historical-hymns/catalog.json?v=284-public');if(!r.ok)throw Error('Não foi possível carregar os hinos históricos.');state.items=await r.json();}
 function render(){
  const items=state.items.filter(i=>!state.query||normalize(i.title).includes(normalize(state.query)));
  el('historicalCount').textContent=state.query?`${items.length} de ${state.items.length} hinos`:`${state.items.length} hinos disponíveis · Tom original`;
  el('historicalSongList').innerHTML=items.map(i=>`<button class="historicalSong" data-historical-song="${esc(i.id)}" type="button"><span aria-hidden="true">♪</span><span><strong>${esc(i.title)}</strong><small>${esc(origin(i))} · Tom original · Abrir partitura</small></span><b aria-hidden="true">›</b></button>`).join('')||'<p class="historicalEmpty">Nenhum hino encontrado.</p>';
 }
 function showLibrary(){screen.classList.add('open');screen.setAttribute('aria-hidden','false');document.body.classList.add('historicalCatalogActive');render();}
 async function open(){
  if(!requirePaidContent('Os Hinos Históricos estão disponíveis para assinantes Premium e VIP.'))return;
  if(HISTORICAL_PLAYER.active){closePlayer();return;}
  if(!state.active){state.snapshot={homeScroll:home.scrollTop,homeOpen:home.classList.contains('open'),homeBody:document.body.classList.contains('mobileHomeOpen')};state.active=true;home.classList.remove('open');document.body.classList.remove('mobileHomeOpen');}
  screen.classList.add('open');screen.setAttribute('aria-hidden','false');document.body.classList.add('historicalCatalogActive');screen.scrollTop=0;
  try{await ensureCatalog();render();}catch(e){el('historicalSongList').textContent=e.message;}
 }
 function close(){
  if(HISTORICAL_PLAYER.active)closePlayer();
  screen.classList.remove('open');screen.setAttribute('aria-hidden','true');document.body.classList.remove('historicalCatalogActive');state.active=false;
  if(state.snapshot){home.classList.toggle('open',state.snapshot.homeOpen);document.body.classList.toggle('mobileHomeOpen',state.snapshot.homeBody);home.scrollTop=state.snapshot.homeScroll;}state.snapshot=null;
 }
 function captureHistoricalReturnState(){
  if(HISTORICAL_PLAYER.snapshot)return;
  captureSchoolSaxAltoEngineState('historical');
  const metro=document.getElementById('visualMetronomePanel');
  HISTORICAL_PLAYER.snapshot={currentItem:currentItem?{...currentItem}:null,currentHinoIndex,lastRegularItem:{...lastRegularItem},currentTitleFromXml,currentTom,currentFreeTranspose,currentVoiceMode,pianoFacilMode,toqueJuntoActive,studyVoiceActive,schoolFluteStudyActive,schoolFluteStudyPending,
    instrumentSolProgram,instrumentFaProgram,clefSelectedVoices:[...clefSelectedVoices],clefVoiceInstruments:{...clefVoiceInstruments},coro1VoiceInstruments:{...coro1VoiceInstruments},coro1SelectedVoices:{...coro1SelectedVoices},voiceVolumes:{...voiceVolumes},activeHymnalEnsembleId,activeHymnalEnsembleResolved,activeHymnalEnsembleResolvedKey,
    bpm:document.getElementById('bpmInput').value,currentTempoUnit,hymnalDynamicsEnabled,currentHymnalDynamicPlan:JSON.parse(JSON.stringify(currentHymnalDynamicPlan||[])),metroClasses:metro.className,metroStyle:metro.getAttribute('style'),visualMetronomeEnabled,visualMetronomeSoundEnabled,visualActive:document.body.classList.contains('visualMetronomeActive'),bodyClasses:document.body.className,loopEnabled,scoreLeft:scoreWrap.scrollLeft,scoreTop:scoreWrap.scrollTop};
}
function restoreHistoricalReturnState(){
  const s=HISTORICAL_PLAYER.snapshot;if(!s)return;HISTORICAL_PLAYER.snapshot=null;clearTimeout(androidMidiUpdateTimer);
  currentItem=s.currentItem;currentHinoIndex=s.currentHinoIndex;lastRegularItem={...s.lastRegularItem};currentTitleFromXml=s.currentTitleFromXml;currentTom=s.currentTom;currentFreeTranspose=s.currentFreeTranspose;currentVoiceMode=s.currentVoiceMode;pianoFacilMode=s.pianoFacilMode;toqueJuntoActive=s.toqueJuntoActive;studyVoiceActive=s.studyVoiceActive;schoolFluteStudyActive=s.schoolFluteStudyActive;schoolFluteStudyPending=s.schoolFluteStudyPending;
  instrumentSolProgram=s.instrumentSolProgram;instrumentFaProgram=s.instrumentFaProgram;clefSelectedVoices=new Set(s.clefSelectedVoices);clefVoiceInstruments={...s.clefVoiceInstruments};Object.assign(coro1VoiceInstruments,s.coro1VoiceInstruments);Object.assign(coro1SelectedVoices,s.coro1SelectedVoices);Object.assign(voiceVolumes,s.voiceVolumes);activeHymnalEnsembleId=s.activeHymnalEnsembleId;activeHymnalEnsembleResolved=s.activeHymnalEnsembleResolved;activeHymnalEnsembleResolvedKey=s.activeHymnalEnsembleResolvedKey;
  hymnalDynamicsEnabled=s.hymnalDynamicsEnabled;currentHymnalDynamicPlan=s.currentHymnalDynamicPlan;
  document.getElementById('bpmInput').value=s.bpm;setTempoUnit(s.currentTempoUnit);
  const metro=document.getElementById('visualMetronomePanel');metro.className=s.metroClasses;if(s.metroStyle===null)metro.removeAttribute('style');else metro.setAttribute('style',s.metroStyle);
  visualMetronomeEnabled=s.visualMetronomeEnabled;visualMetronomeSoundEnabled=s.visualMetronomeSoundEnabled;document.body.classList.toggle('visualMetronomeActive',s.visualActive);
  visualMetronomePlan=null;visualMetronomePlanKey='';restoreSchoolSaxAltoEngineState('historical');scoreWrap.scrollLeft=s.scoreLeft;scoreWrap.scrollTop=s.scoreTop;
  document.body.className=s.bodyClasses;loopEnabled=s.loopEnabled;document.getElementById('loopBtn')?.classList.toggle('active',loopEnabled);try{AndroidHymnal.setLoopEnabled(loopEnabled)}catch(e){}
  updateHymnalDynamicsButton();updateEnsemblePanel();updateTomButtons();updateVoiceButtons();updateTituloTopo();syncSchoolFluteQuickActions();syncVisualMetronomeWindowButtons();syncVisualMetronomeSoundButton();
}

 async function play(id){
  if(!requirePaidContent('Os Hinos Históricos estão disponíveis para assinantes Premium e VIP.'))return;
  await ensureCatalog();const item=state.items.find(i=>i.id===id);if(!item)return;
  const request=++HISTORICAL_PLAYER.request;
  try{
   const r=await fetch(item.file+'?v=284-public');if(!r.ok)throw Error('Partitura indisponível.');const xml=await r.text();if(request!==HISTORICAL_PLAYER.request)return;
   captureHistoricalReturnState();stopPlayback();
   screen.classList.remove('open');screen.setAttribute('aria-hidden','true');document.body.classList.remove('historicalCatalogActive','mobileHomeOpen');
   if(HISTORICAL_PLAYER.currentId!==id)state.ensemble='orquestra-oitavada';
   HISTORICAL_PLAYER.active=true;HISTORICAL_PLAYER.currentId=id;
   currentItem={tipo:'historical',id:item.id,numero:state.items.indexOf(item)+1,titulo:item.title,arquivo:item.file};currentHinoIndex=-1;currentTom='do';currentFreeTranspose=null;currentVoiceMode='4vozes';pianoFacilMode=false;toqueJuntoActive=false;studyVoiceActive=false;schoolFluteStudyActive=false;schoolFluteStudyPending=false;activeHymnalEnsembleId=state.ensemble;hymnalDynamicsEnabled=state.dynamics;clefSelectedVoices=new Set(CLEF_VOICE_NAMES);clefVoiceInstruments={soprano:'clave',contralto:'clave',tenor:'clave',baixo:'clave'};activeHymnalEnsembleResolved=null;activeHymnalEnsembleResolvedKey='';instrumentSolProgram=0;instrumentFaProgram=0;
   document.body.classList.add('historicalPlayerActive');
   await loadText(xml);if(request!==HISTORICAL_PLAYER.request||!HISTORICAL_PLAYER.active)return;
   if(!loaded||!score.querySelector('svg'))throw Error('Não foi possível abrir esta partitura.');
   currentTitleFromXml=item.title;updateTituloTopo();
   el('historicalPlayerTitle').textContent=item.title;el('historicalPlayerOrigin').textContent=origin(item)+' · Tom original';
   el('historicalSongSelect').innerHTML=state.items.map(i=>`<option value="${esc(i.id)}">${esc(i.title)}</option>`).join('');el('historicalSongSelect').value=id;
   resetVisualMetronomeStripForHymn();const metro=el('visualMetronomePanel');metro.classList.remove('closed','maximized','minimized');syncVisualMetronomeWindowButtons();syncBpm();layout();
   el('historicalOrchestra').innerHTML='<option value="">Instrumentação original</option>'+HYMNAL_ENSEMBLES.filter(i=>i.kind==='orchestra').map(i=>`<option value="${esc(i.id)}">${esc(i.name)}</option>`).join('');syncPerformanceControls();window.ExtendedMaestro?.update(0);layout();
   state.lastId=id;localStorage.setItem(key,JSON.stringify({lastId:id}));
   setStatus('Hino histórico pronto · Tom original.');
  }catch(e){console.error(e);setStatus(e.message);if(HISTORICAL_PLAYER.active)closePlayer();el('historicalCount').textContent=e.message;}
 }
 function closePlayer(){
  if(!HISTORICAL_PLAYER.active)return;
  ++HISTORICAL_PLAYER.request;clearTimeout(bpmUpdateTimer);bpmUpdateTimer=null;stopPlayback();HISTORICAL_PLAYER.active=false;
  document.body.classList.remove('historicalPlayerActive');
  for(const p of ['--historical-score-top','--historical-score-bottom','--historical-metronome-top'])document.body.style.removeProperty(p);
  restoreHistoricalReturnState();showLibrary();
 }
// Used only by the private historical player; the displayed XML is untouched.
function historicalSatbMidi(xml){
 const doc=new DOMParser().parseFromString(xml,'application/xml');
 const parts=[...doc.querySelectorAll('score-partwise > part')];
 if(parts.length===1){
  const original=parts[0],staffNumbers=[...original.querySelectorAll('note > staff')].map(n=>Number(n.textContent));
  if(!staffNumbers.includes(2))return '';
  const list=doc.querySelector('part-list');list.replaceChildren();
  for(const staff of [1,2]){
   const part=original.cloneNode(true),id='historical-staff-'+staff;part.setAttribute('id',id);
   const definition=doc.createElement('score-part');definition.setAttribute('id',id);definition.appendChild(doc.createElement('part-name'));list.appendChild(definition);
   for(const note of [...part.querySelectorAll('note')]){
    const noteStaff=Number(note.querySelector(':scope > staff')?.textContent||1);
    if(noteStaff!==staff){
     const duration=note.querySelector(':scope > duration');
     if(duration&&!note.querySelector(':scope > chord, :scope > grace')){const f=doc.createElement('forward');f.appendChild(duration.cloneNode(true));note.replaceWith(f);}else note.remove();
    }else{note.querySelector(':scope > staff')?.remove();}
   }
   part.querySelectorAll('attributes > staves').forEach(n=>n.textContent='1');
   part.querySelectorAll('attributes > clef').forEach(n=>{if(Number(n.getAttribute('number')||1)!==staff)n.remove();else n.removeAttribute('number');});
   original.parentNode.insertBefore(part,original);
  }
  original.remove();
 }
 return renderSingleSatbMidiFromXml(new XMLSerializer().serializeToString(doc));
}
function syncPerformanceControls(){
 el('historicalOrchestra').value=state.ensemble;
 const button=el('historicalDynamics');button.textContent=state.dynamics?'Dinâmica: ligada':'Dinâmica: desligada';button.classList.toggle('active',state.dynamics);button.setAttribute('aria-pressed',String(state.dynamics));
}
function changePerformance(){
 if(!HISTORICAL_PLAYER.active)return;
 const playing=document.body.classList.contains('scorePlaybackActive'),position=Math.max(0,lastTime||0);let scheduled=false;
 if(playing){try{AndroidHymnal.resumeAfterNextPrepare(Math.round(position));scheduled=true;}catch(e){}}
 stopPlayback();activeHymnalEnsembleId=state.ensemble;activeHymnalEnsembleResolved=null;activeHymnalEnsembleResolvedKey='';hymnalDynamicsEnabled=state.dynamics;
 refreshScoreForEnsembleVisuals();prepareMidi();lastTime=position;
 try{AndroidHymnal.rememberPlaybackPosition(Math.round(position));}catch(e){}
 updateCursorByMidiTime(position/1000,true);syncPerformanceControls();layout();
 if(playing&&!scheduled)setTimeout(()=>{if(HISTORICAL_PLAYER.active)startPlaybackAtMs(position)},650);
}

 async function navigate(direction){
  if(!HISTORICAL_PLAYER.active)return;
  const index=state.items.findIndex(i=>i.id===HISTORICAL_PLAYER.currentId);if(index<0)return;
  return play(state.items[(index+direction+state.items.length)%state.items.length].id);
 }
 function syncBpm(){if(HISTORICAL_PLAYER.active)el('historicalPlayerBpm').textContent=currentBpm()+' BPM';}
 function layout(){
  if(!HISTORICAL_PLAYER.active)return;
  const bar=el('historicalPlayerBar').getBoundingClientRect(),metro=window.ExtendedMaestro?.historicalPanel()||el('visualMetronomePanel'),transport=document.querySelector('.header-toolbar .transportGroup').getBoundingClientRect();
  document.body.style.setProperty('--historical-metronome-top',Math.ceil(bar.bottom+5)+'px');
  document.body.style.setProperty('--historical-score-top',Math.ceil(metro.getBoundingClientRect().bottom+5)+'px');
  document.body.style.setProperty('--historical-score-bottom',Math.max(55,Math.ceil(innerHeight-transport.top+5))+'px');
 }
 el('mobileHomeHistorical').onclick=open;el('historicalHomeBack').onclick=close;
 el('historicalSearch').oninput=e=>{state.query=e.target.value;render()};
 el('historicalSongList').onclick=e=>{const row=e.target.closest('[data-historical-song]');if(row)play(row.dataset.historicalSong);};
 el('historicalOrchestra').onchange=e=>{state.ensemble=e.target.value;changePerformance()};el('historicalDynamics').onclick=()=>{state.dynamics=!state.dynamics;changePerformance()};
 el('historicalPlayerBack').onclick=closePlayer;el('historicalSongSelect').onchange=e=>play(e.target.value);
 el('historicalPlayerBpmMinus').onclick=()=>{ajustarBpm(-1);syncBpm()};el('historicalPlayerBpmPlus').onclick=()=>{ajustarBpm(1);syncBpm()};
 el('historicalPlayerMetro').onclick=()=>{const m=window.ExtendedMaestro?.historicalPanel()||el('visualMetronomePanel');m.classList.toggle('minimized');m.classList.remove('closed','maximized');syncVisualMetronomeWindowButtons();layout()};
 for(const [id,direction] of [['previousHymnBtn',-1],['nextHymnBtn',1]])el(id)?.addEventListener('click',e=>{if(HISTORICAL_PLAYER.active){e.stopImmediatePropagation();e.preventDefault();navigate(direction)}},true);
 el('mobileHomeBtn')?.addEventListener('click',e=>{if(HISTORICAL_PLAYER.active){e.stopImmediatePropagation();e.preventDefault();closePlayer();close()}},true);
 el('bpmInput')?.addEventListener('input',syncBpm);window.addEventListener('resize',layout);
 new ResizeObserver(()=>requestAnimationFrame(layout)).observe(el('historicalPlayerBar'));
 window.HistoricalHymns={state,open,close};window.HistoricalPlayer={state:HISTORICAL_PLAYER,play,close:closePlayer,navigate,layout,renderMidi:historicalSatbMidi};
})();
