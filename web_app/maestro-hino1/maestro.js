/* Docked ADM guide, available for normal hymns with 2, 3, 4, 6, 9 or 12 beats. */
(() => {
 'use strict';
 const panel=document.createElement('section');panel.id='maestroHino1Panel';panel.hidden=true;panel.setAttribute('aria-label','Guia visual de regencia');
 panel.innerHTML='<div class="maestroHino1Head"><label for="maestroGuideView">Visual</label><select id="maestroGuideView" aria-label="Escolher metr&ocirc;nomo, maestro"><option value="metronome">Metr&ocirc;nomo</option><option value="maestro">Maestro</option></select><button type="button" aria-label="Minimizar maestro visual" aria-expanded="true">&minus;</button></div><div class="maestroGuideBody"><div class="maestroVisualGroup"><div class="maestroDockLegend"><strong>MAESTRO VISUAL</strong><span id="maestroMeterLabel">4 TEMPOS &middot; 4/4</span><span id="maestroBeatLabel" aria-label="Tempo atual">1</span><em id="maestroDirectionLabel">PREPARA&Ccedil;&Atilde;O</em><span id="maestroDynamicLabel" hidden></span></div><div class="maestroHino1Stage"><canvas width="360" height="500" role="img" aria-label="Maestro regendo em dois, tres, quatro, seis, nove ou doze tempos"></canvas><span role="status">Carregando maestro...</span></div></div></div>';
 document.body.appendChild(panel);
 const canvas=panel.querySelector('canvas'),context=canvas.getContext('2d'),renderScale=Math.min(3,window.devicePixelRatio||1);
 canvas.width=Math.round(360*renderScale);canvas.height=Math.round(500*renderScale);context?.setTransform(renderScale,0,0,renderScale,0,0);
 const status=panel.querySelector('[role="status"]'),label=panel.querySelector('#maestroDirectionLabel'),meterLabel=panel.querySelector('#maestroMeterLabel'),modeSelect=panel.querySelector('select');
 let lastWasDynamics=false,endingSnapshot=null,endingBlendStart=0,playbackStarted=false;
 const dynamicLabel=panel.querySelector('#maestroDynamicLabel');
 let gestureBeats=4;const gestureCache={};let ending=false,endingRaf=0,endingStarted=0,endingDrawn=-1;
 const endingImage=new Image();endingImage.src='maestro-hino1/finalizacao-3-v275.webp?v=277-rests';
 function cancelEnding(){endingSnapshot=null;lastWasDynamics=false;window.HinarioMaestroDynamics?.reset();ending=false;cancelAnimationFrame(endingRaf);endingDrawn=-1;delete panel.dataset.ending;delete panel.dataset.finalFrame;}
 function drawEnding(sourceFrame){
  const data=window.HinarioMaestroEnding3;if(!data||!endingImage.complete||!endingImage.naturalWidth)return;
  let i=0;for(let j=1;j<data.frames.length;j++){if(Math.abs(data.frames[j]-sourceFrame)<Math.abs(data.frames[i]-sourceFrame))i=j;}
  const blendNow=performance.now();if(!endingSnapshot&&lastWasDynamics&&hymnalDynamicsEnabled&&sourceFrame>25){endingSnapshot=document.createElement('canvas');endingSnapshot.width=canvas.width;endingSnapshot.height=canvas.height;endingSnapshot.getContext('2d').drawImage(canvas,0,0);endingBlendStart=blendNow;}
  if(endingDrawn===i&&!endingSnapshot)return;endingDrawn=i;frame=-1;dynamicLabel.hidden=true;lastWasDynamics=false;
  if(window.HinarioMaestroDynamics?.drawFullFrame)window.HinarioMaestroDynamics.drawFullFrame(context,endingImage,(i%8)*360,Math.floor(i/8)*500);else{context.clearRect(0,0,360,500);context.drawImage(endingImage,(i%8)*360,Math.floor(i/8)*500,360,500,0,0,360,500);}
  window.HinarioMaestroDynamics?.drawBaton(context,data.shaft[i]);
  if(endingSnapshot&&blendNow-endingBlendStart<250){context.save();context.globalAlpha=1-(blendNow-endingBlendStart)/250;context.drawImage(endingSnapshot,0,0,360,500);context.restore();}
  if(endingSnapshot&&blendNow-endingBlendStart>=250)endingSnapshot=null;
  panel.dataset.finalFrame=String(data.frames[i]);
 }
 function finish(){
  if(!eligible()||viewMode!=='maestro'){document.body.classList.remove('maestroPlaybackCompact');queueDockLayout();return false;}
  if(ending)return true;
  const useCut=Number(currentItem.numero)===34&&endingImage.complete&&endingImage.naturalWidth;
  const state=window.HinarioMaestroDynamics?.getState(),startSlot=state?.slot||0,lastFrame=Math.max(0,frame);
  ending=true;endingDrawn=-1;endingStarted=performance.now();panel.dataset.ending='true';document.body.classList.add('maestroPlaybackCompact');
  const tick=()=>{if(!ending)return;if(!eligible()){cancelEnding();return;}const elapsed=performance.now()-endingStarted;
   label.textContent=elapsed<300&&useCut?'CORTE':elapsed<3300?'ENCERRANDO':'ENCERROU';
   if(useCut)drawEnding(elapsed<300?91+elapsed/300*18:109+Math.min(1,(elapsed-300)/3000)*72);
   else{window.HinarioMaestroDynamics?.relax(context,lastFrame,startSlot,Math.min(1,elapsed/1200),gestureBeats);dynamicLabel.hidden=true;}
   if(elapsed<3300){endingRaf=requestAnimationFrame(tick);}else{ending=false;playbackStarted=false;delete panel.dataset.ending;document.body.classList.remove('maestroPlaybackCompact');queueDockLayout();resetVisualPlaybackPosition();}
  };endingRaf=requestAnimationFrame(tick);return true;
 }
 let active=false,atlas=null,ready=false,token=0,frame=-1,beat=1,sourceMs=0,viewMode='maestro',layoutQueued=false;
 try{const stored=localStorage.getItem('hinarioHino1GuideView');if(['metronome','maestro'].includes(stored))viewMode=stored;}catch(_){}
 try{if(localStorage.getItem('hinarioMaestroAllMetersV1')!=='1'){viewMode='maestro';localStorage.setItem('hinarioHino1GuideView','maestro');localStorage.setItem('hinarioMaestroAllMetersV1','1');}}catch(_){}
 modeSelect.value=viewMode;panel.dataset.viewMode=viewMode;
 function takeMetronome(){const metro=document.getElementById('visualMetronomePanel');if(metro)metro.parentNode.insertBefore(panel,metro);}
 function restoreMetronome(release=false){if(release)document.body.appendChild(panel);}
 function renderMeter(){}
 function applyView(){
  panel.dataset.viewMode=viewMode;modeSelect.value=viewMode;
  if(!active)return;takeMetronome();
  document.body.classList.toggle('maestroOnlyDock',viewMode==='maestro');
  if(viewMode==='metronome'){const metro=document.getElementById('visualMetronomePanel');metro?.classList.remove('closed','minimized');setVisualMetronomeEnabled(true);syncVisualMetronomeWindowButtons();}
  queueDockLayout();
 }
 function dockLayout(){
  if(!active)return;
  if(!document.body.classList.contains('maestroDockActive'))document.body.classList.add('maestroDockActive');
  const score=document.getElementById('scoreWrap');if(!score)return;
  const controls=document.querySelector('.header-toolbar .transportGroup')?.getBoundingClientRect();
  const reserve=controls&&controls.height>0&&controls.top>innerHeight*.5?Math.max(64,innerHeight-controls.top+6):70;
  const height=Math.max(80,Math.floor(innerHeight-score.getBoundingClientRect().top-reserve));
  const value=height+'px';if(document.body.style.getPropertyValue('--maestroDockScoreHeight')!==value)document.body.style.setProperty('--maestroDockScoreHeight',value);
 }
 function queueDockLayout(){if(layoutQueued||!active)return;layoutQueued=true;requestAnimationFrame(()=>{layoutQueued=false;dockLayout();});}
  const excluded = ['mobileHomeOpen','apkInstrumentPanelOpen','voiceVolumeOverlayOpen','schoolFluteStudyActive','schoolPlayerActive','schoolSaxAltoActive','schoolClarinetActive','schoolTrumpetActive','schoolViolinActive','studyVoiceActive','pianoFacilActive','webToqueJuntoActive','toqueJuntoSessionActive','adminLiveActive','adminGuitarSession','arranjosSessionActive','historicalPlayerActive','msaPlayerActive','orgaoPlayerActive'];
  let meterXml=null,meterSupported=false;
  function supportsMeter(){
   try{const xml=originalXmlText||'';if(xml!==meterXml){meterXml=xml;const doc=new DOMParser().parseFromString(xml,'application/xml'),part=doc.querySelector('score-partwise > part');const times=[...part?.querySelectorAll('measure > attributes > time')||[]];meterSupported=times.length>0&&times.every(t=>[2,3,4,6,9,12].includes(Number(t.querySelector('beats')?.textContent))&&Number(t.querySelector('beat-type')?.textContent)>0);}return meterSupported;}catch(_){return false;}
  }
  function eligible() {
    try {
      return !!AndroidHymnal.isOwnerMode() && loaded && currentItem?.tipo === 'hino' && supportsMeter()
        && !toqueJuntoActive && !studyVoiceActive && !schoolFluteStudyActive
        && !excluded.some(name => document.body.classList.contains(name))
        && !document.querySelector('.mobileScreen.open, .hymnalLanding.open, .hinoDrawer.aberta, .instrumentDrawer.aberta, .easyDrawer.aberta');
    } catch (_) { return false; }
  }
  function draw(index,quarter=0,plan=null) {
    if(!ready||!context)return;
    if(!window.HinarioMaestroDynamics?.ready(gestureBeats)){canvas.hidden=true;status.hidden=false;status.textContent='Carregando maestro...';return;}
    if(window.HinarioMaestroDynamics?.ready(gestureBeats)){const result=window.HinarioMaestroDynamics.draw(context,index,quarter,plan,!!hymnalDynamicsEnabled&&playbackStarted,gestureBeats);if(result){lastWasDynamics=true;frame=index;panel.dataset.frame=String(index);panel.dataset.dynamicLevel=result.level;panel.dataset.dynamicSlot=String(result.slot);dynamicLabel.hidden=false;dynamicLabel.textContent=hymnalDynamicsEnabled?'Din'+String.fromCharCode(226)+'mica: '+(playbackStarted?result.level:'aguardando Play'):'Din'+String.fromCharCode(226)+'mica desligada';return;}}
    dynamicLabel.hidden=true;lastWasDynamics=false;
    if(frame===index)return;
    context.clearRect(0,0,360,500);
    context.drawImage(atlas,(index%8)*360,Math.floor(index/8)*500,360,500,0,0,360,500);
    window.HinarioMaestroDynamics?.drawBaton(context,(gestureBeats===3?window.HinarioMaestroShaft3:window.HinarioMaestroShaft)?.[index]);
    frame=index;panel.dataset.frame=String(index);
  }
  function showTime(milliseconds) {
    sourceMs=Math.max(0,Number(milliseconds)||0);
    if (!active||ending) return;
    const plan=buildVisualMetronomePlan();
    const nominalMs=applyKnownVisualMetronomeAdvance(applyKnownHymnCursorAdvance(visualPlaybackTimeMs(sourceMs)));
    let quarter=Math.max(0,nominalMs-75)*Math.max(1,currentBpm())/60000;const unboundedQuarter=quarter;
    const end=visualMetronomeFinalPulseQuarter(plan);
    if (Number.isFinite(end)&&end>0) quarter=Math.min(quarter,Math.max(0,end));
    const segments=plan.meterSegments?.length?plan.meterSegments:[{startQuarter:0,beats:4,beatType:4,beatOffset:plan.beatOffset||0}];
    let meter=segments[0];for(const next of segments){if(next.startQuarter<=quarter+.000001)meter=next;else break;}
    const beats=Number(meter.beats),movement=window.HinarioMaestroDynamics?.movementConfig(beats);
    if(![2,3,4,6,9,12].includes(beats)||!movement){status.textContent='Movimento ainda indisponivel';status.hidden=false;canvas.hidden=true;return;}
    if(gestureBeats!==beats){gestureBeats=beats;frame=-1;ready=false;}
    if(!gestureCache[beats]){const img=new Image();gestureCache[beats]=img;img.onload=()=>{if(active&&gestureBeats===beats){atlas=img;ready=true;frame=-1;showTime(sourceMs);}};img.onerror=()=>{status.textContent='Erro ao carregar o maestro';status.hidden=false;};img.src='maestro-hino1/'+(beats===3?'movimento-3-tempos.webp':'movimento-1-frente.webp')+'?v=277-rests';}
    atlas=gestureCache[beats];ready=atlas.complete&&atlas.naturalWidth>0;
    canvas.hidden=false;status.hidden=ready;
    const raw=Math.max(0,quarter-(Number(meter.startQuarter)||0))*(Number(meter.beatType)||4)/4;
    const position=(meter===segments[0]&&raw<1?(raw<=.24?0:(raw-.24)/.76):raw)+(Number(meter.beatOffset)||0);
    const phase=((position%beats)+beats)%beats;
    beat=Math.floor(phase)+1;
    panel.querySelector('#maestroBeatLabel').textContent=String(beat);label.textContent=VISUAL_METRONOME_DIRECTIONS[beats]?.[beat-1]||('TEMPO '+beat);meterLabel.textContent=beats+' TEMPOS '+String.fromCharCode(183)+' '+meter.beats+'/'+meter.beatType;panel.dataset.beat=String(beat);panel.dataset.position=phase.toFixed(6);
    const soundEnd=Number(plan.lastSoundEndQuarters),offset=Number(meter.beatOffset)||0;
    const finalStart=visualMetronomeFinalPulseQuarter(plan); // Last actual pulse: Hino 34 ends on 2 after its pickup.
    if(Number(currentItem.numero)===34&&viewMode==='maestro'&&!loopEnabled&&hymnalDynamicsEnabled&&unboundedQuarter>=finalStart-1&&unboundedQuarter<finalStart){draw(Math.min(movement.frames-1,Math.floor(phase*movement.framesPerBeat)),finalStart-1,plan);}
    else if(Number(currentItem.numero)===34&&viewMode==='maestro'&&!loopEnabled&&unboundedQuarter>=finalStart-1&&unboundedQuarter>0){drawEnding(unboundedQuarter<finalStart?1+Math.max(0,unboundedQuarter-(finalStart-1))*24:Math.min(49,25+Math.max(0,unboundedQuarter-finalStart)*48));}
    else{endingDrawn=-1;endingSnapshot=null;delete panel.dataset.finalFrame;draw(Math.min(movement.frames-1,Math.floor(phase*movement.framesPerBeat)),unboundedQuarter,plan);}
    renderMeter(sourceMs);
  }

 function syncContext(){
  const next=eligible();panel.hidden=!next;
  if(ending&&(!next||document.body.classList.contains('scorePlaybackActive')))cancelEnding();
  if(next&&document.body.classList.contains('scorePlaybackActive'))playbackStarted=true;
  if(next&&document.body.classList.contains('scorePlaybackActive')&&!document.body.classList.contains('maestroPlaybackCompact'))document.body.classList.add('maestroPlaybackCompact');
  if(!next&&document.body.classList.contains('maestroPlaybackCompact'))document.body.classList.remove('maestroPlaybackCompact');
  if(next===active){if(active)queueDockLayout();return;}
  active=next;token++;frame=-1;if(!active)playbackStarted=false;
  if(!active){restoreMetronome(true);document.body.classList.remove('maestroDockActive','maestroOnlyDock');document.body.style.removeProperty('--maestroDockScoreHeight');ready=false;atlas=null;context?.clearRect(0,0,360,500);return;}
  takeMetronome();applyView();sourceMs=0;status.textContent='Carregando maestro...';status.hidden=false;
  const request=token;atlas=new Image();atlas.onload=()=>{if(request!==token||!active)return;ready=true;status.hidden=true;showTime(sourceMs);queueDockLayout();};atlas.onerror=()=>{if(request!==token||!active)return;status.textContent='Erro ao carregar o maestro';status.hidden=false;};
  atlas.src='maestro-hino1/movimento-1-frente.webp?v=277-rests';showTime(Math.max(0,Number(lastTime)||0));
 }
 panel.querySelector('button').addEventListener('click',()=>{
  const minimized=panel.classList.toggle('minimized'),button=panel.querySelector('button');button.textContent=minimized?'+':String.fromCharCode(0x2212);button.setAttribute('aria-expanded',String(!minimized));button.setAttribute('aria-label',minimized?'Expandir maestro visual':'Minimizar maestro visual');showTime(sourceMs);queueDockLayout();
 });
 modeSelect.addEventListener('change',()=>{const wasEnding=ending;cancelEnding();if(wasEnding)resetVisualPlaybackPosition();viewMode=modeSelect.value;try{localStorage.setItem('hinarioHino1GuideView',viewMode);}catch(_){}panel.classList.remove('minimized');const button=panel.querySelector('button');button.textContent=String.fromCharCode(0x2212);button.setAttribute('aria-expanded','true');applyView();showTime(sourceMs);});
 document.getElementById('mobileVisualMetronomeBtn')?.addEventListener('click',event=>{if(!eligible()||viewMode==='metronome')return;event.preventDefault();event.stopImmediatePropagation();panel.classList.remove('minimized');panel.querySelector('button').textContent=String.fromCharCode(0x2212);panel.querySelector('button').setAttribute('aria-expanded','true');modeSelect.focus();showTime(sourceMs);queueDockLayout();},true);
 window.addEventListener('resize',queueDockLayout);
 window.addEventListener('maestroDynamicsReady',()=>{if(active){frame=-1;showTime(sourceMs);}});
 const dynamicButton=document.getElementById('mobileDynamicsBtn');if(dynamicButton)new MutationObserver(()=>{if(active){window.HinarioMaestroDynamics?.reset();frame=-1;showTime(sourceMs);}}).observe(dynamicButton,{attributes:true,attributeFilter:['aria-pressed']});
 window.HinarioMaestroTest={syncContext,isEnding(){return ending;},ownsMetronome(){return eligible()&&viewMode==='maestro';},update(milliseconds){syncContext();showTime(milliseconds);},finish,reset(){cancelEnding();playbackStarted=false;document.body.classList.remove('maestroPlaybackCompact');syncContext();showTime(0);},getState(){return {active,ready:ready&&!!window.HinarioMaestroDynamics?.ready(gestureBeats),frame,beat,sourceMs,viewMode,docked:true,ending,finalFrame:panel.dataset.finalFrame||null};}};
 const observer=new MutationObserver(syncContext);observer.observe(document.body,{attributes:true,attributeFilter:['class']});document.querySelectorAll('.hinoDrawer,.instrumentDrawer,.easyDrawer').forEach(drawer=>observer.observe(drawer,{attributes:true,attributeFilter:['class']}));
 const resizeObserver=new ResizeObserver(queueDockLayout);resizeObserver.observe(panel);const header=document.querySelector('header');if(header)resizeObserver.observe(header);
 const metro=document.getElementById('visualMetronomePanel');if(metro){resizeObserver.observe(metro);new MutationObserver(()=>{if(viewMode==='metronome')queueDockLayout();}).observe(metro,{attributes:true,attributeFilter:['class','style']});}
 syncContext();
})();
