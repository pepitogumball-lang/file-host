(function() {
    const API_URL = "https://file-host-mu.vercel.app/api/manage";
    const AUTH_KEY = "ninja_auth_token";
    const VERCEL_URL_KEY = "ninja_api_base"; // Guardamos la URL de Vercel por si cambia

    const state = {
        isAdmin: false,
        token: localStorage.getItem(AUTH_KEY),
        files: []
    };

    const UI = {
        init() {
            document.head.innerHTML += `<style>
                :root { --primary: #58a6ff; --bg: #0d1117; --card: #161b22; --border: #30363d; --text: #c9d1d9; --success: #3fb950; --danger: #f85149; }
                body { font-family: -apple-system, system-ui, sans-serif; background: var(--bg); color: var(--text); margin: 0; display: flex; flex-direction: column; align-items: center; min-height: 100vh; padding: 20px; }
                .container { width: 100%; max-width: 800px; }
                .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; border-bottom: 1px solid var(--border); padding-bottom: 15px; }
                .grid { display: grid; gap: 12px; }
                .file-card { background: var(--card); border: 1px solid var(--border); border-radius: 10px; padding: 15px; display: flex; justify-content: space-between; align-items: center; transition: 0.2s; }
                .file-card:hover { border-color: var(--primary); }
                .btn { background: #21262d; border: 1px solid var(--border); color: var(--text); padding: 8px 16px; border-radius: 6px; cursor: pointer; font-size: 14px; text-decoration: none; transition: 0.2s; }
                .btn:hover { background: #30363d; }
                .btn-sm { padding: 4px 10px; font-size: 12px; }
                .btn-success { background: var(--success); color: white; border: none; }
                .btn-danger { color: var(--danger); border-color: #f8514933; }
                .admin-panel { background: #1c2128; border: 1px solid var(--success); border-radius: 12px; padding: 20px; margin-bottom: 30px; }
                .upload-zone { border: 2px dashed var(--border); border-radius: 8px; padding: 30px; text-align: center; cursor: pointer; margin-top: 15px; }
                .upload-zone:hover { border-color: var(--success); }
                input[type="file"] { display: none; }
                .hidden { display: none !important; }
                #ghost-input { position: fixed; bottom: 0; right: 0; opacity: 0; width: 1px; height: 1px; }
            </style>`;
            
            document.body.innerHTML = `
                <div class="container">
                    <header class="header">
                        <h1 style="color: var(--primary); margin:0;">Ninja Hub 📦</h1>
                        <span id="role-tag" style="font-size: 12px; color: #8b949e;">Modo Público</span>
                    </header>

                    <div id="admin-controls" class="admin-panel hidden">
                        <h3 style="margin-top:0; color: var(--success);">Panel de Control 🥷</h3>
                        <div style="display: flex; gap: 15px; align-items: center;">
                            <label><input type="radio" name="upload-type" value="files" checked> Permanente</label>
                            <label><input type="radio" name="upload-type" value="temp"> Temporal (15m)</label>
                        </div>
                        <div class="upload-zone" onclick="document.getElementById('file-input').click()">
                            <span id="upload-msg">Haz clic para subir un archivo</span>
                            <input type="file" id="file-input">
                        </div>
                        <div style="margin-top: 15px; display: flex; justify-content: flex-end;">
                            <button class="btn btn-sm btn-danger" onclick="Ninja.logout()">Cerrar Admin</button>
                        </div>
                    </div>

                    <div id="file-list" class="grid">
                        <p style="text-align:center; color: #8b949e;">Sincronizando con el depósito...</p>
                    </div>
                </div>
                <input type="text" id="ghost-input">
            `;

            document.getElementById('file-input').onchange = (e) => Ninja.upload(e.target.files[0]);
            UI.setupGhostInput();
        },

        renderFiles(files, isAdmin) {
            const list = document.getElementById('file-list');
            if (files.length === 0) {
                list.innerHTML = '<p style="text-align:center; color: #8b949e; padding: 40px;">No hay archivos públicos en este momento.</p>';
                return;
            }
            list.innerHTML = files.map(f => `
                <div class="file-card">
                    <div style="overflow: hidden; margin-right: 10px;">
                        <div style="font-weight: 600; color: var(--primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${f.name}</div>
                        <div style="font-size: 11px; color: #8b949e; margin-top: 4px;">Publicado en /files</div>
                    </div>
                    <div style="display: flex; gap: 8px; flex-shrink: 0;">
                        <button class="btn btn-sm" onclick="Ninja.copy('${f.url}')">Link</button>
                        ${isAdmin ? `<button class="btn btn-sm btn-danger" onclick="Ninja.delete('${f.name}', '${f.sha}')">Borrar</button>` : ''}
                    </div>
                </div>
            `).join('');
        },

        setupGhostInput() {
            document.addEventListener('keydown', (e) => {
                if (e.key === "Enter") {
                    const val = document.getElementById('ghost-input').value.trim();
                    if (val.length > 5) Ninja.login(val);
                    document.getElementById('ghost-input').value = "";
                }
                if (document.activeElement.tagName !== "INPUT") document.getElementById('ghost-input').focus();
            });
        }
    };

    const Ninja = {
        async init() {
            UI.init();
            if (state.token) {
                await Ninja.verifyAdmin();
            }
            await Ninja.fetchFiles();
        },

        async verifyAdmin() {
            try {
                const res = await fetch(`${API_URL}?action=verify`, {
                    headers: { 'x-admin-password': state.token }
                });
                if (res.ok) {
                    state.isAdmin = true;
                    document.getElementById('admin-controls').classList.remove('hidden');
                    document.getElementById('role-tag').innerText = "Acceso: Administrador 🥷";
                    document.getElementById('role-tag').style.color = "var(--success)";
                } else {
                    Ninja.logout();
                }
            } catch (e) { console.error("Auth error"); }
        },

        async fetchFiles() {
            try {
                const res = await fetch(API_URL);
                state.files = await res.json();
                UI.renderFiles(state.files, state.isAdmin);
            } catch (e) {
                document.getElementById('file-list').innerHTML = '<p style="text-align:center; color: var(--danger);">Error al conectar con el servidor.</p>';
            }
        },

        async login(pass) {
            try {
                const res = await fetch(`${API_URL}?action=verify`, {
                    headers: { 'x-admin-password': pass }
                });
                if (res.ok) {
                    localStorage.setItem(AUTH_KEY, pass);
                    location.reload();
                }
            } catch (e) { alert("Error de validación."); }
        },

        async upload(file) {
            if (!file) return;
            const msg = document.getElementById('upload-msg');
            const type = document.querySelector('input[name="upload-type"]:checked').value;
            msg.innerText = `Subiendo ${file.name}...`;

            const reader = new FileReader();
            reader.onload = async (e) => {
                const content = e.target.result.split(',')[1];
                const res = await fetch(API_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'x-admin-password': state.token },
                    body: JSON.stringify({ name: file.name, content, folder: type })
                });
                const data = await res.json();
                if (res.ok) {
                    if (type === 'temp') prompt("Link Temporal (Expira en 15-20m):", data.url);
                    else Ninja.fetchFiles();
                } else {
                    alert("Error: " + data.error);
                }
                msg.innerText = "Haz clic para subir un archivo";
            };
            reader.readAsDataURL(file);
        },

        async delete(name, sha) {
            if (!confirm(`¿Borrar ${name} del repositorio?`)) return;
            const res = await fetch(API_URL, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json', 'x-admin-password': state.token },
                body: JSON.stringify({ name, sha })
            });
            if (res.ok) Ninja.fetchFiles();
        },

        logout() {
            localStorage.removeItem(AUTH_KEY);
            location.reload();
        },

        copy(text) {
            navigator.clipboard.writeText(text);
            alert("¡Link copiado!");
        }
    };

    window.Ninja = Ninja;
    Ninja.init();
})();
