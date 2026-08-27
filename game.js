// ============================================================
// SILENT CALIBER — Game Logic (original, no third-party game assets)
// ============================================================

const Settings = {
  sensitivity: parseFloat(localStorage.getItem('silentcaliber_sens')||'50'),
  volume: parseFloat(localStorage.getItem('silentcaliber_vol')||'80'),
  graphics: localStorage.getItem('silentcaliber_gfx')||'medium',
  fpsLimit: parseInt(localStorage.getItem('silentcaliber_fps')||'60'),
  save(){
    localStorage.setItem('silentcaliber_sens', this.sensitivity);
    localStorage.setItem('silentcaliber_vol', this.volume);
    localStorage.setItem('silentcaliber_gfx', this.graphics);
    localStorage.setItem('silentcaliber_fps', this.fpsLimit);
  }
};

const WEAPONS = {
  pistol:  { name:'PISTOL',        dmg:22, mag:12, reserve:60,  rate:280, spread:0.012, recoil:0.01, reloadTime:1100, range:60 },
  smg:     { name:'SMG',           dmg:16, mag:30, reserve:120, rate:95,  spread:0.028, recoil:0.018,reloadTime:1500, range:45 },
  rifle:   { name:'ASSAULT RIFLE', dmg:26, mag:30, reserve:90,  rate:135, spread:0.018, recoil:0.022,reloadTime:1800, range:80 },
  shotgun: { name:'SHOTGUN',       dmg:14, mag:8,  reserve:32,  rate:650, spread:0.09,  recoil:0.05, reloadTime:2200, range:20, pellets:8 },
  sniper:  { name:'SNIPER',        dmg:95, mag:5,  reserve:20,  rate:1150,spread:0.002, recoil:0.06, reloadTime:2500, range:150 },
};

function $(id){ return document.getElementById(id); }
function showScreen(id){
  document.querySelectorAll('.screen').forEach(s=>s.classList.add('hidden'));
  $(id).classList.remove('hidden');
}

// ---------------- Screen navigation ----------------
window.addEventListener('load', ()=>{
  let p = 0;
  const bar = $('loadBarInner'), txt = $('loadText');
  const steps = ['بارگذاری موتور گرافیکی...','ساخت شهر...','بارگذاری سلاح‌ها...','آماده‌سازی بات‌ها...','اتمام'];
  const iv = setInterval(()=>{
    p += 20; bar.style.width = p+'%'; txt.textContent = steps[Math.min(steps.length-1, Math.floor(p/20))];
    if(p>=100){ clearInterval(iv); $('loadingScreen').classList.add('hidden'); showScreen('mainMenu'); }
  }, 220);

  $('sensSlider').value = Settings.sensitivity; $('sensVal').textContent = Settings.sensitivity;
  $('volSlider').value = Settings.volume; $('volVal').textContent = Settings.volume;
  $('graphicsQuality').value = Settings.graphics;
  $('fpsLimit').value = Settings.fpsLimit;

  $('btnPlay').onclick = ()=> showScreen('modeSelect');
  $('btnSettings').onclick = ()=> showScreen('settingsScreen');
  $('btnCredits').onclick = ()=> showScreen('creditsScreen');
  $('backFromSettings').onclick = ()=>{ Settings.save(); showScreen('mainMenu'); };
  $('backFromCredits').onclick = ()=> showScreen('mainMenu');
  $('backFromMode').onclick = ()=> showScreen('mainMenu');
  $('backFromLan').onclick = ()=> showScreen('modeSelect');

  $('sensSlider').oninput = e=>{ Settings.sensitivity = +e.target.value; $('sensVal').textContent = e.target.value; };
  $('volSlider').oninput = e=>{ Settings.volume = +e.target.value; $('volVal').textContent = e.target.value; };
  $('graphicsQuality').onchange = e=> Settings.graphics = e.target.value;
  $('fpsLimit').onchange = e=> Settings.fpsLimit = +e.target.value;

  $('modeBot').onclick = ()=>{ startGame('bot'); };
  $('modeLan').onclick = ()=> showScreen('lanLobby');

  $('btnHostGame').onclick = ()=> startGame('lan-host');
  $('btnJoinGame').onclick = ()=> startGame('lan-join');

  $('resumeBtn').onclick = ()=>{ $('pauseMenu').classList.add('hidden'); GameState.paused=false; };
  $('quitToMenuBtn').onclick = ()=> quitToMenu();
  $('pauseBtn').onclick = ()=>{ GameState.paused=true; $('pauseMenu').classList.remove('hidden'); };
  $('respawnBtn').onclick = ()=> respawnPlayer();

  document.querySelectorAll('.weaponBtn').forEach(b=>{
    b.onclick = ()=> switchWeapon(b.dataset.weapon);
  });
  $('fireBtn').addEventListener('touchstart', e=>{ e.preventDefault(); Input.firing=true; });
  $('fireBtn').addEventListener('touchend', e=>{ e.preventDefault(); Input.firing=false; });
  $('reloadBtn').addEventListener('touchstart', e=>{ e.preventDefault(); reload(); });
  $('jumpBtn').addEventListener('touchstart', e=>{ e.preventDefault(); jump(); });
  $('crouchBtn').addEventListener('touchstart', e=>{ e.preventDefault(); Input.crouch=!Input.crouch; });
  $('sprintBtn').addEventListener('touchstart', e=>{ e.preventDefault(); Input.sprint=!Input.sprint; });
  $('nadeBtn').addEventListener('touchstart', e=>{ e.preventDefault(); throwGrenade(); });

  setupJoystick();
  setupLookZone();
});

function quitToMenu(){
  GameState.running = false;
  if(Net.ws) try{ Net.ws.close(); }catch(e){}
  showScreen('mainMenu');
}

// ---------------- Input ----------------
const Input = { moveX:0, moveY:0, lookDX:0, lookDY:0, firing:false, crouch:false, sprint:false };

function setupJoystick(){
  const zone = $('moveJoystickZone'), stick = $('moveJoystickStick');
  let active=false, cx=70, cy=70, startX=0, startY=0;
  const rect = ()=> zone.getBoundingClientRect();
  zone.addEventListener('touchstart', e=>{
    active=true; const t=e.touches[0]; const r=rect(); startX=r.left+70; startY=r.top+70;
  });
  zone.addEventListener('touchmove', e=>{
    if(!active) return; e.preventDefault();
    const t=e.touches[0];
    let dx=t.clientX-startX, dy=t.clientY-startY;
    const max=55; const dist=Math.hypot(dx,dy);
    if(dist>max){ dx=dx/dist*max; dy=dy/dist*max; }
    stick.style.transform = `translate(${dx}px,${dy}px)`;
    Input.moveX = dx/max; Input.moveY = dy/max;
  });
  const end = ()=>{ active=false; stick.style.transform='translate(0,0)'; Input.moveX=0; Input.moveY=0; };
  zone.addEventListener('touchend', end);
  zone.addEventListener('touchcancel', end);
}

function setupLookZone(){
  const zone = $('lookZone');
  let lastX=0, lastY=0, active=false;
  zone.addEventListener('touchstart', e=>{ active=true; lastX=e.touches[0].clientX; lastY=e.touches[0].clientY; });
  zone.addEventListener('touchmove', e=>{
    if(!active) return; e.preventDefault();
    const t=e.touches[0];
    Input.lookDX += (t.clientX-lastX); Input.lookDY += (t.clientY-lastY);
    lastX=t.clientX; lastY=t.clientY;
  });
  zone.addEventListener('touchend', ()=> active=false);
}

// ---------------- World / City generation ----------------
function buildCity(engine, seed){
  const objects = [];
  const rng = mulberry32(seed);
  // ground
  objects.push({ mesh: engine.makeBox(200,0.5,200,[0.24,0.26,0.24]), pos:[0,-0.25,0], collide:false, isGround:true });
  const gridSize = 9, spacing = 20;
  for(let gx=-gridSize; gx<=gridSize; gx++){
    for(let gz=-gridSize; gz<=gridSize; gz++){
      if(Math.abs(gx)<=1 && Math.abs(gz)<=1) continue; // spawn area clear
      if(rng() < 0.42){
        const h = 6 + rng()*22;
        const w = 6 + rng()*5;
        const d = 6 + rng()*5;
        const cx = gx*spacing + (rng()-0.5)*4;
        const cz = gz*spacing + (rng()-0.5)*4;
        const baseColor = [0.5+rng()*0.15, 0.52+rng()*0.15, 0.58+rng()*0.15];
        objects.push({ mesh: engine.makeBox(w,h,d, baseColor), pos:[cx,h/2,cz], size:[w,h,d], collide:true });
      } else if(rng() < 0.5){
        // small prop/obstacle
        const cx = gx*spacing + (rng()-0.5)*10;
        const cz = gz*spacing + (rng()-0.5)*10;
        objects.push({ mesh: engine.makeBox(2,1.2,2,[0.35,0.3,0.28]), pos:[cx,0.6,cz], size:[2,1.2,2], collide:true });
      }
    }
  }
  return objects;
}
function mulberry32(a){ return function(){ a|=0; a=a+0x6D2B79F5|0; let t=Math.imul(a^a>>>15,1|a); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; }; }

// ---------------- Game State ----------------
const GameState = {
  running:false, paused:false, mode:'bot',
  player:{ x:0,y:1.7,z:0, yaw:0, pitch:0, vy:0, onGround:true, crouching:false,
           hp:100, armor:50, score:0, kills:0, deaths:0 },
  weaponKey:'rifle', ammo:{}, reloading:false, lastShot:0,
  bots:[], remotePlayers:{},
};
for(const k in WEAPONS) GameState.ammo[k] = { mag: WEAPONS[k].mag, reserve: WEAPONS[k].reserve };

let engine=null, cityObjects=[], canvas=null;

function startGame(mode){
  GameState.mode = mode;
  showScreen('gameScreen');
  canvas = $('renderCanvas');
  if(!engine) engine = new Engine(canvas);
  cityObjects = buildCity(engine, 1337);
  resetPlayer();
  spawnBots(mode==='bot'? 6 : 0);
  GameState.running = true; GameState.paused = false;

  if(mode==='lan-host') Net.host();
  if(mode==='lan-join') Net.join($('hostAddress').value.trim());

  updateHUD();
  requestAnimationFrame(loop);
}

function resetPlayer(){
  const p = GameState.player;
  p.x=0; p.y=1.7; p.z=0; p.yaw=0; p.pitch=0; p.vy=0; p.hp=100; p.armor=50;
}
function respawnPlayer(){
  resetPlayer();
  $('deathScreen').classList.add('hidden');
  GameState.paused=false;
  updateHUD();
}

function spawnBots(n){
  GameState.bots = [];
  for(let i=0;i<n;i++){
    const ang = (i/n)*Math.PI*2;
    GameState.bots.push({
      id:'bot'+i, x:Math.cos(ang)*40, z:Math.sin(ang)*40, y:1.7, yaw:0,
      hp:100, alive:true, lastShot:0, targetChangeTimer:0, color:[0.8,0.25,0.2]
    });
  }
}

// ---------------- Weapon logic ----------------
function switchWeapon(key){
  GameState.weaponKey = key;
  document.querySelectorAll('.weaponBtn').forEach(b=> b.classList.toggle('active', b.dataset.weapon===key));
  updateHUD();
}
function jump(){
  const p = GameState.player;
  if(p.onGround){ p.vy = 6.2; p.onGround=false; }
}
function reload(){
  const key = GameState.weaponKey, w = WEAPONS[key], a = GameState.ammo[key];
  if(GameState.reloading || a.mag>=w.mag || a.reserve<=0) return;
  GameState.reloading = true;
  setTimeout(()=>{
    const need = w.mag - a.mag;
    const take = Math.min(need, a.reserve);
    a.mag += take; a.reserve -= take;
    GameState.reloading = false;
    updateHUD();
  }, w.reloadTime);
}
function throwGrenade(){
  spawnExplosion(GameState.player.x + Math.sin(GameState.player.yaw)*4, 1, GameState.player.z + Math.cos(GameState.player.yaw)*4);
  GameState.bots.forEach(b=>{
    const dx=b.x-(GameState.player.x+Math.sin(GameState.player.yaw)*4);
    const dz=b.z-(GameState.player.z+Math.cos(GameState.player.yaw)*4);
    if(Math.hypot(dx,dz) < 6 && b.alive) damageBot(b, 70);
  });
}
function spawnExplosion(){ /* visual particle placeholder handled in render via flash */ flashScreen('#ffaa0055'); }
function flashScreen(color){
  const el = $('damageFlash'); el.style.background = `radial-gradient(circle, transparent 30%, ${color} 100%)`;
  el.classList.add('show'); setTimeout(()=> el.classList.remove('show'), 150);
}

function tryFire(now){
  const key = GameState.weaponKey, w = WEAPONS[key], a = GameState.ammo[key];
  if(GameState.reloading) return;
  if(now - GameState.lastShot < w.rate) return;
  if(a.mag<=0){ reload(); return; }
  a.mag--; GameState.lastShot = now;
  const pellets = w.pellets || 1;
  let hitSomething = false;
  for(let i=0;i<pellets;i++){
    const spread = w.spread;
    const yaw = GameState.player.yaw + (Math.random()-0.5)*spread*2;
    const pitch = GameState.player.pitch + (Math.random()-0.5)*spread*2;
    const hit = raycastBots(GameState.player.x, GameState.player.y, GameState.player.z, yaw, pitch, w.range);
    if(hit){ hitSomething = true; damageBot(hit, w.dmg); }
  }
  if(hitSomething) showHitMarker();
  Net.sendShoot();
  updateHUD();
}

function raycastBots(x,y,z,yaw,pitch,range){
  const dx = Math.sin(yaw)*Math.cos(pitch), dz = Math.cos(yaw)*Math.cos(pitch);
  let closest=null, closestDist=range;
  for(const b of GameState.bots){
    if(!b.alive) continue;
    // distance from bot to ray line (2D approx, ignore small height diff)
    const toX=b.x-x, toZ=b.z-z;
    const proj = toX*dx+toZ*dz;
    if(proj<0 || proj>range) continue;
    const closestX=x+dx*proj, closestZ=z+dz*proj;
    const dist = Math.hypot(b.x-closestX, b.z-closestZ);
    if(dist < 1.1 && proj < closestDist){ closest=b; closestDist=proj; }
  }
  return closest;
}
function showHitMarker(){ const el=$('hitMarker'); el.classList.remove('show'); void el.offsetWidth; el.classList.add('show'); }

function damageBot(b, dmg){
  b.hp -= dmg;
  if(b.hp<=0 && b.alive){
    b.alive=false;
    GameState.player.kills++; GameState.player.score += 100;
    addKillFeed(`تو ${b.id} را حذف کردی`);
    updateHUD();
    setTimeout(()=>{ b.alive=true; b.hp=100; const ang=Math.random()*Math.PI*2; b.x=Math.cos(ang)*40; b.z=Math.sin(ang)*40; }, 3500);
  }
}
function addKillFeed(text){
  const feed = $('killFeed');
  const item = document.createElement('div');
  item.className='killFeedItem'; item.textContent=text;
  feed.appendChild(item);
  setTimeout(()=> item.remove(), 3000);
}

function damagePlayer(dmg){
  const p = GameState.player;
  let remaining = dmg;
  if(p.armor>0){ const absorbed=Math.min(p.armor, remaining*0.5); p.armor-=absorbed; remaining-=absorbed; }
  p.hp -= remaining;
  flashScreen('#ff000055');
  if(p.hp<=0){
    p.hp=0; p.deaths++;
    GameState.paused=true;
    $('killerText').textContent='توسط یک دشمن حذف شدی';
    $('deathScreen').classList.remove('hidden');
  }
  updateHUD();
}

// ---------------- HUD ----------------
function updateHUD(){
  const p = GameState.player, key=GameState.weaponKey, w=WEAPONS[key], a=GameState.ammo[key];
  $('hpVal').textContent = Math.round(p.hp); $('hpBar').style.width = p.hp+'%';
  $('armVal').textContent = Math.round(p.armor); $('armBar').style.width = (p.armor/50*100)+'%';
  $('scoreVal').textContent = p.score;
  $('killsVal').textContent = p.kills; $('deathsVal').textContent = p.deaths;
  $('weaponName').textContent = w.name;
  $('ammoInMag').textContent = a.mag; $('ammoReserve').textContent = a.reserve;
}

function drawMinimap(){
  const c = $('minimap'), ctx = c.getContext('2d');
  ctx.clearRect(0,0,120,120);
  ctx.fillStyle='#0b0e13cc'; ctx.fillRect(0,0,120,120);
  const scale = 0.5, ox=60, oz=60;
  ctx.fillStyle='#3ad0ff';
  const p = GameState.player;
  ctx.save(); ctx.translate(ox+p.x*scale*0.3, oz+p.z*scale*0.3);
  ctx.rotate(p.yaw);
  ctx.beginPath(); ctx.moveTo(0,-5); ctx.lineTo(4,4); ctx.lineTo(-4,4); ctx.closePath(); ctx.fill();
  ctx.restore();
  ctx.fillStyle='#ff3b3b';
  GameState.bots.forEach(b=>{
    if(!b.alive) return;
    ctx.beginPath(); ctx.arc(ox+(b.x-p.x)*scale*0.3, oz+(b.z-p.z)*scale*0.3, 3,0,7); ctx.fill();
  });
}

// ---------------- Update loop ----------------
let lastTime = performance.now();
function loop(now){
  if(!GameState.running) return;
  const dt = Math.min(0.05,(now-lastTime)/1000); lastTime = now;
  if(!GameState.paused){
    update(dt, now);
    render();
  }
  requestAnimationFrame(loop);
}

function update(dt, now){
  const p = GameState.player;
  const sensK = 0.0028 * (Settings.sensitivity/50);
  p.yaw -= Input.lookDX * sensK;
  p.pitch -= Input.lookDY * sensK;
  p.pitch = Math.max(-1.3, Math.min(1.3, p.pitch));
  Input.lookDX = 0; Input.lookDY = 0;

  const speed = (Input.sprint?7.2:4.2) * (Input.crouch?0.5:1);
  const mx = Input.moveX, mz = -Input.moveY;
  const forward = mz, strafe = mx;
  const dx = (Math.sin(p.yaw)*forward + Math.cos(p.yaw)*strafe) * speed * dt;
  const dz = (Math.cos(p.yaw)*forward - Math.sin(p.yaw)*strafe) * speed * dt;
  const nx = p.x+dx, nz = p.z+dz;
  if(!collides(nx, p.z)) p.x = nx;
  if(!collides(p.x, nz)) p.z = nz;

  p.vy -= 16*dt;
  p.y += p.vy*dt;
  const groundY = 1.7 * (Input.crouch?0.6:1);
  if(p.y <= groundY){ p.y=groundY; p.vy=0; p.onGround=true; } else p.onGround=false;

  if(Input.firing) tryFire(now);

  updateBots(dt, now);
  Net.sendState();
  drawMinimap();
}

function collides(x,z){
  for(const o of cityObjects){
    if(!o.collide) continue;
    const hw=o.size[0]/2+0.4, hd=o.size[2]/2+0.4;
    if(Math.abs(x-o.pos[0])<hw && Math.abs(z-o.pos[2])<hd) return true;
  }
  return false;
}

function updateBots(dt, now){
  const p = GameState.player;
  for(const b of GameState.bots){
    if(!b.alive) continue;
    const dx=p.x-b.x, dz=p.z-b.z, dist=Math.hypot(dx,dz);
    b.yaw = Math.atan2(dx,dz);
    if(dist>8){
      const speed=2.6*dt;
      const nx=b.x+Math.sin(b.yaw)*speed, nz=b.z+Math.cos(b.yaw)*speed;
      if(!collides(nx,b.z)) b.x=nx;
      if(!collides(b.x,nz)) b.z=nz;
    }
    if(dist < 45 && now-b.lastShot > 1100+Math.random()*700){
      b.lastShot = now;
      const hitChance = Math.max(0.1, 0.55 - dist/100);
      if(Math.random() < hitChance) damagePlayer(6+Math.random()*10);
    }
  }
}

// ---------------- Render ----------------
function render(){
  const p = GameState.player;
  const eye = [p.x, p.y, p.z];
  const lookYaw = p.yaw, lookPitch = p.pitch;
  const dir = [Math.sin(lookYaw)*Math.cos(lookPitch), Math.sin(lookPitch), Math.cos(lookYaw)*Math.cos(lookPitch)];
  const center = [eye[0]+dir[0], eye[1]+dir[1], eye[2]+dir[2]];
  const view = Mat4.lookAt(eye, center, [0,1,0]);

  const gfx = Settings.graphics;
  const fogFar = gfx==='low'? 60 : gfx==='medium'? 100 : 160;
  engine.beginFrame(eye, view, fogFar*0.3, fogFar, [0.55,0.62,0.72]);

  for(const o of cityObjects){
    let m = Mat4.create();
    m = Mat4.translate(m, o.pos);
    engine.drawMesh(o.mesh, m);
  }
  if(!GameState.bots[0] || !GameState.bots[0]._mesh){
    GameState.bots.forEach(b=> b._mesh = engine.makeBox(0.9,1.8,0.6,[0.8,0.25,0.2]));
  }
  for(const b of GameState.bots){
    if(!b.alive) continue;
    let m = Mat4.create();
    m = Mat4.translate(m, [b.x,1.0,b.z]);
    m = Mat4.rotateY(m, b.yaw);
    engine.drawMesh(b._mesh, m);
  }
  for(const id in GameState.remotePlayers){
    const rp = GameState.remotePlayers[id];
    if(!rp._mesh) rp._mesh = engine.makeBox(0.9,1.8,0.6,[0.2,0.6,0.9]);
    let m = Mat4.create(); m = Mat4.translate(m,[rp.x,1.0,rp.z]); m = Mat4.rotateY(m, rp.yaw||0);
    engine.drawMesh(rp._mesh, m);
  }
}

// ---------------- LAN Multiplayer (WebSocket) ----------------
const Net = {
  ws:null, room:null, playerId: 'p'+Math.floor(Math.random()*100000),
  host(){
    $('lanStatus').textContent = 'برای میزبانی، سرور LAN را روی این دستگاه یا یک لپ‌تاپ در همان شبکه اجرا کنید (server/server.js) سپس آدرس آن را در قسمت Join وارد کنید.';
  },
  join(addr){
    if(!addr){ $('lanStatus').textContent='آدرس سرور را وارد کنید'; return; }
    try{
      this.ws = new WebSocket('ws://'+addr);
      this.ws.onopen = ()=>{ $('lanStatus').textContent='متصل شد ✅'; };
      this.ws.onclose = ()=>{ $('lanStatus').textContent='اتصال قطع شد'; };
      this.ws.onerror = ()=>{ $('lanStatus').textContent='خطا در اتصال — آدرس و شبکه را بررسی کنید'; };
      this.ws.onmessage = (ev)=>{
        try{
          const msg = JSON.parse(ev.data);
          if(msg.type==='state') GameState.remotePlayers[msg.id] = msg;
          if(msg.type==='leave') delete GameState.remotePlayers[msg.id];
        }catch(e){}
      };
    }catch(e){ $('lanStatus').textContent='آدرس نامعتبر است'; }
  },
  sendState(){
    if(!this.ws || this.ws.readyState!==1) return;
    const p = GameState.player;
    this.ws.send(JSON.stringify({type:'state', id:this.playerId, x:p.x, y:p.y, z:p.z, yaw:p.yaw}));
  },
  sendShoot(){
    if(!this.ws || this.ws.readyState!==1) return;
    this.ws.send(JSON.stringify({type:'shoot', id:this.playerId}));
  }
};
