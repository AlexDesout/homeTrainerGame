// // 🔒 Vérification login
// const isLogged = localStorage.getItem("isLogged");

// if (isLogged !== "true") {
//   console.warn("Accès refusé - pas connecté");

//   // Redirection vers login
//   window.location.href = "index.html";
// }

// Initialisation : Configure le canvas, le contexte 2D, les dimensions, les éléments DOM pour les contrôles (vitesse et direction), et définit l'objet bike avec position, angle et empattement.
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
const speedInput = document.getElementById("speed");
const steeringInput = document.getElementById("steering");
const speedValue = document.getElementById("speedValue");
const steeringValue = document.getElementById("steeringValue");
let bike = {
  x: 0,
  y: 100,
  angle: 0,
  wheelBase: 60,
};

// Définition des bâtiments
let buildings = [];

// Définition des power-ups
let powerups = [];

// Environnement (étang/rocher/sapin/arbre)
let envObjects = [];

// Zones et spawn dynamiques près de la route
const ROAD_Y = 0;
const ROAD_WIDTH = 200;
const SPAWN_AHEAD_X = 2500;
const SPAWN_BEHIND_X = 1200;
const KEEP_DISTANCE_X = 3200;

// Score du joueur
let score = 0;

// Indicateur pour afficher les flèches de départ
let showStart = true;

// Temps de début du jeu
let startTime = Date.now();

// Effets de collision
let shakeFrames = 0;
let explosion = null;
let pickupMessage = null;

// Web Audio context pour effets sonores
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playPickupSound() {
  const now = audioCtx.currentTime;

  const gain = audioCtx.createGain();
  gain.gain.setValueAtTime(0.22, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
  gain.connect(audioCtx.destination);

  const osc1 = audioCtx.createOscillator();
  osc1.type = 'triangle';
  osc1.frequency.setValueAtTime(900, now);
  osc1.frequency.exponentialRampToValueAtTime(1700, now + 0.2);
  osc1.connect(gain);

  const osc2 = audioCtx.createOscillator();
  osc2.type = 'sawtooth';
  osc2.frequency.setValueAtTime(600, now);
  osc2.frequency.exponentialRampToValueAtTime(930, now + 0.18);
  const gain2 = audioCtx.createGain();
  gain2.gain.setValueAtTime(0.12, now);
  gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
  osc2.connect(gain2).connect(audioCtx.destination);

  const osc3 = audioCtx.createOscillator();
  osc3.type = 'square';
  osc3.frequency.setValueAtTime(1200, now);
  osc3.frequency.exponentialRampToValueAtTime(1900, now + 0.17);
  const gain3 = audioCtx.createGain();
  gain3.gain.setValueAtTime(0.09, now);
  gain3.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
  osc3.connect(gain3).connect(audioCtx.destination);

  osc1.start(now);
  osc2.start(now);
  osc3.start(now);
  osc1.stop(now + 0.28);
  osc2.stop(now + 0.32);
  osc3.stop(now + 0.3);
}

function playCrashSound() {
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'square';
  osc.frequency.setValueAtTime(120, audioCtx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(30, audioCtx.currentTime + 0.1);
  gain.gain.setValueAtTime(0.4, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.25);
  osc.connect(gain).connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.25);
}

function randomBetween(min, max) {
  return min + Math.random() * (max - min);
}

function rectanglesOverlap(rect1, rect2) {
  return !(rect1.x + rect1.width < rect2.x ||
           rect2.x + rect2.width < rect1.x ||
           rect1.y + rect1.height < rect2.y ||
           rect2.y + rect2.height < rect1.y);
}

function generateBuildings(count = 250, roadLength = 3000) {
  buildings = [];
  const roadWidth = 200;
  for (let x = -roadLength; x <= roadLength && buildings.length < count; x += randomBetween(120, 260)) {
    const size = randomBetween(80, 220);
    const side = Math.random() < 0.5 ? -1 : 1;
    const y = side < 0
      ? -roadWidth - randomBetween(40, 260)
      : roadWidth + randomBetween(40, 260);
    buildings.push({ x, y, width: size, height: size });
  }
}

function addBuildingAt(x) {
  const roadWidth = 200;
  const size = randomBetween(80, 220);
  const side = Math.random() < 0.5 ? -1 : 1;
  const y = side < 0
    ? -roadWidth - randomBetween(40, 260)
    : roadWidth + randomBetween(40, 260);
  buildings.push({ x, y, width: size, height: size });
}

function generatePowerUps(count = 5, roadLength = 3000) {
  powerups = [];
  const powerUpSize = 35;
  for (let i = 0; i < count; i++) {
    const x = randomBetween(-roadLength, roadLength);
    const y = randomBetween(0, ROAD_WIDTH - powerUpSize);
    const isMoving = Math.random() < 0.35; // 35% de powerups dynamiques
    const type = isMoving ? 'moving' : 'static';
    const power = isMoving ? 120 : 50;
    powerups.push({
      x,
      y,
      baseY: y,
      width: powerUpSize,
      height: powerUpSize,
      type,
      power,
      phase: Math.random() * Math.PI * 2,
      speed: randomBetween(0.04, 0.1),
      amplitude: randomBetween(20, 45)
    });
  }
}

function addPowerupAt(x) {
  const powerUpSize = 35;
  const y = randomBetween(0, ROAD_WIDTH - powerUpSize);
  const isMoving = Math.random() < 0.35;
  const type = isMoving ? 'moving' : 'static';
  const power = isMoving ? 120 : 50;
  powerups.push({
    x,
    y,
    baseY: y,
    width: powerUpSize,
    height: powerUpSize,
    type,
    power,
    phase: Math.random() * Math.PI * 2,
    speed: randomBetween(0.04, 0.1),
    amplitude: randomBetween(20, 45)
  });
}



generateBuildings();
generatePowerUps();
generateEnvironment();

// Gestion des touches clavier
let keys = {};
document.addEventListener('keydown', (e) => {
  keys[e.key.toLowerCase()] = true;
});
document.addEventListener('keyup', (e) => {
  keys[e.key.toLowerCase()] = false;
});
//http://192.168.0.165:1880/#flow/82973df0b3984119
// Connexion WebSocket pour recevoir les mises à jour de vitesse
const ws = new WebSocket("ws://192.168.0.165:1880/ws/speed");
ws.onopen = function () {
  console.log("Connecté au WebSocket pour la vitesse");
};
ws.onmessage = function (event) {
  console.log("Message WebSocket reçu:", event.data);
  try {
    const data = JSON.parse(event.data);
    if (data.speed !== undefined) {
      speedInput.value = data.speed;
      console.log("Vitesse mise à jour à:", data.speed);
    } else {
      console.warn("Message sans champ 'speed':", data);
    }
  } catch (e) {
    // Si ce n'est pas JSON, traiter comme valeur numérique directe
    const speed = parseFloat(event.data);
    if (!isNaN(speed)) {
      speedInput.value = speed;
      console.log("Vitesse mise à jour à (valeur directe):", speed);
    } else {
      console.error("Message non reconnu:", event.data);
    }
  }
};
ws.onerror = function (error) {
  console.error("Erreur WebSocket:", error);
};
ws.onclose = function () {
  console.log("Connexion WebSocket fermée");
};

// Connexion WebSocket pour recevoir les mises à jour d'angle
const wsAngle = new WebSocket("ws://192.168.0.165:1880/ws/angle");
wsAngle.onopen = function () {
  console.log("Connecté au WebSocket pour l'angle");
};
wsAngle.onmessage = function (event) {
  console.log("Message WebSocket angle reçu:", event.data);
  try {
    const data = JSON.parse(event.data);
    if (data.angle !== undefined) {
      steeringInput.value = data.angle;
      console.log("Angle mis à jour à:", data.angle);
    } else {
      console.warn("Message sans champ 'angle':", data);
    }
  } catch (e) {
    // Si ce n'est pas JSON, traiter comme valeur numérique directe
    const angle = parseFloat(event.data);
    if (!isNaN(angle)) {
      steeringInput.value = angle;
      console.log("Angle mis à jour à (valeur directe):", angle);
    } else {
      console.error("Message angle non reconnu:", event.data);
    }
  }
};
wsAngle.onerror = function (error) {
  console.error("Erreur WebSocket angle:", error);
};
wsAngle.onclose = function () {
  console.log("Connexion WebSocket angle fermée");
};
// update() : Met à jour la position et l'angle du vélo en fonction des valeurs de vitesse et de direction saisies. Calcule le rayon de virage et la vitesse angulaire pour simuler les mouvements réalistes du vélo.
function update() {
  let speed = parseFloat(speedInput.value);
  let steeringDeg = parseFloat(steeringInput.value);

  // Contrôles clavier
  if (keys['z']) {
    speed += 0.1; // Accélérer
  } else if (keys['s']) {
    speed -= 0.1; // Freiner/reculer
  } else {
    // Pas d'accélération : freinage naturel
    if (speed > 0) {
      speed = Math.max(0, speed - 0.08);
    } else if (speed < 0) {
      speed = Math.min(0, speed + 0.08);
    }
  }

  if (keys['q']) steeringDeg -= 1; // Tourner à gauche
  if (keys['d']) steeringDeg += 1; // Tourner à droite

  // Limiter les valeurs
  speed = Math.max(-3, Math.min(10, speed));
  steeringDeg = Math.max(-45, Math.min(45, steeringDeg));

  // Mettre à jour les inputs et affichages
  speedInput.value = speed;
  steeringInput.value = steeringDeg;
  speedValue.textContent = speed.toFixed(1);
  steeringValue.textContent = steeringDeg;

  // Masquer les flèches de départ si on bouge
  if (speed > 0) showStart = false;

  const steering = (steeringDeg * Math.PI) / 180;
  if (Math.abs(steering) > 0.001) {
    const turningRadius = bike.wheelBase / Math.tan(steering);
    const angularVelocity = speed / turningRadius;
    bike.angle += angularVelocity;
  }
  let newX = bike.x + speed * Math.cos(bike.angle);
  let newY = bike.y + speed * Math.sin(bike.angle);

  // Vérifier collision avec les bâtiments
  let canMove = true;
  for (let building of buildings) {
    if (newX >= building.x && newX <= building.x + building.width &&
        newY >= building.y && newY <= building.y + building.height) {
          speedValue.textContent = "0"; // Arrêter le vélo en cas de collision
          speedInput.value = 0;
          shakeFrames = 10;
          explosion = {x: bike.x, y: bike.y, frames: 30};
          playCrashSound();
      canMove = false;
      
      break;
    }
  }
  if (canMove) {
    bike.x = newX;
    bike.y = newY;
  }

  // Déplacer les power-ups mobiles
  for (let powerup of powerups) {
    if (powerup.type === 'moving') {
      powerup.phase += powerup.speed;
      powerup.y = powerup.baseY + Math.sin(powerup.phase) * powerup.amplitude;
      if (powerup.y < 8) powerup.y = 8;
      if (powerup.y > ROAD_WIDTH - 8) powerup.y = ROAD_WIDTH - 8;
    }
  }

  // Collision avec les power-ups (étoiles)
  for (let i = powerups.length - 1; i >= 0; i--) {
    const powerup = powerups[i];
    const dx = bike.x - powerup.x;
    const dy = bike.y - powerup.y;
    const distance = Math.hypot(dx, dy);
    const pickupRadius = 25;
    if (distance < pickupRadius) {
      powerups.splice(i, 1);
      score += powerup.power || 50;
      pickupMessage = { text: `+${powerup.power || 50} !`, duration: 50 };
      playPickupSound();
    }
  }

  ensureObjectsNearBike();
}
// drawStar() : Dessine une étoile à la position donnée avec animation d'éclat et de tremblement
function drawStar(x, y, size, time) {
  const pulse = 0.15 + 0.15 * Math.sin(time * 4); // pulsation d'éclat
  const jitter = 2 + 2 * Math.sin(time * 5); // léger mouvement sur place
  const px = x + Math.cos(time * 3 + x) * jitter;
  const py = y + Math.sin(time * 3 + y) * jitter;
  const currentSize = size * (1 + pulse * 0.2);

  ctx.save();
  ctx.translate(px + currentSize / 5, py + currentSize /5);

  const brightness = 200 + Math.round(55 * (1 + Math.sin(time * 6)) / 2);
  ctx.fillStyle = `rgba(${brightness}, ${brightness}, 0, 0.9)`;

  ctx.beginPath();
  const spikes = 5;
  const outerRadius = currentSize / 2;
  const innerRadius = outerRadius * (0.4 + 0.1 * Math.sin(time * 7));
  for (let i = 0; i < spikes * 2; i++) {
    const angle = (i * Math.PI) / spikes;
    const radius = i % 2 === 0 ? outerRadius : innerRadius;
    const sx = Math.cos(angle) * radius;
    const sy = Math.sin(angle) * radius;
    if (i === 0) ctx.moveTo(sx, sy);
    else ctx.lineTo(sx, sy);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawMovingStar(x, y, size, time) {
  const pulse = 0.15 + 0.25 * Math.sin(time * 8); // plus visible et pulsant
  const jitter = 3 + 3 * Math.sin(time * 6);
  const currentSize = size * (1 + pulse * 0.3);

  ctx.save();
  ctx.translate(x + Math.cos(time * 7 + y) * 5, y + Math.sin(time * 8 + x) * 6);
  ctx.beginPath();
  ctx.fillStyle = `rgba(255, 215, 0, ${0.9 + 0.1 * Math.sin(time * 10)})`;
  ctx.arc(0, 0, currentSize / 2, 0, 2 * Math.PI);
  ctx.fill();

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.restore();
}

function drawHouse(x, y, width, height) {
  // La maison remplit tout l’espace du bâtiment (pas de vide), avec un effet fixe
  const scaleX = width / 64;
  const scaleY = height / 64;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scaleX, scaleY);

  // Ombre légère (fond de la maison)
  ctx.fillStyle = "rgba(0,0,0,0.15)";
  ctx.fillRect(0, 0, 64, 64);

  // Toit principal couvrant l'intégralité
  ctx.fillStyle = "#c75c3a";
  ctx.fillRect(0, 0, 64, 64);

  // Bord du toit (effet volume)
  ctx.strokeStyle = "#8b3a2e";
  ctx.lineWidth = 2;
  ctx.strokeRect(0, 0, 64, 64);

  // Faitage (ligne centrale du toit)
  ctx.beginPath();
  ctx.moveTo(0, 32);
  ctx.lineTo(64, 32);
  ctx.stroke();

  // Cheminée
  ctx.fillStyle = "#6d4c41";
  ctx.fillRect(36, 8, 10, 10);

  // Détail tuiles régulières
  ctx.strokeStyle = "rgba(255,255,255,0.18)";
  ctx.lineWidth = 1;
  for (let ly = 8; ly <= 56; ly += 8) {
    ctx.beginPath();
    ctx.moveTo(8, ly);
    ctx.lineTo(56, ly);
    ctx.stroke();
  }

  ctx.restore();
}

// drawWorld() : Dessine l'environnement : un fond vert et une grille infinie répétitive, centrée sur la position du vélo pour créer un effet de monde ouvert.
function drawEnvironmentSprite(sprite) {
  ctx.save();
  ctx.translate(sprite.x, sprite.y);
  const s = sprite.size;

  if (sprite.type === 'pond') {
    ctx.fillStyle = '#4fc3f7';
    ctx.beginPath();
    ctx.ellipse(0, 0, s * 0.55, s * 0.42, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#0288d1';
    ctx.lineWidth = 2;
    ctx.stroke();
  } else if (sprite.type === 'rock') {
    ctx.fillStyle = '#9e9e9e';
    ctx.beginPath();
    ctx.ellipse(0, 0, s * 0.4, s * 0.32, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#757575';
    ctx.lineWidth = 2;
    ctx.stroke();
  } else if (sprite.type === 'fir') {
    ctx.fillStyle = '#1b5e20';
    ctx.beginPath();
    ctx.moveTo(0, -s * 0.5);
    ctx.lineTo(-s * 0.28, s * 0.25);
    ctx.lineTo(s * 0.28, s * 0.25);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#5d4037';
    ctx.fillRect(-s * 0.05, s * 0.25, s * 0.1, s * 0.25);
  } else if (sprite.type === 'tree') {
    ctx.fillStyle = '#2e7d32';
    ctx.beginPath();
    ctx.arc(0, -s * 0.06, s * 0.45, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#5d4037';
    ctx.fillRect(-s * 0.05, s * 0.1, s * 0.1, s * 0.3);
  }

  ctx.restore();
}

function generateEnvironment(count = 220, roadLength = 3000) {
  envObjects = [];
  const roadWidth = 200;
  for (let i = 0; i < count; i++) {
    const types = ['pond', 'rock', 'fir', 'tree'];
    const type = types[Math.floor(Math.random() * types.length)];
    const x = randomBetween(-roadLength, roadLength);
    const side = Math.random() < 0.5 ? -1 : 1;
    const y = side < 0
      ? -roadWidth - randomBetween(40, 500)
      : roadWidth + randomBetween(40, 500);

    let size;
    switch (type) {
      case 'pond': size = randomBetween(70, 120); break;
      case 'rock': size = randomBetween(50, 90); break;
      case 'fir': size = randomBetween(80, 150); break;
      case 'tree': size = randomBetween(90, 170); break;
      default: size = randomBetween(70, 120);
    }
    envObjects.push({ type, x, y, size });
  }
}

function addEnvironmentAt(x) {
  const roadWidth = 200;
  const rnd = Math.random();
  let type;
  if (rnd < 0.1) type = 'pond';      // 10% lacs
  else if (rnd < 0.45) type = 'rock'; // 35% rochers
  else if (rnd < 0.75) type = 'fir';  // 30% sapins
  else type = 'tree';                 // 25% arbres
  if (rnd < 0.1) type = 'pond';      // 10% lacs
  else if (rnd < 0.45) type = 'rock'; // 35% rochers
  else if (rnd < 0.75) type = 'fir';  // 30% sapins
  else type = 'tree';                 // 25% arbres
  const side = Math.random() < 0.5 ? -1 : 1;
  const y = side < 0
    ? -roadWidth - randomBetween(40, 500)
    : roadWidth + randomBetween(40, 500);
  let size;
  switch (type) {
    case 'pond': size = randomBetween(70, 120); break;
    case 'rock': size = randomBetween(50, 90); break;
    case 'fir': size = randomBetween(80, 150); break;
    case 'tree': size = randomBetween(90, 170); break;
    default: size = randomBetween(70, 120);
  }
  envObjects.push({ type, x, y, size });
}

function ensureObjectsNearBike() {
  const minX = bike.x - SPAWN_BEHIND_X;
  const maxX = bike.x + SPAWN_AHEAD_X;

  let currentMax = buildings.length ? Math.max(...buildings.map(b => b.x)) : bike.x;
  while (currentMax < maxX) {
    addBuildingAt(currentMax + randomBetween(140, 260));
    currentMax = Math.max(currentMax, buildings[buildings.length - 1].x);
  }

  let currentMin = buildings.length ? Math.min(...buildings.map(b => b.x)) : bike.x;
  while (currentMin > minX) {
    addBuildingAt(currentMin - randomBetween(140, 260));
    currentMin = Math.min(currentMin, buildings[0].x);
  }

  let envMax = envObjects.length ? Math.max(...envObjects.map(e => e.x)) : bike.x;
  while (envMax < maxX) {
    addEnvironmentAt(envMax + randomBetween(120, 300));
    envMax = Math.max(envMax, envObjects[envObjects.length - 1].x);
  }

  let envMin = envObjects.length ? Math.min(...envObjects.map(e => e.x)) : bike.x;
  while (envMin > minX) {
    addEnvironmentAt(envMin - randomBetween(120, 300));
    envMin = Math.min(envMin, envObjects[0].x);
  }

  buildings = buildings.filter(b => b.x >= bike.x - KEEP_DISTANCE_X && b.x <= bike.x + KEEP_DISTANCE_X);
  envObjects = envObjects.filter(e => e.x >= bike.x - KEEP_DISTANCE_X && e.x <= bike.x + KEEP_DISTANCE_X);
  powerups = powerups.filter(p => p.x >= bike.x - KEEP_DISTANCE_X && p.x <= bike.x + KEEP_DISTANCE_X);

  const existingRoadPowerups = powerups.filter(p => p.x >= minX && p.x <= maxX).length;
  if (existingRoadPowerups < 8) {
    for (let i = 0; i < 12 - existingRoadPowerups; i++) {
      const x = randomBetween(minX, maxX);
      const y = randomBetween(0, ROAD_WIDTH - 35);
      powerups.push({ x, y, width: 35, height: 35 });
    }
  }
}

function drawWorld() {
  const gridSize = 200;
  // Fond vert
  ctx.fillStyle = "#45da49";
  ctx.fillRect(
    bike.x - canvas.width / 2 - 1000,
    bike.y - canvas.height / 2 - 1000,
    canvas.width + 2000,
    canvas.height + 2000,
  );
  // Grille répétitive infinie
  ctx.strokeStyle = "#3e8e41";
  ctx.lineWidth = 1;
  let startX = Math.floor((bike.x - canvas.width / 2) / gridSize) * gridSize;
  let endX = bike.x + canvas.width / 2;
  let startY = Math.floor((bike.y - canvas.height / 2) / gridSize) * gridSize;
  let endY = bike.y + canvas.height / 2;
  for (let x = startX; x < endX; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, startY);
    ctx.lineTo(x, endY);
    ctx.stroke();
  }
  for (let y = startY; y < endY; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(startX, y);
    ctx.lineTo(endX, y);
    ctx.stroke();
  }
  
  // Route principale (unique)
  const roadSpacing = 1e12;
  const roadWidth = 200;
  const roadStartY = 0; // Route fixe à y=0
  ctx.fillStyle = "#444";
  ctx.fillRect(startX - 1000, roadStartY, canvas.width + 2000, roadWidth);

  // Décor non linéaire autour de la route (étangs, rochers, sapins, arbres)
  envObjects.forEach(obj => drawEnvironmentSprite(obj));
  // Tirets blancs sur la route
  ctx.strokeStyle = "white";
  ctx.lineWidth = 3;
  ctx.setLineDash([40, 20]);
  ctx.lineDashOffset = -bike.y % 60; // Animation basée sur la position du vélo
  ctx.beginPath();
  ctx.moveTo(startX - 1000, roadStartY + roadWidth / 2);
  ctx.lineTo(endX + 1000, roadStartY + roadWidth / 2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.lineDashOffset = 0;

  // Dessiner les bâtiments (maisons)
  buildings.forEach(building => {
    drawHouse(building.x, building.y, building.width, building.height);
  });

  // Dessiner les power-ups (statique + mobile)
  const t = performance.now() / 1000;
  powerups.forEach(powerup => {
    if (powerup.type === 'moving') {
      drawMovingStar(powerup.x, powerup.y, powerup.width, t);
    } else {
      drawStar(powerup.x, powerup.y, powerup.width, t);
    }
  }); 

  // Explosion
  if (explosion) {
    ctx.fillStyle = "red";
    ctx.font = "48px Arial";
    ctx.fillText("BOOM", explosion.x - 50, explosion.y);
    explosion.frames--;
    if (explosion.frames <= 0) {
      explosion = null;
    }
  }
}
// drawBike() : Dessine le vélo sur le canvas : le cadre rouge, les roues noires, en tenant compte de l'angle du vélo et de la direction des roues avant pour une visualisation réaliste.
function drawBike() {
  ctx.save();
  // Caméra : on centre le vélo
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate(bike.angle);
  // Cadre
  ctx.fillStyle = "red";
  ctx.fillRect(-20, -8, 50, 15);
  // Roue arrière
  ctx.fillStyle = "black";
  ctx.fillRect(-35, -3, 30, 5);
  // Roue avant
  ctx.save();
  ctx.translate(20, 0);
  ctx.rotate((parseFloat(steeringInput.value) * Math.PI) / 180);
  ctx.fillRect(0, -3, 30, 5);
  ctx.restore();
  ctx.restore();
}
// loop() : Boucle d'animation principale qui appelle update(), dessine le monde et le vélo, puis utilise requestAnimationFrame pour répéter le cycle à chaque frame, créant l'animation fluide.
function loop() {
  update();
  let shakeX = 0;
  let shakeY = 0;
  if (shakeFrames > 0) {
    shakeX = (Math.random() - 0.5) * 10;
    shakeY = (Math.random() - 0.5) * 10;
    shakeFrames--;
  }
  ctx.save();
  // Caméra suit le vélo
  ctx.translate(canvas.width / 2 - bike.x + shakeX, canvas.height / 2 - bike.y + shakeY);
  drawWorld();
  ctx.restore();
  drawBike();

  // Affichage de l'interface (score)
  drawHUDscore();

  // Affichage du timer
  drawHUDtimer();

  // Message pickup
  drawPickupMessage();

  // Flèche vers la route
  drawArrowToRoad();

  // Flèches de départ
  if (showStart) drawStartArrows();

  requestAnimationFrame(loop);
}

function drawHUDscore() {
  ctx.save();
  if (ctx.resetTransform) {
    ctx.resetTransform();
  } else {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }
  const padding = 12;
  const width = 180;
  const height = 36;
  const x = canvas.width - width - padding;
  const y = padding;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
  ctx.fillRect(x, y, width, height);
  ctx.font = '18px sans-serif';
  ctx.fillStyle = 'white';
  ctx.fillText(`Score : ${score}`, x + 10, y + 24);
  ctx.restore();
}

function drawHUDtimer() {
  ctx.save();
  if (ctx.resetTransform) {
    ctx.resetTransform();
  } else {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }
  const elapsed = Math.floor((Date.now() - startTime) / 1000);
  const minutes = Math.floor(elapsed / 60);
  const seconds = elapsed % 60;
  const timeStr = `${minutes}:${seconds.toString().padStart(2, '0')}`;
  
  const padding = 12;
  const width = 180;
  const height = 36;
  const x = canvas.width - width - padding;
  const y = padding + 36 + padding;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
  
  ctx.fillRect(x, y, width, height);
  ctx.font = '18px sans-serif';
  ctx.fillStyle = 'white';
  ctx.fillText(`Temps : ${timeStr}`, x + 10, y + 24);
  ctx.restore();
}

function drawPickupMessage() {
  if (!pickupMessage || pickupMessage.duration <= 0) return;

  ctx.save();
  if (ctx.resetTransform) ctx.resetTransform();
  else ctx.setTransform(1, 0, 0, 1, 0, 0);

  const alpha = Math.max(0, pickupMessage.duration / 50);
  ctx.font = 'bold 36px sans-serif';
  ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
  ctx.strokeStyle = `rgba(0, 0, 0, ${alpha})`;
  ctx.lineWidth = 5;
  const text = pickupMessage.text;
  const x = canvas.width / 2;
  const y = 140;
  ctx.strokeText(text, x, y);
  ctx.fillText(text, x, y);

  pickupMessage.duration--;
  if (pickupMessage.duration <= 0) pickupMessage = null;

  ctx.restore();
}

function drawStartArrows() {
  ctx.save();
  if (ctx.resetTransform) {
    ctx.resetTransform();
  } else {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  const arrowSize = 20;
  const startX = canvas.width - 80;
  const centerY = canvas.height / 2;

  ctx.fillStyle = 'white';
  ctx.strokeStyle = 'white';
  ctx.lineWidth = 0;

  // Trois flèches en colonne
  for (let i = 0; i < 3; i++) {
    const y = centerY - arrowSize * 2 + i * arrowSize * 2;
    ctx.beginPath();
    // Flèche pointant vers la gauche
    ctx.moveTo(startX + arrowSize / 2, y);
    ctx.lineTo(startX - arrowSize / 2, y - arrowSize / 2);
    ctx.lineTo(startX - arrowSize / 2, y + arrowSize / 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  // Texte "GO GO GO"
  ctx.font = '24px sans-serif';
  ctx.fillStyle = 'white';
  ctx.fillText('GO', startX + arrowSize, centerY - arrowSize * 2 + 5);
  ctx.fillText('GO', startX + arrowSize, centerY + 5);
  ctx.fillText('GO', startX + arrowSize, centerY + arrowSize * 2 + 5);

  ctx.restore();
}

function drawArrowToRoad() {
  const roadWidth = 200;
  const closestRoadY = 0;
  // Vérifier si la route est visible
  const viewTop = bike.y - canvas.height / 2;
  const viewBottom = bike.y + canvas.height / 2;
  const roadTop = closestRoadY;
  const roadBottom = closestRoadY + roadWidth;
  const roadVisible = !(roadBottom < viewTop || roadTop > viewBottom);
  if (roadVisible) return;

  ctx.save();
  if (ctx.resetTransform) {
    ctx.resetTransform();
  } else {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  const arrowSize = 30;
  const centerX = canvas.width / 2;
  const centerY = (bike.y < closestRoadY) ? canvas.height - 50 : 50; // Bottom if below, top if above

  ctx.fillStyle = 'yellow';
  ctx.strokeStyle = 'black';
  ctx.lineWidth = 2;

  ctx.beginPath();
  if (bike.y < closestRoadY) {
    // Point up (vers le haut pour aller à y=0)
    ctx.moveTo(centerX, centerY + arrowSize / 2);
    ctx.lineTo(centerX - arrowSize / 2, centerY - arrowSize / 2);
    ctx.lineTo(centerX + arrowSize / 2, centerY - arrowSize / 2);
  } else {
    // Point down (vers le bas pour aller à y=200)
    ctx.moveTo(centerX, centerY - arrowSize / 2);
    ctx.lineTo(centerX - arrowSize / 2, centerY + arrowSize / 2);
    ctx.lineTo(centerX + arrowSize / 2, centerY + arrowSize / 2);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

loop();
