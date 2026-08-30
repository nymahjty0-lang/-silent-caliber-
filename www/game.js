// ============================================================
// SILENT CALIBER 2D — side-view shooter, original code
// v0.3: character customization, pirate bots, multiple maps
// ============================================================

const WEAPONS = {
  pistol:  { name:'PISTOL',        dmg:22, mag:12, reserve:60,  rate:280, spread:0.05, bulletSpeed:900, range:500 },
  smg:     { name:'SMG',           dmg:16, mag:30, reserve:120, rate:95,  spread:0.09, bulletSpeed:950, range:400 },
  rifle:   { name:'ASSAULT RIFLE', dmg:26, mag:30, reserve:90,  rate:135, spread:0.06, bulletSpeed:1000,range:600 },
  shotgun: { name:'SHOTGUN',       dmg:14, mag:8,  reserve:32,  rate:650, spread:0.25, bulletSpeed:850, range:220, pellets:6 },
  sniper:  { name:'SNIPER',        dmg:95, mag:5,  reserve:20,  rate:1150,spread:0.005,bulletSpeed:1400,range:900 },
};

const SKIN_COLORS = ['#f2c299','#e0a878','#c58a5c','#8a5a3c','#5c3a24','#f5e6d3'];
const OUTFIT_COLORS = ['#4a5c3a','#3a4a5c','#5c3a3a','#4a4a4a','#6b4a2a','#2a2a2a'];
const HAT_TYPES = [
  { key:'none',    icon:'—'  },
  { key:'bandana', icon:'🏴' },
  { key:'cap',     icon:'🧢' },
  { key:'helmet',  icon:'⛑️' },
  { key:'pirate',  icon:'🏴‍☠️' },
];

const MAPS = [
  { name:'شهر متروکه',    seed:42,  ground:'#3a4658', sky:'#0e1420', accent:'#4d5c72' },
  { name:'جزیره دزدان',   seed:777, ground:'#5c4a2a', sky:'#1a2a3a', accent:'#7a6238' },
  { name:'پایگاه نظامی',  seed:1234,ground:'#2a3a2a', sky:'#0a1410', accent:'#3a5238' },
];

function $(id){ return document.getElementById(id); }
function showScreen(id){
  document.querySelectorAll('.screen').forEach(s=>s.classList.add('hidden'));
  $(id).classList.remove('hidden');
}

// ---------------- Character profile (persisted) ----------------
const Profile = {
  name: localStorage.getItem('sc_name') || '',
  skin: localStorage.getItem('sc_skin') || SKIN_COLORS[0],
  outfit: localStorage.getItem('sc_outfit') || OUTFIT_COLORS[0],
  hat: localStorage.getItem('sc_hat') || 'none',
  save(){
    localStorage.setItem('sc_name', this.name);
    localStorage.setItem('sc_skin', this.skin);
    localStorage.setItem('sc_outfit', this.outfit);
    localStorage.setItem('sc_hat', this.hat);
  }
};

window.addEventListener('load', ()=>{
  let p = 0;
  const bar = $('loadBarInner'), txt = $('loadText');
  const steps = ['بارگذاری موتور بازی...','ساخت نقشه...','بارگذاری سلاح‌ها...','آماده‌سازی بات‌ها...','اتمام'];
  const iv = setInterval(()=>{
    p += 20; bar.style.width = p+'%'; txt.textContent = steps[Math.min(steps.length-1, Math.floor(p/20))];
    if(p>=100){ clearInterval(iv); $('loadingScreen').classList.add('hidden'); showScreen('mainMenu'); }
  }, 200);

  $('btnPlay').onclick = ()=> showScreen('modeSelect');
  $('btnCustomize').onclick = ()=> openCustomize();
  $('btnSettings').onclick = ()=> showScreen('settingsScreen');
  $('btnCredits').onclick = ()=> showScreen('creditsScreen');
  $('backFromSettings').onclick = ()=> showScreen('mainMenu');
  $('backFromCredits').onclick = ()=> showScreen('mainMenu');
  $('backFromMode').onclick = ()=> showScreen('mainMenu');
  $('backFromLan').onclick = ()=> showScreen('modeSelect');
  $('backFromCustomize').onclick = ()=> showScreen('mainMenu');
  $('backFromMapSelect').onclick = ()=> showScreen('modeSelect');

  $('modeBot').onclick = ()=> openMapSelect();
  $('modeLan').onclick = ()=> showScreen('lanLobby');
  $('btnHostGame').onclick = ()=> { GameState.selectedMap = 0; startGame('lan-host'); };
  $('btnJoinGame').onclick = ()=> { GameState.selectedMap = 0; startGame('lan-join'); };

  $('saveCustomize').onclick = ()=>{
    Profile.name = $('nameInput').value.trim() || 'Player';
    Profile.save();
    showScreen('mainMenu');
  };

  $('pauseBtn').onclick = ()=>{ GameState.paused=true; $('pauseMenu').classList.remove('hidden'); };
  $('resumeBtn').onclick = ()=>{ $('pauseMenu').classList.add('hidden'); GameState.paused=false; };
  $('quitToMenuBtn').onclick = ()=> quitToMenu();
  $('respawnBtn').onclick = ()=> respawnPlayer();

  document.querySelectorAll('.weaponBtn').forEach(b=>{ b.onclick = ()=> switchWeapon(b.dataset.weapon); });
  $('fireBtn').addEventListener('touchstart', e=>{ e.preventDefault(); Input.firing=true; });
  $('fireBtn').addEventListener('touchend', e=>{ e.preventDefault(); Input.firing=false; });
  $('jetpackBtn').addEventListener('touchstart', e=>{ e.preventDefault(); Input.jetpack=true; });
  $('jetpackBtn').addEventListener('touchend', e=>{ e.preventDefault(); Input.jetpack=false; });
  $('reloadBtn').addEventListener('touchstart', e=>{ e.preventDefault(); reload(); });

  setupJoystick();
  buildCustomizeUI();
  buildMapSelectUI();
});

function quitToMenu(){
  GameState.running = false;
  GameState.paused = false;
  $('pauseMenu').classList.add('hidden');
  $('deathScreen').classList.add('hidden');
  if(Net.ws) try{ Net.ws.close(); }catch(e){}
  showScreen('mainMenu');
}

// ---------------- Customize screen ----------------
function openCustomize(){
  $('nameInput').value = Profile.name;
  showScreen('customizeScreen');
  drawPreview();
}
function buildCustomizeUI(){
  const skinRow = $('skinRow');
  SKIN_COLORS.forEach(c=>{
    const el = document.createElement('div');
    el.className = 'swatch' + (c===Profile.skin?' selected':'');
    el.style.background = c;
    el.onclick = ()=>{ Profile.skin=c; refreshSwatches(); drawPreview(); };
    skinRow.appendChild(el);
  });
  const outfitRow = $('outfitRow');
  OUTFIT_COLORS.forEach(c=>{
    const el = document.createElement('div');
    el.className = 'swatch' + (c===Profile.outfit?' selected':'');
    el.style.background = c;
    el.onclick = ()=>{ Profile.outfit=c; refreshSwatches(); drawPreview(); };
    outfitRow.appendChild(el);
  });
  const hatRow = $('hatRow');
  HAT_TYPES.forEach(h=>{
    const el = document.createElement('div');
    el.className = 'hatSwatch' + (h.key===Profile.hat?' selected':'');
    el.textContent = h.icon;
    el.onclick = ()=>{ Profile.hat=h.key; refreshSwatches(); drawPreview(); };
    hatRow.appendChild(el);
  });
}
function refreshSwatches(){
  document.querySelectorAll('#skinRow .swatch').forEach((el,i)=> el.classList.toggle('selected', SKIN_COLORS[i]===Profile.skin));
  document.querySelectorAll('#outfitRow .swatch').forEach((el,i)=> el.classList.toggle('selected', OUTFIT_COLORS[i]===Profile.outfit));
  document.querySelectorAll('#hatRow .hatSwatch').forEach((el,i)=> el.classList.toggle('selected', HAT_TYPES[i].key===Profile.hat));
}
function drawPreview(){
  const c = $('previewCanvas'), pctx = c.getContext('2d');
  pctx.clearRect(0,0,c.width,c.height);
  pctx.save();
  pctx.translate(c.width/2, c.height-30);
  drawFigure(pctx, 0, 0, 1, Profile.outfit, Profile.skin, Profile.hat, 100, false);
  pctx.restore();
}

// ---------------- Map select ----------------
function buildMapSelectUI(){
  const wrap = $('mapCards');
  MAPS.forEach((m, i)=>{
    const el = document.createElement('div');
    el.className = 'modeCard';
    el.innerHTML = `<div class="modeIcon">🗺️</div><div class="modeName">${m.name}</div><div class="modeDesc">نقشه شماره ${i+1}</div>`;
    el.onclick = ()=>{ GameState.selectedMap = i; startGame('bot'); };
    wrap.appendChild(el);
  });
}
function openMapSelect(){ showScreen('mapSelect'); }

// ---------------- Input ----------------
const Input = { moveX:0, firing:false, jetpack:false };

function setupJoystick(){
  const zone = $('moveJoystickZone'), stick = $('moveJoystickStick');
  let active=false, startX=0, startY=0;
  zone.addEventListener('touchstart', e=>{
    active=true; const r=zone.getBoundingClientRect(); startX=r.left+70; startY=r.top+70;
  });
  zone.addEventListener('touchmove', e=>{
    if(!active) return; e.preventDefault();
    const t=e.touches[0];
    let dx=t.clientX-startX, dy=t.clientY-startY;
    const max=55; const dist=Math.hypot(dx,dy);
    if(dist>max){ dx=dx/dist*max; dy=dy/dist*max; }
    stick.style.transform = `translate(${dx}px,${dy}px)`;
    Input.moveX = dx/max;
  });
  const end = ()=>{ active=false; stick.style.transform='translate(0,0)'; Input.moveX=0; };
  zone.addEventListener('touchend', end);
  zone.addEventListener('touchcancel', end);
}

// ---------------- Map (platforms) ----------------
const WORLD_W = 3000, WORLD_H = 1200;
function buildMap(seed){
  const rng = mulberry32(seed);
  const platforms = [];
  platforms.push({x:0, y:1100, w:WORLD_W, h:100});
  let x = 150;
  while(x < WORLD_W - 200){
    const w = 120 + rng()*180;
    const y = 500 + rng()*500;
    platforms.push({x, y, w, h:26});
    x += w + 100 + rng()*150;
  }
  for(let i=0;i<8;i++){
    platforms.push({x: 200 + rng()*(WORLD_W-400), y: 200 + rng()*250, w: 100+rng()*120, h:22});
  }
  return platforms;
}
function mulberry32(a){ return function(){ a|=0; a=a+0x6D2B79F5|0; let t=Math.imul(a^a>>>15,1|a); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; }; }

// ---------------- Game State ----------------
const GameState = {
  running:false, paused:false, mode:'bot', selectedMap:0,
  player:{ x:150,y:900,vx:0,vy:0,facing:1,onGround:false,hp:100,fuel:100,score:0,kills:0,deaths:0,w:26,h:46 },
  weaponKey:'rifle', ammo:{}, reloading:false, lastShot:0,
  bots:[], bullets:[], remotePlayers:{}, platforms:[],
  camX:0, camY:0,
};
for(const k in WEAPONS) GameState.ammo[k] = { mag: WEAPONS[k].mag, reserve: WEAPONS[k].reserve };

let canvas=null, ctx=null, currentMap=MAPS[0];

function startGame(mode){
  GameState.mode = mode;
  currentMap = MAPS[GameState.selectedMap] || MAPS[0];
  showScreen('gameScreen');
  canvas = $('renderCanvas');
  ctx = canvas.getContext('2d');
  GameState.platforms = buildMap(currentMap.seed);
  resetPlayer();
  spawnBots(mode==='bot'? 5 : 0);
  GameState.bullets = [];
  GameState.running = true; GameState.paused = false;

  if(mode==='lan-host') Net.host();
  if(mode==='lan-join') Net.join($('hostAddress').value.trim());

  updateHUD();
  resizeCanvas();
  window.onresize = resizeCanvas;
  requestAnimationFrame(loop);
}
function resizeCanvas(){
  canvas.width = canvas.clientWidth;
  canvas.height = canvas.clientHeight;
}

function resetPlayer(){
  const p = GameState.player;
  p.x=150; p.y=900; p.vx=0; p.vy=0; p.hp=100; p.fuel=100;
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
    GameState.bots.push({
      id:'دزد '+(i+1), x:400+i*300, y:900, vx:0, vy:0, facing:1, onGround:false,
      hp:100, alive:true, lastShot:0, w:26, h:46, dir:1
    });
  }
}

// ---------------- Weapons ----------------
function switchWeapon(key){
  GameState.weaponKey = key;
  document.querySelectorAll('.weaponBtn').forEach(b=> b.classList.toggle('active', b.dataset.weapon===key));
  updateHUD();
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
  }, 1200);
}

function tryFire(now){
  const key = GameState.weaponKey, w = WEAPONS[key], a = GameState.ammo[key];
  const p = GameState.player;
  if(GameState.reloading) return;
  if(now - GameState.lastShot < w.rate) return;
  if(a.mag<=0){ reload(); return; }
  a.mag--; GameState.lastShot = now;
  const pellets = w.pellets || 1;
  for(let i=0;i<pellets;i++){
    const spread = (Math.random()-0.5)*w.spread;
    const dirX = p.facing * Math.cos(spread);
    const dirY = Math.sin(spread);
    GameState.bullets.push({
      x: p.x + p.facing*20, y: p.y - 24, vx: dirX*w.bulletSpeed, vy: dirY*w.bulletSpeed,
      dmg: w.dmg, range: w.range, dist:0, owner:'player'
    });
  }
  Net.sendShoot();
  updateHUD();
}

function updateBullets(dt){
  for(let i=GameState.bullets.length-1;i>=0;i--){
    const b = GameState.bullets[i];
    b.x += b.vx*dt; b.y += b.vy*dt; b.dist += Math.hypot(b.vx,b.vy)*dt;
    let hit=false;
    if(b.owner==='player'){
      for(const bot of GameState.bots){
        if(!bot.alive) continue;
        if(Math.abs(b.x-bot.x) < bot.w/2+4 && Math.abs(b.y-(bot.y-bot.h/2)) < bot.h/2+4){
          damageBot(bot, b.dmg); hit=true; showHitMarker(); break;
        }
      }
    } else {
      const p = GameState.player;
      if(Math.abs(b.x-p.x) < p.w/2+4 && Math.abs(b.y-(p.y-p.h/2)) < p.h/2+4){
        damagePlayer(b.dmg); hit=true;
      }
    }
    if(hit || b.dist > b.range || b.x<0 || b.x>WORLD_W){
      GameState.bullets.splice(i,1);
    }
  }
}

function damageBot(b, dmg){
  b.hp -= dmg;
  if(b.hp<=0 && b.alive){
    b.alive=false;
    GameState.player.kills++; GameState.player.score += 100;
    addKillFeed(`تو ${b.id} را حذف کردی`);
    updateHUD();
    setTimeout(()=>{ b.alive=true; b.hp=100; b.x=200+Math.random()*(WORLD_W-400); b.y=900; }, 3500);
  }
}
function addKillFeed(text){
  const feed = $('killFeed');
  const item = document.createElement('div');
  item.className='killFeedItem'; item.textContent=text;
  feed.appendChild(item);
  setTimeout(()=> item.remove(), 3000);
}
function showHitMarker(){ const el=$('hitMarker'); el.classList.remove('show'); void el.offsetWidth; el.classList.add('show'); }

function damagePlayer(dmg){
  const p = GameState.player;
  p.hp -= dmg;
  flashScreen();
  if(p.hp<=0){
    p.hp=0; p.deaths++;
    GameState.paused=true;
    $('deathScreen').classList.remove('hidden');
  }
  updateHUD();
}
function flashScreen(){
  const el = $('damageFlash');
  el.classList.add('show'); setTimeout(()=> el.classList.remove('show'), 150);
}

// ---------------- HUD ----------------
function updateHUD(){
  const p = GameState.player, key=GameState.weaponKey, w=WEAPONS[key], a=GameState.ammo[key];
  $('hpVal').textContent = Math.round(p.hp); $('hpBar').style.width = Math.max(0,p.hp)+'%';
  $('fuelVal').textContent = Math.round(p.fuel); $('fuelBar').style.width = Math.max(0,p.fuel)+'%';
  $('scoreVal').textContent = p.score;
  $('killsVal').textContent = p.kills; $('deathsVal').textContent = p.deaths;
  $('weaponName').textContent = w.name;
  $('ammoInMag').textContent = a.mag; $('ammoReserve').textContent = a.reserve;
}

// ---------------- Physics / update loop ----------------
let lastTime = performance.now();
function loop(now){
  if(!GameState.running) return;
  const dt = Math.min(0.033,(now-lastTime)/1000); lastTime = now;
  if(!GameState.paused){
    update(dt, now);
    render();
  }
  requestAnimationFrame(loop);
}

const GRAVITY = 1600;
function collidePlatforms(entity){
  entity.onGround = false;
  for(const plat of GameState.platforms){
    const left = entity.x - entity.w/2, right = entity.x + entity.w/2;
    const bottom = entity.y;
    if(right > plat.x && left < plat.x+plat.w){
      if(bottom >= plat.y && bottom - entity.vy_prev*0.02 <= plat.y+6 && entity.vy >= 0){
        entity.y = plat.y; entity.vy = 0; entity.onGround = true;
      }
    }
  }
}

function update(dt, now){
  const p = GameState.player;
  p.facing = Input.moveX < -0.1 ? -1 : (Input.moveX > 0.1 ? 1 : p.facing);
  p.vx = Input.moveX * 260;

  if(Input.jetpack && p.fuel > 0){
    p.vy -= 2600*dt;
    p.fuel -= 45*dt;
  } else {
    p.fuel = Math.min(100, p.fuel + 18*dt);
  }
  p.vy_prev = p.vy;
  p.vy += GRAVITY*dt;
  p.vy = Math.min(p.vy, 1400);

  p.x += p.vx*dt; p.y += p.vy*dt;
  p.x = Math.max(20, Math.min(WORLD_W-20, p.x));
  if(p.y > WORLD_H) { p.y = 900; p.vy=0; damagePlayer(15); }
  collidePlatforms(p);

  if(Input.firing) tryFire(now);
  updateBullets(dt);
  updateBots(dt, now);
  Net.sendState();

  GameState.camX = p.x;
  GameState.camY = p.y;
}

function updateBots(dt, now){
  const p = GameState.player;
  for(const b of GameState.bots){
    if(!b.alive) continue;
    const dx = p.x - b.x;
    b.dir = dx > 0 ? 1 : -1;
    b.vx = b.dir * 100;
    b.vy_prev = b.vy;
    b.vy += GRAVITY*dt;
    b.x += b.vx*dt; b.y += b.vy*dt;
    if(b.y > WORLD_H){ b.y = 900; b.vy = 0; }
    collidePlatforms(b);

    const dist = Math.hypot(dx, p.y-b.y);
    if(dist < 500 && now - b.lastShot > 900+Math.random()*600){
      b.lastShot = now;
      const dirX = b.dir, dirY = (p.y-b.y)/Math.max(1,Math.abs(dx));
      GameState.bullets.push({
        x:b.x+b.dir*16, y:b.y-24, vx:dirX*800, vy:dirY*300,
        dmg: 10+Math.random()*8, range:500, dist:0, owner:'bot'
      });
    }
  }
}

// ---------------- Render ----------------
function render(){
  const w = canvas.width, h = canvas.height;
  ctx.fillStyle = currentMap.sky;
  ctx.fillRect(0,0,w,h);

  const camX = GameState.camX - w/2, camY = GameState.camY - h/2 - 100;

  ctx.strokeStyle = currentMap.accent;
  ctx.globalAlpha = 0.3;
  ctx.lineWidth = 1;
  for(let i=0;i<20;i++){
    const x = (i*220 - camX*0.3) % (w+220);
    ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,h); ctx.stroke();
  }
  ctx.globalAlpha = 1;

  ctx.save();
  ctx.translate(-camX, -camY);

  ctx.fillStyle = currentMap.ground;
  for(const plat of GameState.platforms){
    ctx.fillRect(plat.x, plat.y, plat.w, plat.h);
    ctx.fillStyle = currentMap.accent;
    ctx.fillRect(plat.x, plat.y, plat.w, 4);
    ctx.fillStyle = currentMap.ground;
  }

  for(const b of GameState.bots){
    if(!b.alive) continue;
    drawFigure(ctx, b.x, b.y, b.dir, '#7a5a3a', '#d9a66c', 'pirate', b.hp, true);
    ctx.fillStyle='#fff'; ctx.font='11px sans-serif'; ctx.textAlign='center';
    ctx.fillText(b.id, b.x, b.y-72);
  }

  for(const id in GameState.remotePlayers){
    const rp = GameState.remotePlayers[id];
    drawFigure(ctx, rp.x, rp.y, rp.facing||1, OUTFIT_COLORS[1], SKIN_COLORS[0], 'cap', 100, false);
  }

  const p = GameState.player;
  drawFigure(ctx, p.x, p.y, p.facing, Profile.outfit, Profile.skin, Profile.hat, p.hp, false);
  ctx.fillStyle='#ffd166'; ctx.font='11px sans-serif'; ctx.textAlign='center';
  ctx.fillText(Profile.name, p.x, p.y-72);

  ctx.fillStyle = '#ffe066';
  for(const b of GameState.bullets){
    ctx.beginPath(); ctx.arc(b.x, b.y, 3, 0, 7); ctx.fill();
  }

  ctx.restore();
}

// unified figure drawing used for both preview canvas and in-game render
function drawFigure(context, x, y, dir, outfitColor, skinColor, hat, hp, isPirate){
  context.save();
  context.translate(x, y);

  // body (outfit)
  context.fillStyle = outfitColor;
  context.fillRect(-13, -46, 26, 46);

  // head (skin)
  context.fillStyle = skinColor;
  context.beginPath(); context.arc(0, -52, 10, 0, 7); context.fill();

  // hat / accessory
  if(hat === 'bandana' || hat === 'pirate'){
    context.fillStyle = '#1a1a1a';
    context.beginPath();
    context.moveTo(-10,-58); context.lineTo(10,-58); context.lineTo(6,-48); context.lineTo(-6,-48);
    context.closePath(); context.fill();
  } else if(hat === 'cap'){
    context.fillStyle = '#c0392b';
    context.beginPath(); context.arc(0,-56,9,Math.PI,0); context.fill();
    context.fillRect(-2,-58,14,4);
  } else if(hat === 'helmet'){
    context.fillStyle = '#556b2f';
    context.beginPath(); context.arc(0,-56,10,Math.PI,0); context.fill();
  }

  // pirate eyepatch
  if(isPirate){
    context.fillStyle = '#111';
    context.fillRect(dir>0?-6:-2, -55, 6, 4);
    context.strokeStyle = '#111'; context.lineWidth=1;
    context.beginPath(); context.moveTo(-9,-56); context.lineTo(9,-52); context.stroke();
  }

  // gun
  context.fillStyle = '#222';
  context.fillRect(dir>0?10:-26, -30, 16, 5);

  // hp bar
  context.fillStyle = '#000000aa';
  context.fillRect(-16, -66, 32, 5);
  context.fillStyle = hp>50?'#4ade80':(hp>20?'#fbbf24':'#ef4444');
  context.fillRect(-16, -66, 32*Math.max(0,hp)/100, 5);

  context.restore();
}

// ---------------- LAN Multiplayer ----------------
const Net = {
  ws:null, playerId: 'p'+Math.floor(Math.random()*100000),
  host(){
    $('lanStatus').textContent = 'برای میزبانی، سرور LAN را روی این دستگاه یا یک لپ‌تاپ در همان شبکه اجرا کنید (server/server.js) سپس آدرس آن را در قسمت Join وارد کنید.';
  },
  join(addr){
    if(!addr){ $('lanStatus').textContent='آدرس سرور را وارد کنید'; return; }
    try{
      this.ws = new WebSocket('ws://'+addr);
      this.ws.onopen = ()=>{ $('lanStatus').textContent='متصل شد ✅'; };
      this.ws.onclose = ()=>{ $('lanStatus').textContent='اتصال قطع شد'; };
      this.ws.onerror = ()=>{ $('lanStatus').textContent='خطا در اتصال'; };
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
    this.ws.send(JSON.stringify({type:'state', id:this.playerId, x:p.x, y:p.y, facing:p.facing}));
  },
  sendShoot(){
    if(!this.ws || this.ws.readyState!==1) return;
    this.ws.send(JSON.stringify({type:'shoot', id:this.playerId}));
  }
};
