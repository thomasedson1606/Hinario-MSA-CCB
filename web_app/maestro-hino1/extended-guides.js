(()=>{'use strict';
 const panel=document.createElement('section');panel.id='extendedMaestroPanel';panel.className='extendedMaestroPanel';panel.hidden=true;
 panel.innerHTML='<div class="extendedGuideHead"><label><span>Visual</span> <select aria-label="Guia visual"><option value="metronome">Metrônomo</option><option value="maestro">Maestro</option></select></label><button class="extendedMinimize" aria-label="Minimizar maestro">−</button></div><div class="extendedGuideFigure"><div class="extendedGuideLegend"><strong>MAESTRO VISUAL</strong><span class="extendedMeter"></span><b class="extendedBeat">1</b><span class="extendedDirection"></span><small class="extendedDynamics"></small></div><canvas aria-label="Maestro visual"></canvas></div><div class="extendedZoom"><button data-zoom="-1" aria-label="Diminuir maestro">−</button><output>100%</output><button data-zoom="1" aria-label="Aumentar maestro">+</button></div>';
 document.body.appendChild(panel);const canvas=panel.querySelector('canvas'),ctx=canvas.getContext('2d'),scale=Math.min(3,devicePixelRatio||1);canvas.width=360*scale;canvas.height=500*scale;ctx.setTransform(scale,0,0,scale,0,0);
 const select=panel.querySelector('select'),metro=document.getElementById('visualMetronomePanel'),views={historical:'maestro',live:'metronome'},position={zoom:1,x:null,y:null},pointers=new Map();
 let kind='',key='',ms=0,started=false,beats=4,index=0,ending=false,raf=0,drag=null,pinch=null,layoutQueued=false;
 const historicalSelect=document.createElement('select');historicalSelect.id='historicalGuideView';historicalSelect.setAttribute('aria-label','Guia visual');historicalSelect.innerHTML=select.innerHTML;document.getElementById('historicalPlayerMetro')?.before(historicalSelect);
 const liveSelect=document.createElement('button');liveSelect.type='button';liveSelect.id='liveGuideView';liveSelect.setAttribute('aria-label','Guia visual Live');liveSelect.textContent='Visual: Metrônomo';document.querySelector('#adminLiveBar .adminLiveTransport')?.append(liveSelect);
 function contextKind(){if(!loaded)return '';if(document.body.classList.contains('historicalPlayerActive')&&currentItem?.tipo==='historical')return 'historical';if(document.body.classList.contains('adminLiveActive')&&document.body.classList.contains('adminLiveClassic')&&adminGuitarIsOwner()&&['hino','coro'].includes(currentItem?.tipo))return 'live';return '';}
 const liveToggle=document.createElement('button');liveToggle.className='extendedLiveToggle';liveToggle.type='button';liveToggle.textContent='Metrônomo';liveToggle.addEventListener('click',()=>setView('metronome'));panel.querySelector('.extendedGuideHead').prepend(liveToggle);
 const selected=()=>kind&&views[kind]==='maestro';
 function cancel(){ending=false;cancelAnimationFrame(raf);}
 function layout(){layoutQueued=false;if(!kind)return;if(kind==='historical'){panel.style.setProperty('--extended-top',document.body.style.getPropertyValue('--historical-metronome-top')||'165px');window.HistoricalPlayer?.layout();return;}
  const bar=document.getElementById('adminLiveBar').getBoundingClientRect(),scoreBox=document.getElementById('scoreWrap').getBoundingClientRect(),minTop=Math.max(8,bar.bottom+8),base=Math.max(160,Math.min(240,scoreBox.left-24)),w=Math.min(innerWidth-16,Math.round(base*position.zoom)),h=Math.min(innerHeight-minTop-20,Math.round(w*1.1+38));
  const x=Math.max(8,Math.min(innerWidth-w-8,position.x??12)),y=Math.max(minTop,Math.min(innerHeight-h-12,position.y??Math.max(minTop,scoreBox.top+12)));
  Object.entries({left:x,top:y,width:w,height:h}).forEach(([name,v])=>panel.style.setProperty('--extended-'+name,v+'px'));panel.querySelector('output').textContent=Math.round(position.zoom*100)+'%';
 }
 function queueLayout(){if(layoutQueued)return;layoutQueued=true;requestAnimationFrame(layout);}
 function sync(){window.syncRepeatHeaderNotice?.();const next=contextKind(),nextKey=next+':'+(currentItem?.id||currentItem?.arquivo||currentItem?.numero||'')+':'+originalXmlText;
  if(next!==kind){cancel();started=false;position.zoom=1;position.x=position.y=null;kind=next;key='';}
  if(key!==nextKey){cancel();started=false;key=nextKey;window.HinarioMaestroDynamics?.reset();}
  if(kind&&document.body.classList.contains('scorePlaybackActive'))started=true;
  const show=!!selected();panel.hidden=!show;document.body.classList.toggle('extendedGuideMaestro',show);panel.dataset.context=kind;select.value=views[kind]||'metronome';historicalSelect.value=views.historical;liveSelect.textContent=views.live==='maestro'?'Visual: Maestro':'Visual: Metrônomo';liveSelect.setAttribute('aria-pressed',String(views.live==='maestro'));
  if(kind)queueLayout();return !!kind;
 }
 function setView(value){if(!sync())return;views[kind]=value;panel.classList.remove('minimized');cancel();setVisualMetronomeEnabled(true);sync();update(ms);queueLayout();}
 liveSelect.addEventListener('click',()=>setView(views.live==='maestro'?'metronome':'maestro'));
 for(const el of [select,historicalSelect])el.addEventListener('change',()=>setView(el.value));
 function drawTime(){if(!selected()||ending)return;const data=window.HinarioMaestroDynamics,plan=buildVisualMetronomePlan(),quarterMs=60000/Math.max(1,currentBpm()),nominal=applyKnownVisualMetronomeAdvance(applyKnownHymnCursorAdvance(visualPlaybackTimeMs(ms))),q=Math.min(Math.max(0,nominal-75)/quarterMs,visualMetronomeFinalPulseQuarter(plan));
  const segments=plan.meterSegments?.length?plan.meterSegments:[{startQuarter:0,beats:plan.beats||4,beatType:plan.beatType||4,beatOffset:plan.beatOffset||0}];let meter=segments[0];for(const next of segments){if(next.startQuarter<=q+.000001)meter=next;else break;}
  beats=Number(meter.beats);if(!data?.movementConfig(beats)){views[kind]='metronome';sync();return;}if(!data.ready(beats))return;
  const raw=Math.max(0,q-(Number(meter.startQuarter)||0))*(Number(meter.beatType)||4)/4,offset=Number(meter.beatOffset)||0,position=(meter===segments[0]&&raw<1?(raw<=.24?0:(raw-.24)/.76):raw)+offset,phase=((position%beats)+beats)%beats,beat=Math.floor(phase)+1;
  const config=data.movementConfig(beats);index=Math.min(config.frames-1,Math.floor(phase*config.framesPerBeat));const result=data.draw(ctx,index,Math.max(0,nominal)/quarterMs,plan,!!hymnalDynamicsEnabled&&started,beats);
  panel.querySelector('.extendedMeter').textContent=beats+' TEMPOS · '+beats+'/'+meter.beatType;panel.querySelector('.extendedBeat').textContent=String(beat);const breath=window.nostalgiaBreathAtActualMs?.(ms);panel.querySelector('.extendedDirection').textContent=breath?'PAUSA · 1/8':VISUAL_METRONOME_DIRECTIONS[beats]?.[beat-1]||'';panel.dataset.breath=String(!!breath);panel.querySelector('.extendedDynamics').textContent=hymnalDynamicsEnabled?(started?'Dinâmica: '+result.level:'Aguardando Play'):'Dinâmica desligada';panel.dataset.beat=String(beat);panel.dataset.frame=String(index);
 }
 function update(value){ms=Math.max(0,Number(value)||0);if(sync())drawTime();}
 function finish(){if(!sync()||!selected())return false;if(ending)return true;const data=window.HinarioMaestroDynamics,startSlot=data?.getState()?.slot||0,t0=performance.now();ending=true;
  const tick=()=>{if(!ending||!contextKind()){cancel();return;}const elapsed=performance.now()-t0;data?.relax(ctx,index,startSlot,Math.min(1,elapsed/1200),beats);panel.querySelector('.extendedDirection').textContent='ENCERRANDO';if(elapsed<3300)raf=requestAnimationFrame(tick);else{cancel();started=false;resetVisualPlaybackPosition();}};raf=requestAnimationFrame(tick);return true;
 }
 function reset(){cancel();started=false;ms=0;sync();drawTime();}
 panel.querySelector('.extendedMinimize').onclick=()=>{panel.classList.toggle('minimized');queueLayout()};
 panel.querySelectorAll('[data-zoom]').forEach(button=>button.onclick=()=>{position.zoom=Math.max(.65,Math.min(2,position.zoom+Number(button.dataset.zoom)*.15));layout()});
 panel.addEventListener('pointerdown',e=>{if(kind!=='live'||e.target.closest('button,select,label'))return;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});try{panel.setPointerCapture(e.pointerId)}catch(_){}if(pointers.size===2){const [a,b]=[...pointers.values()];pinch={distance:Math.hypot(a.x-b.x,a.y-b.y),zoom:position.zoom};drag=null;}else{const r=panel.getBoundingClientRect();drag={id:e.pointerId,dx:e.clientX-r.left,dy:e.clientY-r.top};}e.preventDefault()});
 panel.addEventListener('pointermove',e=>{if(!pointers.has(e.pointerId))return;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pinch&&pointers.size===2){const [a,b]=[...pointers.values()];position.zoom=Math.max(.65,Math.min(2,pinch.zoom*Math.hypot(a.x-b.x,a.y-b.y)/Math.max(1,pinch.distance)));}else if(drag?.id===e.pointerId){position.x=e.clientX-drag.dx;position.y=e.clientY-drag.dy;}layout();e.preventDefault()});
 for(const event of ['pointerup','pointercancel'])panel.addEventListener(event,e=>{pointers.delete(e.pointerId);drag=null;pinch=null;try{panel.releasePointerCapture(e.pointerId)}catch(_){}});
 new MutationObserver(()=>{sync();if(!ending)drawTime()}).observe(document.body,{attributes:true,attributeFilter:['class']});window.addEventListener('resize',queueLayout);window.addEventListener('maestroDynamicsReady',()=>{if(kind)drawTime()});
 window.ExtendedMaestro={update,finish,reset,sync,setView,ownsMetronome:()=>!!contextKind()&&views[contextKind()]==='maestro',historicalPanel:()=>kind==='historical'&&selected()?panel:null,getState:()=>({kind,view:views[kind],started,ending,beats,index,ms,zoom:position.zoom})};sync();
})();
