(function() {
    const VERCEL_KEY = "ninja_vercel_url";
    const ADMIN_PASS = "Holaquetalsoypepi5#";
    
    // UI Templates
    const styles = `
        :root { --primary: #58a6ff; --bg: #0d1117; --card: #161b22; --border: #30363d; --text: #c9d1d9; --success: #3fb950; --danger: #f85149; }
        body { font-family: -apple-system, sans-serif; background: var(--bg); color: var(--text); margin: 0; padding: 20px; display: flex; flex-direction: column; align-items: center; }
        .container { width: 100%; max-width: 800px; }
        .card { background: var(--card); border: 1px solid var(--border); border-radius: 8px; padding: 15px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center; }
        .btn { background: #21262d; border: 1px solid var(--border); color: var(--text); padding: 8px 16px; border-radius: 6px; cursor: pointer; text-decoration: none; font-size: 0.9rem; }
        .btn:hover { background: #30363d; }
        .btn-primary { background: var(--success); color: white; border: none; }
        .btn-danger { color: var(--danger); border-color: #f8514933; }
        .upload-section { background: var(--card); border: 1px solid var(--border); padding: 20px; border-radius: 12px; margin-bottom: 30px; text-align: center; }
        input[type="file"] { display: none; }
        .toggle-group { display: flex; justify-content: center; gap: 10px; margin: 15px 0; }
        #ghost-trigger { position: fixed; bottom: 0; right: 0; opacity: 0; width: 10px; height: 10px; }
    `;

    const html = `
        <div class="container">
            <header style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px;">
                <h1 style="color: var(--primary); margin: 0;">Ninja Hub 🥷</h1>
                <a href="index.html" style="color: #8b949e; text-decoration: none;">Cerrar</a>
            </header>

            <div class="upload-section">
                <h3 id="upload-status">Subir nuevo archivo</h3>
                <div class="toggle-group">
                    <label><input type="radio" name="filetype" value="files" checked> Permanente</label>
                    <label><input type="radio" name="filetype" value="temp"> Temporal (15m)</label>
                </div>
                <button class="btn btn-primary" onclick="document.getElementById('file-input').click()">Seleccionar Archivo</button>
                <input type="file" id="file-input" onchange="window.ninja.upload(this.files[0])">
            </div>

            <div id="file-list">
                <p style="text-align: center; color: #8b949e;">Cargando archivos del depósito...</p>
            </div>
        </div>
        <input type="text" id="ghost-trigger">
    `;

    // Inject CSS & HTML
    const styleTag = document.createElement('style');
    styleTag.innerHTML = styles;
    document.head.appendChild(styleTag);
    document.body.innerHTML = html;

    // Logic
    window.ninja = {
        async load() {
            const list = document.getElementById('file-list');
            const url = localStorage.getItem(VERCEL_KEY);
            if (!url) {
                list.innerHTML = '<p style="text-align: center; color: var(--danger);">Esperando conexión con el motor... (Pega la URL de Vercel)</p>';
                return;
            }

            try {
                const res = await fetch(`${url}/api/manage`, {
                    headers: { 'x-admin-password': ADMIN_PASS }
                });
                const files = await res.json();
                
                if (files.length === 0) {
                    list.innerHTML = '<p style="text-align: center; color: #8b949e;">El depósito está vacío.</p>';
                    return;
                }

                list.innerHTML = files.map(f => `
                    <div class="card">
                        <div style="word-break: break-all; margin-right: 15px;">
                            <strong style="color: var(--primary);">${f.name}</strong><br>
                            <small style="color: #8b949e;">${(f.size / 1024).toFixed(1)} KB</small>
                        </div>
                        <div style="display: flex; gap: 8px;">
                            <button class="btn" onclick="window.ninja.copy('${f.permanent_url}')">Link</button>
                            <button class="btn btn-danger" onclick="window.ninja.del('${f.name}', '${f.sha}')">Borrar</button>
                        </div>
                    </div>
                `).join('');
            } catch (e) {
                list.innerHTML = '<p style="text-align: center; color: var(--danger);">Error conectando con el motor.</p>';
            }
        },

        async upload(file) {
            const url = localStorage.getItem(VERCEL_KEY);
            if (!file || !url) return;
            const status = document.getElementById('upload-status');
            const type = document.querySelector('input[name="filetype"]:checked').value;
            
            status.innerText = `Procesando ${file.name}...`;
            
            const reader = new FileReader();
            reader.onload = async (e) => {
                const content = e.target.result.split(',')[1];
                try {
                    const res = await fetch(`${url}/api/manage`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'x-admin-password': ADMIN_PASS },
                        body: JSON.stringify({ name: file.name, content, folder: type })
                    });
                    const data = await res.json();
                    if (res.ok) {
                        if (type === 'temp') {
                            prompt("Link Temporal Generado (Validez 15-20m):", data.url);
                        } else {
                            alert("¡Archivo subido exitosamente!");
                        }
                        this.load();
                    } else {
                        alert("Error: " + data.error);
                    }
                } catch (err) {
                    alert("Fallo en la comunicación con el motor.");
                }
                status.innerText = "Subir nuevo archivo";
            };
            reader.readAsDataURL(file);
        },

        async del(name, sha) {
            const url = localStorage.getItem(VERCEL_KEY);
            if (!confirm(`¿Eliminar ${name}?`) || !url) return;
            await fetch(`${url}/api/manage`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json', 'x-admin-password': ADMIN_PASS },
                body: JSON.stringify({ name, sha, folder: 'files' })
            });
            this.load();
        },

        copy(text) {
            navigator.clipboard.writeText(text);
            alert("¡Link copiado!");
        }
    };

    // Ghost Input Listener
    document.addEventListener('keydown', (e) => {
        if (e.key === "Enter") {
            const input = document.getElementById('ghost-trigger');
            if (input.value.includes("vercel.app")) {
                localStorage.setItem(VERCEL_KEY, input.value.trim().replace(/\/$/, ''));
                alert("Motor Conectado.");
                window.ninja.load();
                input.value = "";
            }
        }
        document.getElementById('ghost-trigger').focus();
    });

    window.ninja.load();
})();
