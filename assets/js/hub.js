(function() {
    const API = "https://file-host-mu.vercel.app/api/manage";
    const STORE = {
        id: () => {
            if (!localStorage.getItem('n_uid')) localStorage.setItem('n_uid', 'u' + Math.random().toString(36).substr(2, 7));
            return localStorage.getItem('n_uid');
        },
        admin: (val) => val !== undefined ? localStorage.setItem('n_adm', val) : localStorage.getItem('n_adm')
    };

    const state = { isAdmin: false, files: [] };

    const UI = {
        css: `
            :root { --p: #58a6ff; --bg: #0d1117; --c: #161b22; --b: #30363d; --t: #c9d1d9; --s: #3fb950; --d: #f85149; }
            body { font-family: -apple-system, sans-serif; background: var(--bg); color: var(--t); margin: 0; padding: 20px; display: flex; flex-direction: column; align-items: center; }
            .w { width: 100%; max-width: 600px; }
            .card { background: var(--c); border: 1px solid var(--b); border-radius: 8px; padding: 12px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center; }
            .btn { background: #21262d; border: 1px solid var(--b); color: var(--t); padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 13px; }
            .btn-p { background: var(--s); color: white; border: none; }
            .btn-d { color: var(--d); border-color: #f8514933; }
            .up-box { background: var(--c); border: 1px solid var(--b); padding: 20px; border-radius: 10px; margin-bottom: 20px; text-align: center; }
            .ghost { position: fixed; bottom: 0; right: 0; opacity: 0; width: 1px; height: 1px; }
            .tag { font-size: 10px; padding: 2px 6px; border-radius: 4px; background: var(--b); margin-left: 8px; }
            .adm-tag { border: 1px solid var(--s); color: var(--s); }
        `,
        init() {
            document.head.innerHTML += `<style>${this.css}</style>`;
            document.body.innerHTML = `
                <div class="w">
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
                </div>
                <input type="text" id="ghost" class="ghost">
            `;
            this.listen();
        },
        listen() {
            document.addEventListener('keydown', (e) => {
                if (e.key === "Enter") {
                    const g = document.getElementById('ghost');
                    if (g.value.length > 5) Hub.login(g.value);
                    g.value = "";
                }
                if (document.activeElement.tagName !== "INPUT") document.getElementById('ghost').focus();
            });
        },
        render(files, isAdmin, myId) {
            const list = document.getElementById('list');
            if (!files.length) { list.innerHTML = '<p style="text-align:center; color:#8b949e">No hay archivos públicos.</p>'; return; }
            list.innerHTML = files.map(f => `
                <div class="card">
                    <div style="overflow:hidden">
                        <div style="font-size:14px; font-weight:bold; white-space:nowrap; text-overflow:ellipsis; overflow:hidden">${f.displayName}</div>
                        <div style="font-size:11px; color:#8b949e">${f.owner === myId ? 'Tuyo' : 'Público'}</div>
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
                const res = await fetch(`${API}?action=verify`, { headers: { 'x-admin-password': pass } });
                const data = await res.json();
                if (data.authorized) {
                    state.isAdmin = true;
                    document.getElementById('adm-ind').innerHTML = '<span class="tag adm-tag">ADMIN</span>';
                }
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
            const res = await fetch(API, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json', 'x-admin-password': STORE.admin() || '', 'x-user-id': STORE.id() },
                body: JSON.stringify({ name, sha, owner })
            });
            if (res.ok) this.load();
        },
        async login(pass) {
            const res = await fetch(`${API}?action=verify`, { headers: { 'x-admin-password': pass } });
            const data = await res.json();
            if (data.authorized) {
                STORE.admin(pass);
                location.reload();
            }
        },
        copy(txt) { navigator.clipboard.writeText(txt); alert("Copiado"); }
    };

    Hub.init();
})();
