function ensureNativeCommandRegistry() {
    if (!S.nativeCommands || typeof S.nativeCommands !== 'object') S.nativeCommands = {};
    if (!S.nativeCommandState || typeof S.nativeCommandState !== 'object') {
        S.nativeCommandState = { activeCount: 0, currentLabel: '', lastStatus: 'idle', lastExitCode: null, lastCommandId: null };
    }
    return S.nativeCommands;
}

function defaultReleasePipelineState() {
    return {
        active: false,
        currentStep: '',
        lastResult: 'idle',
        steps: [
            { key: 'install', label: 'Install', status: 'pending' },
            { key: 'test', label: 'Test', status: 'pending' },
            { key: 'build', label: 'Build', status: 'pending' },
            { key: 'bundle', label: 'Bundle', status: 'pending' }
        ]
    };
}

async function refreshReleaseArtifacts() {
    if (!S.isNative || !invoke) return [];
    try {
        const artifacts = await invoke('list_release_artifacts', { projectRoot: getNativeProjectRoot() });
        S.releaseArtifacts = Array.isArray(artifacts) ? artifacts : [];
        saveWorkspaceToLocal();
        render();
        return S.releaseArtifacts;
    } catch (error) {
        addBuildLog(`Gagal membaca artefak release: ${error?.message || String(error)}`, 'error');
        return [];
    }
}

function ensureReleasePipelineState() {
    if (!S.releasePipeline || !Array.isArray(S.releasePipeline.steps)) {
        S.releasePipeline = defaultReleasePipelineState();
    }
    return S.releasePipeline;
}

function resetReleasePipelineState() {
    S.releasePipeline = defaultReleasePipelineState();
    saveWorkspaceToLocal();
    render();
}

function updateReleaseStep(stepKey, status) {
    const pipeline = ensureReleasePipelineState();
    pipeline.steps = pipeline.steps.map(step => step.key === stepKey ? { ...step, status } : step);
    pipeline.currentStep = status === 'running' ? stepKey : pipeline.currentStep;
    if (status === 'completed') pipeline.lastResult = 'running';
    if (status === 'failed') {
        pipeline.active = false;
        pipeline.currentStep = stepKey;
        pipeline.lastResult = 'failed';
    }
    saveWorkspaceToLocal();
    render();
}

function finishReleasePipeline(success) {
    const pipeline = ensureReleasePipelineState();
    pipeline.active = false;
    pipeline.currentStep = success ? 'bundle' : pipeline.currentStep;
    pipeline.lastResult = success ? 'completed' : 'failed';
    saveWorkspaceToLocal();
    render();
    if (success) {
        refreshReleaseArtifacts();
    }
}

function createNativeCommandId(label) {
    const slug = String(label || 'command').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'command';
    return `${slug}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function refreshNativeCommandState() {
    ensureNativeCommandRegistry();
    const commands = Object.values(S.nativeCommands);
    const active = commands.filter(item => item && (item.status === 'queued' || item.status === 'started'));
    const last = commands.slice().reverse().find(Boolean);
    S.nativeCommandState = {
        activeCount: active.length,
        currentLabel: active[0]?.label || '',
        lastStatus: last?.status || 'idle',
        lastExitCode: last?.exitCode ?? null,
        lastCommandId: last?.commandId || null
    };
}

function completeNativeCommand(commandId, patch) {
    ensureNativeCommandRegistry();
    const record = S.nativeCommands[commandId];
    if (!record) return null;
    Object.assign(record, patch || {});
    refreshNativeCommandState();
    render();
    return record;
}

async function invokeNativeCommand(commandLine, label, options = {}) {
    const parsed = parseCommandLine(commandLine);
    if (!parsed) {
        addBuildLog(`${label} command belum tersedia.`, "error");
        return false;
    }
    if (!invoke) {
        addBuildLog(`Bridge native Tauri belum tersedia untuk ${label}.`, "error");
        return false;
    }

    const registry = ensureNativeCommandRegistry();
    const commandId = createNativeCommandId(label);
    const record = {
        commandId,
        label,
        kind: options.kind || label,
        commandLine,
        status: 'queued',
        exitCode: null,
        error: null,
        isLongRunning: !!options.longRunning
    };

    let resolveCommand;
    let rejectCommand;
    const commandPromise = new Promise((resolve, reject) => {
        resolveCommand = resolve;
        rejectCommand = reject;
    });

    record.resolve = resolveCommand;
    record.reject = rejectCommand;
    record.promise = commandPromise;
    registry[commandId] = record;
    refreshNativeCommandState();

    addBuildLog(`Dispatching native ${label}: ${commandLine}`, "agent");
    render();

    try {
        await invoke('execute_command', {
            command_id: commandId,
            cmd: parsed.cmd,
            args: parsed.args,
            cwd: getNativeProjectRoot()
        });
        if (typeof options.onDispatch === 'function') {
            options.onDispatch(commandId, record);
        }
    } catch (error) {
        const message = error?.message || String(error);
        const failed = completeNativeCommand(commandId, { status: 'failed', error: message });
        if (failed?.reject) failed.reject(new Error(message));
        addBuildLog(`Native ${label} gagal dijalankan: ${message}`, "error");
        return false;
    }

    if (options.awaitCompletion === false) {
        return true;
    }

    try {
        await commandPromise;
        return true;
    } catch (error) {
        return false;
    }
}

async function stopNativeCommand(commandId, label = 'command') {
    if (!commandId) {
        addBuildLog(`Tidak ada native ${label} yang sedang berjalan.`, "amber");
        return false;
    }
    if (!invoke) {
        addBuildLog(`Bridge native Tauri belum tersedia untuk stop ${label}.`, "error");
        return false;
    }
    addBuildLog(`Stopping native ${label}...`, "info");
    try {
        await invoke('stop_command', { command_id: commandId });
        return true;
    } catch (error) {
        addBuildLog(`Gagal menghentikan native ${label}: ${error?.message || String(error)}`, "error");
        return false;
    }
}

function handleNativeTerminalOutput(payload) {
    if (!payload) return;
    const line = typeof payload === 'string' ? payload : payload.line;
    if (!line) return;
    const commandId = payload.command_id || payload.commandId || null;
    const stream = payload.stream || 'stdout';
    const record = commandId ? ensureNativeCommandRegistry()[commandId] : null;
    const label = record?.label ? `[${record.label}] ` : '';
    const type = stream === 'stderr' ? 'amber' : 'info';
    addBuildLog(`${label}${line}`, type);
}

function handleNativeCommandStatus(payload) {
    if (!payload?.command_id) return;
    const record = completeNativeCommand(payload.command_id, {
        status: payload.status || 'unknown',
        exitCode: payload.exit_code ?? null,
        error: payload.error || null
    });
    if (!record) return;

    if (payload.status === 'started') {
        addBuildLog(`Native ${record.label} started.`, "agent");
        return;
    }

    if (record.kind === 'install' && payload.status === 'completed') {
        S.isInstalled = true;
    }
    if (record.kind === 'dev' && payload.status !== 'started') {
        S.isDevRunning = false;
    }

    const exitLabel = payload.exit_code != null ? ` (exit ${payload.exit_code})` : '';
    if (payload.status === 'completed') {
        addBuildLog(`Native ${record.label} completed${exitLabel}.`, "success");
        if (record.resolve) record.resolve(payload);
        record.resolve = null;
        record.reject = null;
    } else if (payload.status === 'failed') {
        const message = payload.error || `Native ${record.label} failed${exitLabel}.`;
        addBuildLog(message, "error");
        if (record.reject) record.reject(new Error(message));
        record.resolve = null;
        record.reject = null;
    } else if (payload.status === 'stopped') {
        addBuildLog(`Native ${record.label} stopped${exitLabel}.`, "info");
        if (record.resolve) record.resolve(payload);
        record.resolve = null;
        record.reject = null;
    } else {
        if (record.resolve) record.resolve(payload);
    }
}

async function execReleaseCommand(commandLine, label, options = {}) {
    const parsed = parseCommandLine(commandLine);
    if (!parsed) {
        addBuildLog(`${label} command belum tersedia.`, "error");
        return false;
    }
    if (S.isNative) {
        return invokeNativeCommand(commandLine, label, options);
    }
    addBuildLog(commandLine, "agent");
    return true;
}

async function runDesktopReleasePipeline(options = {}) {
    const runtime = detectWorkspaceRuntime();
    if (!runtime.hasTauri || !runtime.desktopBundleCommand) {
        addBuildLog(`Desktop bundling tidak terdeteksi untuk workspace ini.`, "error");
        return false;
    }
    resetReleasePipelineState();
    const pipeline = ensureReleasePipelineState();
    pipeline.active = true;
    pipeline.lastResult = 'running';
    addBuildLog(`AUTOMATION: install -> test -> build -> bundle`, "agent");
    const execOptions = { ignoreBuildLock: true, source: 'release-pipeline' };

    if (!S.isInstalled) {
        updateReleaseStep('install', 'running');
        const installed = await execTerminalCmd('install', execOptions);
        if (!installed) {
            updateReleaseStep('install', 'failed');
            return false;
        }
        updateReleaseStep('install', 'completed');
        if (!S.isNative) await new Promise(r => setTimeout(r, 400));
    } else {
        updateReleaseStep('install', 'completed');
    }
    if (runtime.testCommand) {
        updateReleaseStep('test', 'running');
        const tested = await execTerminalCmd('test', execOptions);
        if (!tested) {
            updateReleaseStep('test', 'failed');
            return false;
        }
        updateReleaseStep('test', 'completed');
        if (!S.isNative) await new Promise(r => setTimeout(r, 400));
    } else {
        updateReleaseStep('test', 'skipped');
        addBuildLog(`AUTOMATION: test dilewati karena script test belum tersedia.`, "info");
    }
    if (runtime.buildCommand) {
        updateReleaseStep('build', 'running');
        const built = await execTerminalCmd('build', execOptions);
        if (!built) {
            updateReleaseStep('build', 'failed');
            return false;
        }
        updateReleaseStep('build', 'completed');
        if (!S.isNative) await new Promise(r => setTimeout(r, 400));
    } else {
        updateReleaseStep('build', 'skipped');
        addBuildLog(`AUTOMATION: build dilewati karena script build belum tersedia.`, "info");
    }
    updateReleaseStep('bundle', 'running');
    const bundled = await execReleaseCommand(runtime.desktopBundleCommand, 'desktop bundle', { kind: 'bundle' });
    if (!bundled) {
        updateReleaseStep('bundle', 'failed');
        return false;
    }
    updateReleaseStep('bundle', 'completed');
    finishReleasePipeline(true);
    addBuildLog(`AUTOMATION: desktop release pipeline completed.`, "success");
    render();
    return true;
}

async function execTerminalCmd(cmd, options = {}) {
    if (S.building && !options.ignoreBuildLock) return false;
    const runtime = detectWorkspaceRuntime();

    if (Object.keys(S.virtualWorkspace).length === 0) {
        addBuildLog(`Peringatan: Terminal ini adalah simulasi.`, "amber");
        addBuildLog(`-> Jalankan 'Mulai Pembangunan Otonom' agar perintah ini memiliki efek pada file nyata.`, "info");
    }

    if (cmd === 'install') {
        if (S.isNative) {
            if (!runtime.installCommand) {
                addBuildLog(`Install command tidak terdeteksi.`, "error");
                return false;
            }
            const ok = await invokeNativeCommand(runtime.installCommand, 'install', { kind: 'install' });
            render();
            return ok;
        }
        S.isInstalled = true;
        addBuildLog(runtime.installCommand || `npm install`, "agent");
        addBuildLog(`[1/4] Resolving packages...`, "info");
        await new Promise(r => setTimeout(r, 800));
        addBuildLog(`[2/4] Fetching packages...`, "info");
        await new Promise(r => setTimeout(r, 1200));
        addBuildLog(`[3/4] Linking dependencies...`, "info");
        await new Promise(r => setTimeout(r, 1000));
        addBuildLog(`[4/4] Building fresh packages...`, "success");
        addBuildLog(`added 1422 packages in 3s`, "success");
        render();
        return true;
    }

    if (cmd === 'dev') {
        if (S.isNative) {
            if (!runtime.devCommand) {
                addBuildLog(`Dev command belum tersedia untuk workspace ini.`, "error");
                return false;
            }
            if (S.isDevRunning) {
                const activeDev = Object.values(ensureNativeCommandRegistry()).find(item => item && item.kind === 'dev' && (item.status === 'queued' || item.status === 'started'));
                const stopped = await stopNativeCommand(activeDev?.commandId, 'dev');
                if (stopped) {
                    S.isDevRunning = false;
                    render();
                }
                return stopped;
            }
            S.isDevRunning = true;
            addBuildLog(`Starting native dev server with ${runtime.devCommand}...`, "agent");
            await invokeNativeCommand(runtime.devCommand, 'dev', { kind: 'dev', awaitCompletion: false, longRunning: true });
            render();
            return true;
        }
        S.isDevRunning = !S.isDevRunning;
        if (S.isDevRunning) {
            addBuildLog(runtime.devCommand || `npm run dev`, "agent");
            addBuildLog(`> ${runtime.devCommand || 'dev server'}`, "info");
            addBuildLog(`ready - started server on 0.0.0.0:3001 (VIRTUAL), url: <a href="javascript:void(0)" onclick="openLivePreview()" style="color:var(--accent); text-decoration:underline">http://localhost:3001</a>`, "success");
            addBuildLog(`event - compiled client and server successfully in 1248 ms (169 modules)`, "success");
        } else {
            addBuildLog(`Stopping dev server...`, "info");
            addBuildLog(`Dev server stopped.`, "error");
        }
        render();
        return true;
    }

    if (cmd === 'build') {
        if (!S.isInstalled) {
            addBuildLog(`Error: Please run 'npm install' first.`, "error");
            return false;
        }
        if (S.isNative) {
            if (!runtime.buildCommand) {
                addBuildLog(`Build command belum tersedia untuk workspace ini.`, "error");
                return false;
            }
            const ok = await invokeNativeCommand(runtime.buildCommand, 'build', { kind: 'build' });
            render();
            return ok;
        }
        addBuildLog(runtime.buildCommand || `npm run build`, "agent");
        addBuildLog(`Creating an optimized production build...`, "info");
        await new Promise(r => setTimeout(r, 2000));
        addBuildLog(`Compiled successfully.`, "success");
        addBuildLog(`Route (pages)                              Size     First Load JS`, "info");
        addBuildLog(`| o /                                      5.28 kB        78.1 kB`, "info");
        addBuildLog(`| lambda /api/hello                        0 B            72.8 kB`, "info");
        addBuildLog(`+ First Load JS shared by all              72.8 kB`, "info");
        render();
        return true;
    }

    if (cmd === 'test') {
        if (!S.isInstalled) {
            addBuildLog(`Error: Please run 'npm install' first.`, "error");
            return false;
        }
        if (S.isNative) {
            if (!runtime.testCommand) {
                addBuildLog(`Test command belum tersedia untuk workspace ini.`, "error");
                return false;
            }
            const ok = await invokeNativeCommand(runtime.testCommand, 'test', { kind: 'test' });
            render();
            return ok;
        }
        if (!runtime.testCommand) {
            addBuildLog(`Test command belum tersedia untuk workspace ini.`, "error");
            return false;
        }
        addBuildLog(runtime.testCommand, "agent");
        addBuildLog(`Running test suite...`, "info");
        await new Promise(r => setTimeout(r, 1500));
        addBuildLog(`No failing tests detected in virtual mode.`, "success");
        render();
        return true;
    }

    if (cmd === 'bundle') {
        if (!runtime.hasTauri || !runtime.desktopBundleCommand) {
            addBuildLog(`Bundle desktop Tauri belum tersedia untuk workspace ini.`, "error");
            return false;
        }
        if (!S.isInstalled) {
            addBuildLog(`Error: Please run 'npm install' first.`, "error");
            return false;
        }
        const ok = await execReleaseCommand(runtime.desktopBundleCommand, 'desktop bundle', { kind: 'bundle' });
        render();
        return ok;
    }

    if (cmd === 'release') {
        return runDesktopReleasePipeline({ source: 'manual-release' });
    }

    return false;
}
