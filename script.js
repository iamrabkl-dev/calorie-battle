// --- CONFIGURATION ---
// ⚠️ นำ Web App URL ที่ได้จากข้อ 1 มาใส่ตรงนี้
const GAS_API_URL = "วาง_WEB_APP_URL_ของคุณที่นี่"; 

// Global Variables
let CACHED_USER = localStorage.getItem('cb_user_name');
let CACHED_TEAM = localStorage.getItem('cb_user_team');
let RANK_THRESHOLDS_CLIENT = []; 
let WELCOME_MESSAGE = "Calorie Battle is Ready!";
let UPLOADED_IMAGE_BASE64 = null; // Store base64 here temporary

// --- Helper for API Calls ---
async function fetchAPI(action, params = {}, method = 'GET') {
    let url = `${GAS_API_URL}?action=${action}`;
    let options = { 
        method: method,
        redirect: "follow" // สำคัญมาก
    };

    if (method === 'GET') {
        // params for GET are already in URL or handled simply
        const queryParams = new URLSearchParams(params).toString();
        if(queryParams) url += `&${queryParams}`;
    } else if (method === 'POST') {
        // Send data as text string inside body (easier for GAS doPost)
        options.body = JSON.stringify({ action: action, payload: params });
        // Use default content type to avoid CORS preflight issues with simple text/plain
        options.headers = { "Content-Type": "text/plain;charset=utf-8" };
    }

    try {
        const response = await fetch(url, options);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return await response.json();
    } catch (e) {
        console.error("API Error:", e);
        Swal.fire('Connection Error', 'ไม่สามารถติดต่อ Server ได้', 'error');
        throw e;
    }
}

// --- MAIN LOGIC ---

document.addEventListener('DOMContentLoaded', () => {
    createSnow(); 
    updateHeaderBadge();
    
    // Initial Load: Config
    fetchAPI('getConfig').then(data => {
        WELCOME_MESSAGE = data.welcomeMessage;
        showWelcomeAndStartLoad();
    });
});

function formatNumber(num) {
    num = Number(num);
    const absNum = Math.abs(num);
    if (absNum >= 1000000) return (num / 1000000).toFixed(2) + 'M'; 
    if (absNum >= 1000) return (num / 1000).toFixed(2) + 'k'; 
    return num.toFixed(2); 
}

function createSnow() {
    const snowContainer = document.getElementById('snow-container');
    if(!snowContainer) return;
    const numSnowflakes = 30; 
    
    for (let i = 0; i < numSnowflakes; i++) {
        const flake = document.createElement('div');
        flake.classList.add('snowflake');
        const size = Math.random() * 8 + 4; 
        const duration = Math.random() * 15 + 5; 
        const delay = Math.random() * 10; 

        flake.style.width = `${size}px`;
        flake.style.height = `${size}px`;
        flake.style.left = `${Math.random() * 100}vw`;
        flake.style.animationDuration = `${duration}s`;
        flake.style.animationDelay = `${delay}s`;
        flake.style.animationName = 'fall'; 
        snowContainer.appendChild(flake);
    }
}

function showWelcomeAndStartLoad() {
    simulateInitialLoad();
    if (WELCOME_MESSAGE) {
        Swal.fire({
            title: WELCOME_MESSAGE,
            text: "ขอให้สนุกกับ Calorie Battle!",
            icon: 'info',
            showConfirmButton: false,
            timer: 2000, 
            customClass: { title: 'text-dark fw-bold fs-3', popup: 'rounded-4 shadow-lg' }
        });
        WELCOME_MESSAGE = null; 
    }
}

function simulateInitialLoad() {
    let progress = 0;
    const interval = 50; 
    const appContent = document.getElementById('app-content');
    
    appContent.innerHTML = `
        <div class="text-center mt-5 pt-5 fade-up">
            <div class="loading-bar-container mx-auto mt-4" style="width: 80%; max-width: 300px; height: 10px; background: #e0e0e0; border-radius: 5px; overflow: hidden; box-shadow: inset 0 1px 3px rgba(0,0,0,0.1);">
                <div id="simulatedProgressBar" style="width: 0%; height: 100%; background: linear-gradient(90deg, var(--red-muaythai), var(--blue-muaythai)); transition: width 0.1s linear;"></div>
            </div>
            <p class="mt-3 text-secondary fw-bold fs-4" id="loadingPercentage">0%</p>
        </div>
    `;

    const progressElement = document.getElementById('simulatedProgressBar');
    const percentageElement = document.getElementById('loadingPercentage');

    const loadingInterval = setInterval(() => {
        progress += 4; // fast load
        if (progress >= 100) {
            progress = 100;
            clearInterval(loadingInterval);
            switchTab('dashboard'); 
        }
        if(progressElement) progressElement.style.width = `${progress}%`;
        if(percentageElement) percentageElement.innerText = `${progress}%`;
    }, interval);
}

// --- TAB SWITCHING ---
window.switchTab = function(tabName) {
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    showLoading('กำลังโหลด...');

    if (tabName === 'dashboard') {
        if(document.querySelector('.nav-item:nth-child(1)')) document.querySelector('.nav-item:nth-child(1)').classList.add('active');
        loadDashboard();
    } else if (tabName === 'record') {
        if(document.querySelector('.nav-item:nth-child(2)')) document.querySelector('.nav-item:nth-child(2)').classList.add('active');
        loadRecordForm();
    } else if (tabName === 'register') {
        if(document.querySelector('.nav-item:nth-child(3)')) document.querySelector('.nav-item:nth-child(3)').classList.add('active');
        showLandingPage(true);
    }
};

function showLoading(text) {
    const appContent = document.getElementById('app-content');
    if(appContent) {
        appContent.innerHTML = `
            <div class="text-center mt-5 pt-5 fade-up">
                <div class="spinner-border text-danger" role="status"></div>
                <p class="mt-2 text-secondary">${text}</p>
            </div>
        `;
    }
}

// --- DASHBOARD ---
function loadDashboard() {
    fetchAPI('getDashboard').then(data => {
        RANK_THRESHOLDS_CLIENT = data.ranksConfig; 
        renderDashboard(data);
    });
}

function renderDashboard(data) {
    const teamA = data.teamA || 0; 
    const teamB = data.teamB || 0; 
    const total = teamA + teamB || 1;
    const pA = Math.round((teamA / total) * 100); 
    const pB = 100 - pA; 

    const getTeamColorClass = (team) => (team && (team.includes('A') || team.includes('แดง'))) ? 'text-red-muaythai' : 'text-blue-muaythai';
    const getTeamBadge = (team) => (team && (team.includes('A') || team.includes('แดง'))) ? '<span class="badge bg-red-muaythai me-1">A</span>' : '<span class="badge bg-blue-muaythai me-1">B</span>';

    // (HTML Structure similar to original but refined for JS file)
    let html = `
    <div class="fade-up">
        <div class="card-custom mb-3 pt-4 border-0 shadow-lg text-center">
            <div class="d-flex justify-content-between px-2 mb-2 align-items-end">
                <div class="text-start">
                    <h5 class="fw-bold text-red-muaythai mb-0">TEAM A</h5>
                    <div class="score-big text-red-muaythai lh-1" id="scoreA">0</div>
                </div>
                <div class="fs-1 text-muted fw-bold fst-italic opacity-25">VS</div>
                <div class="text-end">
                    <h5 class="fw-bold text-blue-muaythai mb-0">TEAM B</h5>
                    <div class="score-big text-blue-muaythai lh-1" id="scoreB">0</div>
                </div>
            </div>
            <div class="progress shadow-sm mx-2 mb-2" style="height: 20px; border-radius: 10px; overflow:hidden; background-color: #f0f0f0;">
                <div class="progress-bar bg-red-muaythai" role="progressbar" style="width: ${pA}%;">${pA}%</div>
                <div class="progress-bar bg-blue-muaythai" role="progressbar" style="width: ${pB}%;">${pB}%</div>
            </div>
            <small class="text-muted mb-3 d-block">สัดส่วนคะแนนรวม</small>
        </div>

        ${CACHED_USER ? `
        <div class="card-custom p-3" style="background: linear-gradient(135deg, #ffffff 0%, #fcfcfc 100%); border: 1px solid #eee;">
            <div class="d-flex justify-content-between align-items-center mb-3">
                <h6 class="m-0 fw-bold text-dark"><i class="bi bi-person-bounding-box me-2 text-secondary"></i>สถิติของฉัน</h6>
            </div>
            <div class="row g-2 text-center">
                <div class="col-4 border-end"><small class="text-muted">วันนี้</small><div class="fw-bold fs-4 text-dark" id="statDay">...</div></div>
                <div class="col-4 border-end"><small class="text-muted">สัปดาห์นี้</small><div class="fw-bold fs-4 ${getTeamColorClass(CACHED_TEAM)}" id="statWeek">...</div></div>
                <div class="col-4"><small class="text-muted">เดือนนี้</small><div class="fw-bold fs-4 text-dark" id="statMonth">...</div></div>
            </div>
        </div>` : ''}

        <div class="card-custom pb-4">
            <div class="card-header-text mb-3"><span><i class="bi bi-trophy-fill me-2 text-warning"></i>ทำเนียบนักสู้</span></div>
            <div class="d-flex flex-column gap-2">
                ${data.leaderboard.length === 0 ? '<div class="text-center p-3 text-muted">ไม่มีผู้ทำคะแนน</div>' : data.leaderboard.map((u, i) => { 
                    let nextRankInfo = "";
                    const nextRank = RANK_THRESHOLDS_CLIENT.find(r => r.threshold > u.total);
                    if (nextRank) {
                        const needed = nextRank.threshold - u.total;
                        nextRankInfo = `<small class="text-muted" style="font-size:0.65rem;">อีก <span class="text-danger fw-bold">${needed.toLocaleString()}</span> สู่ ${nextRank.name}</small>`;
                    } else {
                        nextRankInfo = `<small class="text-success fw-bold" style="font-size:0.65rem;">สูงสุดแล้ว!</small>`;
                    }
                    let rankDisplay = (i === 0) ? `<i class="bi bi-award-fill text-warning fs-4"></i>` : `<span class="fw-bold text-secondary" style="width:25px; display:inline-block; text-align:center;">${i+1}</span>`;
                    return `
                    <div class="d-flex justify-content-between align-items-center p-2 border-bottom border-light leaderboard-item" onclick="viewUserStats('${u.name}', '${u.team}', '${u.rankTitle}')">
                        <div class="d-flex align-items-center" style="flex:1;">
                            <div class="me-2">${rankDisplay}</div>
                            <div style="line-height:1.1;">
                                <div class="fw-bold text-dark fs-6 text-truncate" style="max-width: 140px;">${getTeamBadge(u.team)} ${u.name}</div>
                                <div class="small text-secondary"><i class="bi bi-star-fill text-warning me-1"></i>${u.rankTitle}</div>
                                ${nextRankInfo}
                            </div>
                        </div>
                        <div class="text-end ps-2">
                            <div class="fw-bold ${getTeamColorClass(u.team)} fs-5">${u.total.toLocaleString()}</div>
                            <div class="small text-muted" style="font-size:0.6rem">kcal</div>
                        </div>
                    </div>`;
                }).join('')}
            </div>
        </div>
        
        <div class="card-custom bg-white">
            <div class="card-header-text"><i class="bi bi-info-circle-fill me-2 text-info"></i>คู่มือยศ</div>
            <div class="accordion accordion-flush" id="rankAccordion">
                <div class="accordion-item border-0">
                     <h2 class="accordion-header">
                        <button class="accordion-button collapsed rounded-4 bg-light" type="button" data-bs-toggle="collapse" data-bs-target="#flush-collapseOne">
                            <span class="fw-bold">🎖️ ดูรายละเอียดระดับยศ</span>
                        </button>
                    </h2>
                    <div id="flush-collapseOne" class="accordion-collapse collapse" data-bs-parent="#rankAccordion">
                        <div class="accordion-body p-0 pt-3">
                            <ul class="list-group list-group-flush">
                                ${RANK_THRESHOLDS_CLIENT.slice().reverse().map(r => `
                                    <li class="list-group-item d-flex justify-content-between align-items-start border-0 px-0 pb-3">
                                        <div class="me-auto"><div class="fw-bold text-dark">${r.name}</div><small class="text-muted fst-italic">"${r.desc}"</small></div>
                                        <span class="badge bg-light text-dark border rounded-pill ms-2">${r.threshold.toLocaleString()}+</span>
                                    </li>`).join('')}
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div class="card-custom mb-5">
            <div class="card-header-text"><i class="bi bi-clock-history me-2 text-secondary"></i>ประวัติล่าสุด</div>
            <div class="d-flex flex-column gap-2">
                ${data.history.length === 0 ? '<div class="text-center text-muted py-3">ยังไม่มีการเคลื่อนไหว</div>' : data.history.map(h => `
                <div class="d-flex justify-content-between align-items-center bg-light p-3 rounded-4">
                    <div class="d-flex align-items-center">
                        <div class="me-3 text-center bg-white rounded-3 p-2 shadow-sm" style="min-width:50px;">
                            <div class="fw-bold text-dark">${h.time.split(' ')[1]}</div>
                            <div class="text-muted" style="font-size:0.6rem">${h.time.split(' ')[0]}</div>
                        </div>
                        <div><div class="fw-bold text-dark">${getTeamBadge(h.team)} ${h.name}</div><small class="text-muted" style="font-size:0.7rem;">ส่งผลงานสำเร็จ</small></div>
                    </div>
                    <div class="text-end"><div class="fw-bold text-success fs-6">+${h.cal.toLocaleString()}</div>${h.img ? `<a href="${h.img}" target="_blank" class="text-secondary small text-decoration-none"><i class="bi bi-image-fill"></i> รูป</a>` : ''}</div>
                </div>`).join('')}
            </div>
        </div>
    </div>`;
    
    document.getElementById('app-content').innerHTML = html;
    animateValue("scoreA", 0, teamA, 2000); 
    animateValue("scoreB", 0, teamB, 2000);
    if(CACHED_USER) loadPersonalStats();
}

// --- LANDING PAGE ---
function showLandingPage() {
    document.getElementById('app-content').innerHTML = `
        <div class="fade-up pt-3">
            <div class="card-custom text-center">
                <i class="bi bi-shield-shaded welcome-icon mb-3 d-block text-blue-muaythai" style="font-size: 4rem;"></i>
                <h2 class="fw-bold mb-3">Calorie Battle</h2>
                <p class="text-muted">Team A <span class="text-danger">VS</span> Team B</p>
                <div class="d-grid gap-3">
                     ${CACHED_USER ? 
                        `<div class="alert alert-success"><i class="bi bi-check-circle-fill me-2"></i>คุณเข้าสู่ระบบแล้วในชื่อ <strong>${CACHED_USER}</strong></div>
                         <button class="btn btn-outline-danger rounded-pill fw-bold" onclick="clearCache()">ออกจากระบบ</button>` 
                        : 
                        `<button class="btn btn-primary py-3 rounded-pill fw-bold shadow-sm fs-5" style="background: linear-gradient(90deg, var(--red-muaythai), var(--blue-muaythai)); border:none;" onclick="loadRegisterForm()">
                            <i class="bi bi-person-plus-fill me-2"></i> ลงทะเบียนใหม่
                         </button>
                         <button class="btn btn-outline-secondary py-3 rounded-pill fw-bold" onclick="goToRecordAsExisting()">
                            <i class="bi bi-box-arrow-in-right me-2"></i> เคยสมัครแล้ว (เข้าสู่ระบบ)
                         </button>`
                     }
                </div>
            </div>
        </div>`;
}

// --- RECORD FORM & UPLOAD ---
function loadRecordForm(forceSelection = false) {
    if (!CACHED_USER && !forceSelection) { Swal.fire('เตือน', 'กรุณาลงทะเบียนก่อนครับ', 'warning').then(() => switchTab('register')); return; }
    if (!CACHED_USER || forceSelection) { loadUserSelectionForm(); } else { renderRecordForm(CACHED_USER, CACHED_TEAM); }
}

function renderRecordForm(name, team) {
    UPLOADED_IMAGE_BASE64 = null;
    document.getElementById('app-content').innerHTML = `
    <div class="fade-up">
        <div class="card-custom">
            <h4 class="fw-bold text-center mb-4">ส่งผลการฝึกซ้อม</h4>
            <form id="recordForm">
                <div class="bg-light p-3 rounded-4 mb-4 d-flex justify-content-between align-items-center shadow-sm">
                     <div><small class="text-muted d-block fw-bold" style="font-size:0.75rem">ACCOUNT</small><strong class="text-dark fs-5">${name}</strong></div>
                     <span class="badge ${team.includes('A')||team.includes('แดง')?'bg-red-muaythai':'bg-blue-muaythai'} rounded-pill px-3 py-2 shadow-sm">${team}</span>
                </div>
                <div class="mb-4">
                    <label class="fw-bold small text-secondary ms-2 mb-1">1. อัปโหลดรูปหลักฐาน</label>
                    <div class="card border-0 bg-light rounded-4 p-3 text-center" id="uploadArea" style="border: 2px dashed #ccc !important; cursor: pointer;" onclick="document.getElementById('recFile').click()">
                        <div id="uploadPlaceholder"><i class="bi bi-cloud-arrow-up-fill text-secondary" style="font-size: 2.5rem;"></i><p class="text-muted small mb-0">แตะเพื่อเลือกรูปภาพ</p></div>
                        <div id="uploadProgress" style="display:none;"><div class="spinner-border text-primary mb-2"></div><small class="text-primary fw-bold mt-2 d-block">Processing...</small></div>
                        <div id="uploadSuccess" style="display:none;"><i class="bi bi-check-circle-fill text-success" style="font-size: 2.5rem;"></i><p class="text-success fw-bold small mb-0">พร้อมส่ง</p><img id="previewImg" src="" class="mt-2 rounded-3 shadow-sm" style="max-height: 100px; max-width: 100%; object-fit: cover;"></div>
                    </div>
                    <input type="file" id="recFile" accept="image/*" style="display:none;" onchange="handleFileSelect(this)">
                </div>
                <div class="mb-4"><label class="fw-bold small text-secondary ms-2 mb-1">2. แคลอรี่ (kcal)</label><input type="number" class="form-control form-control-lg rounded-4 border-0 bg-light fw-bold text-center text-red-muaythai" id="recCalories" placeholder="0" required style="font-size:2rem; height: 70px;" disabled></div>
                <button type="submit" id="submitBtn" class="btn w-100 py-3 rounded-pill text-white fw-bold shadow-sm fs-5" style="background: #ccc; border:none;" disabled><i class="bi bi-lock-fill me-2"></i> รอรูปภาพ...</button>
            </form>
        </div>
    </div>`;
    document.getElementById('recordForm').addEventListener('submit', handleRecordSubmit);
}

function handleFileSelect(input) {
    const file = input.files[0]; if (!file) return;
    const reader = new FileReader();
    
    document.getElementById('uploadPlaceholder').style.display = 'none';
    document.getElementById('uploadProgress').style.display = 'block';

    reader.onload = function(e) { 
        const img = new Image(); 
        img.src = e.target.result; 
        img.onload = function() { 
            const canvas = document.createElement('canvas'); 
            const ctx = canvas.getContext('2d'); 
            const MAX_SIZE = 1000; 
            let w = img.width, h = img.height; 
            if (w > h) { if (w > MAX_SIZE) { h *= MAX_SIZE/w; w = MAX_SIZE; } } else { if (h > MAX_SIZE) { w *= MAX_SIZE/h; h = MAX_SIZE; } } 
            canvas.width = w; canvas.height = h; 
            ctx.drawImage(img, 0, 0, w, h); 
            
            // Save Base64 for submitting later
            const base64String = canvas.toDataURL(file.type, 0.7).split(',')[1];
            UPLOADED_IMAGE_BASE64 = {
                base64Data: base64String,
                mimeType: file.type,
                fileName: file.name
            };

            document.getElementById('uploadProgress').style.display = 'none';
            document.getElementById('uploadSuccess').style.display = 'block';
            document.getElementById('previewImg').src = canvas.toDataURL(file.type, 0.7);
            
            const btn = document.getElementById('submitBtn');
            const calInput = document.getElementById('recCalories');
            calInput.disabled = false;
            calInput.focus();
            btn.disabled = false;
            btn.style.background = 'linear-gradient(90deg, var(--red-muaythai), var(--blue-muaythai))';
            btn.innerHTML = '<i class="bi bi-send-fill me-2"></i> ยืนยันส่งผล';
        } 
    }; 
    reader.readAsDataURL(file);
}

function handleRecordSubmit(e) { 
    e.preventDefault(); 
    if (!UPLOADED_IMAGE_BASE64) { Swal.fire('Warning', 'รอรูปก่อนครับ', 'warning'); return; } 
    
    const btn = document.getElementById('submitBtn'); 
    const cal = document.getElementById('recCalories').value; 
    btn.disabled = true; 
    btn.innerHTML = 'กำลังส่งข้อมูล...'; 

    // Send everything in one go
    fetchAPI('saveRecord', {
        name: CACHED_USER,
        team: CACHED_TEAM,
        calories: cal,
        ...UPLOADED_IMAGE_BASE64 // Spread base64 data here
    }, 'POST').then(res => {
        btn.disabled = false;
        if(res.success) {
            Swal.fire({ title: 'สำเร็จ!', html: `ส่งผลงาน +${cal} kcal เรียบร้อยแล้ว`, icon: 'success', showConfirmButton: false, timer: 2000 }).then(() => switchTab('dashboard'));
            if (typeof confetti === 'function') confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
        } else {
            Swal.fire('Error', res.error, 'error');
        }
    });
}

// --- USER MANAGEMENT ---
function loadUserSelectionForm() {
    showLoading('กำลังโหลดรายชื่อผู้ใช้งาน...');
    fetchAPI('getUsers').then(users => {
        if(users.length === 0) { Swal.fire('Info', 'ไม่พบผู้ใช้งาน กรุณาลงทะเบียนใหม่', 'info').then(() => switchTab('register')); return; }
        let options = '<option value="">-- โปรดเลือกชื่อของคุณ --</option>';
        users.forEach(u => options += `<option value="${u.name}" data-team="${u.team}">${u.name} (${u.team})</option>`);
        document.getElementById('app-content').innerHTML = `<div class="fade-up"><div class="card-custom"><h4 class="fw-bold text-center mb-4 text-dark">โปรดเลือกชื่อผู้ใช้งาน</h4><div class="mb-4"><select class="form-select form-select-lg rounded-4 bg-light border-0 py-3" onchange="onUserSelectChange(this)">${options}</select></div><div class="text-center"><button class="btn btn-link text-muted fw-bold text-decoration-none" onclick="switchTab('register')">ยังไม่มีบัญชี? ลงทะเบียนใหม่</button></div></div></div>`;
    });
}

function onUserSelectChange(e) {
    const name = e.value;
    const team = e.options[e.selectedIndex].getAttribute('data-team');
    if(name && team) {
        localStorage.setItem('cb_user_name', name);
        localStorage.setItem('cb_user_team', team);
        CACHED_USER = name; CACHED_TEAM = team;
        updateHeaderBadge();
        switchTab('dashboard');
    }
}

function goToRecordAsExisting() { loadUserSelectionForm(); }

function loadRegisterForm() {
    document.getElementById('app-content').innerHTML = `<div class="fade-up"><div class="card-custom"><h4 class="fw-bold text-center mb-4 text-dark">ลงทะเบียนนักสู้ใหม่</h4><form id="regForm"><div class="mb-3"><label class="fw-bold small text-secondary ms-2">ชื่อ (สำหรับแสดงผล)</label><input type="text" class="form-control form-control-lg rounded-4 bg-light border-0 py-3" name="name" placeholder="เช่น นาย A ใจสู้" required></div><div class="mb-4"><label class="fw-bold small text-secondary ms-2">อีเมล (ติดต่อ)</label><input type="email" class="form-control form-control-lg rounded-4 bg-light border-0 py-3" name="email" placeholder="email@company.com" required></div><button type="submit" class="btn w-100 py-3 rounded-pill fw-bold shadow-sm fs-5" style="background: linear-gradient(90deg, var(--red-muaythai), var(--blue-muaythai)); color: white;">ยืนยันการลงทะเบียน</button></form></div></div>`;
    document.getElementById('regForm').addEventListener('submit', handleRegister);
}

function handleRegister(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());

    btn.disabled = true;
    btn.innerText = 'Processing...';

    fetchAPI('register', data, 'POST').then(res => {
        btn.disabled = false;
        if(res.success) {
            localStorage.setItem('cb_user_name', res.name);
            localStorage.setItem('cb_user_team', res.team);
            CACHED_USER = res.name; CACHED_TEAM = res.team;
            updateHeaderBadge();
            Swal.fire({ title: 'ลงทะเบียนสำเร็จ!', html: `ยินดีต้อนรับสู่ <h1 class="mt-2 ${res.team.includes('A')?'text-red-muaythai':'text-blue-muaythai'} fw-bold">${res.team}</h1>`, icon: 'success', showConfirmButton: false, timer: 2000 }).then(() => switchTab('dashboard'));
        } else {
            Swal.fire('Error', res.error, 'error');
        }
    });
}

function clearCache() {
    Swal.fire({ title: 'Logout?', icon: 'warning', showCancelButton: true, confirmButtonText: 'Yes' }).then((res) => {
        if (res.isConfirmed) {
            localStorage.removeItem('cb_user_name');
            localStorage.removeItem('cb_user_team');
            CACHED_USER = null; CACHED_TEAM = null;
            updateHeaderBadge();
            showLandingPage();
        }
    });
}

function updateHeaderBadge() {
    const badge = document.getElementById('headerUserBadge');
    if(CACHED_USER) {
        badge.style.display = 'block';
        badge.innerHTML = `<span class="badge ${CACHED_TEAM.includes('A')||CACHED_TEAM.includes('แดง')?'bg-red-muaythai':'bg-blue-muaythai'} shadow-sm px-3 py-2">${CACHED_USER}</span>`;
    } else {
        badge.style.display = 'none';
    }
}

function loadPersonalStats() {
    fetchAPI('getPersonalStats', { name: CACHED_USER }).then(stats => {
        if(document.getElementById('statWeek')) {
            animateValue("statDay", 0, stats.day, 1000);
            animateValue("statWeek", 0, stats.week, 1000);
            animateValue("statMonth", 0, stats.month, 1000);
        }
    });
}

function animateValue(id, s, e, d) { 
    const o = document.getElementById(id); 
    if(!o) return; 
    let st = null; 
    const step = (t) => { 
        if (!st) st = t; 
        const p = Math.min((t - st) / d, 1); 
        if (p < 1) {
            const currentValue = Math.floor(p * (e - s) + s);
            o.innerHTML = currentValue.toLocaleString();
            requestAnimationFrame(step); 
        } else {
            o.innerHTML = formatNumber(e); 
        }
    }; 
    requestAnimationFrame(step); 
}

function viewUserStats(name, team, rank) {
    Swal.fire({ title: name, text: 'Loading...', showConfirmButton: false });
    fetchAPI('getPersonalStats', { name: name }).then(stats => {
        Swal.fire({ title: name, html: `Team: ${team}<br>Rank: ${rank}<br><br>Day: ${stats.day}<br>Week: ${stats.week}<br>Month: ${stats.month}` });
    });
}