// ============================================================
// SILENT CALIBER 2D — side-view shooter, original code
// ============================================================

const WEAPONS = {
  pistol:  { name:'PISTOL',        dmg:22, mag:12, reserve:60,  rate:280, spread:0.05, bulletSpeed:900, range:500 },
  smg:     { name:'SMG',           dmg:16, mag:30, reserve:120, rate:95,  spread:0.09, bulletSpeed:950, range:400 },
  rifle:   { name:'ASSAULT RIFLE', dmg:26, mag:30, reserve:90,  rate:135, spread:0.06, bulletSpeed:1000,range:600 },
  shotgun: { name:'SHOTGUN',       dmg:14, mag:8,  reserve:32,  rate:650, spread:0.25, bulletSpeed:850, range:220, pellets:6 },
  sniper:  { name:'SNIPER',        dmg:95, mag:5,  reserve:20,  rate:1150,spread:0.005,bulletSpeed:1400,range:900 },
};

function $(id){ return document.getElementById(id); }
function showScreen(id){
  document.querySelectorAll('.screen').forEach(s=>s.classList.add('hidden'));
  $(id).classList.remove('hidden');
}

window.addEventListener('load', ()=>{
  let p = 0;
  const bar = $('loadBarInner'), txt = $('loadText');
  const steps = ['بارگذاری موتور بازی...','ساخت نقشه...','بارگذاری سلاح‌ها...','آماده‌سازی بات‌ها...','اتمام'];
  const iv = setInterval(()=>{
    p += 20; bar.style.width = p+'%'; txt.textContent = steps[Math.min(steps.length-1, Math.floor(p/20))];
    if(p>=100){ clearInterval(iv); $('loadingScreen').classList.add('hidden'); showScreen('mainMenu'); }
  }, 200);

  $('btnPlay').onclick = ()=> showScreen('modeSelect');
  $('btnSettings').onclick = ()=> showScreen('settingsScreen');
  $('btnCredits').onclick = ()=> showScreen('creditsScreen');
  $('backFromSettings').onclick = ()=> showScreen('mainMenu');
  $('backFromCredits').onclick = ()=> showScreen('mainMenu');
  $('backFromMode').onclick = ()=> showScreen('mainMenu');
  $('backFromLan').onclick = ()=> showScreen('modeSelect');

  $('modeBot').onclick = ()=> startGame('bot');
  $('modeLan').onclick = ()=> showScreen('lanLobby');
  $('btnHostGame').onclick = ()=> startGame('lan-host');
  $('btnJoinGame').onclick = ()=> startGame('lan-join');

  // Pause / Exit controls
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
});

function quitToMenu(){
  GameState.running = false;
  GameState.paused = false;
  $('pauseMenu').classList.add('hidden');
  $('deathScreen').classList.add('hidden');
  if(Net.ws) try{ Net.ws.close(); }catch(e){}
  showScreen('mainMenu');
}

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
  platforms.push({x:0, y:1100, w:WORLD_W, h:100}); // ground
  let x = 150;
  while(x < WORLD_W - 200){
    const w = 120 + rng()*180;
    const y = 500 + rng()*500;
    platforms.push({x, y, w, h:26});
    x += w + 100 + rng()*150;
  }
  // some floating platforms higher up
  for(let i=0;i<8;i++){
    platforms.push({x: 200 + rng()*(WORLD_W-400), y: 200 + rng()*250, w: 100+rng()*120, h:22});
  }
  return platforms;
}
function mulberry32(a){ return function(){ a|=0; a=a+0x6D2B79F5|0; let t=Math.imul(a^a>>>15,1|a); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; }; }

// ---------------- Game State ----------------
const GameState = {
  running:false, paused:false, mode:'bot',
  player:{ x:150,y:900,vx:0,vy:0,facing:1,onGround:false,hp:100,fuel:100,score:0,kills:0,deaths:0,w:26,h:46 },
  weaponKey:'rifle', ammo:{}, reloading:false, lastShot:0,
  bots:[], bullets:[], remotePlayers:{}, platforms:[],
  camX:0, camY:0,
};
for(const k in WEAPONS) GameState.ammo[k] = { mag: WEAPONS[k].mag, reserve: WEAPONS[k].reserve };

let canvas=null, ctx=null;

function startGame(mode){
  GameState.mode = mode;
  showScreen('gameScreen');
  canvas = $('renderCanvas');
  ctx = canvas.getContext('2d');
  GameState.platforms = buildMap(42);
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
      id:'bot'+i, x:400+i*300, y:900, vx:0, vy:0, facing:1, onGround:false,
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
    const angle = spread;
    const dirX = p.facing * Math.cos(angle);
    const dirY = Math.sin(angle);
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

function damageBot(b,
