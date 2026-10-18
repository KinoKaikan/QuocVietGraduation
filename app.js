/**
 * GRADUATION INVITATION & HANDHELD GAME CONSOLE SIMULATOR - TRẦN QUỐC VIỆT
 * 1. Google Identity Services (GIS) API authentication only (no manual name input).
 * 2. Persistent session in localStorage under key 'user_session'.
 * 3. Retro Handheld Console Emulator with tactile D-Pad (Up Jump, Down Duck) & Action Buttons (A Jump, B Duck).
 * 4. Crouch/Duck mechanic allowing player to dodge high/flying obstacles.
 * 5. Collectable Hearts (❤️) to restore lost player lives.
 * 6. 100% Vietnamese font support (Be Vietnam Pro, Playfair Display) with zero broken glyphs.
 * 7. Official FPT University Logo (image.png) centered on invitation card with gold glass plaque.
 * 8. Invitation card rendered directly below game console (no modal pop-up to avoid accidental dismiss).
 * 9. Milestone 2026 points celebration: Fireworks, Confetti, and auto-scroll to unlocked card!
 */

// ==========================================
// CONFIGURATION & CONSTANTS
// ==========================================
const GOOGLE_CLIENT_ID = "892188408749-31vqfrqmlk18u1at62evte7vj62udbq3.apps.googleusercontent.com";
const TARGET_MILESTONE_SCORE = 2026;

const CARD_CONFIG = {
  width: 1000,
  height: 1500,
  logoSrc: "image.png",
  hostName: "TRẦN QUỐC VIỆT",
  hostTitle: "Kỹ Thuật Phần Mềm • ĐH FPT Cần Thơ",
  dateHeader: "THÁNG 10",
  dayOfWeek: "CHỦ NHẬT",
  dayOfMonth: "25",
  time: "11:30 - 12:00",
  year: "2026",
  venueName: "Trường Đại Học FPT Cần Thơ",
  venueAddressLine1: "Số 600, đường Nguyễn Văn Cừ nối dài, phường An Bình,",
  venueAddressLine2: "quận Ninh Kiều, TP Cần Thơ",
  phone: "0949373770"
};

// Global App State
const appState = {
  user: null, // { name, email, picture, sub }
  fptLogoImage: null,
  fptLogoLoaded: false,
  isCardRendered: false,
  isCardUnlocked: false
};

// Game State & Physics
const gameState = {
  canvas: null,
  ctx: null,
  animationId: null,
  isPlaying: false,
  isPaused: false,
  isGameOver: false,
  isVictory: false,
  score: 0,
  distance: 0,
  speed: 4.2,
  hearts: 3,
  invulnerableTimer: 0,
  soundEnabled: true,
  audioCtx: null,

  // Player character
  player: {
    x: 90,
    y: 256,
    normalHeight: 64,
    duckHeight: 34,
    width: 44,
    height: 64,
    vy: 0,
    gravity: 0.68,
    jumpForce: -13.2,
    doubleJumpForce: -11.2,
    isGrounded: true,
    isDucking: false,
    jumpCount: 0,
    maxJumps: 2,
    runFrame: 0,
    runTimer: 0,
    coffeeBoostTimer: 0,
    capToss: null
  },

  // Entities
  obstacles: [],
  items: [],
  particles: [],
  popups: [],
  fireworks: [],

  // Spawn timers
  obstacleTimer: 0,
  itemTimer: 0,

  // Parallax offsets
  bgStarsOffset: 0,
  bgSkylineOffset: 0,
  bgStreetOffset: 0,
  roadOffset: 0,

  // Ground level in 800x400 canvas
  groundY: 320
};

// Pre-generated starry particles on card canvas
const cardCanvasParticles = Array.from({ length: 45 }, () => ({
  x: Math.random() * CARD_CONFIG.width,
  y: Math.random() * CARD_CONFIG.height,
  radius: Math.random() * 2.2 + 0.6,
  alpha: Math.random() * 0.55 + 0.25,
  isStar: Math.random() > 0.65
}));

// ==========================================
// INITIALIZATION
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  setupPreloadLogo();
  setupAudioEngine();
  setupUIEventListeners();
  setupHolographicTilt();
  initGameCanvas();

  // Check persisted session from localStorage (key: 'user_session')
  checkPersistedSession();
  setupGoogleIdentityServices();

  // Ensure Vietnamese-supported fonts are loaded
  if (document.fonts) {
    document.fonts.ready.then(() => {
      if (appState.user) {
        renderInvitationCard();
      }
    }).catch(console.warn);
  }
});

// ==========================================
// PRELOAD FPT UNIVERSITY LOGO (image.png)
// ==========================================
function setupPreloadLogo() {
  const logo = new Image();
  logo.onload = () => {
    appState.fptLogoImage = logo;
    appState.fptLogoLoaded = true;
    if (appState.user) {
      renderInvitationCard();
    }
  };
  logo.onerror = () => {
    console.warn("Could not load image.png directly, trying fallback path...");
    const fallback = new Image();
    fallback.onload = () => {
      appState.fptLogoImage = fallback;
      appState.fptLogoLoaded = true;
      if (appState.user) renderInvitationCard();
    };
    fallback.src = "assets/fpt_logo.png";
  };
  logo.src = CARD_CONFIG.logoSrc;
}

// ==========================================
// WEB AUDIO API SOUND SYNTHESIZER
// ==========================================
function setupAudioEngine() {
  const savedSound = localStorage.getItem('pixel_runner_sound');
  gameState.soundEnabled = savedSound !== 'false';
  updateSoundButtonUI();
}

function getAudioContext() {
  if (!gameState.audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      gameState.audioCtx = new AudioContextClass();
    }
  }
  if (gameState.audioCtx && gameState.audioCtx.state === 'suspended') {
    gameState.audioCtx.resume();
  }
  return gameState.audioCtx;
}

const SoundEffects = {
  playJump() {
    if (!gameState.soundEnabled) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(240, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(540, ctx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    } catch (e) { console.warn(e); }
  },

  playDoubleJump() {
    if (!gameState.soundEnabled) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(780, ctx.currentTime + 0.14);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.14);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.14);
    } catch (e) { console.warn(e); }
  },

  playDuck() {
    if (!gameState.soundEnabled) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(320, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(160, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.10, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.08);
    } catch (e) { console.warn(e); }
  },

  playCollect(points) {
    if (!gameState.soundEnabled) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const notes = points >= 150 ? [523.25, 659.25, 783.99, 1046.50] : [523.25, 659.25, 783.99];
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.05);
        gain.gain.setValueAtTime(0.12, ctx.currentTime + i * 0.05);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.05 + 0.15);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + i * 0.05);
        osc.stop(ctx.currentTime + i * 0.05 + 0.15);
      });
    } catch (e) { console.warn(e); }
  },

  playHeal() {
    if (!gameState.soundEnabled) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const notes = [440, 554.37, 659.25, 880];
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.06);
        gain.gain.setValueAtTime(0.14, ctx.currentTime + i * 0.06);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + i * 0.06 + 0.2);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + i * 0.06);
        osc.stop(ctx.currentTime + i * 0.06 + 0.2);
      });
    } catch (e) { console.warn(e); }
  },

  playHurt() {
    if (!gameState.soundEnabled) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(160, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(60, ctx.currentTime + 0.2);
      gain.gain.setValueAtTime(0.18, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.2);
    } catch (e) { console.warn(e); }
  },

  playVictory() {
    if (!gameState.soundEnabled) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const fanfare = [
        { f: 523.25, d: 0.12, t: 0.00 },
        { f: 659.25, d: 0.12, t: 0.12 },
        { f: 783.99, d: 0.14, t: 0.24 },
        { f: 1046.50, d: 0.35, t: 0.38 },
        { f: 783.99, d: 0.15, t: 0.74 },
        { f: 1046.50, d: 0.60, t: 0.90 }
      ];
      fanfare.forEach(n => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(n.f, ctx.currentTime + n.t);
        gain.gain.setValueAtTime(0.18, ctx.currentTime + n.t);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + n.t + n.d);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + n.t);
        osc.stop(ctx.currentTime + n.t + n.d);
      });
    } catch (e) { console.warn(e); }
  }
};

function toggleSound() {
  gameState.soundEnabled = !gameState.soundEnabled;
  localStorage.setItem('pixel_runner_sound', gameState.soundEnabled ? 'true' : 'false');
  updateSoundButtonUI();
  showToast(gameState.soundEnabled ? "🔊 Đã bật âm thanh" : "🔇 Đã tắt âm thanh");
}

function updateSoundButtonUI() {
  const icon = document.getElementById('soundIcon');
  if (icon) {
    icon.className = gameState.soundEnabled ? 'fa-solid fa-volume-high' : 'fa-solid fa-volume-xmark';
  }
}

// ==========================================
// SESSION PERSISTENCE (REQUIREMENT: 'user_session')
// ==========================================
function checkPersistedSession() {
  try {
    const raw = localStorage.getItem('user_session');
    if (raw) {
      const user = JSON.parse(raw);
      if (user && user.name) {
        setUserState(user, false);
        return true;
      }
    }
  } catch (err) {
    console.error("Failed to parse user_session:", err);
  }
  return false;
}

function setUserState(user, shouldShowWelcome = true) {
  appState.user = user;

  const authSection = document.getElementById('authSection');
  const gameSection = document.getElementById('gameSection');
  const gamePlayerName = document.getElementById('gamePlayerName');
  const gameUserAvatar = document.getElementById('gameUserAvatar');
  const gameUserAvatarIcon = document.getElementById('gameUserAvatarIcon');
  const cardGuestName = document.getElementById('cardGuestName');

  if (gamePlayerName) gamePlayerName.textContent = user.name;
  if (cardGuestName) cardGuestName.textContent = user.name;

  if (user.picture && gameUserAvatar) {
    gameUserAvatar.src = user.picture;
    gameUserAvatar.style.display = 'block';
    if (gameUserAvatarIcon) gameUserAvatarIcon.style.display = 'none';
  } else {
    if (gameUserAvatar) gameUserAvatar.style.display = 'none';
    if (gameUserAvatarIcon) gameUserAvatarIcon.style.display = 'block';
  }

  if (authSection) authSection.style.display = 'none';
  if (gameSection) gameSection.style.display = 'flex';

  renderInvitationCard();

  if (shouldShowWelcome) {
    showToast(`Chào mừng ${user.name}! Hãy cán mốc 2026 điểm để mở thiệp mời.`);
    triggerConfetti();
  }

  resetGame();
}

function handleSignOut() {
  try {
    if (window.google && window.google.accounts && window.google.accounts.id) {
      window.google.accounts.id.disableAutoSelect();
    }
    localStorage.removeItem('user_session');
  } catch (err) {
    console.warn(err);
  }

  appState.user = null;
  appState.isCardUnlocked = false;
  stopGameLoop();

  const authSection = document.getElementById('authSection');
  const gameSection = document.getElementById('gameSection');
  const invitationSection = document.getElementById('invitationSection');

  if (authSection) authSection.style.display = 'block';
  if (gameSection) gameSection.style.display = 'none';
  if (invitationSection) invitationSection.style.display = 'none';

  showToast("Đã đăng xuất tài khoản Google. Vui lòng đăng nhập lại!");
}

// ==========================================
// GOOGLE IDENTITY SERVICES (GIS)
// ==========================================
function setupGoogleIdentityServices() {
  const checkInterval = setInterval(() => {
    if (window.google && window.google.accounts && window.google.accounts.id) {
      clearInterval(checkInterval);
      initializeGsiClient();
    }
  }, 200);
  setTimeout(() => clearInterval(checkInterval), 6000);
}

function initializeGsiClient() {
  try {
    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: handleGoogleCredentialResponse,
      auto_select: false,
      cancel_on_tap_outside: true
    });

    const btnWrapper = document.getElementById('googleSignInBtn');
    if (btnWrapper) {
      window.google.accounts.id.renderButton(btnWrapper, {
        theme: 'filled_blue',
        size: 'large',
        type: 'standard',
        text: 'signin_with',
        shape: 'pill',
        logo_alignment: 'left',
        width: 300
      });
    }
  } catch (err) {
    console.warn("GIS initialization notice:", err);
  }
}

function handleGoogleCredentialResponse(response) {
  if (!response || !response.credential) {
    showToast("Không thể nhận diện thông tin xác thực từ Google.");
    return;
  }

  const payload = decodeJwtResponse(response.credential);
  if (!payload || !payload.name) {
    showToast("Không tìm thấy tên hiển thị từ tài khoản Google này.");
    return;
  }

  const user = {
    name: payload.name,
    email: payload.email || "",
    picture: payload.picture || "",
    sub: payload.sub
  };

  try {
    localStorage.setItem('user_session', JSON.stringify(user));
  } catch (e) {
    console.error("LocalStorage write error:", e);
  }

  setUserState(user, true);
}

function decodeJwtResponse(token) {
  try {
    const base64Url = token.split('.')[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error("JWT decode error:", error);
    return null;
  }
}

// ==========================================
// GAME ENGINE & HANDHELD CONTROLS
// ==========================================
function initGameCanvas() {
  gameState.canvas = document.getElementById('gameCanvas');
  if (!gameState.canvas) return;
  gameState.ctx = gameState.canvas.getContext('2d');
  gameState.ctx.imageSmoothingEnabled = false;

  window.addEventListener('keydown', handleGlobalKeyDown);
  window.addEventListener('keyup', handleGlobalKeyUp);

  gameState.canvas.addEventListener('mousedown', () => triggerPlayerJump());
  gameState.canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    triggerPlayerJump();
  }, { passive: false });

  bindConsoleButtons();
  drawGameFrame();
}

function bindConsoleButtons() {
  // 1. Button A (RIGHT: JUMP / START / RETRY)
  const btnA = document.getElementById('btnActionA');
  if (btnA) {
    const pressA = (e) => {
      e.preventDefault();
      btnA.classList.add('pressed');
      if (!gameState.isPlaying || gameState.isGameOver) {
        startGame();
      } else {
        triggerPlayerJump();
      }
    };
    const releaseA = (e) => {
      if (e) e.preventDefault();
      btnA.classList.remove('pressed');
    };

    btnA.addEventListener('mousedown', pressA);
    btnA.addEventListener('mouseup', releaseA);
    btnA.addEventListener('mouseleave', releaseA);
    btnA.addEventListener('touchstart', pressA, { passive: false });
    btnA.addEventListener('touchend', releaseA, { passive: false });
    btnA.addEventListener('touchcancel', releaseA, { passive: false });
  }

  // 2. Button B (LEFT: DUCK / CROUCH)
  const btnB = document.getElementById('btnActionB');
  if (btnB) {
    const pressB = (e) => {
      e.preventDefault();
      btnB.classList.add('pressed');
      setPlayerDucking(true);
    };
    const releaseB = (e) => {
      if (e) e.preventDefault();
      btnB.classList.remove('pressed');
      setPlayerDucking(false);
    };

    btnB.addEventListener('mousedown', pressB);
    btnB.addEventListener('mouseup', releaseB);
    btnB.addEventListener('mouseleave', releaseB);
    btnB.addEventListener('touchstart', pressB, { passive: false });
    btnB.addEventListener('touchend', releaseB, { passive: false });
    btnB.addEventListener('touchcancel', releaseB, { passive: false });
  }

  // 3. Audio & Pause
  const btnSound = document.getElementById('btnSoundSelect');
  if (btnSound) btnSound.addEventListener('click', toggleSound);

  const btnPause = document.getElementById('btnPauseStart');
  if (btnPause) btnPause.addEventListener('click', togglePauseGame);
}

function handleGlobalKeyDown(e) {
  if (!gameState.isPlaying || gameState.isPaused) {
    if ((e.code === 'Space' || e.code === 'KeyA' || e.code === 'Enter') && !gameState.isPlaying) {
      e.preventDefault();
      startGame();
    }
    return;
  }

  if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW' || e.code === 'KeyA') {
    e.preventDefault();
    triggerPlayerJump();
  } else if (e.code === 'ArrowDown' || e.code === 'KeyS' || e.code === 'KeyB' || e.code === 'KeyC') {
    e.preventDefault();
    setPlayerDucking(true);
  } else if (e.code === 'KeyP') {
    togglePauseGame();
  }
}

function handleGlobalKeyUp(e) {
  if (e.code === 'ArrowDown' || e.code === 'KeyS' || e.code === 'KeyB' || e.code === 'KeyC') {
    setPlayerDucking(false);
  }
}

function triggerPlayerJump() {
  getAudioContext();
  if (!gameState.isPlaying) {
    if (!gameState.isGameOver && !gameState.isVictory) {
      startGame();
    }
    return;
  }

  if (gameState.isPaused || gameState.isGameOver || gameState.isVictory) return;

  const p = gameState.player;
  if (p.isDucking) {
    setPlayerDucking(false);
  }

  if (p.isGrounded) {
    p.vy = p.jumpForce;
    p.isGrounded = false;
    p.jumpCount = 1;
    SoundEffects.playJump();
    spawnJumpDust(p.x + p.width / 2, gameState.groundY);
  } else if (p.jumpCount < p.maxJumps) {
    p.vy = p.doubleJumpForce;
    p.jumpCount++;
    SoundEffects.playDoubleJump();
    spawnDoubleJumpSparkles(p.x + p.width / 2, p.y + p.height);
  }
}

function setPlayerDucking(isDuck) {
  const p = gameState.player;
  if (!gameState.isPlaying || gameState.isGameOver || gameState.isVictory) return;

  if (isDuck && !p.isDucking) {
    p.isDucking = true;
    p.height = p.duckHeight;
    p.y = gameState.groundY - p.duckHeight;
    SoundEffects.playDuck();
  } else if (!isDuck && p.isDucking) {
    p.isDucking = false;
    p.height = p.normalHeight;
    p.y = gameState.groundY - p.normalHeight;
  }
}

function startGame() {
  resetGame();
  gameState.isPlaying = true;
  gameState.isPaused = false;
  gameState.isGameOver = false;
  gameState.isVictory = false;

  hideAllOverlays();
  stopGameLoop();
  gameLoop();
}

function stopGameLoop() {
  if (gameState.animationId) {
    cancelAnimationFrame(gameState.animationId);
    gameState.animationId = null;
  }
}

function resetGame() {
  gameState.score = 0;
  gameState.distance = 0;
  gameState.speed = 4.2;
  gameState.hearts = 3;
  gameState.invulnerableTimer = 0;
  gameState.isGameOver = false;
  gameState.isVictory = false;

  const p = gameState.player;
  p.isDucking = false;
  p.height = p.normalHeight;
  p.y = gameState.groundY - p.normalHeight;
  p.vy = 0;
  p.isGrounded = true;
  p.jumpCount = 0;
  p.runFrame = 0;
  p.coffeeBoostTimer = 0;
  p.capToss = null;

  gameState.obstacles = [];
  gameState.items = [];
  gameState.particles = [];
  gameState.popups = [];
  gameState.fireworks = [];

  gameState.obstacleTimer = 70;
  gameState.itemTimer = 40;

  updateHUD();
  showStartOverlay();
}

function togglePauseGame() {
  if (!gameState.isPlaying || gameState.isGameOver || gameState.isVictory) return;
  gameState.isPaused = !gameState.isPaused;
  const pauseIcon = document.getElementById('pauseIcon');
  if (pauseIcon) {
    pauseIcon.className = gameState.isPaused ? 'fa-solid fa-play' : 'fa-solid fa-pause';
  }
  if (!gameState.isPaused) {
    gameLoop();
  }
}

// ==========================================
// GAME LOOP & ENTITY UPDATES
// ==========================================
function gameLoop() {
  if (!gameState.isPlaying || gameState.isPaused) return;

  updateGameState();
  drawGameFrame();

  if (!gameState.isGameOver) {
    gameState.animationId = requestAnimationFrame(gameLoop);
  }
}

function updateGameState() {
  const p = gameState.player;

  if (p.coffeeBoostTimer > 0) {
    p.coffeeBoostTimer--;
    gameState.speed = 5.6;
  } else {
    gameState.speed = 4.2 + Math.min(1.0, gameState.score / 2500);
  }

  if (!gameState.isVictory) {
    gameState.distance += gameState.speed;
    if (Math.floor(gameState.distance) % 3 === 0) {
      gameState.score++;
      if (gameState.score >= TARGET_MILESTONE_SCORE) {
        triggerMilestoneVictory();
      }
    }
  }

  if (gameState.invulnerableTimer > 0) {
    gameState.invulnerableTimer--;
  }

  if (!p.isGrounded) {
    p.vy += p.gravity;
    p.y += p.vy;
    const targetGround = gameState.groundY - p.height;
    if (p.y >= targetGround) {
      p.y = targetGround;
      p.vy = 0;
      p.isGrounded = true;
      p.jumpCount = 0;
      spawnJumpDust(p.x + p.width / 2, gameState.groundY);
    }
  }

  p.runTimer++;
  if (p.runTimer >= 6) {
    p.runTimer = 0;
    p.runFrame = (p.runFrame + 1) % 4;
    if (p.isGrounded && Math.random() > 0.4) {
      spawnRunDust(p.x + 8, gameState.groundY);
    }
  }

  if (p.capToss) {
    p.capToss.y += p.capToss.vy;
    p.capToss.x += 1.2;
    p.capToss.vy += 0.25;
    p.capToss.rot += p.capToss.rotSpeed;
  }

  gameState.bgStarsOffset = (gameState.bgStarsOffset + gameState.speed * 0.15) % 800;
  gameState.bgSkylineOffset = (gameState.bgSkylineOffset + gameState.speed * 0.4) % 800;
  gameState.bgStreetOffset = (gameState.bgStreetOffset + gameState.speed * 1.2) % 800;
  gameState.roadOffset = (gameState.roadOffset + gameState.speed * 2.2) % 40;

  if (!gameState.isVictory) {
    updateSpawners();
  }

  // Obstacles & Collisions
  for (let i = gameState.obstacles.length - 1; i >= 0; i--) {
    const obs = gameState.obstacles[i];
    obs.x -= gameState.speed;

    if (gameState.invulnerableTimer <= 0 && checkCollision(p, obs)) {
      handleObstacleHit(obs);
    }

    if (obs.x + obs.width < -50) {
      gameState.obstacles.splice(i, 1);
    }
  }

  // Items & Collection
  for (let i = gameState.items.length - 1; i >= 0; i--) {
    const item = gameState.items[i];
    item.x -= gameState.speed;
    item.floatTimer = (item.floatTimer || 0) + 0.08;
    item.floatY = Math.sin(item.floatTimer) * 6;

    const itemBox = {
      x: item.x,
      y: item.y + item.floatY,
      width: item.width,
      height: item.height
    };

    if (checkCollision(p, itemBox)) {
      handleItemCollect(item);
      gameState.items.splice(i, 1);
      continue;
    }

    if (item.x + item.width < -50) {
      gameState.items.splice(i, 1);
    }
  }

  // Particles
  for (let i = gameState.particles.length - 1; i >= 0; i--) {
    const pt = gameState.particles[i];
    pt.x += pt.vx;
    pt.y += pt.vy;
    pt.life--;
    if (pt.life <= 0) gameState.particles.splice(i, 1);
  }

  // Popups
  for (let i = gameState.popups.length - 1; i >= 0; i--) {
    const pop = gameState.popups[i];
    pop.y -= 1.2;
    pop.life--;
    if (pop.life <= 0) gameState.popups.splice(i, 1);
  }

  // Fireworks
  for (let i = gameState.fireworks.length - 1; i >= 0; i--) {
    const fw = gameState.fireworks[i];
    fw.x += fw.vx;
    fw.y += fw.vy;
    fw.vy += 0.08;
    fw.life--;
    if (fw.life <= 0) gameState.fireworks.splice(i, 1);
  }

  if (gameState.isVictory && Math.random() < 0.18) {
    spawnPixelFirework(150 + Math.random() * 500, 60 + Math.random() * 140);
  }

  updateHUD();
}

function updateSpawners() {
  gameState.obstacleTimer--;
  if (gameState.obstacleTimer <= 0) {
    spawnObstacle();
    gameState.obstacleTimer = Math.floor(105 + Math.random() * 65);
  }

  gameState.itemTimer--;
  if (gameState.itemTimer <= 0) {
    spawnItem();
    gameState.itemTimer = Math.floor(75 + Math.random() * 55);
  }
}

// ==========================================
// OBSTACLES & DUCKABLE AIR HAZARDS (ENGLISH)
// ==========================================
let lastSpawnWasAir = false;

function spawnObstacle() {
  // Alternate or 50% chance to ensure a balanced mix of jump vs duck
  const isAir = Math.random() < 0.5 ? !lastSpawnWasAir : (Math.random() < 0.5);
  lastSpawnWasAir = isAir;

  let choice;
  let yPos;

  if (isAir) {
    // Airborne obstacle at head level: MUST DUCK [ B ] to slide underneath!
    const airTypes = [
      { type: 'retake', name: 'Retake', tag: 'RETAKE', width: 44, height: 24, color: '#eab308' },
      { type: 'deadline', name: 'Deadline', tag: 'DEADLINE', width: 44, height: 24, color: '#ef4444' }
    ];
    choice = airTypes[Math.floor(Math.random() * airTypes.length)];
    // Standing player head occupies y in [256, 282]. Ducking player is [286, 320].
    // Airborne obstacle sits at y = 258..282, colliding with standing head, clear under duck!
    yPos = gameState.groundY - 62;
  } else {
    // Ground obstacle: MUST JUMP [ A ] over it!
    const groundTypes = [
      { type: 'thesis', name: 'Thesis', tag: 'THESIS', width: 44, height: 44, color: '#3b82f6' },
      { type: 'report', name: 'Report', tag: 'REPORT', width: 42, height: 44, color: '#a855f7' }
    ];
    choice = groundTypes[Math.floor(Math.random() * groundTypes.length)];
    yPos = gameState.groundY - choice.height;
  }

  gameState.obstacles.push({
    ...choice,
    x: 820,
    y: yPos,
    isAir
  });
}

function spawnItem() {
  const needsHeart = gameState.hearts < 3 && Math.random() < 0.38;

  let choice;
  if (needsHeart) {
    choice = { type: 'heart', name: 'Heart', points: 50, width: 32, height: 32, color: '#ef4444' };
  } else {
    const types = [
      { type: 'grade_a', name: 'Grade A', points: 100, width: 32, height: 32, color: '#D4AF37' },
      { type: 'diploma', name: 'Diploma', points: 150, width: 36, height: 34, color: '#fb923c' },
      { type: 'coffee', name: 'Coffee', points: 50, width: 28, height: 32, color: '#d97706' },
      { type: 'heart', name: 'Heart', points: 50, width: 32, height: 32, color: '#ef4444' }
    ];
    choice = types[Math.floor(Math.random() * types.length)];
  }

  const heights = [
    gameState.groundY - choice.height - 18,
    gameState.groundY - choice.height - 75,
    gameState.groundY - choice.height - 110
  ];
  const yPos = heights[Math.floor(Math.random() * heights.length)];

  gameState.items.push({
    ...choice,
    x: 830,
    y: yPos,
    floatTimer: Math.random() * Math.PI * 2
  });
}

function checkCollision(p, box) {
  const pPadX = 8;
  const pPadY = 4;
  const bPad = 4;

  return (
    p.x + pPadX < box.x + box.width - bPad &&
    p.x + p.width - pPadX > box.x + bPad &&
    p.y + pPadY < box.y + box.height - bPad &&
    p.y + p.height > box.y + bPad
  );
}

function handleObstacleHit(obs) {
  gameState.hearts--;
  gameState.invulnerableTimer = 90;
  SoundEffects.playHurt();
  spawnHurtParticles(gameState.player.x + 20, gameState.player.y + 25);
  addPopupText(gameState.player.x, gameState.player.y - 20, `-1 LIFE! Hit ${obs.name}`, '#ef4444');

  if (gameState.hearts <= 0) {
    triggerGameOver(obs.name);
  }
}

function handleItemCollect(item) {
  gameState.score += item.points;

  if (item.type === 'heart') {
    if (gameState.hearts < 3) {
      gameState.hearts++;
    }
    SoundEffects.playHeal();
    spawnHeartCollectParticles(item.x + 16, item.y + 16);
    addPopupText(item.x, item.y - 18, `+1 LIFE RESTORED! ❤️`, '#ef4444');
  } else if (item.type === 'coffee') {
    gameState.player.coffeeBoostTimer = 180;
    SoundEffects.playCollect(item.points);
    spawnItemCollectParticles(item.x + 16, item.y + 16, item.color);
    addPopupText(item.x, item.y - 18, `+50 COFFEE! ⚡ BOOST`, '#FFDF73');
  } else if (item.type === 'diploma') {
    SoundEffects.playCollect(item.points);
    spawnItemCollectParticles(item.x + 16, item.y + 16, item.color);
    addPopupText(item.x, item.y - 18, `+150 DIPLOMA! 📜`, '#FFDF73');
  } else {
    SoundEffects.playCollect(item.points);
    spawnItemCollectParticles(item.x + 16, item.y + 16, item.color);
    addPopupText(item.x, item.y - 18, `+${item.points} GRADE A! 🌟`, '#FFDF73');
  }

  if (gameState.score >= TARGET_MILESTONE_SCORE) {
    triggerMilestoneVictory();
  }
}

// ==========================================
// MILESTONE VICTORY & INLINE INVITATION UNLOCK
// ==========================================
function triggerMilestoneVictory() {
  if (gameState.isVictory) return;
  gameState.isVictory = true;
  gameState.score = TARGET_MILESTONE_SCORE;

  gameState.player.capToss = {
    x: gameState.player.x + 12,
    y: gameState.player.y - 8,
    vy: -9.5,
    rot: 0,
    rotSpeed: 0.18
  };

  SoundEffects.playVictory();
  triggerConfetti();

  for (let i = 0; i < 5; i++) {
    setTimeout(() => {
      spawnPixelFirework(100 + Math.random() * 600, 50 + Math.random() * 150);
    }, i * 220);
  }

  // Show Compact Victory Overlay on Console Screen
  const victoryOverlay = document.getElementById('gameVictoryOverlay');
  if (victoryOverlay) victoryOverlay.style.display = 'flex';

  // Unlock and smoothly reveal the invitation section directly below the console
  showInvitationSection(true);
}

function triggerGameOver(obstacleName) {
  gameState.isGameOver = true;
  gameState.isPlaying = false;
  stopGameLoop();

  const overOverlay = document.getElementById('gameOverOverlay');
  const reasonText = document.getElementById('gameOverReason');
  if (reasonText) {
    reasonText.innerHTML = `You ran out of lives after hitting <strong>${obstacleName}</strong>! Try again to reach 2026 PTS and graduate!`;
  }
  if (overOverlay) overOverlay.style.display = 'flex';
}

function hideAllOverlays() {
  const start = document.getElementById('gameStartOverlay');
  const over = document.getElementById('gameOverOverlay');
  const victory = document.getElementById('gameVictoryOverlay');
  if (start) start.style.display = 'none';
  if (over) over.style.display = 'none';
  if (victory) victory.style.display = 'none';
}

function showStartOverlay() {
  hideAllOverlays();
  const start = document.getElementById('gameStartOverlay');
  if (start) start.style.display = 'flex';
}

/**
 * REVEALS INVITATION CARD DIRECTLY BELOW THE GAME CONSOLE (NO MODAL POP-UP)
 */
function showInvitationSection(shouldScroll = true) {
  appState.isCardUnlocked = true;
  const invitationSection = document.getElementById('invitationSection');
  const cardGuestName = document.getElementById('cardGuestName');

  if (cardGuestName && appState.user) {
    cardGuestName.textContent = appState.user.name;
  }

  if (invitationSection) {
    invitationSection.style.display = 'flex';
  }

  renderInvitationCard();

  if (shouldScroll && invitationSection) {
    setTimeout(() => {
      invitationSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 450);
  }
}

function handleViewCeremonyDetails() {
  const details = document.getElementById('ceremonyDetails');
  if (details) {
    details.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

function handleReplayGame() {
  const gameSection = document.getElementById('gameSection');
  if (gameSection) {
    gameSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  setTimeout(() => {
    startGame();
    showToast("🎮 Chúc bạn có một màn chơi xuất sắc đạt mốc 2026 điểm!");
  }, 300);
}

// ==========================================
// CANVAS RENDERING (100% VIETNAMESE TYPOGRAPHY)
// ==========================================
function drawGameFrame() {
  const ctx = gameState.ctx;
  if (!ctx) return;
  const W = gameState.canvas.width;
  const H = gameState.canvas.height;

  ctx.clearRect(0, 0, W, H);

  drawPixelSky(ctx, W, H);
  drawPixelSkyline(ctx, W);
  drawPixelStreetlamps(ctx, W);
  drawPixelGround(ctx, W, H);

  gameState.obstacles.forEach(obs => drawPixelObstacle(ctx, obs));
  gameState.items.forEach(item => drawPixelItem(ctx, item));
  drawPixelStudent(ctx, gameState.player);

  drawGameParticles(ctx);
  drawGamePopups(ctx);
  drawGameFireworks(ctx);
}

function drawPixelSky(ctx, W, H) {
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, '#040b1c');
  grad.addColorStop(0.65, '#0b1b3d');
  grad.addColorStop(1, '#11254e');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  ctx.save();
  ctx.fillStyle = '#FFE79A';
  ctx.shadowColor = 'rgba(212, 175, 55, 0.6)';
  ctx.shadowBlur = 15;
  ctx.beginPath();
  ctx.arc(710, 65, 26, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#050d22';
  ctx.shadowBlur = 0;
  ctx.beginPath();
  ctx.arc(698, 60, 24, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.fillStyle = '#ffffff';
  for (let i = 0; i < 35; i++) {
    const x = (i * 27 - gameState.bgStarsOffset + 800) % 800;
    const y = (i * 19) % 180 + 10;
    const size = (i % 3 === 0) ? 2 : 1;
    ctx.globalAlpha = 0.35 + (Math.sin(Date.now() * 0.003 + i) * 0.35);
    ctx.fillRect(Math.floor(x), Math.floor(y), size, size);
  }
  ctx.globalAlpha = 1.0;
}

function drawPixelSkyline(ctx, W) {
  ctx.save();
  ctx.fillStyle = '#06122b';

  const buildings = [
    { x: 0, w: 90, h: 120 },
    { x: 95, w: 60, h: 85 },
    { x: 160, w: 110, h: 140 },
    { x: 275, w: 80, h: 95 },
    { x: 360, w: 120, h: 110 },
    { x: 485, w: 70, h: 80 },
    { x: 560, w: 130, h: 130 },
    { x: 695, w: 100, h: 100 }
  ];

  buildings.forEach(b => {
    const drawX = (b.x - gameState.bgSkylineOffset + 800) % 800;
    ctx.fillRect(Math.floor(drawX), gameState.groundY - b.h, b.w, b.h);

    ctx.fillStyle = '#ffdf73';
    ctx.globalAlpha = 0.6;
    for (let wy = gameState.groundY - b.h + 15; wy < gameState.groundY - 15; wy += 22) {
      for (let wx = drawX + 12; wx < drawX + b.w - 12; wx += 18) {
        if ((wx + wy) % 5 !== 0) {
          ctx.fillRect(Math.floor(wx), Math.floor(wy), 6, 8);
        }
      }
    }
    ctx.fillStyle = '#06122b';
    ctx.globalAlpha = 1.0;
  });

  ctx.restore();
}

function drawPixelStreetlamps(ctx, W) {
  ctx.save();
  const spacing = 200;
  for (let i = 0; i < 5; i++) {
    const lx = (i * spacing - gameState.bgStreetOffset + 1000) % 1000 - 100;
    if (lx > -50 && lx < W + 50) {
      ctx.fillStyle = '#0a162e';
      ctx.fillRect(Math.floor(lx), gameState.groundY - 90, 4, 90);
      ctx.fillRect(Math.floor(lx - 4), gameState.groundY - 95, 12, 5);

      const coneGrad = ctx.createRadialGradient(lx + 2, gameState.groundY - 90, 4, lx + 2, gameState.groundY - 40, 80);
      coneGrad.addColorStop(0, 'rgba(255, 223, 115, 0.45)');
      coneGrad.addColorStop(0.5, 'rgba(212, 175, 55, 0.15)');
      coneGrad.addColorStop(1, 'rgba(212, 175, 55, 0)');
      ctx.fillStyle = coneGrad;
      ctx.beginPath();
      ctx.moveTo(lx - 25, gameState.groundY);
      ctx.lineTo(lx + 29, gameState.groundY);
      ctx.lineTo(lx + 5, gameState.groundY - 90);
      ctx.lineTo(lx - 1, gameState.groundY - 90);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#FFE79A';
      ctx.fillRect(Math.floor(lx - 1), gameState.groundY - 93, 6, 6);
    }
  }
  ctx.restore();
}

function drawPixelGround(ctx, W, H) {
  ctx.save();
  ctx.fillStyle = '#0a1733';
  ctx.fillRect(0, gameState.groundY, W, H - gameState.groundY);

  ctx.fillStyle = '#D4AF37';
  ctx.fillRect(0, gameState.groundY, W, 4);

  ctx.fillStyle = '#112247';
  ctx.fillRect(0, gameState.groundY + 4, W, 10);

  ctx.strokeStyle = '#071126';
  ctx.lineWidth = 2;
  for (let x = -40; x < W + 40; x += 35) {
    const drawX = x - gameState.roadOffset;
    ctx.beginPath();
    ctx.moveTo(drawX, gameState.groundY + 14);
    ctx.lineTo(drawX + 15, H);
    ctx.stroke();
  }
  ctx.restore();
}

function drawPixelStudent(ctx, p) {
  ctx.save();

  if (gameState.invulnerableTimer > 0 && Math.floor(gameState.invulnerableTimer / 4) % 2 === 0) {
    ctx.restore();
    return;
  }

  if (p.coffeeBoostTimer > 0) {
    ctx.fillStyle = 'rgba(255, 223, 115, 0.35)';
    ctx.beginPath();
    ctx.ellipse(p.x + p.width / 2, p.y + p.height / 2, p.width * 0.85, p.height * 0.65, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  const px = Math.floor(p.x);
  const py = Math.floor(p.y);

  if (p.isDucking) {
    // Sliding Robe low to the ground
    ctx.fillStyle = '#0c1b3d';
    ctx.fillRect(px + 4, py + 12, 44, 18);

    ctx.fillStyle = '#D4AF37';
    ctx.fillRect(px + 10, py + 10, 32, 4);

    ctx.fillStyle = '#fcd34d';
    ctx.fillRect(px + 34, py + 6, 12, 12);
    ctx.fillStyle = '#071126';
    ctx.fillRect(px + 42, py + 9, 3, 3);

    drawMortarboard(ctx, px + 28, py - 4);

    ctx.fillStyle = '#050a17';
    ctx.fillRect(px - 2, py + 22, 12, 6);

    if (Math.random() < 0.6) {
      spawnRunDust(px + 4, gameState.groundY);
    }
  } else {
    ctx.fillStyle = '#0c1b3d';
    ctx.fillRect(px + 8, py + 24, 28, 28);
    ctx.fillStyle = '#07122b';
    ctx.fillRect(px + 10, py + 26, 6, 24);

    ctx.fillStyle = '#D4AF37';
    ctx.fillRect(px + 18, py + 24, 8, 26);
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(px + 20, py + 24, 4, 24);

    ctx.fillStyle = '#fcd34d';
    ctx.fillRect(px + 14, py + 12, 16, 12);
    ctx.fillStyle = '#071126';
    ctx.fillRect(px + 24, py + 15, 3, 3);
    ctx.fillStyle = '#e11d48';
    ctx.fillRect(px + 23, py + 20, 3, 2);

    ctx.fillStyle = '#3e2723';
    ctx.fillRect(px + 12, py + 10, 18, 4);
    ctx.fillRect(px + 12, py + 14, 3, 8);

    if (!p.capToss) {
      drawMortarboard(ctx, px + 8, py);
    } else {
      drawDetachedCap(ctx, p.capToss.x, p.capToss.y, p.capToss.rot);
    }

    ctx.fillStyle = '#0c1b3d';
    if (!p.isGrounded) {
      ctx.fillRect(px + 2, py + 20, 8, 12);
      ctx.fillRect(px + 34, py + 18, 8, 12);
    } else {
      const armOffset = Math.sin(p.runFrame * Math.PI / 2) * 4;
      ctx.fillRect(px + 4, py + 26 + armOffset, 8, 14);
    }

    ctx.fillStyle = '#1e293b';
    if (!p.isGrounded) {
      ctx.fillRect(px + 12, py + 50, 8, 8);
      ctx.fillRect(px + 24, py + 48, 8, 6);
      ctx.fillStyle = '#050a17';
      ctx.fillRect(px + 10, py + 58, 10, 4);
      ctx.fillRect(px + 24, py + 54, 10, 4);
    } else {
      const step = p.runFrame;
      let leg1Y = 52, leg2Y = 52, leg1X = 12, leg2X = 24;
      if (step === 0) { leg1X = 8; leg2X = 28; }
      else if (step === 1) { leg1X = 14; leg2X = 22; leg1Y = 50; }
      else if (step === 2) { leg1X = 26; leg2X = 10; }
      else if (step === 3) { leg1X = 20; leg2X = 14; leg2Y = 50; }

      ctx.fillRect(px + leg1X, py + 50, 6, leg1Y - 50 + 6);
      ctx.fillRect(px + leg2X, py + 50, 6, leg2Y - 50 + 6);

      ctx.fillStyle = '#050a17';
      ctx.fillRect(px + leg1X - 2, py + leg1Y + 6, 10, 4);
      ctx.fillRect(px + leg2X - 2, py + leg2Y + 6, 10, 4);
    }
  }

  ctx.restore();
}

function drawMortarboard(ctx, x, y) {
  ctx.fillStyle = '#09152e';
  ctx.fillRect(x + 6, y + 6, 16, 5);

  ctx.fillStyle = '#0f2044';
  ctx.beginPath();
  ctx.moveTo(x + 14, y);
  ctx.lineTo(x + 28, y + 4);
  ctx.lineTo(x + 14, y + 8);
  ctx.lineTo(x, y + 4);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#FFE79A';
  ctx.fillRect(x + 13, y + 3, 3, 3);

  ctx.strokeStyle = '#D4AF37';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x + 14, y + 4);
  ctx.lineTo(x + 24, y + 6);
  ctx.lineTo(x + 26, y + 14);
  ctx.stroke();

  ctx.fillStyle = '#FFE58F';
  ctx.fillRect(x + 24, y + 14, 4, 4);
}

function drawDetachedCap(ctx, cx, cy, rot) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rot);
  drawMortarboard(ctx, -14, -6);
  ctx.restore();
}

function drawPixelObstacle(ctx, obs) {
  ctx.save();
  const ox = Math.floor(obs.x);
  const oy = Math.floor(obs.y);

  if (obs.isAir) {
    // Air obstacle hovering at head level
    // Draw subtle ground shadow to show it is floating in the air
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.beginPath();
    ctx.ellipse(ox + obs.width / 2, gameState.groundY - 2, obs.width * 0.45, 3, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  if (obs.type === 'deadline') {
    // Airborne urgent deadline alarm clock
    ctx.fillStyle = '#dc2626';
    ctx.beginPath();
    ctx.arc(ox + 20, oy + 12, 11, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#fee2e2';
    ctx.beginPath();
    ctx.arc(ox + 20, oy + 12, 8, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#991b1b';
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(ox + 20, oy + 12);
    ctx.lineTo(ox + 20, oy + 6);
    ctx.moveTo(ox + 20, oy + 12);
    ctx.lineTo(ox + 25, oy + 12);
    ctx.stroke();

    ctx.fillStyle = '#f59e0b';
    ctx.fillRect(ox + 10, oy, 5, 4);
    ctx.fillRect(ox + 25, oy, 5, 4);

    // Speed lines
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.6)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(ox + obs.width + 2, oy + 8);
    ctx.lineTo(ox + obs.width + 10, oy + 8);
    ctx.moveTo(ox + obs.width + 4, oy + 16);
    ctx.lineTo(ox + obs.width + 12, oy + 16);
    ctx.stroke();
  } else if (obs.type === 'retake') {
    // Airborne course retake exam paper with red 'F' grade
    ctx.fillStyle = '#fef08a';
    ctx.fillRect(ox + 4, oy + 2, 34, 20);

    ctx.fillStyle = '#ca8a04';
    ctx.fillRect(ox + 8, oy + 6, 14, 2);
    ctx.fillRect(ox + 8, oy + 10, 18, 2);
    ctx.fillRect(ox + 8, oy + 14, 12, 2);

    ctx.fillStyle = '#dc2626';
    ctx.font = "bold 15px 'Be Vietnam Pro', sans-serif";
    ctx.fillText("F", ox + 22, oy + 17);

    // Floating flutter wings
    ctx.fillStyle = 'rgba(254, 240, 138, 0.6)';
    ctx.beginPath();
    ctx.ellipse(ox + 2, oy + 10, 3, 6, -0.3, 0, Math.PI * 2);
    ctx.ellipse(ox + 40, oy + 10, 3, 6, 0.3, 0, Math.PI * 2);
    ctx.fill();
  } else if (obs.type === 'thesis') {
    // Ground thesis laptop
    ctx.fillStyle = '#1e3a8a';
    ctx.fillRect(ox + 4, oy + 6, 36, 26);

    ctx.fillStyle = '#0f172a';
    ctx.fillRect(ox + 7, oy + 9, 30, 20);

    ctx.fillStyle = '#22c55e';
    ctx.fillRect(ox + 10, oy + 13, 14, 2);
    ctx.fillRect(ox + 10, oy + 17, 18, 2);
    ctx.fillStyle = '#ef4444';
    ctx.fillRect(ox + 28, oy + 13, 6, 8);

    ctx.fillStyle = '#334155';
    ctx.fillRect(ox + 16, oy + 32, 12, 4);
    ctx.fillRect(ox + 8, oy + 36, 28, 4);
  } else if (obs.type === 'report') {
    // Ground report binder stack
    ctx.fillStyle = '#7e22ce';
    ctx.fillRect(ox + 4, oy + 24, 34, 18);
    ctx.fillStyle = '#9333ea';
    ctx.fillRect(ox + 8, oy + 14, 30, 12);
    ctx.fillStyle = '#a855f7';
    ctx.fillRect(ox + 6, oy + 4, 32, 12);

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(ox + 28, oy + 6, 6, 4);
    ctx.fillRect(ox + 10, oy + 16, 6, 4);
  }

  // Floating Tag Banner (Be Vietnam Pro)
  ctx.fillStyle = 'rgba(7, 17, 38, 0.9)';
  ctx.fillRect(ox - 8, oy - 18, obs.width + 16, 15);
  ctx.strokeStyle = obs.color;
  ctx.lineWidth = 1;
  ctx.strokeRect(ox - 8, oy - 18, obs.width + 16, 15);

  ctx.fillStyle = obs.color;
  ctx.font = "bold 9px 'Be Vietnam Pro', sans-serif";
  ctx.textAlign = 'center';
  ctx.fillText(obs.isAir ? `⬇ DUCK: ${obs.tag}` : `⬆ JUMP: ${obs.tag}`, ox + obs.width / 2, oy - 7);

  ctx.restore();
}

function drawPixelItem(ctx, item) {
  ctx.save();
  const ix = Math.floor(item.x);
  const iy = Math.floor(item.y + (item.floatY || 0));

  ctx.fillStyle = item.type === 'heart' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(255, 223, 115, 0.25)';
  ctx.beginPath();
  ctx.arc(ix + item.width / 2, iy + item.height / 2, 20, 0, Math.PI * 2);
  ctx.fill();

  if (item.type === 'heart') {
    ctx.fillStyle = '#ef4444';
    ctx.shadowColor = 'rgba(239, 68, 68, 0.8)';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    const cx = ix + 16, cy = iy + 16;
    ctx.moveTo(cx, cy + 10);
    ctx.bezierCurveTo(cx - 14, cy - 2, cx - 14, cy - 12, cx, cy - 6);
    ctx.bezierCurveTo(cx + 14, cy - 12, cx + 14, cy - 2, cx, cy + 10);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(cx - 6, cy - 6, 3, 3);
  } else if (item.type === 'grade_a') {
    ctx.fillStyle = '#f59e0b';
    ctx.beginPath();
    ctx.arc(ix + 16, iy + 16, 14, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#FFE79A';
    ctx.beginPath();
    ctx.arc(ix + 16, iy + 16, 11, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#b45309';
    ctx.font = "bold 13px 'Be Vietnam Pro', sans-serif";
    ctx.textAlign = 'center';
    ctx.fillText("A+", ix + 16, iy + 21);
  } else if (item.type === 'diploma') {
    ctx.fillStyle = '#fef3c7';
    ctx.fillRect(ix + 4, iy + 8, 28, 16);

    ctx.fillStyle = '#ef4444';
    ctx.fillRect(ix + 16, iy + 6, 6, 20);
    ctx.beginPath();
    ctx.moveTo(ix + 16, iy + 26);
    ctx.lineTo(ix + 14, iy + 32);
    ctx.lineTo(ix + 24, iy + 26);
    ctx.fill();
  } else if (item.type === 'coffee') {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(ix + 7, iy + 8, 16, 4);

    ctx.fillStyle = '#b45309';
    ctx.fillRect(ix + 8, iy + 12, 14, 18);

    ctx.fillStyle = '#d97706';
    ctx.fillRect(ix + 7, iy + 16, 16, 8);

    ctx.fillStyle = '#ffffff';
    ctx.globalAlpha = 0.7;
    ctx.fillRect(ix + 11, iy + 2, 2, 4);
    ctx.fillRect(ix + 16, iy + 0, 2, 5);
  }

  ctx.restore();
}

// ==========================================
// PARTICLES, POPUPS & FIREWORKS
// ==========================================
function spawnRunDust(x, y) {
  gameState.particles.push({
    x, y: y - 4,
    vx: -gameState.speed * 0.4 - Math.random() * 1.5,
    vy: -Math.random() * 1.5,
    size: Math.random() * 3 + 2,
    color: 'rgba(255, 255, 255, 0.4)',
    life: 14
  });
}

function spawnJumpDust(x, y) {
  for (let i = 0; i < 6; i++) {
    gameState.particles.push({
      x, y: y - 2,
      vx: (Math.random() - 0.5) * 4,
      vy: -Math.random() * 2,
      size: Math.random() * 4 + 2,
      color: 'rgba(212, 175, 55, 0.5)',
      life: 18
    });
  }
}

function spawnDoubleJumpSparkles(x, y) {
  for (let i = 0; i < 8; i++) {
    gameState.particles.push({
      x, y,
      vx: (Math.random() - 0.5) * 5,
      vy: Math.random() * 3,
      size: 3,
      color: '#FFE79A',
      life: 20
    });
  }
}

function spawnHurtParticles(x, y) {
  for (let i = 0; i < 16; i++) {
    gameState.particles.push({
      x, y,
      vx: (Math.random() - 0.5) * 7,
      vy: (Math.random() - 0.5) * 7,
      size: Math.random() * 4 + 2,
      color: '#ef4444',
      life: 25
    });
  }
}

function spawnItemCollectParticles(x, y, color) {
  for (let i = 0; i < 14; i++) {
    gameState.particles.push({
      x, y,
      vx: (Math.random() - 0.5) * 6,
      vy: (Math.random() - 0.5) * 6,
      size: Math.random() * 3 + 2,
      color: color || '#FFDF73',
      life: 22
    });
  }
}

function spawnHeartCollectParticles(x, y) {
  for (let i = 0; i < 16; i++) {
    gameState.particles.push({
      x, y,
      vx: (Math.random() - 0.5) * 6,
      vy: (Math.random() - 0.5) * 6,
      size: Math.random() * 4 + 2,
      color: '#ef4444',
      life: 26
    });
  }
}

function addPopupText(x, y, text, color) {
  gameState.popups.push({
    x, y, text, color, life: 45
  });
}

function spawnPixelFirework(x, y) {
  const colors = ['#FFE79A', '#ef4444', '#38bdf8', '#4ade80', '#c084fc', '#ffffff'];
  const baseColor = colors[Math.floor(Math.random() * colors.length)];
  for (let i = 0; i < 32; i++) {
    const angle = (i / 32) * Math.PI * 2;
    const speed = Math.random() * 4.5 + 2;
    gameState.fireworks.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: Math.random() * 3 + 2,
      color: baseColor,
      life: Math.floor(35 + Math.random() * 20)
    });
  }
}

function drawGameParticles(ctx) {
  ctx.save();
  gameState.particles.forEach(p => {
    ctx.fillStyle = p.color;
    ctx.fillRect(Math.floor(p.x), Math.floor(p.y), p.size, p.size);
  });
  ctx.restore();
}

function drawGamePopups(ctx) {
  ctx.save();
  ctx.font = "bold 12px 'Be Vietnam Pro', sans-serif";
  ctx.textAlign = 'center';
  gameState.popups.forEach(pop => {
    ctx.fillStyle = pop.color;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
    ctx.shadowBlur = 6;
    ctx.fillText(pop.text, Math.floor(pop.x), Math.floor(pop.y));
  });
  ctx.restore();
}

function drawGameFireworks(ctx) {
  ctx.save();
  gameState.fireworks.forEach(fw => {
    ctx.fillStyle = fw.color;
    ctx.shadowColor = fw.color;
    ctx.shadowBlur = 6;
    ctx.fillRect(Math.floor(fw.x), Math.floor(fw.y), fw.size, fw.size);
  });
  ctx.restore();
}

// ==========================================
// HUD UPDATES
// ==========================================
function updateHUD() {
  const scoreElem = document.getElementById('hudScore');
  if (scoreElem) scoreElem.textContent = gameState.score;

  const barElem = document.getElementById('hudProgressBar');
  if (barElem) {
    const pct = Math.min(100, Math.max(0, (gameState.score / TARGET_MILESTONE_SCORE) * 100));
    barElem.style.width = `${pct}%`;
  }

  const heartsContainer = document.getElementById('hudHearts');
  if (heartsContainer) {
    let heartsHtml = '';
    for (let i = 1; i <= 3; i++) {
      if (i <= gameState.hearts) {
        heartsHtml += '<i class="fa-solid fa-heart heart-active"></i> ';
      } else {
        heartsHtml += '<i class="fa-solid fa-heart heart-lost"></i> ';
      }
    }
    heartsContainer.innerHTML = heartsHtml;
  }
}

// ==========================================
// INVITATION CARD (CANVA BOARDING PASS / TICKET STYLE)
// Inspires by user reference image: Perforated Ticket, Clean Typography,
// No oversized logo, Balanced Layout & Tilted Ribbon Tag for Host
// ==========================================
function renderInvitationCard() {
  const canvas = document.getElementById('invitationCanvas');
  const loader = document.getElementById('canvasLoader');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const W = CARD_CONFIG.width;
  const H = CARD_CONFIG.height;

  // 1. Ambient Background Gradient (Gold-to-Blue aura inspired by Canva screenshot)
  const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
  bgGrad.addColorStop(0, "#C59B46");
  bgGrad.addColorStop(0.22, "#917646");
  bgGrad.addColorStop(0.48, "#2C4C82");
  bgGrad.addColorStop(0.78, "#163467");
  bgGrad.addColorStop(1, "#0A1D42");
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  // Soft background particle dust
  drawCardCanvasParticles(ctx);

  // Ticket Dimensions & Placement
  const ticketW = 600;
  const ticketX = (W - ticketW) / 2; // 200
  const ticketY = 105;
  const ticketH = 1325;

  // 2. Ticket Paper Drop Shadow & Body
  ctx.save();
  ctx.shadowColor = "rgba(0, 0, 0, 0.45)";
  ctx.shadowBlur = 32;
  ctx.shadowOffsetY = 16;

  // Cardstock surface
  const paperGrad = ctx.createLinearGradient(ticketX, ticketY, ticketX, ticketY + ticketH);
  paperGrad.addColorStop(0, "#FFFFFF");
  paperGrad.addColorStop(0.85, "#FAFCFF");
  paperGrad.addColorStop(1, "#F3F7FC");
  ctx.fillStyle = paperGrad;
  ctx.fillRect(ticketX, ticketY, ticketW, ticketH);
  ctx.restore();

  // Subtle border around ticket
  ctx.save();
  ctx.strokeStyle = "rgba(203, 213, 225, 0.7)";
  ctx.lineWidth = 1;
  ctx.strokeRect(ticketX, ticketY, ticketW, ticketH);
  ctx.restore();

  // 3. Ticket Slot / Dispenser Bezel (Top)
  drawTicketDispenserSlot(ctx, W / 2, 95, 680, 48);

  // 4. Ticket Content (Crisp Navy & Gold Palette)
  // Section A: "Thân mời"
  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "bold 44px 'Playfair Display', Georgia, serif";
  ctx.fillStyle = "#0F2B5C";
  ctx.fillText("Thân mời", W / 2, 195);

  // Section B: "Bạn: [Guest Name]"
  const guestName = (appState.user && appState.user.name) ? appState.user.name : "Quốc Việt";
  ctx.font = "bold 28px 'Be Vietnam Pro', sans-serif";
  ctx.fillStyle = "#0F2B5C";
  ctx.fillText("Bạn: ", W / 2 - (guestName.length > 18 ? 140 : 110), 265);

  // Recipient Script Name
  let nameFontSize = 58;
  if (guestName.length > 25) nameFontSize = 42;
  else if (guestName.length > 18) nameFontSize = 48;
  ctx.font = `bold ${nameFontSize}px 'Dancing Script', cursive`;
  ctx.fillStyle = "#1E3A8A";
  ctx.fillText(guestName, W / 2 + 30, 265);

  // Section C: Subtitle
  ctx.font = "500 19px 'Be Vietnam Pro', sans-serif";
  ctx.fillStyle = "#475569";
  ctx.fillText("Đến tham dự và cùng chia sẻ niềm vui", W / 2, 325);
  ctx.fillText("trong ngày đặc biệt này.", W / 2, 353);

  // Section D: Dotted Divider 1
  drawDottedLine(ctx, ticketX + 45, 395, ticketX + ticketW - 45, 395, "#1E3A8A", 2.2, 11);

  // Section E: Milestone Date Block (25/10/2026)
  drawAcademicCompassIcon(ctx, ticketX + 85, 470);
  drawDiplomaScrollIcon(ctx, ticketX + ticketW - 85, 470);

  ctx.font = "900 62px 'Montserrat', sans-serif";
  ctx.fillStyle = "#0F2B5C";
  ctx.fillText("25/10/2026", W / 2, 470);

  // Section F: Ceremony Time & Cap Icon
  drawTicketMortarboard(ctx, W / 2, 535);

  ctx.font = "bold 34px 'Playfair Display', Georgia, serif";
  ctx.fillStyle = "#0F2B5C";
  ctx.fillText("11:30 - 12:00", W / 2, 580);

  // Section G: Venue & Address
  ctx.font = "bold 23px 'Be Vietnam Pro', sans-serif";
  ctx.fillStyle = "#0F2B5C";
  ctx.fillText(CARD_CONFIG.venueName, W / 2, 638);

  ctx.font = "italic 500 17px 'Be Vietnam Pro', sans-serif";
  ctx.fillStyle = "#475569";
  ctx.fillText("Số 600 Nguyễn Văn Cừ, phường An Bình,", W / 2, 672);
  ctx.fillText("thành phố Cần Thơ", W / 2, 698);

  ctx.font = "600 18px 'Be Vietnam Pro', sans-serif";
  ctx.fillStyle = "#1E3A8A";
  ctx.fillText("Hotline: 0949 373 770", W / 2, 730);

  // Section H: Dotted Divider 2
  drawDottedLine(ctx, ticketX + 45, 765, ticketX + ticketW - 45, 765, "#1E3A8A", 2.2, 11);

  // Section I: Bold Ceremony Title
  ctx.font = "900 52px 'Montserrat', 'Playfair Display', sans-serif";
  ctx.fillStyle = "#0F2B5C";
  ctx.letterSpacing = "2px";
  ctx.fillText("LỄ TỐT NGHIỆP", W / 2, 835);

  // Section J: Tilted Luxury Bookmark / Tag (Directly inspired by Canva reference)
  drawTiltedBookmarkTag(ctx, W / 2, 1010);

  // Section K: Warm Invitation Note
  ctx.font = "bold 27px 'Dancing Script', cursive";
  ctx.fillStyle = "#1E3A8A";
  ctx.fillText("Rất hân hạnh được đón tiếp bạn!", W / 2, 1260);

  // Section L: Perforated Tear Line & Bottom Serrated Edge
  drawDottedLine(ctx, ticketX + 30, 1370, ticketX + ticketW - 30, 1370, "#64748B", 2, 9);
  drawPerforatedEdge(ctx, ticketX, ticketY + ticketH, ticketW);

  ctx.restore();

  if (loader) loader.classList.add('hidden');
  appState.isCardRendered = true;
}

function drawCardCanvasParticles(ctx) {
  cardCanvasParticles.forEach(p => {
    ctx.save();
    ctx.beginPath();
    ctx.fillStyle = `rgba(255, 230, 150, ${p.alpha * 0.7})`;
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });
}

/**
 * Top Metallic Dispenser Slot Capsule
 */
function drawTicketDispenserSlot(ctx, cx, cy, w, h) {
  ctx.save();
  const x = cx - w / 2;
  const y = cy - h / 2;
  const r = h / 2;

  // Outer Bezel Shadow
  ctx.shadowColor = "rgba(0, 0, 0, 0.4)";
  ctx.shadowBlur = 18;
  ctx.shadowOffsetY = 8;

  // Metallic Chrome Bezel
  const bezelGrad = ctx.createLinearGradient(x, y, x, y + h);
  bezelGrad.addColorStop(0, "#F8FAFC");
  bezelGrad.addColorStop(0.35, "#CBD5E1");
  bezelGrad.addColorStop(0.7, "#94A3B8");
  bezelGrad.addColorStop(1, "#E2E8F0");
  ctx.fillStyle = bezelGrad;
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
  ctx.fill();

  // Inner Slot Slit
  ctx.shadowColor = "transparent";
  const slotW = w - 60;
  const slotH = 16;
  const slotX = cx - slotW / 2;
  const slotY = cy - slotH / 2;
  ctx.fillStyle = "#0F172A";
  ctx.beginPath();
  ctx.roundRect(slotX, slotY, slotW, slotH, slotH / 2);
  ctx.fill();

  ctx.restore();
}

/**
 * Dotted Separator Line
 */
function drawDottedLine(ctx, x1, y1, x2, y2, color, dotRadius = 2.2, gap = 11) {
  ctx.save();
  ctx.fillStyle = color;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const count = Math.floor(dist / gap);

  for (let i = 0; i <= count; i++) {
    const t = i / count;
    const px = x1 + dx * t;
    const py = y1 + dy * t;
    ctx.beginPath();
    ctx.arc(px, py, dotRadius, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

/**
 * Academic Compass / Seal Emblem Icon
 */
function drawAcademicCompassIcon(ctx, cx, cy) {
  ctx.save();
  ctx.strokeStyle = "#1E3A8A";
  ctx.lineWidth = 1.8;

  // Outer ring
  ctx.beginPath();
  ctx.arc(cx, cy, 22, 0, Math.PI * 2);
  ctx.stroke();

  // Inner ring
  ctx.beginPath();
  ctx.arc(cx, cy, 16, 0, Math.PI * 2);
  ctx.stroke();

  // 8-point compass star
  ctx.fillStyle = "#1E3A8A";
  for (let i = 0; i < 4; i++) {
    const angle = (i * Math.PI) / 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(angle - 0.2) * 5, cy + Math.sin(angle - 0.2) * 5);
    ctx.lineTo(cx + Math.cos(angle) * 14, cy + Math.sin(angle) * 14);
    ctx.lineTo(cx + Math.cos(angle + 0.2) * 5, cy + Math.sin(angle + 0.2) * 5);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

/**
 * Rolled Diploma Scroll Icon
 */
function drawDiplomaScrollIcon(ctx, cx, cy) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(-0.25);

  ctx.strokeStyle = "#1E3A8A";
  ctx.lineWidth = 1.8;
  ctx.fillStyle = "#FFFFFF";

  // Cylinder body
  ctx.fillRect(-22, -9, 44, 18);
  ctx.strokeRect(-22, -9, 44, 18);

  // Rolled ends
  ctx.beginPath();
  ctx.ellipse(-22, 0, 4, 9, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(22, 0, 4, 9, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Red/Gold tie ribbon
  ctx.fillStyle = "#DC2626";
  ctx.fillRect(-4, -9.5, 8, 19);
  ctx.fillStyle = "#D4AF37";
  ctx.fillRect(-1.5, -9.5, 3, 19);

  ctx.restore();
}

/**
 * Mortarboard Cap Icon above time
 */
function drawTicketMortarboard(ctx, cx, cy) {
  ctx.save();
  ctx.fillStyle = "#1E3A8A";
  ctx.strokeStyle = "#1E3A8A";
  ctx.lineWidth = 1.5;

  // Cap diamond top
  ctx.beginPath();
  ctx.moveTo(cx, cy - 14);
  ctx.lineTo(cx + 28, cy - 4);
  ctx.lineTo(cx, cy + 6);
  ctx.lineTo(cx - 28, cy - 4);
  ctx.closePath();
  ctx.fill();

  // Cap skull base
  ctx.beginPath();
  ctx.moveTo(cx - 15, cy + 2);
  ctx.lineTo(cx - 15, cy + 11);
  ctx.bezierCurveTo(cx - 15, cy + 16, cx + 15, cy + 16, cx + 15, cy + 11);
  ctx.lineTo(cx + 15, cy + 2);
  ctx.closePath();
  ctx.fill();

  // Golden Tassel
  ctx.strokeStyle = "#D4AF37";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx, cy - 4);
  ctx.lineTo(cx + 22, cy + 4);
  ctx.lineTo(cx + 22, cy + 16);
  ctx.stroke();

  ctx.fillStyle = "#D4AF37";
  ctx.fillRect(cx + 20, cy + 16, 4, 4);

  ctx.restore();
}

/**
 * Tilted Luxury Bookmark / Tag (Directly inspired by Canva reference image)
 */
function drawTiltedBookmarkTag(ctx, cx, cy) {
  ctx.save();

  // 1. Lower Amber-Gold Ribbon Banner (tilted at -3 deg)
  ctx.save();
  ctx.translate(cx + 10, cy + 42);
  ctx.rotate(-0.05);

  const bannerW = 340;
  const bannerH = 46;
  const bx = -bannerW / 2;
  const by = -bannerH / 2;

  ctx.shadowColor = "rgba(0, 0, 0, 0.22)";
  ctx.shadowBlur = 12;
  ctx.shadowOffsetY = 6;

  // Gold gradient fill
  const bannerGrad = ctx.createLinearGradient(bx, by, bx + bannerW, by);
  bannerGrad.addColorStop(0, "#E5B944");
  bannerGrad.addColorStop(0.5, "#FCD34D");
  bannerGrad.addColorStop(1, "#D4AF37");
  ctx.fillStyle = bannerGrad;
  ctx.beginPath();
  ctx.roundRect(bx, by, bannerW, bannerH, 6);
  ctx.fill();

  ctx.shadowColor = "transparent";
  ctx.font = "bold 15px 'Be Vietnam Pro', sans-serif";
  ctx.fillStyle = "#0F2B5C";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("Kỹ Thuật Phần Mềm • ĐH FPT Cần Thơ", 0, 0);
  ctx.restore();

  // 2. Main Sapphire Blue Bookmark Tag (tilted at -9 deg)
  ctx.save();
  ctx.translate(cx - 15, cy - 10);
  ctx.rotate(-0.16);

  const tagW = 320;
  const tagH = 90;
  const tx = -tagW / 2;
  const ty = -tagH / 2;

  // Drop shadow
  ctx.shadowColor = "rgba(0, 0, 0, 0.35)";
  ctx.shadowBlur = 16;
  ctx.shadowOffsetY = 8;

  // Sapphire Royal Blue Gradient
  const tagGrad = ctx.createLinearGradient(tx, ty, tx + tagW, ty + tagH);
  tagGrad.addColorStop(0, "#163472");
  tagGrad.addColorStop(0.5, "#0F2B5C");
  tagGrad.addColorStop(1, "#0A1D42");
  ctx.fillStyle = tagGrad;
  ctx.beginPath();
  ctx.roundRect(tx, ty, tagW, tagH, 8);
  ctx.fill();

  // Subtle inner border
  ctx.shadowColor = "transparent";
  ctx.strokeStyle = "rgba(255, 229, 143, 0.4)";
  ctx.lineWidth = 1;
  ctx.strokeRect(tx + 4, ty + 4, tagW - 8, tagH - 8);

  // Left Hole with Golden Ring & Hanging Ribbon Thread
  const holeX = tx + 20;
  const holeY = 0;
  ctx.fillStyle = "#FFFFFF";
  ctx.beginPath();
  ctx.arc(holeX, holeY, 6, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#D4AF37";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(holeX, holeY, 7, 0, Math.PI * 2);
  ctx.stroke();

  // Golden loop thread extending to the left
  ctx.strokeStyle = "#FFE58F";
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(holeX, holeY);
  ctx.bezierCurveTo(holeX - 45, holeY - 15, holeX - 65, holeY + 25, holeX - 85, holeY + 10);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(holeX, holeY);
  ctx.bezierCurveTo(holeX - 40, holeY - 25, holeX - 70, holeY + 10, holeX - 95, holeY + 20);
  ctx.stroke();

  // Host Name inside Tag
  ctx.font = "bold 46px 'Dancing Script', cursive";
  ctx.fillStyle = "#FFE58F";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
  ctx.shadowBlur = 6;
  ctx.fillText("Trần Quốc Việt", 10, 0);

  ctx.restore();
  ctx.restore();
}

/**
 * Perforated Serrated Cuts at Bottom Edge
 */
function drawPerforatedEdge(ctx, x, y, width) {
  ctx.save();
  ctx.fillStyle = "#0A1D42"; // Matches ambient background at bottom

  const toothWidth = 20;
  const toothHeight = 12;
  const count = Math.ceil(width / toothWidth);

  for (let i = 0; i < count; i++) {
    const tx = x + i * toothWidth;
    ctx.beginPath();
    ctx.moveTo(tx, y);
    ctx.lineTo(tx + toothWidth / 2, y - toothHeight);
    ctx.lineTo(tx + toothWidth, y);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

function createGoldGradient(ctx, x1, y1, x2, y2) {
  const grad = ctx.createLinearGradient(x1, y1, x2, y2);
  grad.addColorStop(0, "#FFE79A");
  grad.addColorStop(0.35, "#D4AF37");
  grad.addColorStop(0.7, "#F39C12");
  grad.addColorStop(1, "#AA771C");
  return grad;
}

// ==========================================
// ACTIONS: DOWNLOAD & CLIPBOARD
// ==========================================
function downloadCanvasCard() {
  const canvas = document.getElementById('invitationCanvas');
  if (!canvas) return;

  try {
    const rawName = (appState.user && appState.user.name) ? appState.user.name : "Khach_Moi";
    const sanitized = rawName
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]/g, "_");

    const fileName = `Thiep_Moi_Tot_Nghiep_Tran_Quoc_Viet_${sanitized}.png`;
    const imageURL = canvas.toDataURL("image/png", 1.0);

    const link = document.createElement('a');
    link.href = imageURL;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    triggerConfetti();
    showToast(`Đã tải thiệp mời: ${fileName}`);
  } catch (error) {
    console.error("Download error:", error);
    showToast("Không thể tải ảnh. Vui lòng thử lại!");
  }
}

async function copyCanvasCardToClipboard() {
  const canvas = document.getElementById('invitationCanvas');
  if (!canvas) return;

  if (!navigator.clipboard || !window.ClipboardItem) {
    showToast("Trình duyệt không hỗ trợ sao chép trực tiếp. Hãy chọn 'Tải Thiệp Về'!");
    return;
  }

  try {
    canvas.toBlob(async (blob) => {
      if (!blob) {
        showToast("Lỗi xuất ảnh sang clipboard.");
        return;
      }
      try {
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob })
        ]);
        triggerConfetti();
        showToast("Đã sao chép ảnh thiệp mời vào bộ nhớ tạm (Clipboard)!");
      } catch (err) {
        console.warn("Clipboard write failed:", err);
        showToast("Không thể chép vào clipboard. Vui lòng bấm 'Tải Thiệp Về'!");
      }
    }, 'image/png', 1.0);
  } catch (err) {
    console.error(err);
    showToast("Lỗi khi sao chép ảnh.");
  }
}

// ==========================================
// 3D HOLOGRAPHIC FOIL TILT
// ==========================================
function setupHolographicTilt() {
  const card = document.getElementById('holoCard');
  if (!card) return;

  let currentTiltX = 0;
  let currentTiltY = 0;
  let targetTiltX = 0;
  let targetTiltY = 0;

  function handleOrientation(e) {
    if (e.beta === null || e.gamma === null) return;
    const normalizedBeta = Math.max(-25, Math.min(25, (e.beta - 45) * 0.75));
    const normalizedGamma = Math.max(-25, Math.min(25, e.gamma * 0.9));
    targetTiltX = -normalizedBeta;
    targetTiltY = normalizedGamma;
  }

  if (typeof DeviceOrientationEvent !== 'undefined') {
    if (typeof DeviceOrientationEvent.requestPermission === 'function') {
      window.addEventListener('click', () => {
        DeviceOrientationEvent.requestPermission()
          .then(state => {
            if (state === 'granted') {
              window.addEventListener('deviceorientation', handleOrientation, true);
            }
          }).catch(console.warn);
      }, { once: true });
    } else {
      window.addEventListener('deviceorientation', handleOrientation, true);
    }
  }

  card.addEventListener('mousemove', (e) => {
    const rect = card.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    targetTiltX = -y * 20;
    targetTiltY = x * 20;
  });

  card.addEventListener('mouseleave', () => {
    targetTiltX = 0;
    targetTiltY = 0;
  });

  function renderTilt() {
    currentTiltX += (targetTiltX - currentTiltX) * 0.12;
    currentTiltY += (targetTiltY - currentTiltY) * 0.12;

    card.style.transform = `perspective(1000px) rotateX(${currentTiltX.toFixed(2)}deg) rotateY(${currentTiltY.toFixed(2)}deg)`;

    const glareX = 50 + currentTiltY * 2.2;
    const glareY = 50 - currentTiltX * 2.2;
    card.style.setProperty('--glare-x', `${glareX.toFixed(1)}%`);
    card.style.setProperty('--glare-y', `${glareY.toFixed(1)}%`);

    const sheenPos = `${(50 + currentTiltY * 2.5).toFixed(1)}% ${(50 - currentTiltX * 2.5).toFixed(1)}%`;
    const sheenAngle = `${(125 + currentTiltY * 1.6).toFixed(1)}deg`;
    card.style.setProperty('--sheen-pos', sheenPos);
    card.style.setProperty('--sheen-angle', sheenAngle);

    const tiltMag = Math.sqrt(currentTiltX * currentTiltX + currentTiltY * currentTiltY);
    const intensity = Math.min(1, tiltMag / 15);
    card.style.setProperty('--glare-opacity', `${(0.10 + intensity * 0.22).toFixed(2)}`);
    card.style.setProperty('--sheen-opacity', `${(0.12 + intensity * 0.20).toFixed(2)}`);

    requestAnimationFrame(renderTilt);
  }

  requestAnimationFrame(renderTilt);
}

// ==========================================
// TOAST & CONFETTI
// ==========================================
function triggerConfetti() {
  if (typeof confetti === 'function') {
    confetti({
      particleCount: 65,
      spread: 75,
      origin: { y: 0.6 },
      colors: ['#D4AF37', '#FFE58F', '#F39C12', '#FFFFFF', '#38bdf8']
    });
  }
}

let toastTimer = null;
function showToast(message) {
  const toast = document.getElementById('toast');
  if (!toast) return;

  toast.innerHTML = `<i class="fa-solid fa-circle-info gold-text"></i> <span>${message}</span>`;
  toast.classList.add('show');

  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove('show');
  }, 4200);
}

// ==========================================
// UI EVENT LISTENERS
// ==========================================
function setupUIEventListeners() {
  const switchAccountBtnTop = document.getElementById('switchAccountBtnTop');
  if (switchAccountBtnTop) switchAccountBtnTop.addEventListener('click', handleSignOut);

  const startGameBtn = document.getElementById('startGameBtn');
  if (startGameBtn) startGameBtn.addEventListener('click', startGame);

  const restartGameBtn = document.getElementById('restartGameBtn');
  if (restartGameBtn) restartGameBtn.addEventListener('click', startGame);

  // Reveal invitation section below console
  const skipToCardBtn = document.getElementById('skipToCardBtn');
  if (skipToCardBtn) skipToCardBtn.addEventListener('click', () => showInvitationSection(true));

  const skipAfterLoseBtn = document.getElementById('skipAfterLoseBtn');
  if (skipAfterLoseBtn) skipAfterLoseBtn.addEventListener('click', () => showInvitationSection(true));

  const scrollToCardBtn = document.getElementById('scrollToCardBtn');
  if (scrollToCardBtn) scrollToCardBtn.addEventListener('click', () => showInvitationSection(true));

  // MANDATORY BUTTONS (Mục 1.4)
  const btnViewCeremonyDetails = document.getElementById('btnViewCeremonyDetails');
  if (btnViewCeremonyDetails) {
    btnViewCeremonyDetails.addEventListener('click', handleViewCeremonyDetails);
  }

  const btnReplayGame = document.getElementById('btnReplayGame');
  if (btnReplayGame) {
    btnReplayGame.addEventListener('click', handleReplayGame);
  }

  const downloadBtn = document.getElementById('downloadBtn');
  if (downloadBtn) downloadBtn.addEventListener('click', downloadCanvasCard);

  const copyImageBtn = document.getElementById('copyImageBtn');
  if (copyImageBtn) copyImageBtn.addEventListener('click', copyCanvasCardToClipboard);
}
