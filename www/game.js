// ============================================================
// SILENT CALIBER 2D — side-view shooter
// v0.6: 18 weapons, real bullet/grenade sprites, HP regen
// ============================================================

const WEAPONS = {
  blasterA: { name:"رگبار پایه", dmg:20, mag:32, reserve:128, rate:85, spread:0.07, bulletSpeed:950, range:450, price:0, sprite:"blaster-a" },
  blasterB: { name:"اسلحه 2", dmg:17, mag:10, reserve:40, rate:622, spread:0.05, bulletSpeed:878, range:376, price:7, sprite:"blaster-b" },
  blasterC: { name:"اسلحه 3", dmg:18, mag:11, reserve:44, rate:594, spread:0.05, bulletSpeed:906, range:402, price:9, sprite:"blaster-c" },
  blasterD: { name:"اسلحه 4", dmg:20, mag:13, reserve:52, rate:566, spread:0.05, bulletSpeed:934, range:428, price:11, sprite:"blaster-d" },
  blasterE: { name:"اسلحه 5", dmg:21, mag:14, reserve:56, rate:538, spread:0.05, bulletSpeed:962, range:454, price:13, sprite:"blaster-e" },
  blasterF: { name:"اسلحه 6", dmg:23, mag:16, reserve:64, rate:510, spread:0.05, bulletSpeed:990, range:480, price:15, sprite:"blaster-f" },
  blasterG: { name:"اسلحه 7", dmg:25, mag:18, reserve:72, rate:482, spread:0.05, bulletSpeed:1018, range:506, price:17, sprite:"blaster-g" },
  blasterH: { name:"اسلحه 8", dmg:26, mag:19, reserve:76, rate:454, spread:0.05, bulletSpeed:1046, range:532, price:18, sprite:"blaster-h" },
  blasterI: { name:"اسلحه 9", dmg:28, mag:21, reserve:84, rate:426, spread:0.05, bulletSpeed:1074, range:558, price:20, sprite:"blaster-i" },
  blasterJ: { name:"اسلحه 10", dmg:29, mag:22, reserve:88, rate:398, spread:0.05, bulletSpeed:1102, range:584, price:21, sprite:"blaster-j" },
  blasterK: { name:"اسلحه 11", dmg:31, mag:24, reserve:96, rate:370, spread:0.05, bulletSpeed:1130, range:610, price:22, sprite:"blaster-k" },
  blasterL: { name:"اسلحه 12", dmg:33, mag:26, reserve:104, rate:342, spread:0.05, bulletSpeed:1158, range:636, price:24, sprite:"blaster-l" },
  blasterM: { name:"اسلحه 13", dmg:34, mag:27, reserve:108, rate:314, spread:0.05, bulletSpeed:1186, range:662, price:25, sprite:"blaster-m" },
  blasterN: { name:"اسلحه 14", dmg:36, mag:29, reserve:116, rate:286, spread:0.05, bulletSpeed:1214, range:688, price:26, sprite:"blaster-n" },
  blasterO: { name:"اسلحه 15", dmg:37, mag:30, reserve:120, rate:258, spread:0.05, bulletSpeed:1242, range:714, price:27, sprite:"blaster-o" },
  blasterP: { name:"اسلحه 16", dmg:39, mag:32, reserve:128, rate:230, spread:0.05, bulletSpeed:1270, range:740, price:28, sprite:"blaster-p" },
  blasterQ: { name:"اسلحه 17", dmg:41, mag:34, reserve:136, rate:202, spread:0.05, bulletSpeed:1298, range:766, price:29, sprite:"blaster-q" },
  blasterR: { name:"اسلحه 18", dmg:42, mag:35, reserve:140, rate:174, spread:0.05, bulletSpeed:1326, range:792, price:30, sprite:"blaster-r" },
};
const STARTER_WEAPON = 'blasterA';
const GRENADE_PRICE = 5;
const KILL_REWARD = 10;
const GRENADE_DMG = 70;
const GRENADE_RADIUS = 90;
const HIT_REGEN_DELAY = 3000;   // ms after last hit before regen starts
const HP_REGEN_TIME = 20000;    // ms to go from 0 to 100

const CHARACTERS = [
  { key:'maleAdventurer',   label:'کاراکتر ۱' },
  { key:'femaleAdventurer', label:'کاراکتر ۲' },
  { key:'malePerson',       label:'کاراکتر ۳' },
  { key:'femalePerson',     label:'کاراکتر ۴' },
  { key:'robot',            label:'ربات' },
  { key:'zombie',           label:'زامبی' },
];
const ENEMY_CHAR = 'zombie';

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
const Sprites = {};
const WeaponSprites = {};
let BulletSprite, GrenadeSprite, SmokeSprite;
let spritesLoaded = 0, spritesTotal = 0;
function loadSprites(onDone){
  const poses = ['idle','side','walk0','walk1','jump','hurt'];
  const weaponKeys = Object.keys(WEAPONS);
  spritesTotal = CHARACTERS.length * poses.length + weaponKeys.length + 3;
  let settled = false;
  const checkDone = ()=>{ if(!settled && spritesLoaded>=spritesTotal){ settled=true; onDone(); } };
  const track = (img)=>{
    let counted = false;
    const mark = ()=>{ if(counted) return; counted=true; spritesLoaded++; checkDone(); };
    img.onload = mark; img.onerror = mark;
    setTimeout(mark, 3000);
  };

  CHARACTERS.forEach(c=>{
    Sprites[c.key] = {};
    poses.forEach(pose=>{
      const img = new Image();
      track(img);
      img.src = `sprites/${c.key}_${pose}.png`;
      Sprites[c.key][pose] = img;
    });
  });

  weaponKeys.forEach(key=>{
    const img = new Image();
    track(img);
    img.src = `weapons/${WEAPONS[key].sprite}.png`;
    WeaponSprites[key] = img;
  });

  BulletSprite = new Image(); track(BulletSprite); BulletSprite.src = 'weapons/bullet.png';
  GrenadeSprite = new Image(); track(GrenadeSprite); GrenadeSprite.src = 'weapons/grenade.png';
  SmokeSprite = new Image(); track(SmokeSprite); SmokeSprite.src = 'weapons/smoke.png';
}

// ---------------- Profile (persisted) ----------------
function loadUnlocked(){
  try{
    const raw = localStorage.getItem('sc_unlocked');
    if(raw) return JSON.parse(raw);
  }catch(e){}
  return { [STARTER_WEAPON]: true };
}
const Profile = {
  name: localStorage.getItem('sc_name') || '',
  character: localStorage.getItem('sc_character') || CHARACTERS[0].key,
  coins: parseInt(localStorage.getItem('sc_coins')||'0',10),
  grenades: parseInt(localStorage.getItem('sc_grenades')||'0',10),
  unlocked: loadUnlocked(),
  save(){
    localStorage.setItem('sc_name', this.name);
    localStorage.setItem('sc_character', this.character);
    localStorage.setItem('sc_coins', this.coins);
    localStorage.setItem('sc_grenades', this.grenades);
    localStorage.setItem('sc_unlocked', JSON.stringify(this.unlocked));
  },
  addCoins(n){ this.coins += n; this.save(); updateCoinDisplays(); }
};
if(!Profile.unlocked[STARTER_WEAPON]){ Profile.unlocked[STARTER_WEAPON] = true; Profile.save(); }

function updateCoinDisplays(){
  document.querySelectorAll('.coinVal').forEach(el=> el.textContent = Profile.coins);
}

window.addEventListener('load', ()=>{
  let p = 0;
  const bar = $('loadBarInner'), txt = $('loadText');
  const steps = ['بارگذاری تصاویر...','ساخت نقشه...','بارگذاری سلاح‌ها...','آماده‌سازی بات‌ها...','اتمام'];
  const iv = setInterval(()=>{
    p += 12; if(p>90) p=90;
    bar.style.width = p+'%'; txt.textContent = steps[Math.min(steps.length-1, Math.floor(p/20))];
  }, 150);

  let gameStarted = false;
  function goToMainMenu(){
    if(gameStarted) return;
    gameStarted = true;
    clearInterval(iv);
    bar.style.width = '100%';
    setTimeout(()=>{ $('loadingScreen').classList.add('hidden'); showScreen('mainMenu'); }, 150);
  }
  loadSprites(goToMainMenu);
  setTimeout(goToMainMenu, 5000);

  $('btnPlay').onclick = ()=> showScreen('modeSelect');
  $('btnCustomize').onclick = ()=> openCustomize();
  $('btnShop').onclick = ()=> openShop();
  $('btnSettings').onclick = ()=> showScreen('settingsScreen');
  $('btnCredits').onclick = ()=> showScreen('creditsScreen');
  $('backFromSettings').onclick = ()=> showScreen('mainMenu');
  $('backFromCredits').onclick = ()=> showScreen('mainMenu');
  $('backFromMode').onclick = ()=> showScreen('mainMenu');
  $('backFromLan').onclick = ()=> showScreen('modeSelect');
  $('backFromCustomize').onclick = ()=> showScreen('mainMenu');
  $('backFromMapSelect').onclick = ()=> showScreen('modeSelect');
  $('backFromShop').onclick = ()=>{
    if(GameState.running){
      showScreen('gameScreen');
      GameState.paused = false;
    } else {
      showScreen('mainMenu');
    }
  };

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

  $('fireBtn').addEventListener('touchstart', e=>{ e.preventDefault(); Input.firing=true; });
  $('fireBtn').addEventListener('touchend', e=>{ e.preventDefault(); Input.firing=false; });
  $('jetpackBtn').addEventListener('touchstart', e=>{ e.preventDefault(); Input.jetpack=true; });
  $('jetpackBtn').addEventListener('touchend', e=>{ e.preventDefault(); Input.jetpack=false; });
  $('reloadBtn').addEventListener('touchstart', e=>{ e.preventDefault(); reload(); });
  $('nadeBtn').addEventListener('touchstart', e=>{ e.preventDefault(); throwGrenade(); });
  $('hudCartBtn').addEventListener('click', ()=>{
    GameState.paused = true;
    buildShopUI();
    showScreen('shopScreen');
  });

  setupJoystick();
  buildCustomizeUI();
  buildMapSelectUI();
  buildWeaponSwitchUI();
  buildShopUI();
  updateCoinDisplays();
});

function quitToMenu(){
  GameState.running = false;
  GameState.paused = false;
  $('pauseMenu').classList.add('hidden');
  $('deathScreen').classList.add('hidden');
  if(Net.ws) try{ Net.ws.close(); }catch(e){}
  resetEconomy();
  showScreen('mainMenu');
}

function resetEconomy(){
  Profile.coins = 0;
  Profile.grenades = 0;
  Profile.unlocked = { [STARTER_WEAPON]: true };
  Profile.save();
  updateCoinDisplays();
  buildShopUI();
  buildWeaponSwitchUI();
}

function getMostExpensiveWeaponKey(){
  let best = STARTER_WEAPON, bestPrice = -1;
  for(const k in WEAPONS){ if(WEAPONS[k].price > bestPrice){ bestPrice = WEAPONS[k].price; best = k; } }
  return best;
}
function spawnZombieHorde(n){
  const p = GameState.player;
  for(let i=0;i<n;i++){
    const ang = Math.random()*Math.PI*2;
    GameState.bots.push({
      id:'هجوم '+(i+1), x: p.x + Math.cos(ang)*(400+Math.random()*300), y:900,
      vx:0, vy:0, facing:1, onGround:false, hp:80, alive:true, lastShot:0,
      w:26, h:46, dir:1, animT:0
    });
  }
  addKillFeed(`⚠️ یک لشکر زامبی از راه رسید!`);
}

// ---------------- Shop ----------------
function openShop(){ showScreen('shopScreen'); buildShopUI(); }
function buildShopUI(){
  const wrap = $('shopItems');
  wrap.innerHTML = '';
  Object.keys(WEAPONS).forEach(key=>{
    const w = WEAPONS[key];
    const owned = !!Profile.unlocked[key];
    const el = document.createElement('div');
    el.className = 'shopCard';
    el.innerHTML = `
      <div class="shopIcon"><img src="weapons/${w.sprite}.png" onerror="this.style.display='none'"/></div>
      <div class="shopName">${w.name}</div>
      <div class="shopPrice">${owned ? 'خریداری شده' : (w.price===0 ? 'رایگان' : '🪙 ' + w.price)}</div>
    `;
    if(!owned){
      const btn = document.createElement('button');
      btn.className = 'btn shopBuyBtn';
      btn.textContent = 'خرید';
      btn.onclick = ()=>{
        if(Profile.coins >= w.price){
          Profile.coins -= w.price;
          Profile.unlocked[key] = true;
          Profile.save();
          updateCoinDisplays();
          buildShopUI();
          buildWeaponSwitchUI();
          if(key === getMostExpensiveWeaponKey() && GameState.running){
            spawnZombieHorde(22);
          }
        } else {
          alert('سکه کافی نیست');
        }
      };
      el.appendChild(btn);
    } else {
      el.classList.add('owned');
    }
    wrap.appendChild(el);
  });

  const nadeEl = document.createElement('div');
  nadeEl.className = 'shopCard';
  nadeEl.innerHTML = `
    <div class="shopIcon"><img src="weapons/grenade.png" onerror="this.style.display='none'"/></div>
    <div class="shopName">نارنجک</div>
    <div class="shopPrice">🪙 ${GRENADE_PRICE} (موجودی: ${Profile.grenades})</div>
  `;
  const nadeBtn = document.createElement('button');
  nadeBtn.className = 'btn shopBuyBtn';
  nadeBtn.textContent = 'خرید یک عدد';
  nadeBtn.onclick = ()=>{
    if(Profile.coins >= GRENADE_PRICE){
      Profile.coins -= GRENADE_PRICE;
      Profile.grenades += 1;
      Profile.save();
      updateCoinDisplays();
      buildShopUI();
    } else {
      alert('سکه کافی نیست');
    }
  };
  nadeEl.appendChild(nadeBtn);
  wrap.appendChild(nadeEl);
}

// ---------------- Weapon switch UI (locked/unlocked) ----------------
function buildWeaponSwitchUI(){
  const row = $('weaponSwitchRow');
  row.innerHTML = '';
  Object.keys(WEAPONS).forEach(key=>{
    const w = WEAPONS[key];
    const owned = !!Profile.unlocked[key];
    if(!owned) return; // only show owned weapons in-game switch row
    const btn = document.createElement('button');
    btn.className = 'weaponBtn' + (key===GameState.weaponKey?' active':'');
    btn.dataset.weapon = key;
    btn.textContent = w.name.length>6 ? w.name.slice(0,6) : w.name;
    btn.onclick = ()=> switchWeapon(key);
    row.appendChild(btn);
  });
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
  player:{ x:150,y:900,vx:0,vy:0,facing:1,onGround:false,hp:100,fuel:100,score:0,kills:0,deaths:0,w:26,h:46,animT:0,lastHitTime:0 },
  weaponKey:STARTER_WEAPON, ammo:{}, reloading:false, lastShot:0,
  bots:[], bullets:[], grenades:[], remotePlayers:{}, platforms:[],
  camX:0, camY:0, explosionFx:null,
};
for(const k in WEAPONS) GameState.ammo[k] = { mag: WEAPONS[k].mag, reserve: WEAPONS[k].reserve };

let canvas=null, ctx=null, currentMap=MAPS[0];

function startGame(mode){
  GameState.mode = mode;
  GameState.weaponKey = Profile.unlocked[STARTER_WEAPON] ? STARTER_WEAPON : Object.keys(Profile.unlocked)[0] || STARTER_WEAPON;
  currentMap = MAPS[GameState.selectedMap] || MAPS[0];
  showScreen('gameScreen');
  canvas = $('renderCanvas');
  ctx = canvas.getContext('2d');
  GameState.platforms = buildMap(currentMap.seed);
  resetPlayer();
  spawnBots(mode==='bot'? 5 : 0);
  GameState.bullets = [];
  GameState.grenades = [];
  GameState.running = true; GameState.paused = false;

  if(mode==='lan-host') Net.host();
  if(mode==='lan-join') Net.join($('hostAddress').value.trim());

  buildWeaponSwitchUI();
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
  p.x=150; p.y=900; p.vx=0; p.vy=0; p.hp=100; p.fuel=100; p.lastHitTime=0;
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
  if(!Profile.unlocked[key]) return;
  GameState.weaponKey = key;
  buildWeaponSwitchUI();
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
  const spread = (Math.random()-0.5)*w.spread;
  const dirX = p.facing * Math.cos(spread);
  const dirY = Math.sin(spread);
  GameState.bullets.push({
    x: p.x + p.facing*20, y: p.y - 60, vx: dirX*w.bulletSpeed, vy: dirY*w.bulletSpeed,
    dmg: w.dmg, range: w.range, dist:0, owner:'player'
  });
  Net.sendShoot();
  updateHUD();
}

function throwGrenade(){
  if(Profile.grenades <= 0) return;
  Profile.grenades -= 1;
  Profile.save();
  const p = GameState.player;
  GameState.grenades.push({
    x: p.x + p.facing*20, y: p.y - 50, vx: p.facing*420, vy: -520, fuse: 1.1, rot:0
  });
  updateHUD();
}

function updateGrenades(dt){
  for(let i=GameState.grenades.length-1;i>=0;i--){
    const g = GameState.grenades[i];
    g.vy += GRAVITY*dt;
    g.x += g.vx*dt; g.y += g.vy*dt;
    g.rot += dt*10;
    for(const plat of GameState.platforms){
      if(g.x > plat.x && g.x < plat.x+plat.w && g.y >= plat.y && g.y - g.vy*dt <= plat.y+6 && g.vy>=0){
        g.y = plat.y; g.vy = -g.vy*0.4; g.vx *= 0.6;
      }
    }
    g.fuse -= dt;
    if(g.fuse <= 0){
      explodeGrenade(g.x, g.y);
      GameState.grenades.splice(i,1);
    }
  }
}
function explodeGrenade(x, y){
  GameState.explosionFx = { x, y, t: 0 };
  for(const bot of GameState.bots){
    if(!bot.alive) continue;
    if(Math.hypot(bot.x-x, bot.y-70-y) < GRENADE_RADIUS){
      damageBot(bot, GRENADE_DMG);
    }
  }
  const p = GameState.player;
  if(Math.hypot(p.x-x, p.y-70-y) < GRENADE_RADIUS){
    damagePlayer(GRENADE_DMG*0.6);
  }
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
    Profile.addCoins(KILL_REWARD);
    addKillFeed(`تو ${b.id} را حذف کردی (+${KILL_REWARD} 🪙)`);
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
  p.lastHitTime = performance.now();
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
  $('nadeCount').textContent = Profile.grenades;
  updateCoinDisplays();
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

  // HP regen: 3s after last hit, refill to 100 over 20s
  if(p.hp > 0 && p.hp < 100 && (now - p.lastHitTime) > HIT_REGEN_DELAY){
    p.hp = Math.min(100, p.hp + (100/(HP_REGEN_TIME/1000))*dt);
    updateHUD();
  }

  if(Input.firing) tryFire(now);
  updateBullets(dt);
  updateGrenades(dt);
  updateBots(dt, now);
  Net.sendState();

  GameState.camX = p.x;
  GameState.camY = p.y;

  if(GameState.explosionFx){
    GameState.explosionFx.t += dt;
    if(GameState.explosionFx.t > 0.5) GameState.explosionFx = null;
  }
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
    drawSpriteChar(ENEMY_CHAR, b.x, b.y, b.dir, b.onGround, Math.abs(b.vx)>5, b.animT, b.hp, null);
    ctx.fillStyle='#fff'; ctx.font='11px sans-serif'; ctx.textAlign='center';
    ctx.fillText(b.id, b.x, b.y-80);
  }

  for(const id in GameState.remotePlayers){
    const rp = GameState.remotePlayers[id];
    drawSpriteChar(CHARACTERS[0].key, rp.x, rp.y, rp.facing||1, true, false, 0, 100, null);
  }

  const p = GameState.player;
  drawSpriteChar(Profile.character, p.x, p.y, p.facing, p.onGround, Math.abs(p.vx)>5, p.animT, p.hp, GameState.weaponKey);
  ctx.fillStyle='#ffd166'; ctx.font='11px sans-serif'; ctx.textAlign='center';
  ctx.fillText(Profile.name || 'Player', p.x, p.y-80);

  for(const b of GameState.bullets){
    if(BulletSprite && BulletSprite.complete && BulletSprite.naturalWidth>0){
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(Math.atan2(b.vy, b.vx));
      ctx.drawImage(BulletSprite, -8, -4, 16, 8);
      ctx.restore();
    } else {
      ctx.fillStyle = '#ffe066';
      ctx.beginPath(); ctx.arc(b.x, b.y, 3, 0, 7); ctx.fill();
    }
  }

  for(const g of GameState.grenades){
    if(GrenadeSprite && GrenadeSprite.complete && GrenadeSprite.naturalWidth>0){
      ctx.save();
      ctx.translate(g.x, g.y);
      ctx.rotate(g.rot);
      ctx.drawImage(GrenadeSprite, -10, -10, 20, 20);
      ctx.restore();
    }
  }

  if(GameState.explosionFx){
    const fx = GameState.explosionFx;
    const t = fx.t/0.5;
    if(SmokeSprite && SmokeSprite.complete && SmokeSprite.naturalWidth>0){
      const size = 60 + t*100;
      ctx.globalAlpha = 1 - t;
      ctx.drawImage(SmokeSprite, fx.x-size/2, fx.y-size/2, size, size);
      ctx.globalAlpha = 1;
    }
    ctx.strokeStyle = `rgba(255,150,30,${1-t})`;
    ctx.lineWidth = 6;
    ctx.beginPath(); ctx.arc(fx.x, fx.y, GRENADE_RADIUS*t, 0, 7); ctx.stroke();
  }

  ctx.restore();
}

function drawSpriteChar(charKey, x, y, dir, onGround, moving, animT, hp, weaponKey){
  const set = Sprites[charKey];
  if(!set) return;
  let img = set.idle;
  if(!onGround) img = set.jump || set.idle;
  else if(moving){
    img = (Math.floor(animT*8) % 2 === 0) ? set.walk0 : set.walk1;
  }
  if(!img || !img.complete || img.naturalWidth===0) img = set.idle;
  if(!img) return;

  const dw = 52, dh = 70;
  ctx.save();
  ctx.translate(x, y - dh);
  if(dir < 0){ ctx.scale(-1,1); }
  ctx.drawImage(img, -dw/2, 0, dw, dh);

  if(weaponKey){
    const wimg = WeaponSprites[weaponKey];
    if(wimg && wimg.complete && wimg.naturalWidth>0){
      ctx.drawImage(wimg, dw*0.28, dh*0.36, 26, 26);
    }
  }
  ctx.restore();

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
