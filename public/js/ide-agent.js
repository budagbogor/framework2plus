function createAutonomousTaskQueue(){
    return [
        { key: 'plan', label: 'Plan', goal: 'Menyusun blueprint arsitektur dan file map.', status: 'pending' },
        { key: 'scaffold', label: 'Scaffold', goal: 'Membuat baseline file dan bootstrap yang bisa dijalankan.', status: 'pending' },
        { key: 'implement', label: 'Implement', goal: 'Membangun fitur inti sesuai MASTERPLAN.', status: 'pending' },
        { key: 'test', label: 'Test', goal: 'Menambah test, memperbaiki import, dan validasi script.', status: 'pending' },
        { key: 'harden', label: 'Harden', goal: 'Merapikan docs, env, CI, dan deployment.', status: 'pending' },
        { key: 'package', label: 'Package', goal: 'Menutup checklist release dan packaging final.', status: 'pending' }
    ];
}

function ensureAutonomousQueue(){
    if (!Array.isArray(S.buildQueue) || !S.buildQueue.length) {
        S.buildQueue = createAutonomousTaskQueue();
    }
    return S.buildQueue;
}

function updateQueueStep(stepKey, status){
    const queue = ensureAutonomousQueue();
    let activeGoal = '';
    queue.forEach(step => {
        if (step.key === stepKey) {
            step.status = status;
            activeGoal = step.goal || '';
        } else if (status === 'active' && step.status === 'active') {
            step.status = 'pending';
        }
    });
    saveWorkspaceToLocal();
    if (status === 'active') {
        refreshBuildMeta({
            currentGoal: activeGoal || S.buildMeta.currentGoal,
            lastReason: `queue-${stepKey}-${status}`
        });
    }
    render();
}

async function runQueuedAgentStep(stepKey, systemPrompt, userPrompt, phase){
    updateQueueStep(stepKey, 'active');
    if (phase) {
        refreshBuildMeta({
            phase,
            lastReason: `queue-${stepKey}-start`
        });
    }
    await processBuildStep(systemPrompt, userPrompt);
    updateQueueStep(stepKey, 'completed');
}

function syncTaskPlannerArtifact(){
    const planner = createTaskPlanFromWorkspace();
    S.virtualWorkspace['TASK_PLAN.md'] = planner.md;
    if (S.isNative && invoke) {
        invoke('save_file', { path: `${getNativeProjectRoot()}/TASK_PLAN.md`, content: planner.md });
    }
    return planner;
}

async function maybeRunNativeReleasePipeline(){
    const runtime = detectWorkspaceRuntime();
    if (!S.isNative || !runtime.hasTauri || !runtime.desktopBundleCommand) return;
    addBuildLog(`QUEUE HOOK: paket desktop terdeteksi, memulai release automation.`, "agent");
    refreshBuildMeta({
        summary: 'Queue selesai. Menjalankan pipeline desktop install/test/build/bundle.',
        currentGoal: 'Menjalankan release automation untuk Tauri Windows build.',
        lastReason: 'desktop-release-automation'
    });
    const ok = await runDesktopReleasePipeline({ source: 'queue-hook' });
    if (!ok) {
        refreshBuildMeta({
            phase: 'package',
            summary: 'Pipeline desktop gagal. Periksa terminal native dan perbaiki command yang gagal.',
            currentGoal: 'Menstabilkan langkah release yang gagal.',
            lastReason: 'desktop-release-failed'
        });
    }
}

async function startAutonomousBuild(){
    if(!S.aiConfig.enabled || !S.aiConfig.connected){
        addBuildLog("AI Settings belum aktif. Hubungkan AI terlebih dahulu sebelum menjalankan autonomous build.", "error");
        render();
        alert("AI Settings belum aktif. Silakan hubungkan AI (Puter.js atau OpenRouter) terlebih dahulu.");
        openAIPanel();
        return;
    }

    if(!S.generated){
        addBuildLog("Blueprint project belum dibuat. Jalankan generate project dulu sebelum memulai pembangunan otonom.", "error");
        render();
        alert("Blueprint project belum tersedia. Silakan generate project dulu.");
        return;
    }

    S.building = true;
    S.buildLogs = [];
    S.virtualWorkspace = {};
    S.activeFile = null;
    S.chatHistory = [];
    S.activeTab = 'builder';
    S.buildMeta = defaultBuildMeta();
    S.buildQueue = createAutonomousTaskQueue();
    S.nativeCommands = {};
    S.nativeCommandState = { activeCount: 0, currentLabel: '', lastStatus: 'idle', lastExitCode: null, lastCommandId: null };
    S.releasePipeline = { active: false, steps: [], currentStep: '', lastResult: 'idle' };
    S.releaseArtifacts = [];
    addBuildLog("SUPREME SYSTEM INITIALIZED. AUTHORIZING PROFESSIONAL AGENT...", "info");
    addBuildLog("WORLD-CLASS DESIGN SYSTEM: APPLIED.", "info");
    refreshBuildMeta({
        phase: 'planning',
        summary: 'Menyusun blueprint project dari deskripsi dan stack terpilih.',
        currentGoal: 'Membuat MASTERPLAN, TECH_NOTES, dan baseline workspace.',
        lastReason: 'build-start'
    });
    syncTaskPlannerArtifact();
    render();

    try {
        await runAutonomousLoop();
    } catch(err) {
        addBuildLog(`CRITICAL ERROR: ${err.message}`, "error");
        S.building = false;
        render();
    }
}

function addBuildLog(msg, type='info'){
    const time = new Date().toLocaleTimeString();
    S.buildLogs.push({time, msg, type});
    saveWorkspaceToLocal();
    render();
    setTimeout(() => {
        const term = document.getElementById('buildTerminal');
        if(term) term.scrollTop = term.scrollHeight;
    }, 50);
}

function viewVirtualFile(p){
    S.activeFile = p;
    render();
}

async function submitAgentChat() {
    const input = document.getElementById('agentChatInput');
    const msg = input.value.trim();
    if (!msg || S.building) return;

    input.value = '';
    addBuildLog(`USER: ${msg}`, 'agent');

    S.building = true;
    refreshBuildMeta({
        phase: 'revision',
        summary: `Menjalankan revisi user: ${msg}`,
        currentGoal: 'Memodifikasi workspace tanpa merusak file yang tidak terkait.',
        lastReason: 'user-revision'
    });
    render();

    try {
        const agentContext = collectAgentContext();

        const systemPrompt = `Kamu adalah SENIOR FULLSTACK DEVELOPER.
Tugas: Melakukan REVISI atau PENAMBAHAN FITUR berdasarkan permintaan USER.
Konteks Workspace: [${agentContext.workspaceFiles.join(", ")}]
Isi MASTERPLAN.md Saat Ini:
${agentContext.masterplan || "Belum ada masterplan."}

BUILD STATUS:
${agentContext.buildStatus || "Belum ada build status."}

ACTIVE FILE:
${agentContext.activeFile || "Tidak ada file aktif"}

ACTIVE FILE CONTENT:
${agentContext.activeContent || "Tidak ada"}

RECENT CHAT:
${agentContext.recentChat || "Belum ada"}

RECENT LOGS:
${agentContext.recentLogs || "Belum ada"}

ATURAN:
1. Jika user meminta revisi, perbarui file yang ada atau buat file baru.
2. JANGAN menghapus file yang tidak terkait dengan revisi.
3. Tetap gunakan format JSON yang konsisten.
4. Update MASTERPLAN.md jika ada perubahan arsitektur besar.
5. DILARANG menggunakan atribut 'integrity' pada tag <link> atau <script> untuk library eksternal (seperti FontAwesome, Google Fonts, dll) karena sering menyebabkan error pemblokiran di browser.
6. Jika ada import rusak, script hilang, test belum ada, atau deployment belum siap, prioritaskan itu.

FORMAT RESPONS (Valid JSON):
{
  "logs": ["Status revisi"],
  "summary": "Ringkasan revisi singkat",
  "current_goal": "Target revisi saat ini",
  "remaining_tasks": ["task berikutnya jika ada"],
  "critical_files": ["file penting yang wajib ada"],
  "files": [
    {"path": "file/diperbarui.ext", "content": "kode baru"}
  ],
  "finished": true
}`;

        const userPrompt = `USER REQUEST: "${msg}"
Lakukan perubahan yang diperlukan agar hasil sesuai dengan permintaan user di atas.`;

        S.chatHistory.push({ role:'user', message: msg });
        await processBuildStep(systemPrompt, userPrompt);
        S.chatHistory.push({ role:'assistant', message: `Revisi diproses untuk: ${msg}` });
        addBuildLog("REVISION COMPLETED SUCCESSFULLY.", "success");
    } catch (err) {
        addBuildLog(`REVISION ERROR: ${err.message}`, "error");
    } finally {
        S.building = false;
        render();
    }
}

async function runAutonomousLoop(){
    const g = S.generated;
    let iteration = 0;
    const maxIterations = 8;
    ensureAutonomousQueue();

    addBuildLog("PHASE 0: MANUFACTURING ARCHITECTURAL BLUEPRINT...", "agent");
    refreshBuildMeta({
        phase: 'planning',
        summary: 'Agent menyusun arsitektur, file map, dan catatan deployment.',
        currentGoal: 'Melahirkan blueprint yang bisa dieksekusi menjadi workspace nyata.',
        lastReason: 'architect-blueprint'
    });

    const blueprintPrompt = `Role: SENIOR SYSTEM ARCHITECT.
Project: ${g.name} (${S.mode})
Description: ${S.answers.projectName}
Tech Stack: ${g.fe || g.fw || ''} | ${g.be || ''} | ${g.db || ''}

TUGAS: Buat file MASTERPLAN.md dan TECH_NOTES.md sangat detail.
Masterplan harus mencakup daftar semua file yang akan kita bangun agar aplikasi 100% fungsional hingga siap DEPLOY.
Sertakan checklist implementasi yang jelas dengan format markdown "- [ ] task" agar progres dapat dilacak.
Tech Notes harus mencakup panduan deployment (Vercel/Docker).

FORMAT RESPONS (Valid JSON):
{
  "logs": ["Designing architecture...", "Planning deployment strategy..."],
  "summary": "Ringkasan kondisi workspace setelah fase ini",
  "current_goal": "Fokus fase saat ini",
  "remaining_tasks": ["task lanjutan"],
  "critical_files": ["daftar file inti project"],
  "files": [
    {"path": "MASTERPLAN.md", "content": "..."},
    {"path": "TECH_NOTES.md", "content": "..."}
  ]
}`;

    await runQueuedAgentStep('plan', "Kamu adalah SENIOR SYSTEM ARCHITECT.", blueprintPrompt, 'planning');
    syncTaskPlannerArtifact();
    addBuildLog("ARCHITECTURE ESTABLISHED. STARTING RECURSIVE BUILD LOOP.", "success");

    const scaffoldSystemPrompt = `Kamu adalah LEAD ENGINEER.
Tugas: menyiapkan baseline workspace yang benar-benar runnable.
Prioritas:
1. package.json / config / entry file harus valid
2. struktur folder modular
3. script dev/build/test masuk akal
4. jangan merusak file yang sudah ada

FORMAT RESPONS (Valid JSON):
{
  "logs": ["status"],
  "summary": "ringkasan",
  "current_goal": "fokus",
  "remaining_tasks": ["task"],
  "critical_files": ["file"],
  "files": [{"path":"file","content":"isi"}],
  "finished": false
}`;
    const scaffoldUserPrompt = `Siapkan baseline project ${g.name} agar workspace punya bootstrap yang bisa dijalankan.
Fokus pada package manager, app entry, config, dan wiring awal modul.`;
    await runQueuedAgentStep('scaffold', scaffoldSystemPrompt, scaffoldUserPrompt, 'implementation');
    syncTaskPlannerArtifact();

    updateQueueStep('implement', 'active');
    while(S.building && iteration < maxIterations){
        iteration++;
        const currentFiles = Object.keys(S.virtualWorkspace).join(", ");
        const agentContext = collectAgentContext();
        refreshBuildMeta({
            phase: 'implementation',
            currentGoal: `Iterasi ${iteration}: menambah modul yang belum ada dan menyambungkan integrasi.`,
            lastReason: `iteration-${iteration}`
        });

        const systemPrompt = `Kamu adalah SENIOR PROFESSIONAL DEVELOPER AGENT.
Bekerja secara otonom 100% sampai aplikasi SELESAI dan SIAP DEPLOY.
Konteks Workspace: [${currentFiles}]
Workspace intelligence:
- projectType: ${agentContext.insights.runtime.projectType}
- packageManager: ${agentContext.insights.runtime.packageManager}
- healthScore: ${agentContext.insights.healthScore}
- hasTests: ${agentContext.insights.hasTests}
- hasEnvExample: ${agentContext.insights.hasEnvExample}
- hasCi: ${agentContext.insights.hasCi}

ATURAN:
1. JANGAN berhenti sampai semua fitur di MASTERPLAN.md terimplementasi.
2. Tulis kode nyata, lengkap, fungsional, dan modular.
3. Di iterasi terakhir, wajib sertakan file konfigurasi deployment (misal vercel.json).
4. SET finished: true HANYA jika project sudah 100% tuntas.
5. DILARANG menggunakan atribut 'integrity' pada tag <link> atau <script> untuk library eksternal (seperti FontAwesome, Google Fonts, dll) karena sering menyebabkan error pemblokiran di browser.
6. Jika package.json ada, pastikan scripts dev/build/test masuk akal untuk project.
7. Prioritaskan import yang valid, struktur modular, dan file bootstrap yang bisa benar-benar dijalankan.

FORMAT RESPONS (Valid JSON):
{
  "logs": ["Status koding iterasi ini"],
  "summary": "Ringkasan hasil iterasi",
  "current_goal": "Fokus iterasi berikutnya",
  "remaining_tasks": ["task yang masih terbuka"],
  "critical_files": ["file inti yang wajib ada"],
  "files": [
    {"path": "folder/nama.ext", "content": "isi kode"}
  ],
  "finished": boolean
}`;

        const userPrompt = `Iterasi #${iteration}: Lanjutkan pembangunan proyek ${g.name}.
Lihat MASTERPLAN.md dan bangun modul/file berikutnya yang belum ada.
Pastikan semua file saling terhubung (imports) dengan sempurna.`;

        addBuildLog(`ITERATION #${iteration} IN PROGRESS...`, "info");
        await processBuildStep(systemPrompt, userPrompt);
        syncTaskPlannerArtifact();

        if (!S.building) break;
    }
    updateQueueStep('implement', 'completed');

    if (S.building) {
        const testSystemPrompt = `Kamu adalah QA ENGINEER + BUILD DOCTOR.
Tugas: periksa kelengkapan script, test, import, dan file konfigurasi yang bisa memicu runtime error.
Prioritaskan menambah test minimum, memperbaiki import rusak, dan memastikan script test/build valid.

FORMAT RESPONS (Valid JSON):
{
  "logs": ["status"],
  "summary": "ringkasan",
  "current_goal": "fokus",
  "remaining_tasks": ["task"],
  "critical_files": ["file"],
  "files": [{"path":"file","content":"isi"}],
  "finished": false
}`;
        const testUserPrompt = `Audit workspace ${g.name} untuk kebutuhan testing dan reliability.
Tambahkan test yang paling penting, perbaiki broken import, dan rapikan command test/build jika perlu.`;
        await runQueuedAgentStep('test', testSystemPrompt, testUserPrompt, 'implementation');
        syncTaskPlannerArtifact();
    }

    if (S.building) {
        const hardenSystemPrompt = `Kamu adalah RELEASE ENGINEER.
Tugas: hardening workspace untuk production readiness.
Prioritas:
1. README, .env.example, CI, deployment notes
2. error handling dasar
3. release config yang masih kurang

FORMAT RESPONS (Valid JSON):
{
  "logs": ["status"],
  "summary": "ringkasan",
  "current_goal": "fokus",
  "remaining_tasks": ["task"],
  "critical_files": ["file"],
  "files": [{"path":"file","content":"isi"}],
  "finished": false
}`;
        const hardenUserPrompt = `Lakukan production hardening untuk ${g.name}.
Lengkapi dokumentasi setup, env example, CI, deployment, dan file release lain yang belum ada.`;
        await runQueuedAgentStep('harden', hardenSystemPrompt, hardenUserPrompt, 'implementation');
        syncTaskPlannerArtifact();
    }

    if (S.building) {
        const reviewSystemPrompt = `Kamu adalah PRINCIPAL CODE REVIEWER.
Tugas: lakukan review gate sebelum packaging.
Prioritas:
1. blocker runtime / import / config
2. missing file yang membuat build gagal
3. test gap paling kritis
4. regression risk pada bootstrap atau packaging

FORMAT RESPONS (Valid JSON):
{
  "logs": ["status"],
  "summary": "ringkasan",
  "current_goal": "fokus",
  "remaining_tasks": ["task"],
  "critical_files": ["file"],
  "files": [{"path":"file","content":"isi"}],
  "finished": false
}`;
        const reviewUserPrompt = `Lakukan review gate final untuk ${g.name}.
Jika ada blocker nyata, perbaiki langsung file yang perlu diperbarui sebelum langkah package.`;
        await processBuildStep(reviewSystemPrompt, reviewUserPrompt);
        syncTaskPlannerArtifact();
    }

    if (S.building) {
        const packageSystemPrompt = `Kamu adalah STAFF ENGINEER yang bertugas menutup release candidate.
Tugas: sinkronkan file terakhir yang dibutuhkan agar project siap dipackage, di-install, atau dideploy.
Jika project sudah benar-benar siap, set finished true.

FORMAT RESPONS (Valid JSON):
{
  "logs": ["status"],
  "summary": "ringkasan",
  "current_goal": "fokus",
  "remaining_tasks": ["task"],
  "critical_files": ["file"],
  "files": [{"path":"file","content":"isi"}],
  "finished": true
}`;
        const packageUserPrompt = `Finalisasi ${g.name} sebagai release candidate.
Pastikan checklist utama tuntas, file packaging/deployment ada, dan workspace siap diekspor ke project nyata.`;
        await runQueuedAgentStep('package', packageSystemPrompt, packageUserPrompt, 'ready');
        syncTaskPlannerArtifact();
    }

    S.building = false;
    refreshBuildMeta({
        phase: 'ready',
        summary: 'Autonomous build selesai. Workspace siap diekspor, di-install, dan dijalankan.',
        currentGoal: 'Verifikasi manual, install dependency, lalu jalankan preview.',
        lastReason: 'build-finished'
    });
    await maybeRunNativeReleasePipeline();
    addBuildLog("100% COMPLETION REACHED. THE SYSTEM IS READY FOR DEPLOYMENT.", "success");
    addBuildLog("Final Steps: Download source, run 'npm install', then 'npm run dev' or 'vercel deploy'.", "agent");
    render();
}

async function processBuildStep(system, user){
    const beforeWorkspace = Object.fromEntries(getWorkspaceFileEntries());
    const agentContext = collectAgentContext();
    const profile = getAgentProfilePresets()[S.aiProfile] || getAgentProfilePresets().builder;
    const enrichedSystem = `${system}

PROJECT BRAIN SUMMARY:
${agentContext.projectBrain?.summary || 'Belum ada project brain.'}

PROJECT BRAIN RISKS:
${(agentContext.projectBrain?.risks || []).join('\n') || 'Tidak ada risiko mayor yang terdeteksi.'}

ACTIVE AI PROFILE: ${profile.label}
PROFILE GUIDANCE: ${profile.guidance}`;
    const prov = AI_PROVIDERS[S.aiConfig.provider];
    const body = {
        model: S.aiConfig.model,
        messages: [{role:'system', content:enrichedSystem}, {role:'user', content:user}],
        response_format: {type: 'json_object'}
    };

    let res;
    if (S.aiConfig.provider === 'puter') {
        const combined = `${enrichedSystem}\n\n${user}`;
        await waitForPuterReady(5000);
        const resp = await withTimeout(puter.ai.chat(combined, {model: S.aiConfig.model}), 12000, 'Puter.js generation');
        res = { ok: true, json: async () => {
            let content = resp.toString().replace(/```json/g, '').replace(/```/g, '').trim();
            try { return JSON.parse(content); } catch(e) {
                const match = content.match(/\{[\s\S]*\}/);
                return JSON.parse(match ? match[0] : '{}');
            }
        }};
    } else {
        const shouldUseProxy = S.isNative ? S.aiConfig.provider !== 'puter' : S.aiConfig.useProxy;
        if (shouldUseProxy) {
            res = await requestAIProxy({
                provider: S.aiConfig.provider,
                apiUrl: `${prov.baseUrl}/chat/completions`,
                apiKey: S.aiConfig.apiKey,
                payload: body
            });
        } else {
            res = await withTimeout(fetch(`${prov.baseUrl}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${S.aiConfig.apiKey}`
                },
                body: JSON.stringify(body)
            }), 20000, `${S.aiConfig.provider} generation fetch`);
        }
    }

    if(res.ok){
        const data = await res.json();
        let result = {};
        const rawContent = data.choices ? data.choices[0].message.content : (data.content || data);
        let clean = typeof rawContent === 'string' ? rawContent.replace(/```json/g, '').replace(/```/g, '').trim() : rawContent;

        try {
            result = typeof clean === 'string' ? JSON.parse(clean) : clean;
        } catch(e) {
            console.warn("Standard JSON parse failed, attempting deep clean...", e);
            try {
                const match = clean.match(/\{[\s\S]*\}/);
                if(match){
                    let deepClean = match[0]
                        .replace(/\\n/g, "\\n")
                        .replace(/\\'/g, "'")
                        .replace(/[\u0000-\u001F\u007F-\u009F]/g, "");
                    result = JSON.parse(deepClean);
                } else {
                    throw e;
                }
            } catch(e2) {
                addBuildLog("AI Response Corrupted. Retrying internal parsing...", "error");
                result = { logs: ["Error parsing AI response"], files: [], finished: false };
            }
        }

        result.logs = normalizeList(result.logs);
        result.remaining_tasks = normalizeList(result.remaining_tasks);
        result.critical_files = normalizeList(result.critical_files);
        if(result.next_focus && !result.current_goal) result.current_goal = result.next_focus;
        (result.logs || []).forEach(l => addBuildLog(l, "info"));
        (result.files || []).forEach(f => {
            const fullPath = S.isNative ? `${getNativeProjectRoot()}/${f.path}` : f.path;
            S.virtualWorkspace[f.path] = f.content;

            if (S.isNative && invoke) {
                invoke('save_file', { path: fullPath, content: f.content });
            }

            addBuildLog(`Manufacturing module: ${f.path}`, "success");
            if(!S.activeFile) S.activeFile = f.path;
        });
        const diff = diffWorkspaceFiles(beforeWorkspace, Object.fromEntries(getWorkspaceFileEntries()));
        S.virtualWorkspace['CHANGES_LAST_STEP.json'] = JSON.stringify(diff, null, 2);
        if (S.isNative && invoke) {
            invoke('save_file', { path: `${getNativeProjectRoot()}/CHANGES_LAST_STEP.json`, content: S.virtualWorkspace['CHANGES_LAST_STEP.json'] });
        }
        refreshBuildMeta({
            summary: result.summary || `Workspace diperbarui dengan ${(result.files || []).length} file dari agent.`,
            currentGoal: result.current_goal || S.buildMeta.currentGoal,
            remainingTasks: result.remaining_tasks,
            criticalFiles: result.critical_files,
            lastChangedFiles: diff.touched,
            phase: result.finished ? 'ready' : (S.building ? 'implementation' : S.buildMeta.phase),
            lastReason: 'ai-step'
        });
        syncDoctorArtifacts();
        syncProjectBrainArtifacts();

        if(result.finished) S.building = false;
        render();
    } else {
        throw new Error("Gagal berkomunikasi dengan AI.");
    }
}

async function downloadVirtualProject(){
    const zip = new JSZip();
    const folderName = slug(S.generated.name);
    const root = zip.folder(folderName);

    addBuildLog("PACKAGING SOURCE FOR PRODUCTION...", "info");

    for(const [path, content] of Object.entries(S.virtualWorkspace)){
        if(path.endsWith('.md') && (path.includes('MASTERPLAN') || path.includes('TECH_NOTES'))){
            root.file(`DOCS/${path}`, content);
        } else {
            root.file(path, content);
        }
    }

    const blob = await zip.generateAsync({type:'blob'});
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `PRO-SOURCE-${folderName}.zip`;
    link.click();
    addBuildLog("DOWNLOAD STARTED. YOUR PROFESSIONAL CODE BASE IS READY.", "success");
}

function restart(){
    localStorage.removeItem('devforge_logs');
    localStorage.removeItem('devforge_workspace');
    localStorage.removeItem('devforge_build_meta');
    localStorage.removeItem('devforge_build_queue');
    localStorage.removeItem('devforge_release_pipeline');
    localStorage.removeItem('devforge_release_artifacts');
    Object.assign(S, {
        mode: null,
        step: 0,
        answers: {},
        generating: false,
        generated: null,
        activeTab: null,
        building: false,
        buildLogs: [],
        virtualWorkspace: {},
        buildQueue: [],
        buildMeta: defaultBuildMeta(),
        nativeCommands: {},
        nativeCommandState: { activeCount: 0, currentLabel: '', lastStatus: 'idle', lastExitCode: null, lastCommandId: null },
        releasePipeline: { active: false, steps: [], currentStep: '', lastResult: 'idle' },
        releaseArtifacts: [],
        activeFile: null,
        chatHistory: []
    });
    render();
    window.scrollTo(0, 0);
}

function installBuilderActionBindings(){
    if (window.__builderActionBindingsInstalled) return;
    window.__builderActionBindingsInstalled = true;

    document.addEventListener('click', (event) => {
        const trigger = event.target.closest('[data-builder-action="start-autonomous-build"]');
        if (!trigger) return;
        event.preventDefault();
        startAutonomousBuild();
    });
}

// Expose critical builder actions explicitly so inline handlers and
// the native action bridge can resolve them reliably across runtimes.
window.startAutonomousBuild = startAutonomousBuild;
window.submitAgentChat = submitAgentChat;
window.viewVirtualFile = viewVirtualFile;
window.downloadVirtualProject = downloadVirtualProject;
window.restart = restart;
installBuilderActionBindings();
