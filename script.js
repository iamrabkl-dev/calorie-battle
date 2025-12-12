// ============================================
// ⚠️ ใส่ URL Web App ที่ได้จากการ Deploy ใหม่ที่นี่ ⚠️
// ============================================
const GAS_API_URL = "https://script.google.com/macros/s/AKfycbxyMC5kINgS53UZ5ACkBSx-0ZU9Lm-m81n2F06_q5rK9Ek9IiMX6bON3gz8wbgxyMKtJg/exec"; 

let CACHED_USER = localStorage.getItem('cb_user_name');
let CACHED_TEAM = localStorage.getItem('cb_user_team');
let WELCOME_MESSAGE = "Calorie Battle is Ready!";
let UPLOADED_IMAGE_URL = null; // เก็บ URL รูปที่อัปโหลดเสร็จแล้ว

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
        Swal.fire('Connection Error', `ไม่สามารถติดต่อ Server ได้: ${e.message}`, 'error');
        throw e;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    updateHeaderBadge();
    fetchAPI('getConfig').then(data => {
        WELCOME_MESSAGE = data.welcomeMessage;
        showWelcomeAndStartLoad();
    }).catch(() => showWelcomeAndStartLoad());
});

function showWelcomeAndStartLoad() {
    let progress = 0;
    const appContent = document.getElementById('app-content');
    appContent.innerHTML = `
        <div class="text-center mt-5 pt-5 fade-up">
            <div class="loading-bar-container mx-auto mt-4" style="width: 80%; max-width: 300px; height: 10px; background: #e0e0e0; border-radius: 5px; overflow: hidden;"><div id="simulatedProgressBar" style="width: 0%; height: 100%; background: linear-gradient(90deg, #D93026, #1A73E8);"></div></div>
            <p class="mt-3 text-secondary fw-bold fs-4" id="loadingPercentage">0%</p>
        </div>`;
    const bar = document.getElementById('simulatedProgressBar'); const txt = document.getElementById('loadingPercentage');
    const interval = setInterval(() => {
        progress += 5; 
        if (progress >= 100) { clearInterval(interval); switchTab('dashboard'); }
        if(bar) bar.style.width = `${progress}%`; if(txt) txt.innerText = `${progress}%`;
    }, 50);
}

window.switchTab = function(tabName) {
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    showLoading('กำลังโหลด...');
    if (tabName === 'dashboard') {
        loadDashboard();
    } else if (tabName === 'record') {
        loadRecordForm();
    } else if (tabName === 'register') {
        showLandingPage();
    }
};

function showLoading(text) { document.getElementById('app-content').innerHTML = `<div class="text-center mt-5 pt-5"><div class="spinner-border text-danger"></div><p class="mt-2 text-secondary">${text}</p></div>`; }

// --- Record Form & Mobile Upload Logic ---
function loadRecordForm() {
    if (!CACHED_USER) { Swal.fire('เตือน', 'กรุณาลงทะเบียนก่อน', 'warning').then(() => switchTab('register')); return; }
    UPLOADED_IMAGE_URL = null; 
    
    document.getElementById('app-content').innerHTML = `
    <div class="fade-up"><div class="card-custom">
        <h4 class="fw-bold text-center mb-4">ส่งผลการฝึกซ้อม</h4>
        <form id="recordForm">
            <div class="bg-light p-3 rounded-4 mb-4 d-flex justify-content-between align-items-center">
                <div><strong class="text-dark fs-5">${CACHED_USER}</strong></div><span class="badge bg-secondary rounded-pill px-3 py-2">${CACHED_TEAM}</span>
            </div>
            <div class="mb-4">
                <div class="card border-0 bg-light rounded-4 p-3 text-center" style="border: 2px dashed #ccc !important; cursor: pointer;" onclick="if(!document.getElementById('uploadProgressBar')) document.getElementById('recFile').click()">
                    <div id="uploadPlaceholder"><i class="bi bi-cloud-arrow-up-fill text-secondary fs-1"></i><p class="text-muted small">แตะเพื่ออัปโหลดรูป</p></div>
                    <div id="uploadProgressContainer" style="display:none;" class="mt-3">
                        <div class="progress" style="height: 20px; border-radius: 10px;"><div id="uploadProgressBar" class="progress-bar progress-bar-striped progress-bar-animated bg-success" style="width: 0%">0%</div></div>
                        <small class="text-muted mt-1 d-block">กำลังอัปโหลดรูปภาพ...</small>
                    </div>
                    <div id="uploadSuccess" style="display:none;"><img id="previewImg" src="" class="mt-2 rounded-3 shadow-sm" style="max-height: 150px; width: auto;"><div class="mt-2 text-success fw-bold"><i class="bi bi-check-circle-fill"></i> เรียบร้อย</div></div>
                </div>
                <input type="file" id="recFile" accept="image/*" style="display:none;" onchange="handleFileSelect(this)">
            </div>
            <div class="mb-4"><input type="number" class="form-control form-control-lg rounded-4 text-center" id="recCalories" placeholder="0 kcal" required disabled style="font-size:2rem; height: 70px;"></div>
            <button type="submit" id="submitBtn" class="btn w-100 py-3 rounded-pill text-white fw-bold shadow-sm" style="background: #ccc; border:none;" disabled>กรุณาอัปโหลดรูปก่อน</button>
        </form>
    </div></div>`;
    document.getElementById('recordForm').addEventListener('submit', handleRecordSubmit);
}

function handleFileSelect(input) {
    const file = input.files[0]; if (!file) return;
    document.getElementById('uploadPlaceholder').style.display = 'none';
    document.getElementById('uploadProgressContainer').style.display = 'block';
    const progressBar = document.getElementById('uploadProgressBar');
    
    progressBar.style.width = '10%'; progressBar.innerText = '10%'; 

    const reader = new FileReader();
    reader.onload = function(e) { 
        const img = new Image(); img.src = e.target.result; 
        img.onload = function() { 
            const canvas = document.createElement('canvas'); const ctx = canvas.getContext('2d'); 
            const MAX = 800; // ลดลงเล็กน้อยเพื่อความเสถียรบนมือถือ
            let w = img.width, h = img.height; 
            if (w > h) { if (w > MAX) { h *= MAX/w; w = MAX; } } else { if (h > MAX) { w *= MAX/h; h = MAX; } } 
            canvas.width = w; canvas.height = h; ctx.drawImage(img, 0, 0, w, h); 
            
            const base64Data = canvas.toDataURL(file.type, 0.7).split(',')[1];
            progressBar.style.width = '40%'; progressBar.innerText = '40%';

            fetchAPI('uploadImage', { base64Data: base64Data, mimeType: file.type, fileName: file.name }, 'POST')
            .then(res => {
                if(res.success) {
                    progressBar.style.width = '100%'; progressBar.innerText = '100%';
                    setTimeout(() => {
                        document.getElementById('uploadProgressContainer').style.display = 'none';
                        document.getElementById('uploadSuccess').style.display = 'block';
                        document.getElementById('previewImg').src = res.imageUrl; 
                        UPLOADED_IMAGE_URL = res.imageUrl; 
                        document.getElementById('recCalories').disabled = false;
                        const btn = document.getElementById('submitBtn');
                        btn.disabled = false;
                        btn.style.background = 'linear-gradient(90deg, #D93026, #1A73E8)';
                        btn.innerHTML = 'บันทึกคะแนน';
                    }, 500);
                } else throw new Error(res.error);
            })
            .catch(err => {
                document.getElementById('uploadProgressContainer').style.display = 'none';
                document.getElementById('uploadPlaceholder').style.display = 'block';
                Swal.fire('Upload Failed', err.message, 'error');
            });
        } 
    }; reader.readAsDataURL(file);
}

function handleRecordSubmit(e) { 
    e.preventDefault(); 
    if(!UPLOADED_IMAGE_URL) { Swal.fire('Error', 'ไม่พบรูปภาพ', 'error'); return; }
    const btn = document.getElementById('submitBtn'); btn.disabled = true; btn.innerHTML = 'กำลังบันทึก...'; 
    fetchAPI('saveRecord', { name: CACHED_USER, team: CACHED_TEAM, calories: document.getElementById('recCalories').value, imageUrl: UPLOADED_IMAGE_URL }, 'POST')
    .then(res => {
        if(res.success) { Swal.fire('สำเร็จ!', 'ส่งผลเรียบร้อย', 'success').then(() => switchTab('dashboard')); }
        else Swal.fire('Error', res.error, 'error');
    }).finally(() => { btn.disabled = false; btn.innerHTML = 'บันทึกคะแนน'; });
}

// ... ฟังก์ชันอื่น (Dashboard, Register, Helper) ให้คงไว้เหมือนเดิม ...
function loadDashboard() { fetchAPI('getDashboard').then(data => { renderDashboard(data); }); }
function renderDashboard(data) { 
     // (นำโค้ด Dashboard เดิมมาใส่ตรงนี้ หรือใช้โค้ดจาก Script เก่า)
     document.getElementById('app-content').innerHTML = `<div class="fade-up"><div class="card-custom text-center"><h3 class="fw-bold">Leaderboard</h3><p>Team A: ${data.teamA} vs Team B: ${data.teamB}</p></div></div>`;
}
function showLandingPage() { 
    document.getElementById('app-content').innerHTML = '<div class="text-center pt-5"><button class="btn btn-primary" onclick="loadRegisterForm()">ลงทะเบียน</button></div>';
}
function loadRegisterForm() { /* โค้ดลงทะเบียนเดิม */ }
function updateHeaderBadge() { document.getElementById('headerUserBadge').style.display = CACHED_USER ? 'block' : 'none'; document.getElementById('headerUserBadge').innerHTML = CACHED_USER || ''; }
