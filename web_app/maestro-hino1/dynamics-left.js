/* Approved left-hand dynamics, independent of the conducting cycle. */
(()=>{'use strict';
 const images={};let current=null,lastNow=0,lastEnabled=null,lastResult=null;
 for(const [key,file] of Object.entries({body:'dynamics-torso-v275.webp',background:'dynamics-background.webp',left:'dynamics-left.webp',right3:'dynamics-right.webp',right4:'dynamics-right-4.webp',right2:'dynamics-right-2-v275.webp',right6:'dynamics-right-6-v275.webp',right9:'dynamics-right-9-v275.webp',right12:'dynamics-right-12-v275.webp',materialBody:'materials-body-v276.webp',materialLeft:'materials-left-v276.webp',materialRight2:'materials-right-2-v276.webp',materialRight3:'materials-right-3-v276.webp',materialRight4:'materials-right-4-v276.webp',materialRight6:'materials-right-6-v276.webp',materialRight9:'materials-right-9-v276.webp',materialRight12:'materials-right-12-v276.webp'})){
  const im=new Image();images[key]=im;im.onload=()=>window.dispatchEvent(new Event('maestroDynamicsReady'));im.src='maestro-hino1/'+file+'?v=277-rests';
 }
 const anchors=[34,46,60,76,94,112],names=['pp','p','mp','mf','f','ff'];
 function movementConfig(beats=3){return window.HinarioMaestroDynamicsData?.movements?.[beats]||null;}
 function ready(beats=3){return !!movementConfig(beats)&&['body','background','left','right'+beats,'materialBody','materialLeft','materialRight'+beats].every(k=>images[k]?.complete&&images[k].naturalWidth>0);}
 function scalar(velocity){
  if(velocity<=anchors[0])return 0;for(let i=1;i<6;i++)if(velocity<=anchors[i])return i-1+(velocity-anchors[i-1])/(anchors[i]-anchors[i-1]);return 5;
 }
 let buffers=null,lastPaintKey=null;const torsoLeftCache=new Map(),fullFrames=new WeakMap();
 function blackCloth(pixels,width,height,x=0,y=0){
  for(let row=0;row<height;row++){const globalY=row+y;if(globalY<96||globalY>453)continue;
   for(let col=0;col<width;col++){const i=(row*width+col)*4;if(!pixels[i+3])continue;const r=pixels[i],g=pixels[i+1],b=pixels[i+2],hi=Math.max(r,g,b),lo=Math.min(r,g,b);
    if(hi<135&&hi-lo<22){const value=Math.round(4+.42*(.2126*r+.7152*g+.0722*b));pixels[i]=pixels[i+1]=pixels[i+2]=value;}
   }
  }
 }
 function rawPixels(image,sx,sy,w,h){const c=document.createElement('canvas');c.width=w;c.height=h;const x=c.getContext('2d',{willReadFrequently:true});x.drawImage(image,sx,sy,w,h,0,0,w,h);return x.getImageData(0,0,w,h).data;}
 function pixels(image,sx,sy,w,h,x=0,y=0,mask=null){const data=rawPixels(image,sx,sy,w,h);if(!mask){blackCloth(data,w,h,x,y);return data;}
  const original=new Uint8ClampedArray(data);blackCloth(data,w,h,x,y);
  for(let i=0;i<data.length;i+=4){const alpha=data[i+3];if(!alpha)continue;const green=Math.min(1,mask[i+1]/alpha);const red=Math.min(1,mask[i]/alpha);if(green<.02){if(red>.8&&Math.max(original[i],original[i+1],original[i+2])>100&&Math.max(original[i],original[i+1],original[i+2])-Math.min(original[i],original[i+1],original[i+2])<25){data[i]=data[i+1]=data[i+2]=24;}continue;}const lum=.2126*original[i]+.7152*original[i+1]+.0722*original[i+2],value=4+.105*lum;for(let c=0;c<3;c++)data[i+c]=data[i+c]*(1-green)+value*green;}
  return data;
 }
 function repairJoint(data,mask,rect,roi){const [x,y,w,h]=rect,[rx,ry,rw,rh]=roi;for(let gy=ry;gy<ry+rh;gy++)for(let gx=rx;gx<rx+rw;gx++){if(gx<x||gy<y||gx>=x+w||gy>=y+h)continue;const mi=((gy-y)*w+gx-x)*4,coverage=Math.min(255,mask[mi]+mask[mi+1]),di=(gy*360+gx)*4,old=data[di+3];if(coverage<100||old>=coverage-12)continue;let color=null;for(let radius=1;radius<=8&&!color;radius++)for(let yy=-radius;yy<=radius&&!color;yy++)for(let xx=-radius;xx<=radius;xx++){const nx=gx+xx,ny=gy+yy;if(nx<x||ny<y||nx>=x+w||ny>=y+h)continue;const ni=(ny*360+nx)*4,nm=((ny-y)*w+nx-x)*4;if(data[ni+3]>245&&mask[nm]+mask[nm+1]>240&&Math.max(data[ni],data[ni+1],data[ni+2])<100){color=[data[ni],data[ni+1],data[ni+2]];break;}}if(color){for(let c=0;c<3;c++)data[di+c]=(data[di+c]*old+color[c]*(coverage-old))/coverage;data[di+3]=coverage;}}}
 function prepare(){if(buffers)return;const d=window.HinarioMaestroDynamicsData,c=document.createElement('canvas');c.width=360;c.height=500;const cctx=c.getContext('2d'),frameData=cctx.createImageData(360,500);
  const sprites=(name,count,rect)=>{const [x,y,w,h]=rect;return Array.from({length:count},(_,i)=>pixels(images[name],i%8*w,Math.floor(i/8)*h,w,h,x,y,rawPixels(images.materialLeft,i%8*w,Math.floor(i/8)*h,w,h)));};
  buffers={torso:pixels(images.body,0,0,360,500,0,0,rawPixels(images.materialBody,0,0,360,500)),left:sprites('left',d.leftFrames,d.leftRect),rightBanks:{},materialBanks:{},leftMasks:Array.from({length:d.leftFrames},(_,i)=>rawPixels(images.materialLeft,i%8*d.leftRect[2],Math.floor(i/8)*d.leftRect[3],d.leftRect[2],d.leftRect[3])),canvas:c,ctx:cctx,frameData};
 }
 function rightBank(beats){prepare();if(!buffers.rightBanks[beats]){const d=movementConfig(beats),[x,y,w,h]=d.rect;const masks=Array.from({length:d.frames},(_,i)=>rawPixels(images['materialRight'+beats],i%8*w,Math.floor(i/8)*h,w,h));buffers.materialBanks[beats]=masks;buffers.rightBanks[beats]=Array.from({length:d.frames},(_,i)=>pixels(images['right'+beats],i%8*w,Math.floor(i/8)*h,w,h,x,y,masks[i]));}return buffers.rightBanks[beats];}
 function merge(destination,source,rect){const [x,y,w,h]=rect;
  for(let row=0;row<h;row++)for(let col=0;col<w;col++){const si=(row*w+col)*4,di=((row+y)*360+col+x)*4,af=source[si+3]/255;if(!af)continue;const ab=destination[di+3]/255;
   if(!ab){destination[di]=source[si];destination[di+1]=source[si+1];destination[di+2]=source[si+2];destination[di+3]=source[si+3];continue;}
   // Shared antialiased seams are complementary coverage, not two coats of transparency.
   const seam=af>.02&&af<.98&&ab>.02&&ab<.98&&Math.abs(af+ab-1)<.15,total=seam?af+ab:af+ab*(1-af),alpha=seam?1:total;
   for(let c=0;c<3;c++)destination[di+c]=(source[si+c]*af+destination[di+c]*ab*(seam?1:1-af))/total;
   destination[di+3]=Math.round(alpha*255);
  }
 }
 function paint(ctx,index,slot,beats){prepare();const bank=rightBank(beats),movement=movementConfig(beats);const key=beats+':'+index+':'+slot;if(lastPaintKey!==key){let base=torsoLeftCache.get(slot);const d=window.HinarioMaestroDynamicsData;
   if(!base){base=new Uint8ClampedArray(buffers.torso);merge(base,buffers.left[slot],d.leftRect);repairJoint(base,buffers.leftMasks[slot],d.leftRect,[178,106,76,88]);torsoLeftCache.set(slot,base);if(torsoLeftCache.size>8)torsoLeftCache.delete(torsoLeftCache.keys().next().value);}
   buffers.frameData.data.set(base);merge(buffers.frameData.data,bank[index],movement.rect);repairJoint(buffers.frameData.data,buffers.materialBanks[beats][index],movement.rect,[100,106,78,88]);buffers.ctx.putImageData(buffers.frameData,0,0);lastPaintKey=key;
  }
  ctx.clearRect(0,0,360,500);ctx.drawImage(images.background,0,0,360,500);ctx.drawImage(buffers.canvas,0,0);
 }
 function drawFullFrame(ctx,image,sx,sy){let cache=fullFrames.get(image);if(!cache){cache=new Map();fullFrames.set(image,cache);}const key=sx+':'+sy;let c=cache.get(key);
  if(!c){c=document.createElement('canvas');c.width=360;c.height=500;const cctx=c.getContext('2d'),data=cctx.createImageData(360,500);data.data.set(pixels(image,sx,sy,360,500));cctx.putImageData(data,0,0);cache.set(key,c);if(cache.size>8)cache.delete(cache.keys().next().value);}
  ctx.clearRect(0,0,360,500);ctx.drawImage(c,0,0);lastPaintKey=null;
 }
 let scoreCache={xml:null,marks:[],wedges:[]};
 function scoreVelocity(quarter){
  const xml=getDisplayXmlText()||'';
  if(scoreCache.xml!==xml){
   const marks=[],wedges=[],open={};let divisions=1,total=0,sequence=0;
   try{const doc=new DOMParser().parseFromString(xml,'application/xml'),part=doc.querySelector('score-partwise > part');
    for(const measure of part?.querySelectorAll(':scope > measure')||[]){
     divisions=Math.max(1,Number(measure.querySelector(':scope > attributes divisions')?.textContent)||divisions);let cursor=0,end=0,previous=0;
     for(const node of measure.children){
      const duration=Math.max(0,Number(node.querySelector(':scope > duration')?.textContent)||0);
      if(node.tagName==='backup'){cursor=Math.max(0,cursor-duration);continue;}
      if(node.tagName==='forward'){cursor+=duration;end=Math.max(end,cursor);continue;}
      if(node.tagName==='direction'){
       const q=total+(cursor+(Number(node.querySelector(':scope > offset')?.textContent)||0))/divisions;
       const mark=node.querySelector('direction-type > dynamics')?.firstElementChild?.tagName;
       const values={ppp:34,pp:34,p:46,mp:60,mf:76,f:94,ff:112,fff:112,sf:94,sfz:94};if(mark&&values[mark])marks.push({q,value:values[mark],sequence:sequence++});
       for(const wedge of node.querySelectorAll('direction-type > wedge')){const number=wedge.getAttribute('number')||'1',type=wedge.getAttribute('type');if(type==='crescendo'||type==='diminuendo')open[number]={start:q,type};else if(type==='stop'&&open[number]){wedges.push({...open[number],end:q});delete open[number];}}
      }
      if(node.tagName!=='note'||node.querySelector(':scope > grace'))continue;
      const chord=!!node.querySelector(':scope > chord'),onset=chord?previous:cursor;previous=onset;end=Math.max(end,onset+duration);if(!chord)cursor+=duration;
     }
     total+=end/divisions;
    }
    for(const wedge of Object.values(open))wedges.push({...wedge,end:total});
   }catch(_){}
   marks.sort((a,b)=>a.q-b.q||a.sequence-b.sequence);scoreCache={xml,marks,wedges};
  }
  const {marks,wedges}=scoreCache;if(!marks.length)return null;
  const at=q=>{let value=marks[0].value;for(const point of marks){if(point.q>q+1e-6)break;value=point.value;}return value;};
  let value=at(quarter);
  for(const wedge of wedges){if(quarter<wedge.start||quarter>=wedge.end||wedge.end<=wedge.start)continue;const from=at(wedge.start);const next=marks.find(point=>point.q>=wedge.end-1e-6);const to=next?next.value:Math.max(34,Math.min(112,from+(wedge.type==='crescendo'?18:-18)));value=from+(to-from)*(quarter-wedge.start)/(wedge.end-wedge.start);}
  return value;
 }
 function draw(ctx,index,quarter,plan,enabled,beats=3){
  if(!ready(beats))return null;
  const data=window.HinarioMaestroDynamicsData,now=performance.now();let velocity=0,target=0,level='off';
  if(enabled){velocity=scoreVelocity(Math.max(0,quarter))??hymnalDynamicVelocityAtTick(Math.max(0,quarter),Math.max(1,Number(plan?.totalQuarters)||1));const value=scalar(velocity);target=1+value*8;level=names[Math.round(value)];}
  const moving=document.body.classList.contains('scorePlaybackActive');
  if(current===null||lastEnabled!==enabled||!moving)current=target;else current+=(target-current)*(1-Math.exp(-Math.min(120,now-lastNow)/220));
  lastNow=now;lastEnabled=enabled;const slot=enabled?Math.max(1,Math.min(41,Math.round(current))):0;
  paint(ctx,index,slot,beats);
  drawBaton(ctx,movementConfig(beats).shaft[index]);
  lastResult={level,slot,velocity,enabled,rightFrame:index,beats};return lastResult;
 }
 function drawBaton(ctx,shaft){if(!shaft)return;const [x,y,tx,ty]=shaft;ctx.save();ctx.lineCap='round';ctx.lineJoin='round';ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(tx,ty);ctx.strokeStyle='#080808';ctx.lineWidth=7/1.2;ctx.stroke();ctx.strokeStyle='#ffdc00';ctx.lineWidth=3/1.2;ctx.stroke();ctx.beginPath();ctx.arc(tx,ty,4.2/1.2,0,Math.PI*2);ctx.fillStyle='#080808';ctx.fill();ctx.beginPath();ctx.arc(tx,ty,2.4/1.2,0,Math.PI*2);ctx.fillStyle='#ffdc00';ctx.fill();ctx.restore();}
 function relax(ctx,index,startSlot,progress,beats){if(!ready(beats))return;const ease=progress*progress*(3-2*progress),slot=Math.max(0,Math.round(startSlot*(1-ease)));paint(ctx,index,slot,beats);drawBaton(ctx,movementConfig(beats).shaft[index]);lastResult={level:'off',slot,enabled:false,beats,rightFrame:index};}
 window.HinarioMaestroDynamics={ready,draw,relax,drawFullFrame,drawBaton,movementConfig,reset(){lastPaintKey=null;current=null;lastNow=0;lastEnabled=null;},getState(){return lastResult;}};
})();
