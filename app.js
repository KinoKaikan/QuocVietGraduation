/**
 * GRADUATION INVITATION CARD GENERATOR - TRẦN QUỐC VIỆT
 * Pure Vanilla JavaScript implementation with Google Identity Services API (GSI),
 * Client-Side JWT Token Parsing, and High-Resolution HTML5 Canvas Graphics.
 * Typography: 100% Vietnamese Diacritics Support (Playfair Display, Dancing Script, Be Vietnam Pro).
 */

// ==========================================
// CONFIGURATION & CONSTANTS
// ==========================================
const GOOGLE_CLIENT_ID = "892188408749-31vqfrqmlk18u1at62evte7vj62udbq3.apps.googleusercontent.com";

const CARD_CONFIG = {
  width: 1000,
  height: 1500,
  avatarSrc: "assets/portrait.jpg",
  hostName: "TRẦN QUỐC VIỆT",
  hostTitle: "Kỹ Sư Kỹ Thuật Phần Mềm • ĐH FPT Cần Thơ",
  dateHeader: "THÁNG 10",
  dayOfWeek: "CHỦ NHẬT",
  dayOfMonth: "25",
  time: "10:00 - 11:00",
  year: "2026",
  venueName: "Hội Trường Lớn - Trường Đại Học FPT Cần Thơ",
  venueAddressLine1: "Số 600, đường Nguyễn Văn Cừ nối dài, phường An Bình,",
  venueAddressLine2: "quận Ninh Kiều, TP Cần Thơ",
  phone: "0949373770"
};

// Global App State
const state = {
  currentGuestName: "Nguyễn Văn A",
  googleUser: null, // { name, email, picture, sub }
  avatarImageLoaded: false,
  avatarImage: null,
  isRendering: false
};

// Pre-generated starry particles on canvas for consistent shimmer
const canvasParticles = Array.from({ length: 45 }, () => ({
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
  setupPreloadAvatar();
  setupUIEventListeners();
  checkPersistedSession();
  setupGoogleIdentityServices();

  // Ensure Vietnamese-supported Google Fonts are fully ready before drawing
  if (document.fonts) {
    document.fonts.ready.then(() => {
      renderInvitationCard();
    }).catch(() => {
      renderInvitationCard();
    });
  } else {
    setTimeout(renderInvitationCard, 500);
  }
});

// ==========================================
// ASSET PRELOADING
// ==========================================
function setupPreloadAvatar() {
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.onload = () => {
    state.avatarImageLoaded = true;
    state.avatarImage = img;
    renderInvitationCard();
  };
  img.onerror = () => {
    console.warn("Avatar image failed to load, fallback avatar circle will be used.");
    state.avatarImageLoaded = false;
    renderInvitationCard();
  };
  img.src = CARD_CONFIG.avatarSrc;
}

// ==========================================
// GOOGLE IDENTITY SERVICES (GSI)
// ==========================================
function setupGoogleIdentityServices() {
  const checkGsiInterval = setInterval(() => {
    if (window.google && window.google.accounts && window.google.accounts.id) {
      clearInterval(checkGsiInterval);
      initializeGsiClient();
    }
  }, 200);

  setTimeout(() => clearInterval(checkGsiInterval), 4000);
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
        width: 290
      });
    }
  } catch (err) {
    console.warn("Google Identity Services notice:", err);
  }
}

/**
 * Handle Google JWT Credential Response
 * Decodes client-side JWT token to extract official full display name (user.name)
 */
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

  // Save authenticated user info
  state.googleUser = {
    name: payload.name,
    email: payload.email || "",
    picture: payload.picture || CARD_CONFIG.avatarSrc,
    sub: payload.sub
  };
  state.currentGuestName = payload.name;

  try {
    sessionStorage.setItem('grad_google_user', JSON.stringify(state.googleUser));
  } catch (e) {
    console.error(e);
  }

  updateUIForAuthenticatedUser();
  renderInvitationCard();
  triggerCelebrationConfetti();
  showToast(`Xin chào ${payload.name}! Đã cá nhân hóa thiệp mời của bạn.`);
}

/**
 * Client-side JWT Decoder
 * Safely decodes UTF-8 Vietnamese diacritics in JWT payload without backend
 */
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

/**
 * Check if user previously logged in in current session
 */
function checkPersistedSession() {
  try {
    const saved = sessionStorage.getItem('grad_google_user');
    if (saved) {
      const user = JSON.parse(saved);
      if (user && user.name) {
        state.googleUser = user;
        state.currentGuestName = user.name;
        updateUIForAuthenticatedUser();
      }
    }
  } catch (e) {
    console.error(e);
  }
}

/**
 * Update UI when user is authenticated with Google
 */
function updateUIForAuthenticatedUser() {
  const authSection = document.getElementById('authSection');
  const userBanner = document.getElementById('userProfileBanner');
  const displayNameText = document.getElementById('displayNameText');
  const userEmailText = document.getElementById('userEmailText');
  const userAvatarImg = document.getElementById('userAvatarImg');

  if (state.googleUser) {
    if (displayNameText) displayNameText.textContent = state.googleUser.name;
    if (userEmailText) {
      userEmailText.textContent = state.googleUser.email 
        ? `Tài khoản: ${state.googleUser.email} • Thiệp mời đã sẵn sàng bên dưới:`
        : "Thiệp mời tốt nghiệp chính thức của bạn đã được tạo độc quyền bên dưới:";
    }
    if (userAvatarImg && state.googleUser.picture) {
      userAvatarImg.src = state.googleUser.picture;
    }

    if (userBanner) userBanner.style.display = 'flex';
    if (authSection) authSection.style.display = 'none';
  } else {
    if (userBanner) userBanner.style.display = 'none';
    if (authSection) authSection.style.display = 'block';
  }
}

/**
 * Switch account / Log out
 */
function handleSignOut() {
  try {
    if (window.google && window.google.accounts && window.google.accounts.id) {
      window.google.accounts.id.disableAutoSelect();
    }
    sessionStorage.removeItem('grad_google_user');
  } catch (e) {
    console.error(e);
  }

  state.googleUser = null;
  state.currentGuestName = "Nguyễn Văn A";
  const customInput = document.getElementById('customGuestInput');
  if (customInput) customInput.value = "Nguyễn Văn A";

  updateUIForAuthenticatedUser();
  renderInvitationCard();
  showToast("Đã đăng xuất tài khoản Google. Bạn có thể chọn tài khoản khác.");
}

// ==========================================
// UI EVENT LISTENERS
// ==========================================
function setupUIEventListeners() {
  // Download PNG Button
  const downloadBtn = document.getElementById('downloadBtn');
  if (downloadBtn) {
    downloadBtn.addEventListener('click', downloadCanvasCard);
  }

  // Copy Image Button
  const copyImageBtn = document.getElementById('copyImageBtn');
  if (copyImageBtn) {
    copyImageBtn.addEventListener('click', copyCanvasCardToClipboard);
  }

  // Switch Account Buttons
  const switchAccountBtn = document.getElementById('switchAccountBtn');
  if (switchAccountBtn) {
    switchAccountBtn.addEventListener('click', handleSignOut);
  }

  const switchAccountBtnTop = document.getElementById('switchAccountBtnTop');
  if (switchAccountBtnTop) {
    switchAccountBtnTop.addEventListener('click', handleSignOut);
  }

  // Custom Guest Name Form
  const applyCustomNameBtn = document.getElementById('applyCustomNameBtn');
  const customGuestInput = document.getElementById('customGuestInput');

  if (applyCustomNameBtn && customGuestInput) {
    const handleApplyName = () => {
      const trimmed = customGuestInput.value.trim();
      if (!trimmed) {
        showToast("Vui lòng nhập tên khách mời.");
        return;
      }
      state.currentGuestName = trimmed;
      renderInvitationCard();
      triggerCelebrationConfetti();
      showToast(`Đã cập nhật thiệp mời cho: ${trimmed}`);
    };

    applyCustomNameBtn.addEventListener('click', handleApplyName);
    customGuestInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') handleApplyName();
    });
  }

  // Quick Preset Tags
  const presetButtons = document.querySelectorAll('.tag-btn');
  presetButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const name = btn.getAttribute('data-name');
      if (name) {
        state.currentGuestName = name;
        if (customGuestInput) customGuestInput.value = name;
        renderInvitationCard();
        triggerCelebrationConfetti();
        showToast(`Đã áp dụng tên mẫu: ${name}`);
      }
    });
  });
}

// ==========================================
// HIGH-RESOLUTION CANVAS RENDERING
// ==========================================
function renderInvitationCard() {
  const canvas = document.getElementById('invitationCanvas');
  const loader = document.getElementById('canvasLoader');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const W = CARD_CONFIG.width;
  const H = CARD_CONFIG.height;

  // 1. Draw Background Navy Gradient
  const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
  bgGrad.addColorStop(0, "#08142D");
  bgGrad.addColorStop(0.3, "#0B1B3D");
  bgGrad.addColorStop(0.7, "#11244C");
  bgGrad.addColorStop(1, "#071228");
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  // Subtle radial glow near center
  const radialGlow = ctx.createRadialGradient(W / 2, 650, 60, W / 2, 650, 480);
  radialGlow.addColorStop(0, "rgba(212, 175, 55, 0.14)");
  radialGlow.addColorStop(0.6, "rgba(22, 42, 82, 0.2)");
  radialGlow.addColorStop(1, "rgba(0, 0, 0, 0)");
  ctx.fillStyle = radialGlow;
  ctx.fillRect(0, 0, W, H);

  // 2. Draw Golden Sparkles / Particles
  drawCanvasParticles(ctx);

  // 3. Draw Decorative Gold Borders & Flourishes
  drawOrnamentalBorders(ctx, W, H);

  // 4. Draw Header: "THÂN MỜI" (Playfair Display)
  drawTopSection(ctx, W);

  // 5. Draw Recipient Name (Dancing Script - 100% Vietnamese support)
  drawRecipientName(ctx, W, state.currentGuestName);

  // 6. Draw Host Line: "Đến dự lễ tốt nghiệp của TRẦN QUỐC VIỆT"
  drawHostDetails(ctx, W);

  // 7. Draw Circular Framed Host Avatar
  drawCenterAvatarCircle(ctx, W / 2, 650, 150);

  // 8. Draw Date & Time Block
  drawDateTimeBlock(ctx, W);

  // 9. Draw Venue & Contact (Just the clean number 0949373770, no 'hotline')
  drawVenueAndContact(ctx, W);

  // 10. Draw Bottom Ornamental Flourish (Clean accent, no text quote)
  drawBottomAccent(ctx, W, H);

  // Hide loader
  if (loader) {
    loader.classList.add('hidden');
  }
}

/**
 * Draws starry bokeh particles on canvas
 */
function drawCanvasParticles(ctx) {
  canvasParticles.forEach(p => {
    ctx.save();
    ctx.beginPath();
    ctx.fillStyle = `rgba(255, 230, 150, ${p.alpha})`;
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fill();

    if (p.isStar) {
      ctx.strokeStyle = `rgba(255, 235, 170, ${p.alpha * 0.75})`;
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(p.x - p.radius * 3.5, p.y);
      ctx.lineTo(p.x + p.radius * 3.5, p.y);
      ctx.moveTo(p.x, p.y - p.radius * 3.5);
      ctx.lineTo(p.x, p.y + p.radius * 3.5);
      ctx.stroke();
    }
    ctx.restore();
  });
}

/**
 * Luxury double gold border with ornate corners
 */
function drawOrnamentalBorders(ctx, W, H) {
  const outerPad = 45;
  const innerPad = 58;

  const goldGrad = createGoldGradient(ctx, outerPad, outerPad, W - outerPad, H - outerPad);
  ctx.strokeStyle = goldGrad;
  ctx.lineWidth = 2.5;
  ctx.strokeRect(outerPad, outerPad, W - outerPad * 2, H - outerPad * 2);

  ctx.strokeStyle = "rgba(212, 175, 55, 0.65)";
  ctx.lineWidth = 1.2;
  ctx.strokeRect(innerPad, innerPad, W - innerPad * 2, H - innerPad * 2);

  const cornerSize = 42;
  drawCornerFlourish(ctx, innerPad, innerPad, 1, 1, cornerSize);
  drawCornerFlourish(ctx, W - innerPad, innerPad, -1, 1, cornerSize);
  drawCornerFlourish(ctx, innerPad, H - innerPad, 1, -1, cornerSize);
  drawCornerFlourish(ctx, W - innerPad, H - innerPad, -1, -1, cornerSize);

  drawDiamond(ctx, W / 2, innerPad, 5, "#D4AF37");
  drawDiamond(ctx, W / 2, H - innerPad, 5, "#D4AF37");
}

function drawCornerFlourish(ctx, x, y, dirX, dirY, size) {
  ctx.save();
  ctx.strokeStyle = "#FFE58F";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x + dirX * size, y);
  ctx.lineTo(x + dirX * 12, y);
  ctx.lineTo(x + dirX * 12, y + dirY * 12);
  ctx.lineTo(x, y + dirY * 12);
  ctx.lineTo(x, y + dirY * size);
  ctx.stroke();

  drawDiamond(ctx, x + dirX * 18, y + dirY * 18, 4, "#D4AF37");
  ctx.restore();
}

function drawDiamond(ctx, cx, cy, size, color) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(cx, cy - size);
  ctx.lineTo(cx + size, cy);
  ctx.lineTo(cx, cy + size);
  ctx.lineTo(cx - size, cy);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/**
 * 4. Top Text: "THÂN MỜI" (Using Playfair Display - 100% Vietnamese support)
 */
function drawTopSection(ctx, W) {
  const topY = 135;

  drawGraduationCapIcon(ctx, W / 2, topY - 25);

  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "bold 34px 'Playfair Display', Georgia, serif";
  
  const goldGrad = createGoldGradient(ctx, W / 2 - 120, topY, W / 2 + 120, topY);
  ctx.fillStyle = goldGrad;
  ctx.shadowColor = "rgba(212, 175, 55, 0.4)";
  ctx.shadowBlur = 10;
  ctx.fillText("THÂN MỜI", W / 2, topY + 18);
  ctx.restore();
}

function drawGraduationCapIcon(ctx, cx, cy) {
  ctx.save();
  ctx.fillStyle = "#D4AF37";
  ctx.strokeStyle = "#FFE58F";
  ctx.lineWidth = 1.2;

  ctx.beginPath();
  ctx.moveTo(cx, cy - 14);
  ctx.lineTo(cx + 28, cy - 3);
  ctx.lineTo(cx, cy + 8);
  ctx.lineTo(cx - 28, cy - 3);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(cx - 15, cy + 3);
  ctx.lineTo(cx - 15, cy + 12);
  ctx.bezierCurveTo(cx - 15, cy + 18, cx + 15, cy + 18, cx + 15, cy + 12);
  ctx.lineTo(cx + 15, cy + 3);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.beginPath();
  ctx.strokeStyle = "#FFE79A";
  ctx.lineWidth = 1.5;
  ctx.moveTo(cx, cy - 3);
  ctx.lineTo(cx + 22, cy + 6);
  ctx.lineTo(cx + 22, cy + 16);
  ctx.stroke();

  ctx.restore();
}

/**
 * 5. Recipient Name: User's Official Google Display Name
 * Uses Dancing Script with complete Vietnamese diacritic glyph support!
 */
function drawRecipientName(ctx, W, name) {
  const nameY = 240;

  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  let fontSize = 70;
  if (name.length > 25) fontSize = 52;
  else if (name.length > 18) fontSize = 60;

  // Dancing Script font - flawless Vietnamese rendering
  ctx.font = `bold ${fontSize}px 'Dancing Script', cursive`;

  const nameGrad = ctx.createLinearGradient(W / 2 - 250, nameY - 30, W / 2 + 250, nameY + 30);
  nameGrad.addColorStop(0, "#FFF3B3");
  nameGrad.addColorStop(0.5, "#E5B944");
  nameGrad.addColorStop(1, "#F39C12");

  ctx.fillStyle = nameGrad;
  ctx.shadowColor = "rgba(212, 175, 55, 0.55)";
  ctx.shadowBlur = 16;
  ctx.fillText(name, W / 2, nameY);

  ctx.restore();
  drawCalligraphyUnderline(ctx, W / 2, nameY + (fontSize * 0.44));
}

function drawCalligraphyUnderline(ctx, cx, cy) {
  ctx.save();
  const lineHalfWidth = 140;
  const grad = ctx.createLinearGradient(cx - lineHalfWidth, cy, cx + lineHalfWidth, cy);
  grad.addColorStop(0, "rgba(212, 175, 55, 0)");
  grad.addColorStop(0.5, "rgba(255, 229, 143, 0.9)");
  grad.addColorStop(1, "rgba(212, 175, 55, 0)");

  ctx.strokeStyle = grad;
  ctx.lineWidth = 1.5;

  ctx.beginPath();
  ctx.moveTo(cx - lineHalfWidth, cy);
  ctx.bezierCurveTo(cx - 50, cy + 4, cx - 20, cy - 3, cx, cy);
  ctx.bezierCurveTo(cx + 20, cy - 3, cx + 50, cy + 4, cx + lineHalfWidth, cy);
  ctx.stroke();

  drawDiamond(ctx, cx, cy, 3.5, "#FFE58F");
  ctx.restore();
}

/**
 * 6. Host Line: "Đến dự lễ tốt nghiệp của TRẦN QUỐC VIỆT"
 */
function drawHostDetails(ctx, W) {
  const lineY = 330;

  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  // "ĐẾN DỰ LỄ TỐT NGHIỆP CỦA"
  ctx.font = "600 19px 'Be Vietnam Pro', 'Montserrat', sans-serif";
  ctx.fillStyle = "#E2E8F0";
  ctx.fillText("ĐẾN DỰ LỄ TỐT NGHIỆP CỦA", W / 2, lineY);

  // "TRẦN QUỐC VIỆT" (Playfair Display - flawless Vietnamese accents)
  const hostNameY = lineY + 46;
  ctx.font = "bold 40px 'Playfair Display', Georgia, serif";
  const nameGrad = createGoldGradient(ctx, W / 2 - 190, hostNameY, W / 2 + 190, hostNameY);
  ctx.fillStyle = nameGrad;
  ctx.shadowColor = "rgba(212, 175, 55, 0.6)";
  ctx.shadowBlur = 18;
  ctx.fillText(CARD_CONFIG.hostName, W / 2, hostNameY);

  // Subtitle
  const subY = hostNameY + 36;
  ctx.font = "500 16px 'Be Vietnam Pro', 'Montserrat', sans-serif";
  ctx.fillStyle = "#D4AF37";
  ctx.shadowBlur = 0;
  ctx.fillText(CARD_CONFIG.hostTitle, W / 2, subY);

  ctx.restore();
}

/**
 * 7. Center Circle: Host's avatar picture framed in circular gold border
 */
function drawCenterAvatarCircle(ctx, cx, cy, radius) {
  ctx.save();

  // Outer radiant aura
  const aura = ctx.createRadialGradient(cx, cy, radius - 10, cx, cy, radius + 25);
  aura.addColorStop(0, "rgba(212, 175, 55, 0.45)");
  aura.addColorStop(1, "rgba(212, 175, 55, 0)");
  ctx.fillStyle = aura;
  ctx.beginPath();
  ctx.arc(cx, cy, radius + 25, 0, Math.PI * 2);
  ctx.fill();

  // Clip area for avatar photo
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.clip();

  if (state.avatarImageLoaded && state.avatarImage) {
    const img = state.avatarImage;
    const aspect = img.width / img.height;
    let drawW, drawH, drawX, drawY;

    if (aspect > 1) {
      drawH = radius * 2;
      drawW = drawH * aspect;
      drawX = cx - drawW / 2;
      drawY = cy - radius;
    } else {
      // For vertical/square portrait: zoom in slightly and anchor around upper 33% (where the face is)
      const zoom = 1.35;
      drawW = radius * 2 * zoom;
      drawH = drawW / aspect;
      drawX = cx - drawW / 2;
      drawY = cy - drawH * 0.33;
    }

    ctx.drawImage(img, drawX, drawY, drawW, drawH);
  } else {
    const fallbackGrad = ctx.createLinearGradient(cx, cy - radius, cx, cy + radius);
    fallbackGrad.addColorStop(0, "#162A52");
    fallbackGrad.addColorStop(1, "#0B1B3D");
    ctx.fillStyle = fallbackGrad;
    ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);

    ctx.fillStyle = "#D4AF37";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "bold 60px 'Playfair Display', serif";
    ctx.fillText("TQV", cx, cy);
  }
  ctx.restore();

  // Outer Ornate Double Gold Ring
  const ringGrad = createGoldGradient(ctx, cx - radius, cy - radius, cx + radius, cy + radius);
  
  ctx.lineWidth = 4;
  ctx.strokeStyle = ringGrad;
  ctx.shadowColor = "rgba(212, 175, 55, 0.5)";
  ctx.shadowBlur = 14;
  ctx.beginPath();
  ctx.arc(cx, cy, radius + 2, 0, Math.PI * 2);
  ctx.stroke();

  ctx.lineWidth = 1.2;
  ctx.strokeStyle = "rgba(255, 235, 160, 0.75)";
  ctx.shadowBlur = 0;
  ctx.beginPath();
  ctx.arc(cx, cy, radius - 7, 0, Math.PI * 2);
  ctx.stroke();

  const beadAngles = [0, Math.PI / 4, Math.PI / 2, 3 * Math.PI / 4, Math.PI, 5 * Math.PI / 4, 3 * Math.PI / 2, 7 * Math.PI / 4];
  beadAngles.forEach(ang => {
    const bx = cx + Math.cos(ang) * (radius + 2);
    const by = cy + Math.sin(ang) * (radius + 2);
    drawDiamond(ctx, bx, by, 3, "#FFE58F");
  });

  ctx.restore();
}

/**
 * 8. Date & Time Block:
 * Header: THÁNG 10
 * Layout: CHỦ NHẬT | 25 | 10:00 - 11:00
 * Year: 2026
 */
function drawDateTimeBlock(ctx, W) {
  const blockY = 850;

  drawGoldDividerLine(ctx, W / 2, blockY, 340);

  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  // Header: THÁNG 10 (Playfair Display)
  const headerY = blockY + 38;
  ctx.font = "bold 23px 'Playfair Display', Georgia, serif";
  ctx.fillStyle = "#FFE58F";
  ctx.shadowColor = "rgba(212, 175, 55, 0.4)";
  ctx.shadowBlur = 8;
  ctx.fillText(CARD_CONFIG.dateHeader, W / 2, headerY);

  const rowCenterY = headerY + 68;

  // Left: "CHỦ NHẬT" (Playfair Display - flawless diacritics for "Ủ")
  ctx.font = "bold 22px 'Playfair Display', Georgia, serif";
  ctx.fillStyle = "#FFFFFF";
  ctx.shadowBlur = 0;
  ctx.fillText(CARD_CONFIG.dayOfWeek, W / 2 - 180, rowCenterY);

  // Left Vertical Separator
  drawVerticalSeparator(ctx, W / 2 - 80, rowCenterY - 38, rowCenterY + 38);

  // Center: "25"
  ctx.font = "bold 78px 'Playfair Display', Georgia, serif";
  const numGrad = createGoldGradient(ctx, W / 2 - 50, rowCenterY - 40, W / 2 + 50, rowCenterY + 40);
  ctx.fillStyle = numGrad;
  ctx.shadowColor = "rgba(212, 175, 55, 0.7)";
  ctx.shadowBlur = 20;
  ctx.fillText(CARD_CONFIG.dayOfMonth, W / 2, rowCenterY + 4);

  // Right Vertical Separator
  drawVerticalSeparator(ctx, W / 2 + 80, rowCenterY - 38, rowCenterY + 38);

  // Right: "10:00 - 11:00"
  ctx.font = "bold 21px 'Playfair Display', Georgia, serif";
  ctx.fillStyle = "#FFFFFF";
  ctx.shadowBlur = 0;
  ctx.fillText(CARD_CONFIG.time, W / 2 + 185, rowCenterY);

  // Year: "2026"
  const yearY = rowCenterY + 58;
  ctx.font = "bold 20px 'Playfair Display', Georgia, serif";
  ctx.fillStyle = "#D4AF37";
  ctx.fillText(`— NĂM ${CARD_CONFIG.year} —`, W / 2, yearY);

  ctx.restore();

  drawGoldDividerLine(ctx, W / 2, yearY + 32, 340);
}

function drawVerticalSeparator(ctx, x, y1, y2) {
  ctx.save();
  const grad = ctx.createLinearGradient(x, y1, x, y2);
  grad.addColorStop(0, "rgba(212, 175, 55, 0.1)");
  grad.addColorStop(0.5, "rgba(255, 229, 143, 0.85)");
  grad.addColorStop(1, "rgba(212, 175, 55, 0.1)");

  ctx.strokeStyle = grad;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(x, y1);
  ctx.lineTo(x, y2);
  ctx.stroke();
  ctx.restore();
}

function drawGoldDividerLine(ctx, cx, cy, width) {
  ctx.save();
  const half = width / 2;
  const grad = ctx.createLinearGradient(cx - half, cy, cx + half, cy);
  grad.addColorStop(0, "rgba(212, 175, 55, 0)");
  grad.addColorStop(0.5, "rgba(255, 229, 143, 0.85)");
  grad.addColorStop(1, "rgba(212, 175, 55, 0)");

  ctx.strokeStyle = grad;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(cx - half, cy);
  ctx.lineTo(cx + half, cy);
  ctx.stroke();

  drawDiamond(ctx, cx, cy, 4, "#FFE58F");
  ctx.restore();
}

/**
 * 9. Venue Details & Phone
 * Displays address cleanly and phone as JUST the number "0949373770" (no 'hotline')
 */
function drawVenueAndContact(ctx, W) {
  const venueStartY = 1125;

  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  // Section Header: ĐỊA ĐIỂM TỔ CHỨC
  ctx.font = "bold 15px 'Playfair Display', Georgia, serif";
  ctx.fillStyle = "#D4AF37";
  ctx.fillText("ĐỊA ĐIỂM TỔ CHỨC", W / 2, venueStartY);

  // Venue Name
  const nameY = venueStartY + 38;
  ctx.font = "bold 23px 'Be Vietnam Pro', 'Montserrat', sans-serif";
  ctx.fillStyle = "#FFFFFF";
  ctx.shadowColor = "rgba(0, 0, 0, 0.6)";
  ctx.shadowBlur = 6;
  ctx.fillText(CARD_CONFIG.venueName, W / 2, nameY);

  // Address Line 1
  const addr1Y = nameY + 36;
  ctx.font = "500 17px 'Be Vietnam Pro', 'Montserrat', sans-serif";
  ctx.fillStyle = "#CBD5E1";
  ctx.fillText(CARD_CONFIG.venueAddressLine1, W / 2, addr1Y);

  // Address Line 2
  const addr2Y = addr1Y + 28;
  ctx.fillText(CARD_CONFIG.venueAddressLine2, W / 2, addr2Y);

  // Phone number ONLY: 0949373770 (Clean, modern, not cheesy)
  const phoneY = addr2Y + 44;
  ctx.font = "600 22px 'Be Vietnam Pro', 'Montserrat', sans-serif";
  ctx.fillStyle = "#FFE58F";
  ctx.shadowColor = "rgba(212, 175, 55, 0.35)";
  ctx.shadowBlur = 8;
  ctx.fillText(CARD_CONFIG.phone, W / 2, phoneY);

  ctx.restore();
}

/**
 * 10. Bottom Warm Friendly Line & Filigree Accent
 */
function drawBottomAccent(ctx, W, H) {
  const quoteY = 1382;

  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  // "Hãy đến và cùng chụp vài tấm hình nhé" - Dancing Script nét chữ tự nhiên, dấu tiếng Việt chuẩn 100%
  ctx.font = "bold 27px 'Dancing Script', cursive";
  ctx.fillStyle = "#FFE58F";
  ctx.shadowColor = "rgba(212, 175, 55, 0.45)";
  ctx.shadowBlur = 10;
  ctx.fillText("Hãy đến và cùng chụp vài tấm hình nhé", W / 2, quoteY);

  // Delicate bottom gold diamonds
  const starY = quoteY + 34;
  drawDiamond(ctx, W / 2 - 24, starY, 2.5, "rgba(212, 175, 55, 0.6)");
  drawDiamond(ctx, W / 2, starY, 4, "#FFE58F");
  drawDiamond(ctx, W / 2 + 24, starY, 2.5, "rgba(212, 175, 55, 0.6)");

  ctx.restore();
}

/**
 * Helper: Metallic Gold Gradient Generator
 */
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
    const sanitizedName = (state.currentGuestName || "Khach_Moi")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]/g, "_");

    const fileName = `Thiep_Moi_Tot_Nghiep_Tran_Quoc_Viet_${sanitizedName}.png`;
    const imageURL = canvas.toDataURL("image/png", 1.0);

    const link = document.createElement('a');
    link.href = imageURL;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    triggerCelebrationConfetti();
    showToast(`Đã tải thiệp mời độ nét cao: ${fileName}`);
  } catch (error) {
    console.error("Download error:", error);
    showToast("Không thể tải ảnh. Vui lòng thử lại!");
  }
}

async function copyCanvasCardToClipboard() {
  const canvas = document.getElementById('invitationCanvas');
  if (!canvas) return;

  if (!navigator.clipboard || !window.ClipboardItem) {
    showToast("Trình duyệt không hỗ trợ sao chép ảnh trực tiếp. Hãy chọn 'Tải Thiệp Về'!");
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
        triggerCelebrationConfetti();
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
// CELEBRATION EFFECTS & TOAST
// ==========================================
function triggerCelebrationConfetti() {
  if (typeof confetti === 'function') {
    confetti({
      particleCount: 50,
      spread: 70,
      origin: { y: 0.65 },
      colors: ['#D4AF37', '#FFE58F', '#F39C12', '#FFFFFF', '#162A52']
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
