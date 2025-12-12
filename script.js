// ============================================
// ⚠️ อย่าลืมอัปเดต URL ใหม่หลัง Deploy ⚠️
// ============================================
const GAS_API_URL = "https://script.google.com/macros/s/AKfycbxyMC5kINgS53UZ5ACkBSx-0ZU9Lm-m81n2F06_q5rK9Ek9IiMX6bON3gz8wbgxyMKtJg/exec"; 

// Global Variables
let CACHED_USER = localStorage.getItem('cb_user_name');
let CACHED_TEAM = localStorage.getItem('cb_user_team');
let RANK_THRESHOLDS_CLIENT = []; 
let WELCOME_MESSAGE = "Calorie Battle is Ready!";
let UPLOADED_IMAGE_URL = null; // เก็บ URL รูปที่อัปโหลดเสร็จแล้ว

// --- API Helper ---
async function fetchAPI(action, params = {}, method = 'GET') {
    let url = `${GAS_API_URL}?action=${action}`;
    let options = { method: method, redirect: "follow" };

    if (method === 'GET') {
        const queryParams = new URLSearchParams(params).toString();
        if(queryParams) url += `&${queryParams}`;
    } else if (method === 'POST') {
        options.body = JSON.stringify({ action: action, payload: params });
        options.headers = { "Content-Type": "text/plain;charset=utf-8" };
    }

    try {
        const response = await fetch(url, options);
        const text = await response.text();
        let json;
        try { json = JSON.parse(text); } catch (e) { throw new Error("Server Error: ตอบกลับไม่ใช่ JSON"); }
        if (json.success === false) throw new Error(json.error || "Unknown Server Error");
        return json;
    } catch (e) {
        Swal.fire({ title: 'Connection Error', html: `ไม่สามารถติดต่อ Server ได้<br><small style="color:red">${e.message}</small>`, icon: 'error' });
        throw e;
    }
}

// --- Main Logic ---
document.addEventListener('DOMContentLoaded', () => {
    createSnow(); 
    updateHeaderBadge();
    fetchAPI('getConfig').then(data => {
        WELCOME_MESSAGE = data.welcomeMessage;
        showWelcomeAndStartLoad();
    }).catch(() => showWelcomeAndStartLoad());
});

function formatNumber(num) {
    num = Number(num); const abs = Math.abs(num);
    if (abs >= 1000000) return (num / 1000000).toFixed(2) + 'M'; 
    if (abs >= 1000) return (num / 1000).toFixed(2) + 'k'; 
    return num.toFixed(2); 
}

function createSnow() {
    const container = document.getElementById('snow-container');
    if(!container) return;
    for (let i = 0; i < 30; i++) {
        const flake = document.createElement('div');
        flake.classList.add('snowflake');
        const size = Math.random() * 8 + 4; 
        flake.style.width = `${size}px`; flake.style.height = `${size}px`;
        flake.style.left = `${Math.random() * 100}vw`;
        flake.style.animationDuration = `${Math.random() * 15 + 5}s`;
        flake.style.animationDelay = `${Math.random() * 10}s`;
        flake.style.animationName = 'fall'; 
        container.appendChild(flake);
    }
}

function showWelcomeAndStartLoad() {
    simulateInitialLoad();
    if (WELCOME_MESSAGE) {
        Swal.fire({ title: WELCOME_MESSAGE, text: "ขอให้สนุกกับ Calorie Battle!", icon: 'info', showConfirmButton: false, timer: 2000, customClass: { title: 'text-dark fw-bold fs-3', popup: 'rounded-4 shadow-lg' }});
        WELCOME_MESSAGE = null; 
    }
}

function simulateInitialLoad() {
    let progress = 0;
    const appContent = document.getElementById('app-content');
    appContent.innerHTML = `
        <div class="text-center mt-5 pt-5 fade-up">
            <div class="loading-bar-container mx-auto mt-4" style="width: 80%; max-width: 300px; height: 10px; background: #e0e0e0; border-radius: 5px; overflow: hidden; box-shadow: inset 0 1px 3px rgba(0,0,0,0.1);">
                <div id="simulatedProgressBar" style="width: 0%; height: 100%; background: linear-gradient(90deg, #D93026, #1A73E8); transition: width 0.1s linear;"></div>
            </div>
            <p class="mt-3 text-secondary fw-bold fs-4" id="loadingPercentage">0%</p>
        </div>`;
    const bar = document.getElementById('simulatedProgressBar');
    const txt = document.getElementById('loadingPercentage');
    const interval = setInterval(() => {
        progress += 5; 
        if (progress >= 100) { clearInterval(interval); switchTab('dashboard'); }
        if(bar) bar.style.width = `${progress}%`;
        if(txt) txt.innerText = `${progress}%`;
    }, 50);
}

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
        showLandingPage();
    }
};

function showLoading(text) {
    const appContent = document.getElementById('app-content');
    if(appContent) appContent.innerHTML = `<div class="text-center mt-5 pt-5 fade-up"><div class="spinner-border text-danger" role="status"></div><p class="mt-2 text-secondary">${text}</p></div>`;
}

// --- Dashboard ---
function loadDashboard() {
    fetchAPI('getDashboard').then(data => {
        RANK_THRESHOLDS_CLIENT = data.ranksConfig; 
        renderDashboard(data);
    });
}

function renderDashboard(data) {
    const teamA = data.teamA || 0; const teamB = data.teamB || 0; 
    const total = teamA + teamB || 1;
    const pA = Math.round((teamA / total) * 100); const pB = 100 - pA; 
    const getTeamBadge = (team) => (team && (team.includes('A') || team.includes('แดง'))) ? '<span class="badge bg-red-muaythai me-1">A</span>' : '<span class="badge bg-blue-muaythai me-1">B</span>';
    const getTeamColor = (team) => (team && (team.includes('A') || team.includes('แดง'))) ? 'text-red-muaythai' : 'text-blue-muaythai';

    let html = `
    <div class="fade-up">
        <div class="card-custom mb-3 pt-4 border-0 shadow-lg text-center">
            <div class="d-flex justify-content-between px-2 mb-2 align-items-end">
                <div class="text-start"><h5 class="fw-bold text-red-muaythai mb-0">TEAM A</h5><div class="score-big text-red-muaythai lh-1" id="scoreA">0</div></div>
                <div class="fs-1 text-muted fw-bold fst-italic opacity-25">VS</div>
                <div class="text-end"><h5 class="fw-bold text-blue-muaythai mb-0">TEAM B</h5><div class="score-big text-blue-muaythai lh-1" id="scoreB">0</div></div>
            </div>
            <div class="progress shadow-sm mx-2 mb-2" style="height: 20px; border-radius: 10px; overflow:hidden; background-color: #f0f0f0;">
                <div class="progress-bar bg-red-muaythai" style="width: ${pA}%;">${pA}%</div><div class="progress-bar bg-blue-muaythai" style="width: ${pB}%;">${pB}%</div>
            </div>
        </div>
        ${CACHED_USER ? `<div class="card-custom p-3" style="background: linear-gradient(135deg, #ffffff 0%, #fcfcfc 100%); border: 1px solid #eee;">
            <div class="d-flex justify-content-between align-items-center mb-3"><h6 class="m-0 fw-bold text-dark"><i class="bi bi-person-bounding-box me-2 text-secondary"></i>สถิติของฉัน</h6></div>
            <div class="row g-2 text-center">
                <div class="col-4 border-end"><small class="text-muted">วันนี้</small><div class="fw-bold fs-4 text-dark" id="statDay">...</div></div>
                <div class="col-4 border-end"><small class="text-muted">สัปดาห์นี้</small><div class="fw-bold fs-4 ${getTeamColor(CACHED_TEAM)}" id="statWeek">...</div></div>
                <div class="col-4"><small class="text-muted">เดือนนี้</small><div class="fw-bold fs-4 text-dark" id="statMonth">...</div></div>
            </div>
        </div>` : ''}
        <div class="card-custom pb-4">
            <div class="card-header-text mb-3"><span><i class="bi bi-trophy-fill me-2 text-warning"></i>ทำเนียบนักสู้</span></div>
            <div class="d-flex flex-column gap-2">
                ${data.leaderboard.length === 0 ? '<div class="text-center p-3 text-muted">ไม่มีผู้ทำคะแนน</div>' : data.leaderboard.map((u, i) => { 
                    const rankDisplay = (i === 0) ? `<i class="bi bi-award-fill text-warning fs-4"></i>` : `<span class="fw-bold text-secondary" style="width:25px; display:inline-block; text-align:center;">${i+1}</span>`;
                    return `<div class="d-flex justify-content-between align-items-center p-2 border-bottom border-light leaderboard-item" onclick="viewUserStats('${u.name}', '${u.team}', '${u.rankTitle}')">
                        <div class="d-flex align-items-center" style="flex:1;"><div class="me-2">${rankDisplay}</div>
                        <div style="line-height:1.1;"><div class="fw-bold text-dark fs-6 text-truncate" style="max-width: 140px;">${getTeamBadge(u.team)} ${u.name}</div>
                        <div class="small text-secondary">${u.rankTitle}</div></div></div>
                        <div class="text-end ps-2"><div class="fw-bold ${getTeamColor(u.team)} fs-5">${u.total.toLocaleString()}</div></div>
                    </div>`;
                }).join('')}
            </div>
        </div>
        <div class="card-custom mb-5">
            <div class="card-header-text"><i class="bi bi-clock-history me-2 text-secondary"></i>ประวัติล่าสุด</div>
            <div class="d-flex flex-column gap-2">
                ${data.history.map(h => `<div class="d-flex justify-content-between align-items-center bg-light p-3 rounded-4">
                    <div class="d-flex align-items-center"><div class="me-3 text-center bg-white rounded-3 p-2 shadow-sm" style="min-width:50px;"><div class="fw-bold text-dark">${h.time.split(' ')[1]}</div></div>
                    <div><div class="fw-bold text-dark">${getTeamBadge(h.team)} ${h.name}</div></div></div>
                    <div class="text-end"><div class="fw-bold text-success fs-6">+${h.cal.toLocaleString()}</div></div>
                </div>`).join('')}
            </div>
        </div>
    </div>`;
    
    document.getElementById('app-content').innerHTML = html;
    animateValue("scoreA", 0, teamA, 2000); animateValue("scoreB", 0, teamB, 2000);
    if(CACHED_USER) loadPersonalStats();
}

function showLandingPage() {
    document.getElementById('app-content').innerHTML = `<div class="fade-up pt-3"><div class="card-custom text-center">
        <i class="bi bi-shield-shaded welcome-icon mb-3 d-block text-blue-muaythai" style="font-size: 4rem;"></i>
        <h2 class="fw-bold mb-3">Calorie Battle</h2>
        <div class="d-grid gap-3">${CACHED_USER ? 
            `<div class="alert alert-success">เข้าสู่ระบบแล้ว: <strong>${CACHED_USER}</strong></div><button class="btn btn-outline-danger rounded-pill fw-bold" onclick="clearCache()">ออกจากระบบ</button>` : 
            `<button class="btn btn-primary py-3 rounded-pill fw-bold shadow-sm" style="background: linear-gradient(90deg, #D93026, #1A73E8); border:none;" onclick="loadRegisterForm()">ลงทะเบียนใหม่</button>
             <button class="btn btn-outline-secondary py-3 rounded-pill fw-bold" onclick="goToRecordAsExisting()">เคยสมัครแล้ว</button>`}
        </div></div></div>`;
}

function loadRegisterForm() {
    document.getElementById('app-content').innerHTML = `<div class="fade-up"><div class="card-custom"><h4 class="fw-bold text-center mb-4">ลงทะเบียน</h4><form id="regForm">
        <div class="mb-3"><input type="text" class="form-control form-control-lg rounded-4" name="name" placeholder="ชื่อเรียก" required></div>
        <div class="mb-4"><input type="email" class="form-control form-control-lg rounded-4" name="email" placeholder="อีเมล" required></div>
        <button type="submit" class="btn w-100 py-3 rounded-pill fw-bold text-white shadow-sm" style="background: linear-gradient(90deg, #D93026, #1A73E8);">ลงทะเบียน</button>
    </form></div></div>`;
    document.getElementById('regForm').addEventListener('submit', (e) => {
        e.preventDefault(); const btn = e.target.querySelector('button'); btn.disabled = true; btn.innerText = 'กำลังประมวลผล...';
        const data = Object.fromEntries(new FormData(e.target).entries());
        fetchAPI('register', data, 'POST').then(res => {
            if(res.success) {
                localStorage.setItem('cb_user_name', res.name); localStorage.setItem('cb_user_team', res.team);
                CACHED_USER = res.name; CACHED_TEAM = res.team;
                updateHeaderBadge(); Swal.fire('ยินดีต้อนรับ', `คุณอยู่ทีม ${res.team}`, 'success').then(() => switchTab('dashboard'));
            } else Swal.fire('Error', res.error, 'error');
        }).finally(() => btn.disabled = false);
    });
}

function goToRecordAsExisting() {
    showLoading('โหลดรายชื่อ...');
    fetchAPI('getUsers').then(users => {
        let opts = users.map(u => `<option value="${u.name}" data-team="${u.team}">${u.name}</option>`).join('');
        document.getElementById('app-content').innerHTML = `<div class="fade-up"><div class="card-custom"><h4 class="fw-bold text-center">เลือกชื่อของคุณ</h4>
        <select class="form-select form-select-lg rounded-4 mt-4" onchange="if(this.value){ localStorage.setItem('cb_user_name', this.value); localStorage.setItem('cb_user_team', this.options[this.selectedIndex].getAttribute('data-team')); CACHED_USER = this.value; CACHED_TEAM = localStorage.getItem('cb_user_team'); updateHeaderBadge(); switchTab('dashboard'); }">
        <option value="">-- รายชื่อ --</option>${opts}</select></div></div>`;
    });
}

// --- Record / Upload Functions (NEW LOGIC) ---
function loadRecordForm() {
    if (!CACHED_USER) { Swal.fire('เตือน', 'กรุณาลงทะเบียนก่อน', 'warning').then(() => switchTab('register')); return; }
    UPLOADED_IMAGE_URL = null; // Reset ค่า
    
    document.getElementById('app-content').innerHTML = `
    <div class="fade-up">
        <div class="card-custom">
            <h4 class="fw-bold text-center mb-4">ส่งผลการฝึกซ้อม</h4>
            <form id="recordForm">
                <div class="bg-light p-3 rounded-4 mb-4 d-flex justify-content-between align-items-center shadow-sm">
                    <div><strong class="text-dark fs-5">${CACHED_USER}</strong></div>
                    <span class="badge bg-secondary rounded-pill px-3 py-2 shadow-sm">${CACHED_TEAM}</span>
                </div>

                <div class="mb-4">
                    <div class="card border-0 bg-light rounded-4 p-3 text-center position-relative" style="border: 2px dashed #ccc !important; cursor: pointer;" onclick="if(!document.getElementById('uploadProgressBar')) document.getElementById('recFile').click()">
                        
                        <div id="uploadPlaceholder">
                            <i class="bi bi-cloud-arrow-up-fill text-secondary fs-1"></i>
                            <p class="text-muted small">แตะเพื่ออัปโหลดรูป</p>
                        </div>

                        <div id="uploadProgressContainer" style="display:none;" class="mt-3">
                            <div class="progress" style="height: 20px; border-radius: 10px;">
                                <div id="uploadProgressBar" class="progress-bar progress-bar-striped progress-bar-animated bg-success" role="progressbar" style="width: 0%">0%</div>
                            </div>
                            <small class="text-muted mt-1 d-block">กำลังอัปโหลดรูปภาพ...</small>
                        </div>

                        <div id="uploadSuccess" style="display:none;">
                            <img id="previewImg" src="" class="mt-2 rounded-3 shadow-sm" style="max-height: 150px; width: auto;">
                            <div class="mt-2 text-success fw-bold"><i class="bi bi-check-circle-fill"></i> อัปโหลดเรียบร้อย</div>
                        </div>

                    </div>
                    <input type="file" id="recFile" accept="image/*" style="display:none;" onchange="handleFileSelect(this)">
                </div>

                <div class="mb-4">
                    <input type="number" class="form-control form-control-lg rounded-4 text-center" id="recCalories" placeholder="0 kcal" required disabled style="font-size:2rem; height: 70px;">
                </div>

                <button type="submit" id="submitBtn" class="btn w-100 py-3 rounded-pill text-white fw-bold shadow-sm" style="background: #ccc; border:none;" disabled>
                    กรุณาอัปโหลดรูปก่อน
                </button>
            </form>
        </div>
    </div>`;
    
    document.getElementById('recordForm').addEventListener('submit', handleRecordSubmit);
}

function handleFileSelect(input) {
    const file = input.files[0]; 
    if (!file) return;

    // 1. เริ่มแสดง Progress Bar
    document.getElementById('uploadPlaceholder').style.display = 'none';
    document.getElementById('uploadProgressContainer').style.display = 'block';
    
    const progressBar = document.getElementById('uploadProgressBar');
    let progress = 0;
    
    // ตั้งค่าเริ่มต้น 5%
    progressBar.style.width = '5%'; progressBar.innerText = '5%';

    const reader = new FileReader();
    reader.onload = function(e) { 
        const img = new Image(); img.src = e.target.result; 
        img.onload = function() { 
            // ย่อรูปก่อนส่ง (Client-side Resize)
            const canvas = document.createElement('canvas'); const ctx = canvas.getContext('2d'); 
            const MAX = 1000; let w = img.width, h = img.height; 
            if (w > h) { if (w > MAX) { h *= MAX/w; w = MAX; } } else { if (h > MAX) { w *= MAX/h; h = MAX; } } 
            canvas.width = w; canvas.height = h; ctx.drawImage(img, 0, 0, w, h); 
            
            const base64Data = canvas.toDataURL(file.type, 0.7).split(',')[1];
            
            // 2. จำลองการโหลด (Fake Progress) ระหว่างรอเซิร์ฟเวอร์ตอบกลับ
            progressBar.style.width = '30%'; progressBar.innerText = '30%';
            
            let uploadSim = setInterval(() => {
                if(progress < 90) {
                    progress += Math.random() * 15;
                    if(progress > 90) progress = 90; // หยุดที่ 90% จนกว่าจะเสร็จจริง
                    progressBar.style.width = `${Math.round(progress)}%`;
                    progressBar.innerText = `${Math.round(progress)}%`;
                }
            }, 300);

            // ส่งข้อมูลไปอัปโหลดที่ GAS (Action: uploadImage)
            fetchAPI('uploadImage', { 
                base64Data: base64Data, 
                mimeType: file.type, 
                fileName: file.name 
            }, 'POST')
            .then(res => {
                clearInterval(uploadSim);
                if(res.success) {
                    // 3. อัปโหลดเสร็จสมบูรณ์ (100%)
                    progressBar.style.width = '100%'; 
                    progressBar.innerText = '100%';
                    progressBar.classList.remove('progress-bar-animated');
                    
                    setTimeout(() => {
                        document.getElementById('uploadProgressContainer').style.display = 'none';
                        document.getElementById('uploadSuccess').style.display = 'block';
                        document.getElementById('previewImg').src = res.imageUrl; 
                        
                        UPLOADED_IMAGE_URL = res.imageUrl; // เก็บ URL รูปจริง

                        // ปลดล็อกปุ่ม Submit และช่องกรอก Calories
                        document.getElementById('recCalories').disabled = false;
                        const btn = document.getElementById('submitBtn');
                        btn.disabled = false;
                        btn.style.background = 'linear-gradient(90deg, #D93026, #1A73E8)';
                        btn.innerHTML = 'บันทึกคะแนน';
                    }, 500);
                } else {
                    throw new Error(res.error);
                }
            })
            .catch(err => {
                clearInterval(uploadSim);
                document.getElementById('uploadProgressContainer').style.display = 'none';
                document.getElementById('uploadPlaceholder').style.display = 'block';
                Swal.fire('Upload Failed', err.message, 'error');
            });
        } 
    }; 
    reader.readAsDataURL(file);
}

function handleRecordSubmit(e) { 
    e.preventDefault(); 
    if(!UPLOADED_IMAGE_URL) { Swal.fire('Error', 'ไม่พบรูปภาพ กรุณาอัปโหลดใหม่', 'error'); return; }

    const btn = document.getElementById('submitBtn'); 
    btn.disabled = true; 
    btn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> กำลังบันทึก...'; 
    
    // ส่ง URL รูปภาพและ Calories ไปบันทึก (Action: saveRecord)
    fetchAPI('saveRecord', { 
        name: CACHED_USER, 
        team: CACHED_TEAM, 
        calories: document.getElementById('recCalories').value, 
        imageUrl: UPLOADED_IMAGE_URL 
    }, 'POST')
    .then(res => {
        if(res.success) { 
            Swal.fire({
                title: 'บันทึกสำเร็จ!', text: 'ส่งผลเรียบร้อยแล้ว', icon: 'success',
                timer: 2000, showConfirmButton: false
            }).then(() => switchTab('dashboard')); 
            confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } }); 
        }
        else Swal.fire('Error', res.error, 'error');
    }).finally(() => {
        btn.disabled = false;
        btn.innerHTML = 'บันทึกคะแนน';
    });
}

// --- Utility Functions ---
function clearCache() { localStorage.clear(); CACHED_USER = null; updateHeaderBadge(); showLandingPage(); }
function updateHeaderBadge() { document.getElementById('headerUserBadge').style.display = CACHED_USER ? 'block' : 'none'; document.getElementById('headerUserBadge').innerHTML = CACHED_USER ? `<span class="badge bg-dark shadow-sm px-3 py-2">${CACHED_USER}</span>` : ''; }
function loadPersonalStats() { fetchAPI('getPersonalStats', { name: CACHED_USER }).then(s => { if(document.getElementById('statWeek')) { animateValue("statDay", 0, s.day, 1000); animateValue("statWeek", 0, s.week, 1000); animateValue("statMonth", 0, s.month, 1000); } }); }
function animateValue(id, s, e, d) { const o = document.getElementById(id); if(!o) return; let st = null; const step = (t) => { if (!st) st = t; const p = Math.min((t - st) / d, 1); o.innerHTML = (p < 1 ? Math.floor(p * (e - s) + s) : formatNumber(e)).toLocaleString(); if(p < 1) requestAnimationFrame(step); }; requestAnimationFrame(step); }
function viewUserStats(n, t, r) { Swal.fire({ title: n, text: 'Loading...', showConfirmButton: false }); fetchAPI('getPersonalStats', { name: n }).then(s => Swal.fire({ title: n, html: `Team: ${t}<br>Rank: ${r}<br><br>Day: ${s.day}<br>Week: ${s.week}` })); }
