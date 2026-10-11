(()=>{
'use strict';
const $=id=>document.getElementById(id);
const cv=$('scene'),ctx=cv.getContext('2d',{alpha:false});
const hud=$('hud'),controls=$('controls'),skillHit=$('skill-hit'),notice=$('notice');
const W=900,H=1220, TAU=Math.PI*2, CELL=28;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const rand=(a,b)=>a+Math.random()*(b-a);
const pick=a=>a[Math.floor(Math.random()*a.length)];
const circle=(x,y,r)=>{ctx.beginPath();ctx.arc(x,y,r,0,TAU);};
const rounded=(x,y,w,h,r)=>{ctx.beginPath();ctx.roundRect(x,y,w,h,r);};
const walls=[
  [0,0,900,24],[0,1196,900,24],[0,0,24,1220],[876,0,24,1220],
  [24,403,240,24],[359,403,270,24],[745,403,131,24],
  [24,796,147,24],[290,796,238,24],[647,796,229,24],
  [438,24,24,191],[438,276,24,127],
  [424,427,24,128],[424,637,24,159],
  [346,820,24,122],[346,1022,24,174],
  [765,24,24,208],[765,315,24,88]
];
const furniture=[
  [93,91,126,62,'table'],[290,84,89,117,'shelf'],[550,83,137,69,'sofa'],[557,259,118,76,'table'],[102,248,105,95,'sofa'],[274,310,77,49,'box'],[810,266,52,78,'shelf'],
  [64,488,142,63,'table'],[272,494,100,82,'box'],[511,481,111,65,'sofa'],[719,487,99,126,'shelf'],[113,657,128,76,'sofa'],[300,693,68,68,'box'],[554,682,107,60,'table'],[763,702,79,52,'box'],
  [73,877,115,68,'shelf'],[207,918,93,71,'sofa'],[445,869,160,70,'table'],[724,887,107,72,'sofa'],[78,1059,79,69,'box'],[461,1081,94,68,'shelf'],[640,1056,105,88,'table']
];
const solids=[...walls.map(([x,y,w,h])=>({x,y,w,h,kind:'wall'})),...furniture.map(([x,y,w,h,kind])=>({x,y,w,h,kind}))];
const rugs=[[43,52,356,325,'#c7a2a3'],[483,55,240,319,'#91a2a4'],[34,448,361,328,'#9eb6ae'],[474,444,374,320,'#ac9ca9'],[39,841,278,342,'#b8a193'],[389,841,466,341,'#94b0ad']];
const cheeseGroups=[
  [{x:240,y:143},{x:392,y:336},{x:709,y:210},{x:515,y:342},{x:89,y:361}],
  [{x:247,y:604},{x:381,y:743},{x:654,y:623},{x:845,y:672},{x:100,y:761}],
  [{x:250,y:1126},{x:400,y:974},{x:802,y:1060},{x:609,y:1008},{x:838,y:1160}]
];
const patrols=[{x:110,y:210},{x:360,y:250},{x:553,y:197},{x:719,y:341},{x:800,y:460},{x:672,y:565},{x:504,y:732},{x:288,y:629},{x:111,y:731},{x:207,y:872},{x:504,y:992},{x:802,y:1029},{x:627,y:1144}];
const nest={x:195,y:1120};
const COLS=Math.ceil(W/CELL),ROWS=Math.ceil(H/CELL);
let nav=[];
function inside(x,y,r){for(const s of solids){const dx=x-clamp(x,s.x,s.x+s.w),dy=y-clamp(y,s.y,s.y+s.h);if(dx*dx+dy*dy<(r*r))return false;}return x>=r&&x<=W-r&&y>=r&&y<=H-r;}
function rebuildNav(){nav=new Uint8Array(COLS*ROWS);for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++){nav[y*COLS+x]=inside(x*CELL+CELL/2,y*CELL+CELL/2,17)?1:0;}}
rebuildNav();
const nid=(x,y)=>y*COLS+x, nxy=i=>({x:(i%COLS)*CELL+CELL/2,y:Math.floor(i/COLS)*CELL+CELL/2});
function nearestCell(p){let x=clamp(Math.floor(p.x/CELL),0,COLS-1),y=clamp(Math.floor(p.y/CELL),0,ROWS-1);if(nav[nid(x,y)])return nid(x,y);for(let radius=1;radius<=8;radius++)for(let oy=-radius;oy<=radius;oy++)for(let ox=-radius;ox<=radius;ox++){const nx=x+ox,ny=y+oy;if(nx>=0&&ny>=0&&nx<COLS&&ny<ROWS&&nav[nid(nx,ny)])return nid(nx,ny);}return -1;}
function route(from,to){const start=nearestCell(from),end=nearestCell(to);if(start<0||end<0)return [];
 if(start===end)return [{x:to.x,y:to.y}];
 const total=COLS*ROWS,g=new Float32Array(total).fill(Infinity),prev=new Int32Array(total).fill(-1),closed=new Uint8Array(total),open=[start];g[start]=0;
 const dirs=[[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]];
 while(open.length){let best=0,bestF=Infinity;for(let i=0;i<open.length;i++){const c=open[i],px=c%COLS,py=(c/COLS)|0,ex=end%COLS,ey=(end/COLS)|0;const h=Math.hypot(px-ex,py-ey);if(g[c]+h<bestF){bestF=g[c]+h;best=i;}}const current=open.splice(best,1)[0];if(closed[current])continue;closed[current]=1;if(current===end)break;
  const x=current%COLS,y=(current/COLS)|0;for(const [dx,dy]of dirs){const nx=x+dx,ny=y+dy;if(nx<0||ny<0||nx>=COLS||ny>=ROWS)continue;const idx=nid(nx,ny);if(!nav[idx]||closed[idx])continue;if(dx&&dy&&(!nav[nid(nx,y)]||!nav[nid(x,ny)]))continue;const ng=g[current]+(dx&&dy?1.4142:1);if(ng<g[idx]){g[idx]=ng;prev[idx]=current;open.push(idx);}}
 }
 if(prev[end]===-1)return [];
 const out=[];for(let t=end;t!==start&&t!==-1;t=prev[t]){out.push(nxy(t));if(out.length>150)return [];}out.reverse();out.push({x:to.x,y:to.y});return out;
}
// Segment against the same solid objects used by collisions: sight and hearing never bypass a wall.
function intersectRay(ox,oy,dx,dy,max){let result=max;for(const s of solids){let low=0,high=max;for(const [o,d,min,maxB] of [[ox,dx,s.x,s.x+s.w],[oy,dy,s.y,s.y+s.h]]){if(Math.abs(d)<1e-9){if(o<min||o>maxB){low=Infinity;break;}}else{let a=(min-o)/d,b=(maxB-o)/d;if(a>b)[a,b]=[b,a];low=Math.max(low,a);high=Math.min(high,b);if(low>high)break;}}
 if(low<=high&&low>=0&&low<result)result=low;
 }return result;}
function clearSight(a,b){const dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy);if(d<.01)return true;return intersectRay(a.x,a.y,dx/d,dy/d,d+1)>=d-.5;}
function relocate(o,dx,dy,r){if(dx){const x=o.x+dx;if(inside(x,o.y,r))o.x=x;}if(dy){const y=o.y+dy;if(inside(o.x,y,r))o.y=y;}}
let state='title',player,cat,cheeses,skill,clock=0,flash=0,tipUntil=0,currentTip='',cam={x:0,y:0},vw=400,vh=760,scale=1,ss=1,lastTime=0,gameOverDelay=0,fx=[],lastBell=0;
let keys=new Set(),stick={active:false,id:null,x:0,y:0},dashHeld=false,clickGoal=null,clickRoute=[],clickRecalc=0;
let muted=false,ac=null,soundEnabled=true;
try{muted=localStorage.getItem('catnyalight-muted')==='1';}catch{}soundEnabled=!muted;
function tone(freq,duration,type='sine',volume=.05,delay=0,ending=null){if(!soundEnabled)return;try{if(!ac){const A=window.AudioContext||window.webkitAudioContext;if(!A)return;ac=new A();}if(ac.state==='suspended')ac.resume().catch(()=>{});const o=ac.createOscillator(),v=ac.createGain(),t=ac.currentTime+delay;o.type=type;o.frequency.setValueAtTime(freq,t);if(ending)o.frequency.exponentialRampToValueAtTime(Math.max(30,ending),t+duration);v.gain.setValueAtTime(.0001,t);v.gain.exponentialRampToValueAtTime(volume,t+.015);v.gain.exponentialRampToValueAtTime(.0001,t+duration);o.connect(v);v.connect(ac.destination);o.start(t);o.stop(t+duration+.015);}catch{}}
function sfx(name){switch(name){case 'start':tone(440,.13);tone(660,.16,'sine',.045,.13);break;case 'bite':tone(500,.047,'triangle',.018);break;case 'success':tone(610,.11);tone(780,.13,'sine',.045,.085);break;case 'perfect':tone(660,.1);tone(880,.14,'sine',.05,.1);tone(1175,.22,'sine',.038,.22);break;case 'miss':tone(170,.27,'sawtooth',.055,0,65);break;case 'alert':tone(780,.13,'triangle',.07);break;case 'chase':tone(340,.16,'sawtooth',.045);tone(440,.16,'sawtooth',.045,.13);break;case 'unlock':for(let i=0;i<4;i++)tone(410*Math.pow(1.25,i),.22,'sine',.04,i*.14);break;case 'win':for(let i=0;i<4;i++)tone([440,550,660,880][i],.24,'triangle',.055,i*.16);break;case 'lose':tone(260,.28,'triangle',.055,0,150);tone(190,.38,'triangle',.04,.21,92);break;case 'bell':tone(1140,.07,'sine',.016);tone(810,.14,'sine',.013,.055);break;}}
function say(text,duration=2.4,danger=false){currentTip=text;tipUntil=clock+duration;notice.textContent=text;notice.classList.toggle('danger',danger);}
function particle(x,y,label,color='#ffe9b0',life=.85){fx.push({x,y,label,color,life,max:life});if(fx.length>35)fx.shift();}
function pickCheeses(){const spots=cheeseGroups.map(g=>pick(g));return spots.map((p,i)=>({...p,id:i,progress:0,done:false,checks:[],checkIndex:0,eating:false,interrupted:false}));}
function reset(){clock=0;lastBell=0;fx=[];flash=0;tipUntil=0;gameOverDelay=0;player={x:112,y:1005,dir:-Math.PI/2,speed:0,stamina:100,exhausted:false,dash:false,r:12,dist:0};
 cat={x:695,y:454,dir:Math.PI*-.65,r:15,mode:'patrol',target:null,path:[],pathIndex:0,repath:0,modeTime:0,alertTime:0,seekTime:0,lastSeen:null,lastNoise:null,patrolLast:-1,findTimer:0,investigateTimer:0,catAnim:0,noiseCooldown:0};
 cheeses=pickCheeses();for(const ch of cheeses){const count=Math.random()<.42?1:2;let checks=count===1?[rand(.36,.68)]:[rand(.25,.34),rand(.65,.78)];ch.checks=checks;}
 skill=null;cam.x=clamp(player.x-vw/2,0,Math.max(0,W-vw));cam.y=clamp(player.y-vh*.49,0,Math.max(0,H-vh));dashHeld=false;clickGoal=null;clickRoute=[];keys.clear();stick.active=false;stick.x=0;stick.y=0;resetKnob();state='playing';$('title-screen').hidden=true;$('result-screen').hidden=true;hud.hidden=false;controls.hidden=false;skillHit.hidden=true;
 $('count').textContent='チーズ 0 / 3';say('家具の陰に隠れよう',3);sfx('start');
}
function resetKnob(){$('knob').style.transform='translate(0px,0px)';}
function setCatMode(mode){if(cat.mode===mode)return;cat.mode=mode;cat.modeTime=0;cat.path=[];cat.pathIndex=0;cat.repath=0;}
function investigate(p,importance=1){if(cat.mode==='chase'||cat.mode==='alert')return;const d=dist(cat,p),max=importance>1?355:importance>.7?245:150;if(d>max)return;const chance=clamp((1-d/max)*(.8+importance*.38),.12,.98);if(Math.random()>chance)return;
 cat.lastNoise={x:clamp(p.x+rand(-22,22),32,W-32),y:clamp(p.y+rand(-22,22),32,H-32)};cat.investigateTimer=rand(3.3,5.1);cat.target={...cat.lastNoise};setCatMode('investigate');}
function setChase(){cat.lastSeen={x:player.x,y:player.y};cat.findTimer=0;setCatMode('alert');cat.alertTime=.35;sfx('alert');particle(cat.x,cat.y-35,'!','#ffdf85',1.1);say('！ 見つかった！ 隠れて！',1.5,true);flash=.32;}
function visible(){const d=dist(cat,player);if(d>178)return false;if(!clearSight(cat,player))return false;if(d<52)return true;const angle=Math.atan2(player.y-cat.y,player.x-cat.x);const dd=Math.atan2(Math.sin(angle-cat.dir),Math.cos(angle-cat.dir));return Math.abs(dd)<(cat.mode==='chase'?.88:.75);}
function choosePatrol(){const candidates=patrols.map((p,i)=>({p,i,d:dist(cat,p)})).filter(x=>x.i!==cat.patrolLast&&x.d>120&&x.d<750&&route(cat,x.p).length);
 const options=candidates.length?candidates:patrols.map((p,i)=>({p,i}));const choice=pick(options);cat.patrolLast=choice.i;cat.target={...choice.p};cat.seekTime=rand(0,.6);}
function catPathToward(to,dt){if(!to)return;
 cat.repath-=dt;
 if(!cat.path.length||cat.repath<=0){cat.path=route(cat,to);cat.pathIndex=0;cat.repath=cat.mode==='chase'?.36:rand(.72,1.12);}
 let point=cat.path[cat.pathIndex];while(point&&dist(cat,point)<16){cat.pathIndex++;point=cat.path[cat.pathIndex];}
 if(!point)point=to;
 const d=dist(cat,point);if(d<=.01)return;
 const dx=(point.x-cat.x)/d,dy=(point.y-cat.y)/d;
 const sp=cat.mode==='chase'?118:cat.mode==='alert'?0:cat.mode==='search'?92:cat.mode==='investigate'?89:72;
 const vx=dx*sp*dt,vy=dy*sp*dt,bx=cat.x,by=cat.y;
 relocate(cat,vx,vy,cat.r);
 if(Math.hypot(cat.x-bx,cat.y-by)<sp*dt*.30)cat.repath=0;
 cat.dir=Math.atan2(dy,dx);
}
function updateCat(dt){cat.modeTime+=dt;cat.catAnim+=dt;cat.noiseCooldown=Math.max(0,cat.noiseCooldown-dt);
 if(cat.mode!=='chase'&&cat.mode!=='alert'&&visible())setChase();
 if(cat.mode==='patrol'){if(!cat.target||dist(cat,cat.target)<26||cat.modeTime>15){choosePatrol();cat.modeTime=0;}if(cat.seekTime>0)cat.seekTime-=dt;else catPathToward(cat.target,dt);}
 else if(cat.mode==='investigate'){if(visible()){setChase();return;}cat.investigateTimer-=dt;catPathToward(cat.target,dt);if(cat.investigateTimer<=0||dist(cat,cat.target)<24){cat.lastSeen={...cat.target};setCatMode('search');cat.findTimer=rand(3.5,5.5);}}
 else if(cat.mode==='alert'){cat.alertTime-=dt;cat.dir=Math.atan2(player.y-cat.y,player.x-cat.x);if(cat.alertTime<=0){cat.lastSeen={x:player.x,y:player.y};setCatMode('chase');sfx('chase');}}
 else if(cat.mode==='chase'){
  const see=visible();if(see){cat.lastSeen={x:player.x,y:player.y};cat.findTimer=0;}else cat.findTimer+=dt;
  // Never track a hidden player: the last-seen point is retained but does not update without vision.
  if(cat.findTimer>1.35){cat.target={...cat.lastSeen};setCatMode('search');cat.findTimer=rand(5.3,7.8);return;}
  catPathToward(cat.lastSeen,dt);
 }else if(cat.mode==='search'){
  if(visible()){setChase();return;}
  cat.findTimer-=dt;
  if(!cat.target||dist(cat,cat.target)<29||cat.modeTime>2.4){const center=cat.lastSeen||cat.lastNoise||cat;let p;
   for(let i=0;i<25;i++){const a=rand(0,TAU),r=rand(30,130);const t={x:clamp(center.x+Math.cos(a)*r,35,W-35),y:clamp(center.y+Math.sin(a)*r,35,H-35)};if(inside(t.x,t.y,19)&&route(cat,t).length){p=t;break;}}cat.target=p||{...center};cat.modeTime=0;cat.dir+=rand(-.6,.6);}
  catPathToward(cat.target,dt);
  if(cat.findTimer<=0){setCatMode('patrol');cat.target=null;}
 }
 if(state==='playing'&&cat.mode!=='alert'&&dist(cat,player)<cat.r+player.r-2){finish(false);}
 const proximity=dist(cat,player);
 if(proximity<230&&clock-lastBell>clamp(proximity/180+.65,.7,2.0)){sfx('bell');lastBell=clock;}
}
function updatePlayer(dt){let x=(keys.has('KeyD')||keys.has('ArrowRight')?1:0)-(keys.has('KeyA')||keys.has('ArrowLeft')?1:0);
 let y=(keys.has('KeyS')||keys.has('ArrowDown')?1:0)-(keys.has('KeyW')||keys.has('ArrowUp')?1:0);
 x+=stick.x;y+=stick.y;
 if(Math.abs(x)+Math.abs(y)<.08&&clickGoal){if(!clickRoute.length||clickRecalc<=0){clickRoute=route(player,clickGoal);clickRecalc=.9;}clickRecalc-=dt;while(clickRoute.length&&dist(player,clickRoute[0])<13)clickRoute.shift();const target=clickRoute[0]||clickGoal;const d=dist(player,target);if(d>9){x=(target.x-player.x)/d;y=(target.y-player.y)/d;}else{clickGoal=null;clickRoute=[];}}
 else if(Math.abs(x)+Math.abs(y)>.08){clickGoal=null;clickRoute=[];}
 const m=Math.hypot(x,y);if(m>1){x/=m;y/=m;}
 const moving=m>.12;const wantsDash=dashHeld||keys.has('ShiftLeft')||keys.has('ShiftRight')||keys.has('Space');
 if(player.exhausted&&player.stamina>=23)player.exhausted=false;
 const running=moving&&wantsDash&&!player.exhausted&&player.stamina>0;
 player.dash=running;const speed=running?193:103;
 if(running){player.stamina=Math.max(0,player.stamina-dt*38);player.recoveryDelay=.9;if(player.stamina<=0){player.exhausted=true;dashHeld=false;}}
 else{player.recoveryDelay=Math.max(0,(player.recoveryDelay||0)-dt);if(player.recoveryDelay<=0)player.stamina=Math.min(100,player.stamina+dt*16.5);}
 if(moving){player.dir=Math.atan2(y,x);player.speed=speed;const ox=player.x,oy=player.y;relocate(player,x*speed*dt,y*speed*dt,player.r);player.dist+=Math.hypot(player.x-ox,player.y-oy);
  if(running&&cat.noiseCooldown<=0){investigate({x:player.x,y:player.y},.69);cat.noiseCooldown=.68;}
 }else player.speed=0;
 $('stamina-fill').style.width=player.stamina.toFixed(1)+'%';$('stamina-label').textContent=Math.floor(player.stamina)+'%';$('dash').classList.toggle('exhausted',player.exhausted);$('dash').classList.toggle('pressed',running);
}
function startSkill(ch){skill={cheese:ch,phase:0,start:-Math.PI/2,target:rand(2.3,4.0),speed:TAU/2.05,zone:.76,perfect:.16};
 skillHit.hidden=false;particle(ch.x,ch.y-33,'！','#fff9e0',1);}
function stopSkill(result){if(!skill)return;const ch=skill.cheese;skill=null;skillHit.hidden=true;
 if(result==='PERFECT'){ch.progress=Math.min(1,ch.progress+.135);say('PERFECT! ひとくちボーナス',1.5);particle(ch.x,ch.y-35,'PERFECT!','#bdfedc');sfx('perfect');}
 else if(result==='SUCCESS'){say('SUCCESS! ナイス！',1.15);particle(ch.x,ch.y-35,'SUCCESS','#bdfedc');sfx('success');}
 else{ch.progress=Math.max(0,ch.progress-.12);say('ガサッ！ 猫に聞こえたかも…',2.4,true);particle(ch.x,ch.y-35,'ガサッ！','#ffc2ad',1.2);sfx('miss');investigate(ch,1.5);}
}
function tapSkill(){if(!skill||state!=='playing')return;let angle=skill.phase*skill.speed,target=skill.target;let delta=Math.atan2(Math.sin(angle-target),Math.cos(angle-target));const result=Math.abs(delta)<=skill.perfect/2?'PERFECT':Math.abs(delta)<=skill.zone/2?'SUCCESS':'MISS';stopSkill(result);}
function updateCheese(dt){let active=null;for(const ch of cheeses){if(ch.done)continue;const d=dist(player,ch);const still=player.speed===0&&d<45;
 if(still){active=ch;ch.eating=true;if(!skill){ch.progress=Math.min(1,ch.progress+dt/6.25);if(Math.random()<dt*.48)sfx('bite');if(Math.random()<dt*.13)investigate(ch,.38);
    if(ch.checkIndex<ch.checks.length&&ch.progress>=ch.checks[ch.checkIndex]){ch.checkIndex++;startSkill(ch);}
    if(ch.progress>=1){ch.done=true;ch.progress=1;particle(ch.x,ch.y,'おいしい！','#ffe894',1.4);sfx('perfect');const n=cheeses.filter(c=>c.done).length;$('count').textContent=`チーズ ${n} / 3`;say(n===3?'巣が開いた！ 帰ろう！':`チーズ ${n} / 3  つぎを探そう！`,3.8);if(n===3){sfx('unlock');flash=.3;}
    }
   }}else if(ch.eating){ch.eating=false;if(skill?.cheese===ch){skill=null;skillHit.hidden=true;}ch.progress=Math.max(0,ch.progress-.11);ch.interrupted=true;}
 }
 if(active&&!active.done&&!skill&&clock>tipUntil)say('動かずにチーズをかじろう',1.2);
 if(cheeses.every(c=>c.done)&&dist(player,nest)<37){finish(true);}
 if(skill){skill.phase+=dt;if(skill.phase*skill.speed>TAU+.16)stopSkill('MISS');}
}
function finish(win){if(state!=='playing')return;state=win?'won':'caught';skill=null;skillHit.hidden=true;dashHeld=false;controls.hidden=true;hud.hidden=true;gameOverDelay=win?.5:.65;flash=win?1:.85;sfx(win?'win':'lose');
 const n=cheeses.filter(c=>c.done).length;const whole=Math.floor(clock),min=Math.floor(whole/60),sec=String(whole%60).padStart(2,'0');$('result-icon').textContent=win?'🐭🏡':'🐈';$('result-title').textContent=win?'巣へ帰還！':'GAME OVER';$('result-detail').textContent=win?'チーズを全部食べて、無事に帰れた！':`猫につかまっちゃった！ チーズ ${n} / 3`;
 let best='';if(win){try{const p=Number(localStorage.getItem('catnyalight-best'))||Infinity;if(clock<p)localStorage.setItem('catnyalight-best',String(clock));const b=Number(localStorage.getItem('catnyalight-best'));best=` ／ BEST ${Math.floor(b/60)}:${String(Math.floor(b%60)).padStart(2,'0')}`;}catch{}}
 $('result-time').textContent=`TIME ${min}:${sec}${best}`;
}
function tick(dt){if(state==='playing'){clock+=dt;updatePlayer(dt);updateCat(dt);if(state==='playing')updateCheese(dt);for(const f of fx)f.life-=dt;fx=fx.filter(f=>f.life>0);if(tipUntil<clock){if(cat.mode==='chase'||cat.mode==='alert')say('追いかけてくる！ 壁で視線を切ろう',1.4,true);else if(cheeses.every(c=>c.done))say('巣へ帰ろう！',2.4);else if(cheeses.some(c=>!c.done&&dist(player,c)<75))say('チーズのそばで止まろう',1.2);else say('物音を立てずに進もう',2.4);}
 }else if(state==='won'||state==='caught'){gameOverDelay-=dt;if(gameOverDelay<=0){$('result-screen').hidden=false;state='result';}}
 flash=Math.max(0,flash-dt*1.15);
}
function resize(){const rect=cv.getBoundingClientRect();const w=Math.max(1,rect.width),h=Math.max(1,rect.height);ss=Math.min(window.devicePixelRatio||1,2);cv.width=Math.ceil(w*ss);cv.height=Math.ceil(h*ss);scale=Math.max(w/450,h/750);vw=w/scale;vh=h/scale;}
function camera(){const px=player?.x??100,py=player?.y??1110;const tx=clamp(px-vw/2,0,Math.max(0,W-vw)),ty=clamp(py-vh*.49,0,Math.max(0,H-vh));cam.x+=(tx-cam.x)*.13;cam.y+=(ty-cam.y)*.13;}
function floorDraw(){ctx.fillStyle='#d1b69b';ctx.fillRect(0,0,W,H);
 ctx.strokeStyle='#b8987d';ctx.lineWidth=1;for(let y=10;y<H;y+=43){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();for(let x=(Math.floor(y/43)%2)*74;x<W;x+=148){ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x,y+43);ctx.stroke();}}
 for(const [x,y,w,h,color] of rugs){ctx.fillStyle=color;rounded(x,y,w,h,15);ctx.fill();ctx.strokeStyle='#fff5d153';ctx.lineWidth=4;rounded(x+9,y+9,w-18,h-18,9);ctx.stroke();}
 // Lamps and tiny ambient markers are scenery, not obstacles.
 for(const [x,y]of [[42,56],[840,65],[42,454],[844,843],[41,1120],[800,763]]){ctx.fillStyle='#faf0d0';circle(x,y,11);ctx.fill();ctx.strokeStyle='#927665';ctx.lineWidth=2;ctx.stroke();ctx.fillStyle='#f6d89a70';circle(x,y,23);ctx.fill();}
}
function obstacleDraw(s){const {x,y,w,h,kind}=s;ctx.save();ctx.shadowColor='#46304466';ctx.shadowBlur=9;ctx.shadowOffsetY=5;
 if(kind==='wall'){ctx.fillStyle='#56475a';rounded(x,y,w,h,4);ctx.fill();ctx.shadowBlur=0;ctx.shadowOffsetY=0;ctx.fillStyle='#b69b98';rounded(x+2,y+2,w-4,h-7,3);ctx.fill();ctx.strokeStyle='#fff1c780';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(x+3,y+3);ctx.lineTo(x+w-4,y+3);ctx.stroke();}
 else{const color={sofa:'#668e8b',shelf:'#755b78',table:'#aa755e',box:'#b48b5d'}[kind];ctx.fillStyle=color;rounded(x,y,w,h,kind==='box'?7:13);ctx.fill();ctx.shadowBlur=0;ctx.shadowOffsetY=0;ctx.lineWidth=3;ctx.strokeStyle='#46344990';rounded(x+4,y+4,w-8,h-8,kind==='box'?5:9);ctx.stroke();if(kind==='sofa'){ctx.fillStyle='#95b7b1';rounded(x+8,y+8,w-16,h-16,8);ctx.fill();ctx.fillStyle='#6a9395';rounded(x+11,y+10,Math.max(9,w-22),Math.min(23,h*.34),5);ctx.fill();}
 else if(kind==='table'){ctx.fillStyle='#d9a584';rounded(x+9,y+8,w-18,h-16,8);ctx.fill();ctx.fillStyle='#f8e1b3';circle(x+w*.57,y+h*.50,Math.min(15,h*.25));ctx.fill();ctx.fillStyle='#dfa48b';circle(x+w*.60,y+h*.47,5);ctx.fill();}
 else if(kind==='shelf'){ctx.strokeStyle='#e6c6a6';ctx.lineWidth=4;for(let n=1;n<=3;n++){const yy=y+(h/4)*n;ctx.beginPath();ctx.moveTo(x+8,yy);ctx.lineTo(x+w-8,yy);ctx.stroke();}ctx.fillStyle='#c9b2c3';for(let i=0;i<6;i++)ctx.fillRect(x+11+(i%3)*(w-22)/3,y+13+Math.floor(i/3)*h*.49,10,Math.min(12,h*.18));}
 else if(kind==='box'){ctx.strokeStyle='#f0cb90';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(x+10,y+10);ctx.lineTo(x+w-10,y+h-10);ctx.moveTo(x+w-10,y+10);ctx.lineTo(x+10,y+h-10);ctx.stroke();}}
 ctx.restore();}
function drawNest(){const open=cheeses.every(c=>c.done),pulse=Math.sin(clock*5)*.5+.5;ctx.save();ctx.translate(nest.x,nest.y);if(open){ctx.fillStyle=`rgba(137,254,194,${.12+pulse*.15})`;circle(0,0,45+pulse*10);ctx.fill();}
 ctx.fillStyle=open?'#66c09b':'#816b71';circle(0,0,31);ctx.fill();ctx.strokeStyle=open?'#f2e8a6':'#4f3b52';ctx.lineWidth=5;ctx.stroke();ctx.fillStyle=open?'#1d5849':'#3a2b38';circle(0,0,21);ctx.fill();ctx.strokeStyle=open?'#a9ffe0':'#be9e95';ctx.lineWidth=2;ctx.stroke();
 ctx.fillStyle='#fff9e6';ctx.font='bold 13px sans-serif';ctx.textAlign='center';ctx.fillText('巣',0,5);ctx.font='bold 10px sans-serif';ctx.fillStyle='#403346';ctx.fillText(open?'OPEN':'LOCK',0,-40);ctx.restore();}
function drawCheese(ch){if(ch.done)return;ctx.save();ctx.translate(ch.x,ch.y);const bob=Math.sin(clock*3+ch.id)*2.4;
 ctx.fillStyle='#f8f0ba55';circle(0,0,37);ctx.fill();ctx.translate(0,bob);ctx.fillStyle='#75544154';ctx.beginPath();ctx.ellipse(0,16,22,9,0,0,TAU);ctx.fill();
 ctx.fillStyle='#ffdd76';ctx.strokeStyle='#ad6a4f';ctx.lineWidth=2.5;ctx.beginPath();ctx.moveTo(-23,12);ctx.lineTo(-16,-18);ctx.quadraticCurveTo(-9,-25,1,-17);ctx.lineTo(24,8);ctx.closePath();ctx.fill();ctx.stroke();ctx.fillStyle='#ecad5c';ctx.beginPath();ctx.moveTo(-23,12);ctx.lineTo(24,8);ctx.lineTo(-5,21);ctx.closePath();ctx.fill();ctx.stroke();ctx.fillStyle='#f7bc5c';for(const [x,y,r]of[[-10,-7,5],[5,0,4],[-8,9,3]]){circle(x,y,r);ctx.fill();}
 if(ch.progress>0){ctx.strokeStyle='#34283c88';ctx.lineWidth=7;circle(0,0,32);ctx.stroke();ctx.strokeStyle='#a9ffe0';ctx.lineCap='round';ctx.beginPath();ctx.arc(0,0,32,-Math.PI/2,-Math.PI/2+TAU*ch.progress);ctx.stroke();}
 ctx.restore();}
function drawMouse(){ctx.save();ctx.translate(player.x,player.y);ctx.rotate(player.dir+Math.PI/2);const step=player.speed?Math.sin(clock*(player.dash?23:12))*2:0;
 ctx.strokeStyle='#bd7487';ctx.lineWidth=4;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(0,10);ctx.bezierCurveTo(-10,21,-25,19,-27,33+step);ctx.stroke();
 ctx.fillStyle=player.dash?'#f4ded4':'#e1c6c4';ctx.strokeStyle='#926879';ctx.lineWidth=2.5;for(const x of [-11,11]){circle(x,-8,9);ctx.fill();ctx.stroke();ctx.fillStyle='#f0aabb';circle(x,-8,5);ctx.fill();ctx.fillStyle='#e1c6c4';}
 ctx.fillStyle='#f6e4db';ctx.beginPath();ctx.ellipse(0,3,12.5,16,0,0,TAU);ctx.fill();ctx.stroke();ctx.fillStyle='#2b2432';for(const x of[-5,5]){circle(x,1,2.5);ctx.fill();}
 ctx.fillStyle='#dd8799';circle(0,-10,3.4);ctx.fill();ctx.strokeStyle='#fff3e8';ctx.lineWidth=1.1;for(const sg of [-1,1])for(const tilt of[-1,1]){ctx.beginPath();ctx.moveTo(sg*4,-7);ctx.lineTo(sg*15,-7+tilt*5);ctx.stroke();}
 if(player.dash){ctx.strokeStyle='#fff4dab0';ctx.lineWidth=3;for(const x of [-8,0,8]){ctx.beginPath();ctx.moveTo(x,21);ctx.lineTo(x,29+step);ctx.stroke();}}
 ctx.restore();}
function drawCat(){ctx.save();ctx.translate(cat.x,cat.y);ctx.rotate(cat.dir+Math.PI/2);
 const watching=cat.mode==='chase'||cat.mode==='alert';ctx.strokeStyle=watching?'#ce6b61':'#ab7757';ctx.lineWidth=7;ctx.lineCap='round';ctx.beginPath();ctx.moveTo(6,13);ctx.bezierCurveTo(21,21,26,4,23,-6);ctx.stroke();
 ctx.fillStyle=watching?'#d89377':'#c39b7e';ctx.strokeStyle='#795b63';ctx.lineWidth=2.5;ctx.beginPath();ctx.ellipse(0,3,17,20,0,0,TAU);ctx.fill();ctx.stroke();
 ctx.beginPath();ctx.moveTo(-17,-6);ctx.lineTo(-18,-30);ctx.lineTo(-5,-19);ctx.lineTo(5,-19);ctx.lineTo(18,-30);ctx.lineTo(17,-6);ctx.closePath();ctx.fill();ctx.stroke();ctx.fillStyle='#eaa9a1';ctx.beginPath();ctx.moveTo(-16,-25);ctx.lineTo(-12,-17);ctx.lineTo(-7,-19);ctx.moveTo(16,-25);ctx.lineTo(12,-17);ctx.lineTo(7,-19);ctx.fill();
 ctx.fillStyle='#fff0df';for(const x of[-8,8]){ctx.beginPath();ctx.ellipse(x,-8,5,7,0,0,TAU);ctx.fill();}
 ctx.fillStyle=watching?'#c63f43':'#493544';for(const x of[-8,8]){ctx.beginPath();ctx.ellipse(x,-8,2.8,4.7,0,0,TAU);ctx.fill();}
 ctx.fillStyle='#885363';circle(0,1,3.5);ctx.fill();ctx.strokeStyle='#664b5c';ctx.lineWidth=1.5;for(const sg of[-1,1]){ctx.beginPath();ctx.moveTo(sg*4,1);ctx.lineTo(sg*23,0);ctx.moveTo(sg*4,3);ctx.lineTo(sg*21,10);ctx.stroke();}
 ctx.fillStyle='#ffdf85';ctx.font='900 13px system-ui';ctx.textAlign='center';if(cat.mode==='investigate'||cat.mode==='search')ctx.fillText('?',0,-34);if(cat.mode==='alert'||cat.mode==='chase')ctx.fillText('!',0,-35);
 ctx.restore();}
function drawVision(){const cone=cat.mode==='chase'||cat.mode==='alert',range=cone?244:225,half=cat.mode==='chase'?.88:.75;
 ctx.fillStyle=cone?'rgba(240,70,80,.22)':'rgba(255,228,122,.17)';ctx.beginPath();ctx.moveTo(cat.x,cat.y);for(let i=0;i<=44;i++){const a=cat.dir-half+(half*2*i/44),d=intersectRay(cat.x,cat.y,Math.cos(a),Math.sin(a),range);ctx.lineTo(cat.x+Math.cos(a)*d,cat.y+Math.sin(a)*d);}ctx.closePath();ctx.fill();
 ctx.fillStyle=cone?'rgba(253,85,94,.14)':'rgba(255,234,154,.13)';ctx.beginPath();for(let i=0;i<=40;i++){const a=TAU*i/40,d=intersectRay(cat.x,cat.y,Math.cos(a),Math.sin(a),56);if(!i)ctx.moveTo(cat.x+Math.cos(a)*d,cat.y+Math.sin(a)*d);else ctx.lineTo(cat.x+Math.cos(a)*d,cat.y+Math.sin(a)*d);}ctx.closePath();ctx.fill();}
function drawWorld(){ctx.save();ctx.translate(-cam.x,-cam.y);floorDraw();for(const r of solids)obstacleDraw(r);drawNest();drawVision();for(const ch of cheeses)drawCheese(ch);drawMouse();drawCat();
 for(const f of fx){ctx.save();ctx.globalAlpha=clamp(f.life/f.max,0,1);ctx.fillStyle=f.color;ctx.textAlign='center';ctx.font='900 16px system-ui';ctx.shadowColor='#3c263c';ctx.shadowBlur=6;ctx.fillText(f.label,f.x,f.y-(f.max-f.life)*30);ctx.restore();}
 ctx.restore();}
function drawWaypoint(){if(state!=='playing')return;
 const goal=cheeses.every(c=>c.done)?nest:cheeses.filter(c=>!c.done).reduce((a,b)=>dist(player,a)<dist(player,b)?a:b);
 const x=(goal.x-cam.x)*scale,y=(goal.y-cam.y)*scale,cw=cv.width/ss,ch=cv.height/ss;
 if(x>42&&x<cw-42&&y>115&&y<ch-180)return;
 const px=clamp(x,29,cw-29),py=clamp(y,139,ch-190);const angle=Math.atan2(y-py,x-px);ctx.save();ctx.translate(px,py);ctx.fillStyle='#30283fdd';circle(0,0,19);ctx.fill();ctx.strokeStyle='#ffdf91';ctx.lineWidth=1.6;ctx.stroke();ctx.rotate(angle);ctx.fillStyle='#ffdf91';ctx.beginPath();ctx.moveTo(11,0);ctx.lineTo(-5,-7);ctx.lineTo(-5,7);ctx.closePath();ctx.fill();ctx.restore();}
function drawSkill(){if(!skill)return;const cw=cv.width/ss,ch=cv.height/ss,cx=cw/2,cy=ch*.46,rr=Math.min(96,cw*.26);
 ctx.fillStyle='rgba(23,18,37,.43)';ctx.fillRect(0,0,cw,ch);ctx.save();ctx.translate(cx,cy);
 ctx.fillStyle='#282137f5';circle(0,0,rr+22);ctx.fill();ctx.strokeStyle='#f8e6c9';ctx.lineWidth=3;ctx.stroke();
 ctx.lineWidth=14;ctx.strokeStyle='#785d76';ctx.beginPath();ctx.arc(0,0,rr,-Math.PI/2,-Math.PI/2+TAU);ctx.stroke();
 const center=skill.start+skill.target;ctx.strokeStyle='#aadfbb';ctx.beginPath();ctx.arc(0,0,rr,center-skill.zone/2,center+skill.zone/2);ctx.stroke();ctx.strokeStyle='#ffe281';ctx.lineWidth=17;ctx.beginPath();ctx.arc(0,0,rr,center-skill.perfect/2,center+skill.perfect/2);ctx.stroke();
 const a=skill.start+skill.phase*skill.speed;ctx.strokeStyle='#fff5e4';ctx.lineWidth=4;ctx.shadowColor='#fff3b8';ctx.shadowBlur=8;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(Math.cos(a)*(rr+11),Math.sin(a)*(rr+11));ctx.stroke();ctx.shadowBlur=0;ctx.fillStyle='#ffe9aa';circle(0,0,8);ctx.fill();ctx.fillStyle='#fff6df';ctx.font='900 15px system-ui';ctx.textAlign='center';ctx.fillText('かじかじ!',0,7);ctx.restore();}
function draw(){const w=cv.width/ss,h=cv.height/ss;ctx.setTransform(ss,0,0,ss,0,0);ctx.clearRect(0,0,w,h);if(state==='title'){ctx.fillStyle='#35293d';ctx.fillRect(0,0,w,h);return;}camera();ctx.save();ctx.scale(scale,scale);drawWorld();ctx.restore();
 if(state==='playing'){drawWaypoint();drawSkill();const danger=clamp(1-dist(cat,player)/230,0,1);if(danger>0){const grad=ctx.createRadialGradient(w/2,h/2,Math.min(w,h)*.21,w/2,h/2,Math.max(w,h)*.61);grad.addColorStop(0,'rgba(146,34,57,0)');grad.addColorStop(1,`rgba(146,34,57,${(danger*.25).toFixed(3)})`);ctx.fillStyle=grad;ctx.fillRect(0,0,w,h);}}
 if(state==='caught'||state==='result'){ctx.fillStyle='rgba(25,17,39,.36)';ctx.fillRect(0,0,w,h);}if(flash>.01){ctx.fillStyle=`rgba(${state==='won'?'236,255,194':'248,98,109'},${Math.min(.36,flash*.23)})`;ctx.fillRect(0,0,w,h);}
}
function loop(t){if(!lastTime)lastTime=t;const dt=clamp((t-lastTime)/1000,0,.045);lastTime=t;if(state!=='title'&&state!=='result')tick(dt);draw();requestAnimationFrame(loop);}
function pointerPos(e){const r=cv.getBoundingClientRect();return{x:e.clientX-r.left,y:e.clientY-r.top};}
function toggleSound(){soundEnabled=!soundEnabled;$('sound').textContent=soundEnabled?'♪ ON':'♪ OFF';$('sound').setAttribute('aria-label',soundEnabled?'効果音をオフにする':'効果音をオンにする');try{localStorage.setItem('catnyalight-muted',soundEnabled?'0':'1');}catch{}}
$('sound').addEventListener('click',toggleSound);$('sound').textContent=soundEnabled?'♪ ON':'♪ OFF';
$('start').addEventListener('click',reset);$('retry').addEventListener('click',reset);
const el=$('stick');function updateStick(e){const r=el.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2,dx=e.clientX-cx,dy=e.clientY-cy,limit=43* Math.min(1,r.width/136),len=Math.hypot(dx,dy),factor=Math.min(1,limit/Math.max(len,.001));stick.x=clamp(dx*factor/limit,-1,1);stick.y=clamp(dy*factor/limit,-1,1);$('knob').style.transform=`translate(${dx*factor}px,${dy*factor}px)`;}
el.addEventListener('pointerdown',e=>{if(state!=='playing')return;e.preventDefault();stick.id=e.pointerId;stick.active=true;el.setPointerCapture(e.pointerId);updateStick(e);});
el.addEventListener('pointermove',e=>{if(stick.active&&e.pointerId===stick.id){e.preventDefault();updateStick(e);}});
function endStick(e){if(e.pointerId!==stick.id)return;stick.active=false;stick.id=null;stick.x=stick.y=0;resetKnob();}
el.addEventListener('pointerup',endStick);el.addEventListener('pointercancel',endStick);el.addEventListener('lostpointercapture',e=>{if(stick.active)endStick(e);});
const dash=$('dash');dash.addEventListener('pointerdown',e=>{e.preventDefault();dashHeld=true;dash.setPointerCapture(e.pointerId);});function endDash(){dashHeld=false;}dash.addEventListener('pointerup',endDash);dash.addEventListener('pointercancel',endDash);dash.addEventListener('lostpointercapture',endDash);
skillHit.addEventListener('pointerdown',e=>{e.preventDefault();tapSkill();});
cv.addEventListener('pointerdown',e=>{if(state!=='playing'||skill||e.pointerType!=='mouse')return;const p=pointerPos(e);clickGoal={x:clamp(p.x/scale+cam.x,30,W-30),y:clamp(p.y/scale+cam.y,30,H-30)};clickRoute=[];});
window.addEventListener('keydown',e=>{const code=e.code;if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(code))e.preventDefault();if(state!=='playing')return;if(skill&&(code==='Space'||code==='Enter')){if(!e.repeat)tapSkill();return;}keys.add(code);});
window.addEventListener('keyup',e=>keys.delete(e.code));window.addEventListener('blur',()=>{keys.clear();dashHeld=false;stick.active=false;stick.x=stick.y=0;resetKnob();});
document.addEventListener('visibilitychange',()=>{if(document.hidden){keys.clear();dashHeld=false;lastTime=0;}});
window.addEventListener('resize',resize);resize();requestAnimationFrame(loop);
// Opt-in deterministic test interface. Not shown or used during normal play.
if(new URLSearchParams(location.search).has('test')||window.__forceCatGameTest){window.__catGameTest={get:()=>({state,clock,player:{...player},cat:{...cat},cheeses:cheeses?.map(c=>({...c})),nest:{...nest},skill:skill?{...skill}:null}),
 reset,step:seconds=>{for(let i=0;i<Math.ceil(seconds/.025);i++)tick(Math.min(.025,seconds-i*.025));},stepSim:dt=>tick(dt),setInput:(x,y,sprint=false)=>{stick.x=x;stick.y=y;dashHeld=sprint;},move:(x,y)=>{player.x=x;player.y=y;clickGoal=null;},catMove:(x,y)=>{cat.x=x;cat.y=y;},catDir:a=>{cat.dir=a;},mode:m=>setCatMode(m),skillResult:stopSkill,skillTap:tapSkill,finish,route,inside,clearSight,visible,
 cheeseDone:i=>{cheeses[i].progress=1;cheeses[i].done=true;$('count').textContent=`チーズ ${cheeses.filter(c=>c.done).length} / 3`;},setCheese:(i,x,y)=>{cheeses[i].x=x;cheeses[i].y=y;},setCatTarget:p=>{cat.target=p;},hear:(x,y,p=1.5)=>investigate({x,y},p),nav:()=>({cols:COLS,rows:ROWS,available:nav.reduce((a,b)=>a+b,0)})};}
})();
