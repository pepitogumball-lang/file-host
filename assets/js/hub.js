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

    const state = { isAdmin: false, files: [] };

    const UI = {
        css: `
            :root { --p: #58a6ff; --bg: #0d1117; --c: #161b22; --b: #30363d; --t: #c9d1d9; --s: #3fb950; --d: #f85149; }
            body { font-family: -apple-system, sans-serif; background: var(--bg); color: var(--t); margin: 0; padding: 20px; display: flex; flex-direction: column; align-items: center; }
            .w { width: 100%; max-width: 600px; }
            .card { background: var(--c); border: 1px solid var(--b); border-radius: 8px; padding: 12px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center; }
            .btn { background: #21262d; border: 1px solid var(--b); color: var(--t); padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 13px; transition: 0.2s; }
            .btn-p { background: var(--s); color: white; border: none; }
            .btn-d { color: var(--d); border-color: #f8514933; }
            .up-box { background: var(--c); border: 1px solid var(--b); padding: 20px; border-radius: 10px; margin-bottom: 20px; text-align: center; }
            .tag { font-size: 10px; padding: 2px 6px; border-radius: 4px; background: var(--b); margin-left: 8px; font-weight: bold; }
            .adm-tag { border: 1px solid var(--s); color: var(--s); }
            .hidden { display: none !important; }
            
            /* Pantalla de Login Minimalista Negra */
            #login-screen { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: #000; display: flex; justify-content: center; align-items: center; z-index: 9999; flex-direction: column; }
            #login-screen label { color: #fff; margin-bottom: 20px; font-size: 18px; letter-spacing: 1px; }
            #login-input { background: transparent; border: none; border-bottom: 1px solid #333; color: #fff; text-align: center; font-size: 20px; width: 250px; outline: none; padding: 10px; }
            #login-input:focus { border-bottom-color: var(--p); }
            #login-error { color: var(--d); font-size: 12px; margin-top: 15px; }
        `,
        init() {
            document.head.innerHTML += `<style>${this.css}</style>`;
            document.body.innerHTML = `
                <div id="login-screen" class="hidden">
                    <label>Contraseña</label>
                    <input type="password" id="login-input" autocomplete="off">
                    <div id="login-error" class="hidden">Contraseña incorrecta</div>
                </div>

                <div id="hub-content" class="w">
                    <header style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
                        <h2 style="color:var(--p); margin:0;">Ninja Hub <span id="adm-ind"></span></h2>
                        <span style="font-size:12px; color:#8b949e">ID: ${STORE.id()}</span>
                    </header>
                    
                    <div class="up-box">
                        <div style="margin-bottom:15px; font-size:14px;">
                            <label><input type="radio" name="mode" value="perm" checked> Permanente</label>
                            <label style="margin-left:15px;"><input type="radio" name="mode" value="temp"> Temporal (15m)</label>
                        </div>
                        <button class="btn btn-p" onclick="document.getElementById('fin').click()">Subir Archivo</button>
                        <input type="file" id="fin" style="display:none" onchange="Hub.upload(this.files[0])">
                        <p id="up-st" style="font-size:12px; margin-top:10px; color:#8b949e"></p>
                    </div>

                    <div id="list"><p style="text-align:center; color:#8b949e">Cargando depósito...</p></div>
                    
                    <div id="logout-zone" class="hidden" style="margin-top:20px; text-align:center">
                        <button class="btn btn-d" style="font-size:11px" onclick="Hub.logout()">Cerrar Sesión Admin</button>
                    </div>
                </div>
            `;
            this.handleRouting();
        },
        handleRouting() {
            const path = window.location.pathname;
            const hash = window.location.hash;
            
            // Si la URL contiene el secreto o el hash secreto
            if (path.includes(ADMIN_PASS) || hash.includes(ADMIN_PASS)) {
                document.getElementById('hub-content').classList.add('hidden');
                document.getElementById('login-screen').classList.remove('hidden');
                document.getElementById('login-input').focus();
                
                document.getElementById('login-input').onkeydown = (e) => {
                    if (e.key === "Enter") Hub.doLogin();
                };
            }
        },
        render(files, isAdmin, myId) {
            const list = document.getElementById('list');
            if (!files.length) { list.innerHTML = '<p style="text-align:center; color:#8b949e; padding: 40px;">No hay archivos públicos disponibles.</p>'; return; }
            list.innerHTML = files.map(f => `
                <div class="card">
                    <div style="overflow:hidden">
                        <div style="font-size:14px; font-weight:bold; white-space:nowrap; text-overflow:ellipsis; overflow:hidden">${f.displayName}</div>
                        <div style="font-size:11px; color:#8b949e">${f.owner === myId ? 'Subido por ti' : 'Archivo Público'}</div>
                    </div>
                    <div style="display:flex; gap:6px; flex-shrink:0">
                        <button class="btn" onclick="Hub.copy('${f.url}')">Link</button>
                        ${(isAdmin || f.owner === myId) ? `<button class="btn btn-d" onclick="Hub.del('${f.name}','${f.sha}','${f.owner}')">Borrar</button>` : ''}
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
            try {
                const res = await fetch(API);
                state.files = await res.json();
                UI.render(state.files, state.isAdmin, STORE.id());
            } catch (e) { document.getElementById('list').innerHTML = "Error de conexión"; }
        },
        async doLogin() {
            const val = document.getElementById('login-input').value.trim();
            const err = document.getElementById('login-error');
            
            if (val === ADMIN_PASS) {
                const res = await fetch(`${API}?action=verify`, { headers: { 'x-admin-password': val } });
                const data = await res.json();
                if (data.authorized) {
                    STORE.admin(val);
                    window.location.href = 'hub.html'; // Redirigir para limpiar URL
                } else { err.classList.remove('hidden'); }
            } else {
                err.classList.remove('hidden');
            }
        },
        async upload(file) {
            if (!file) return;
            const st = document.getElementById('up-st');
            const type = document.querySelector('input[name="mode"]:checked').value;
            st.innerText = "Subiendo...";
            const reader = new FileReader();
            reader.onload = async (e) => {
                const res = await fetch(API, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'x-admin-password': STORE.admin() || '', 'x-user-id': STORE.id() },
                    body: JSON.stringify({ name: file.name, content: e.target.result.split(',')[1], type })
                });
                const data = await res.json();
                if (res.ok) {
                    if (type === 'temp') prompt("Link Temporal:", data.url);
                    else this.load();
                } else alert("Error: " + data.error);
                st.innerText = "";
            };
            reader.readAsDataURL(file);
        },
        async del(name, sha, owner) {
            if (!confirm("¿Borrar archivo?")) return;
            await fetch(API, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json', 'x-admin-password': STORE.admin() || '', 'x-user-id': STORE.id() },
                body: JSON.stringify({ name, sha, owner })
            });
            this.load();
        },
        logout() { STORE.clear(); location.reload(); },
        copy(txt) { navigator.clipboard.writeText(txt); alert("Copiado"); }
    };

    Hub.init();
})();
