// ============================================================
// SILENT CALIBER 2D — side-view shooter
// v0.4: real character sprites (Kenney Toon Characters, CC0), maps
// ============================================================

const WEAPONS = {
  pistol:  { name:'PISTOL',        dmg:22, mag:12, reserve:60,  rate:280, spread:0.05, bulletSpeed:900, range:500 },
  smg:     { name:'SMG',           dmg:16, mag:30, reserve:120, rate:95,  spread:0.09, bulletSpeed:950, range:400 },
  rifle:   { name:'ASSAULT RIFLE', dmg:26, mag:30, reserve:90,  rate:135, spread:0.06, bulletSpeed:1000,range:600 },
  shotgun: { name:'SHOTGUN',       dmg:14, mag:8,  reserve:32,  rate:650, spread:0.25, bulletSpeed:850, range:220, pellets:6 },
  sniper:  { name:'SNIPER',        dmg:95, mag:5,  reserve:20,  rate:1150,spread:0.005,bulletSpeed:1400,range:900 },
};

const CHARACTERS = [
  { key:'maleAdventurer',   label:'کاراکتر ۱' },
  { key:'femaleAdventurer', label:'کاراکتر ۲' },
  { key:'malePerson',       label:'کاراکتر ۳' },
  { key:'femalePerson',     label:'کاراکتر ۴' },
  { key:'robot',            label:'ربات' },
  { key:'zombie',           label:'زامبی' },
];
const ENEMY_CHAR = 'zombie'; // bots always look like this

const MAPS = [
  { name:'شهر متروکه',    seed:42,  ground:'#3a4658', sky:'#0e1420', accent:'#4d5c72' },
  { name:'جزیره',         seed:777, ground:'#5c4a2a', sky:'#1a2a3a', accent:'#7a6238' },
  { name:'پایگاه نظامی',  seed:1234,ground:'#2a3a2a', sky:'#0a1410', accent:'#3a5238' },
];

function $(id){ return document.getElementById(id); }
function showScreen(id){
  document.querySelectorAll('.screen').forEach(s=>s.classList.add('hidden'));
  $(id).classList.remove('hidden');
}

// ---------------- Sprite loading ----------------
const Sprites = {}; // Sprites[charKey] = { idle, side, walk0, walk1, jump, hurt } as Image objects
let spritesLoaded = 0, spritesTotal = 0;
function loadSprites(onDone){
  const poses = ['idle','side','walk0','walk1','jump','hurt'];
  spritesTotal = CHARACTERS.length * poses.length;
  CHARACTERS.forEach(c=>{
    Sprites[c.key] = {};
    poses.forEach(pose=>{
      const img = new Image();
      img.onload = ()=>{ spritesLoaded++; if(spritesLoaded>=spritesTotal) onDone(); };
      img.onerror = ()=>{ spritesLoaded++; if(spritesLoaded>=spritesTotal) onDone(); };
      img.src = `sprites/${c.key}_${pose}.png`;
      Sprites[c.key][pose] = img;
    });
  });
}

// ---------------- Profile (persisted) ----------------
const Profile = {
  name: localStorage.getItem('sc_name') || '',
  character: localStorage.getItem('sc_character') || CHARACTERS[0].key,
  save(){
    localStorage.setItem('sc_name', this.name);
    localStorage.setItem('sc_character', this.character);
  }
};

window.addEventListener('load', ()=>{
  let p = 0;
  const bar = $('loadBarInner'), txt = $('loadText');
  const steps = ['بارگذاری تصاویر کاراکتر...','ساخت نقشه...','بارگذاری سلاح‌ها...','آماده‌سازی بات‌ها...','اتمام'];
  const iv = setInterval(()=>{
    p += 15; if(p>90) p=90;
    bar.style.width = p+'%'; txt.textContent = steps[Math.min(steps.length-1, Math.floor(p/20))];
  }, 150);

  loadSprites(()=>{
    clearInterval(iv);
    bar.style.width = '100%';
    setTimeout(()=>{ $('loadingScreen').classList.add('hidden'); showScreen('mainMenu'); }, 150);
  });

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
  refreshCharGrid();
  drawPreview();
}
function buildCustomizeUI(){
  const grid = $('charGrid');
  CHARACTERS.forEach(c=>{
    const el = document.createElement('div');
    el.className = 'charCard';
    el.dataset.key = c.key;
    const thumb = document.createElement('canvas');
    thumb.width = 64; thumb.height = 80;
    el.appendChild(thumb);
    const label = document.createElement('div');
    label.className = 'charLabel'; label.textContent = c.label;
    el.appendChild(label);
    el.onclick = ()=>{ Profile.character = c.key; refreshCharGrid(); drawPreview(); };
    grid.appendChild(el);

    const tctx = thumb.getContext('2d');
    const img = Sprites[c.key] && Sprites[c.key].idle;
    if(img){
      if(img.complete) tctx.drawImage(img, 0,0,96,128, 0,0,64,80);
      else img.onload = ()=> tctx.drawImage(img, 0,0,96,128, 0,0,64,80);
    }
  });
}
function refreshCharGrid(){
  document.querySelectorAll('.charCard').forEach(el=>{
    el.classList.toggle('selected', el.dataset.key === Profile.character);
  });
}
function drawPreview(){
  const c = $('previewCanvas'), pctx = c.getContext('2d');
  pctx.clearRect(0,0,c.width,c.height);
  const img = Sprites[Profile.character] && Sprites[Profile.character].idle;
  if(img && img.complete){
    const scale = 1.4;
    pctx.drawImage(img, c.width/2 - 48*scale, c.height - 128*scale - 10, 96*scale, 128*scale);
  }
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
  player:{ x:150,y:900,vx:0,vy:0,facing:1,onGround:false,hp:100,fuel:100,score:0,kills:0,deaths:0,w:26,h:46,animT:0 },
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
      id:'دشمن '+(i+1), x:400+i*300, y:900, vx:0, vy:0, facing:1, onGround:false,
      hp:100, alive:true, lastShot:0, w:26, h:46, dir:1, animT:0
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
      x: p.x + p.facing*20, y: p.y - 60, vx: dirX*w.bulletSpeed, vy: dirY*w.bulletSpeed,
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
        if(Math.abs(b.x-bot.x) < bot.w/2+8 && Math.abs(b.y-(bot.y-bot.h)) < bot.h/2+8){
          damageBot(bot, b.dmg); hit=true; showHitMarker(); break;
        }
      }
    } else {
      const p = GameState.player;
      if(Math.abs(b.x-p.x) < p.w/2+8 && Math.abs(b.y-(p.y-p.h)) < p.h/2+8){
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
  p.animT += dt * Math.abs(Input.moveX);

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
    b.animT += dt;
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
        x:b.x+b.dir*16, y:b.y-60, vx:dirX*800, vy:dirY*300,
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
    drawSpriteChar(ENEMY_CHAR, b.x, b.y, b.dir, b.onGround, Math.abs(b.vx)>5, b.animT, b.hp);
    ctx.fillStyle='#fff'; ctx.font='11px sans-serif'; ctx.textAlign='center';
    ctx.fillText(b.id, b.x, b.y-80);
  }

  for(const id in GameState.remotePlayers){
    const rp = GameState.remotePlayers[id];
    drawSpriteChar(CHARACTERS[0].key, rp.x, rp.y, rp.facing||1, true, false, 0, 100);
  }

  const p = GameState.player;
  drawSpriteChar(Profile.character, p.x, p.y, p.facing, p.onGround, Math.abs(p.vx)>5, p.animT, p.hp);
  ctx.fillStyle='#ffd166'; ctx.font='11px sans-serif'; ctx.textAlign='center';
  ctx.fillText(Profile.name || 'Player', p.x, p.y-80);

  ctx.fillStyle = '#ffe066';
  for(const b of GameState.bullets){
    ctx.beginPath(); ctx.arc(b.x, b.y, 3, 0, 7); ctx.fill();
  }

  ctx.restore();
}

// draws a sprite-based character: picks pose (idle/walk/jump), flips by facing, shows hp bar
function drawSpriteChar(charKey, x, y, dir, onGround, moving, animT, hp){
  const set = Sprites[charKey];
  if(!set) return;
  let img = set.idle;
  if(!onGround) img = set.jump || set.idle;
  else if(moving){
    img = (Math.floor(animT*8) % 2 === 0) ? set.walk0 : set.walk1;
  }
  if(!img || !img.complete || img.naturalWidth===0) img = set.idle;
  if(!img) return;

  const dw = 52, dh = 70; // display size in world units
  ctx.save();
  ctx.translate(x, y - dh);
  if(dir < 0){ ctx.scale(-1,1); }
  ctx.drawImage(img, -dw/2, 0, dw, dh);
  ctx.restore();

  // hp bar
  ctx.fillStyle = '#000000aa';
  ctx.fillRect(x-16, y-dh-12, 32, 5);
  ctx.fillStyle = hp>50?'#4ade80':(hp>20?'#fbbf24':'#ef4444');
  ctx.fillRect(x-16, y-dh-12, 32*Math.max(0,hp)/100, 5);
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
