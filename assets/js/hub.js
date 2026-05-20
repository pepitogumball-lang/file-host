(function() {
    const API = "https://file-host-mu.vercel.app/api/manage";
    const AUTH_KEY = "n_adm_token";
    const UID_KEY = "n_uid";
    const ADMIN_PASS = "Holaquetalsoypepi5#";

    const STORE = {
        id: () => {
            let uid = localStorage.getItem(UID_KEY);
            if (!uid) {
                uid = 'ninja-' + Math.random().toString(36).substring(2, 15) + '-' + Date.now().toString(36);
                localStorage.setItem(UID_KEY, uid);
            }
            return uid;
        },
        admin: (val) => val !== undefined ? localStorage.setItem(AUTH_KEY, val) : localStorage.getItem(AUTH_KEY),
        clear: () => localStorage.removeItem(AUTH_KEY)
    };

    const state = { isAdmin: false, files: [], loading: false };

    const UI = {
        css: `
            :root { --p: #58a6ff; --bg: #0d1117; --c: #161b22; --b: #30363d; --t: #c9d1d9; --s: #3fb950; --d: #f85149; --ov: rgba(0,0,0,0.85); }
            body { font-family: -apple-system, sans-serif; background: var(--bg); color: var(--t); margin: 0; padding: 20px; display: flex; flex-direction: column; align-items: center; min-height: 100vh; }
            .w { width: 100%; max-width: 600px; }
            .card { background: var(--c); border: 1px solid var(--b); border-radius: 8px; padding: 12px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center; transition: transform 0.1s; }
            .card:hover { border-color: var(--p); }
            .btn { background: #21262d; border: 1px solid var(--b); color: var(--t); padding: 8px 16px; border-radius: 6px; cursor: pointer; font-size: 13px; transition: 0.2s; display: inline-flex; align-items: center; gap: 5px; }
            .btn:hover { background: #30363d; border-color: #8b949e; }
            .btn-p { background: var(--s); color: white; border: none; font-weight: bold; }
            .btn-p:hover { background: #2ea043; }
            .btn-d { color: var(--d); border-color: #f8514933; }
            .btn-d:hover { background: #f8514911; border-color: var(--d); }
            
            .up-box { background: var(--c); border: 1px solid var(--b); padding: 25px; border-radius: 10px; margin-bottom: 25px; text-align: center; box-shadow: 0 4px 12px rgba(0,0,0,0.3); }
            .tag { font-size: 10px; padding: 2px 6px; border-radius: 4px; background: var(--b); margin-left: 8px; font-weight: bold; text-transform: uppercase; }
            .adm-tag { border: 1px solid var(--s); color: var(--s); background: #3fb95011; }
            .owner-tag { color: var(--p); border: 1px solid #58a6ff33; background: #58a6ff11; }
            
            .hidden { display: none !important; }
            
            /* Pantalla de Login Minimalista */
            #login-screen { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: #000; display: flex; justify-content: center; align-items: center; z-index: 10000; flex-direction: column; }
            #login-screen label { color: #fff; margin-bottom: 25px; font-size: 20px; letter-spacing: 2px; font-weight: 200; }
            #login-input { background: transparent; border: none; border-bottom: 1px solid #333; color: #fff; text-align: center; font-size: 22px; width: 280px; outline: none; padding: 10px; transition: 0.3s; }
            #login-input:focus { border-bottom-color: var(--p); width: 320px; }
            #login-error { color: var(--d); font-size: 13px; margin-top: 20px; font-weight: bold; }

            /* Modal de Resultado */
            #modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: var(--ov); display: flex; justify-content: center; align-items: center; z-index: 9000; backdrop-filter: blur(4px); }
            .modal { background: #161b22; border: 1px solid var(--b); border-radius: 12px; width: 90%; max-width: 450px; padding: 30px; box-shadow: 0 20px 50px rgba(0,0,0,0.5); position: relative; }
            .modal h3 { margin-top: 0; color: var(--s); display: flex; align-items: center; gap: 10px; }
            .modal-url-box { background: #0d1117; border: 1px solid var(--b); padding: 12px; border-radius: 6px; margin: 20px 0; display: flex; align-items: center; gap: 10px; }
            .modal-url-box input { background: transparent; border: none; color: var(--p); width: 100%; outline: none; font-family: monospace; font-size: 13px; }
            .modal-footer { display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px; }
            .refresh-msg { font-size: 12px; color: #8b949e; text-align: center; margin-top: 15px; font-style: italic; }

            @keyframes pulse { 0% { opacity: 1; } 50% { opacity: 0.5; } 100% { opacity: 1; } }
            .loading-dots { animation: pulse 1.5s infinite; }
        `,
        init() {
            document.head.innerHTML += `<style>${this.css}</style>`;
            document.body.innerHTML = `
                <div id="login-screen" class="hidden">
                    <label>Contraseña</label>
                    <input type="password" id="login-input" autocomplete="off" placeholder="••••••••">
                    <div id="login-error" class="hidden">ACCESO DENEGADO</div>
                </div>

                <div id="modal-overlay" class="hidden">
                    <div class="modal" id="modal-content"></div>
                </div>

                <div id="hub-content" class="w">
                    <header style="display:flex; justify-content:space-between; align-items:center; margin-bottom:30px; border-bottom: 1px solid var(--b); padding-bottom: 15px;">
                        <div>
                            <h2 style="color:var(--p); margin:0; font-size: 24px; letter-spacing: -0.5px;">Ninja Hub <span id="adm-ind"></span></h2>
                            <div style="font-size:11px; color:#8b949e; margin-top:4px;">Tu depósito privado de archivos</div>
                        </div>
                        <div style="text-align:right">
                            <span style="font-size:10px; color:#58a6ff; display:block; margin-bottom:2px;">SESIÓN ACTIVA</span>
                            <span style="font-size:11px; color:#8b949e; font-family:monospace;">${STORE.id().substring(0,15)}...</span>
                        </div>
                    </header>
                    
                    <div class="up-box">
                        <div style="margin-bottom:20px; font-size:14px; color: #8b949e;">
                            <label style="cursor:pointer; padding: 5px 10px;"><input type="radio" name="mode" value="perm" checked> Permanente</label>
                            <label style="margin-left:15px; cursor:pointer; padding: 5px 10px;"><input type="radio" name="mode" value="temp"> Temporal (20m)</label>
                        </div>
                        <button class="btn btn-p" style="width: 200px; justify-content: center; height: 45px; font-size: 15px;" onclick="document.getElementById('fin').click()">
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M8 2.75a.75.75 0 01.75.75v4.5h4.5a.75.75 0 010 1.5h-4.5v4.5a.75.75 0 01-1.5 0v-4.5h-4.5a.75.75 0 010-1.5h4.5v-4.5A.75.75 0 018 2.75z"></path></svg>
                            Seleccionar Archivo
                        </button>
                        <input type="file" id="fin" style="display:none" onchange="Hub.upload(this.files[0])">
                        <p id="up-st" style="font-size:12px; margin-top:15px; color:var(--p); font-weight:bold; height: 15px;"></p>
                    </div>

                    <div id="list-header" style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 15px;">
                        <span style="font-size:13px; font-weight:bold; color: #8b949e;">DEPÓSITO PÚBLICO</span>
                        <button class="btn" style="padding: 4px 8px; font-size: 11px;" onclick="Hub.load()">Refrescar</button>
                    </div>
                    <div id="list"><p style="text-align:center; color:#8b949e; padding: 40px;" class="loading-dots">Iniciando conexión...</p></div>
                    
                    <div id="logout-zone" class="hidden" style="margin-top:40px; text-align:center; border-top: 1px solid var(--b); padding-top: 20px;">
                        <button class="btn btn-d" style="font-size:11px" onclick="Hub.logout()">Cerrar Sesión Administrador</button>
                    </div>
                </div>
            `;
            this.handleRouting();
        },
        handleRouting() {
            const h = window.location.hash;
            const p = window.location.pathname;
            if (h.includes(ADMIN_PASS) || p.includes(ADMIN_PASS)) {
                document.getElementById('hub-content').classList.add('hidden');
                document.getElementById('login-screen').classList.remove('hidden');
                const inp = document.getElementById('login-input');
                inp.focus();
                inp.onkeydown = (e) => { if (e.key === "Enter") Hub.doLogin(); };
            }
        },
        showResult(data) {
            const ov = document.getElementById('modal-overlay');
            const cont = document.getElementById('modal-content');
            const isTemp = data.type === 'temp';
            
            cont.innerHTML = `
                <h3>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    ¡Subida Exitosa!
                </h3>
                <p style="font-size: 14px; color: #8b949e; margin-bottom: 5px;">${data.displayName}</p>
                <div style="font-size: 11px; margin-bottom: 15px;">
                    ${isTemp ? '<span class="tag" style="background:#e3b34122; color:#e3b341; border:1px solid #e3b34144">TEMPORAL</span> Expira en 20 min' : '<span class="tag adm-tag">PERMANENTE</span> Guardado en el Hub'}
                </div>
                
                <div class="modal-url-box">
                    <input type="text" id="res-url" value="${data.url}" readonly>
                </div>
                
                <div class="modal-footer">
                    <button class="btn" onclick="Hub.copy('${data.url}')">Copiar Link</button>
                    <a href="${data.url}" target="_blank" class="btn btn-p" style="text-decoration:none">Abrir</a>
                    <button class="btn" style="background:var(--b)" onclick="document.getElementById('modal-overlay').classList.add('hidden')">Cerrar</button>
                </div>
                ${!isTemp ? '<p class="refresh-msg">La lista se actualizará automáticamente en unos segundos...</p>' : ''}
            `;
            ov.classList.remove('hidden');
            if (!isTemp) setTimeout(() => Hub.load(), 8000);
        },
        render(files, isAdmin, myId) {
            const list = document.getElementById('list');
            if (!files.length) { list.innerHTML = '<div style="text-align:center; color:#8b949e; padding: 60px; border: 2px dashed var(--b); border-radius: 10px;">El depósito está vacío.</div>'; return; }
            list.innerHTML = files.map(f => `
                <div class="card">
                    <div style="overflow:hidden; padding-right: 10px;">
                        <div style="font-size:14px; font-weight:bold; white-space:nowrap; text-overflow:ellipsis; overflow:hidden; color: #adbac7;">${f.displayName}</div>
                        <div style="display:flex; align-items:center; margin-top: 4px;">
                            <span style="font-size:10px; color:#768390; font-family: monospace;">BY: ${f.owner.substring(0,8)}</span>
                            ${f.owner === myId ? '<span class="tag owner-tag">Tuyo</span>' : ''}
                        </div>
                    </div>
                    <div style="display:flex; gap:8px; flex-shrink:0">
                        <button class="btn" style="padding: 6px 10px;" onclick="Hub.copy('${f.url}')" title="Copiar Link">
                            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path fill-rule="evenodd" d="M0 6.75C0 5.784.784 5 1.75 5h1.5a.75.75 0 010 1.5h-1.5a.25.25 0 00-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 00.25-.25v-1.5a.75.75 0 011.5 0v1.5A1.75 1.75 0 019.25 16h-7.5A1.75 1.75 0 010 14.25v-7.5z"></path><path fill-rule="evenodd" d="M5 1.75C5 .784 5.784 0 6.75 0h7.5C15.216 0 16 .784 16 1.75v7.5A1.75 1.75 0 0114.25 11h-7.5A1.75 1.75 0 015 9.25v-7.5zm1.75-.25a.25.25 0 00-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 00.25-.25v-7.5a.25.25 0 00-.25-.25h-7.5z"></path></svg>
                        </button>
                        <a href="${f.url}" target="_blank" class="btn" style="padding: 6px 10px;" title="Abrir">
                             <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M3.75 2h3.5a.75.75 0 010 1.5h-3.5a.25.25 0 00-.25.25v8.5c0 .138.112.25.25.25h8.5a.25.25 0 00.25-.25v-3.5a.75.75 0 011.5 0v3.5A1.75 1.75 0 0112.25 14h-8.5A1.75 1.75 0 012 12.25v-8.5A1.75 1.75 0 013.75 2z"></path><path d="M10.5 1.75a.75.75 0 01.75-.75h3.75a.75.75 0 01.75.75v3.75a.75.75 0 01-1.5 0V3.31L9.53 8.03a.75.75 0 11-1.06-1.06l4.72-4.72h-2.19a.75.75 0 01-.75-.75z"></path></svg>
                        </a>
                        ${(isAdmin || f.owner === myId) ? `<button class="btn btn-d" style="padding: 6px 10px;" onclick="Hub.del('${f.name}','${f.sha}','${f.owner}','${f.folder}')" title="Eliminar">
                             <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path fill-rule="evenodd" d="M6.5 1.75a.25.25 0 01.25-.25h2.5a.25.25 0 01.25.25V3h-3V1.75zm4.5 0V3h2.25a.75.75 0 010 1.5H2.75a.75.75 0 010-1.5H5V1.75C5 .784 5.784 0 6.75 0h2.5C10.216 0 11 .784 11 1.75zM4.496 6.675a.75.75 0 10-1.492.15l.66 6.623c.09.901.848 1.552 1.754 1.552h5.164c.906 0 1.664-.651 1.754-1.552l.66-6.623a.75.75 0 10-1.492-.15l-.66 6.623a.25.25 0 01-.25.251H5.411a.25.25 0 01-.25-.251l-.665-6.623z"></path></svg>
                        </button>` : ''}
                    </div>
                </div>
            `).join('');
        }
    };

    const Hub = {
        async init() {
            UI.init();
            const pass = STORE.admin();
            if (pass) {
                try {
                    const res = await fetch(`${API}?action=verify`, { headers: { 'x-admin-password': pass } });
                    const data = await res.json();
                    if (data.authorized) {
                        state.isAdmin = true;
                        document.getElementById('adm-ind').innerHTML = '<span class="tag adm-tag">ADMIN</span>';
                        document.getElementById('logout-zone').classList.remove('hidden');
                    } else { STORE.clear(); }
                } catch (e) {}
            }
            this.load();
        },
        async load() {
            if (state.loading) return;
            state.loading = true;
            const list = document.getElementById('list');
            try {
                const res = await fetch(API);
                state.files = await res.json();
                UI.render(state.files, state.isAdmin, STORE.id());
            } catch (e) { list.innerHTML = `<p style="color:var(--d); text-align:center;">Error al cargar: ${e.message}</p>`; }
            state.loading = false;
        },
        async doLogin() {
            const val = document.getElementById('login-input').value.trim();
            const err = document.getElementById('login-error');
            if (val === ADMIN_PASS) {
                const res = await fetch(`${API}?action=verify`, { headers: { 'x-admin-password': val } });
                const data = await res.json();
                if (data.authorized) {
                    STORE.admin(val);
                    window.location.hash = "";
                    location.reload();
                } else { err.classList.remove('hidden'); }
            } else { err.classList.remove('hidden'); }
        },
        async upload(file) {
            if (!file) return;
            const st = document.getElementById('up-st');
            const type = document.querySelector('input[name="mode"]:checked').value;
            st.innerText = "SUBIENDO ARCHIVO...";
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const res = await fetch(API, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'x-admin-password': STORE.admin() || '', 'x-user-id': STORE.id() },
                        body: JSON.stringify({ name: file.name, content: e.target.result.split(',')[1], type })
                    });
                    const data = await res.json();
                    if (res.ok) {
                        UI.showResult(data);
                    } else { alert("ERROR: " + data.error); }
                } catch (err) { alert("ERROR DE CONEXIÓN: " + err.message); }
                st.innerText = "";
            };
            reader.readAsDataURL(file);
        },
        async del(name, sha, owner, folder) {
            if (!confirm("¿Eliminar este archivo permanentemente?")) return;
            try {
                const res = await fetch(API, {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json', 'x-admin-password': STORE.admin() || '', 'x-user-id': STORE.id() },
                    body: JSON.stringify({ name, sha, owner, folder })
                });
                if (res.ok) { this.load(); } 
                else { const d = await res.json(); alert("ERROR: " + d.error); }
            } catch (e) { alert("ERROR DE CONEXIÓN"); }
        },
        logout() { STORE.clear(); location.reload(); },
        copy(txt) {
            const temp = document.createElement("input");
            document.body.appendChild(temp);
            temp.value = txt;
            temp.select();
            document.execCommand("copy");
            document.body.removeChild(temp);
            alert("¡Link copiado al portapapeles!");
        }
    };

    Hub.init();
})();
