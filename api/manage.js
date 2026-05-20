export default async function handler(req, res) {
  // CORS configuration
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, X-Admin-Password');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { method } = req;
  const adminPassword = process.env.ADMIN_PASSWORD;
  const githubToken = process.env.GH_TOKEN;
  const userPassword = req.headers['x-admin-password'] || req.body?.password;

  if (!adminPassword || userPassword !== adminPassword) {
    return res.status(401).json({ error: 'Unauthorized: Acceso restringido' });
  }

  const repo = 'pepitogumball-lang/file-host';
  const baseUrl = `https://api.github.com/repos/${repo}/contents/files`;

  try {
    // SERVE ADMIN UI (POST with action: get_ui)
    if (method === 'POST' && req.body?.action === 'get_ui') {
      res.setHeader('Content-Type', 'text/html');
      return res.status(200).send(`
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Ninja Admin Hub 🥷 (POST-only)</title>
    <style>
        body { font-family: sans-serif; background: #0d1117; color: white; padding: 2rem; display: flex; flex-direction: column; align-items: center; }
        .container { width: 100%; max-width: 800px; background: #161b22; padding: 2rem; border-radius: 12px; border: 1px solid #30363d; }
        h1 { color: #58a6ff; margin-bottom: 1.5rem; }
        .upload-zone { border: 2px dashed #30363d; padding: 2rem; text-align: center; border-radius: 8px; margin-bottom: 2rem; cursor: pointer; }
        .file-list { display: flex; flex-direction: column; gap: 10px; }
        .file-item { background: #0d1117; padding: 10px; border-radius: 6px; border: 1px solid #30363d; display: flex; justify-content: space-between; }
        .btn { padding: 6px 12px; border-radius: 4px; border: none; cursor: pointer; font-weight: bold; }
        .btn-del { background: #da3633; color: white; }
    </style>
</head>
<body>
<div class="container">
    <h1>Ninja Admin Hub 🥷</h1>
    <p style="color: #8b949e">Panel servido vía POST - Acceso seguro.</p>
    
    <div class="upload-zone" onclick="document.getElementById('fileInput').click()">
        <p>Click para subir archivo permanente 🚀</p>
        <input type="file" id="fileInput" style="display: none" onchange="handleUpload(this)">
    </div>

    <div style="display: flex; justify-content: space-between; align-items: center;">
        <h2>Archivos en /files</h2>
        <button class="btn" onclick="loadFiles()" style="background: #21262d; color: white;">Refrescar 🔄</button>
    </div>
    <div class="file-list" id="fileList"></div>
</div>

<script>
    const password = "${userPassword}";
    const apiEndpoint = window.location.href;

    async function loadFiles() {
        const res = await fetch(apiEndpoint, {
            method: 'GET',
            headers: { 'x-admin-password': password }
        });
        const files = await res.json();
        document.getElementById('fileList').innerHTML = files.map(f => \`
            <div class="file-item">
                <span>\${f.name} (\${(f.size/1024).toFixed(1)} KB)</span>
                <button class="btn btn-del" onclick="deleteFile('\${f.name}', '\${f.sha}')">Borrar</button>
            </div>
        \`).join('');
    }

    async function handleUpload(input) {
        if (!input.files[0]) return;
        const file = input.files[0];
        const reader = new FileReader();
        reader.onload = async () => {
            const content = reader.result.split(',')[1];
            const res = await fetch(apiEndpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'x-admin-password': password },
                body: JSON.stringify({ name: file.name, content })
            });
            if (res.ok) { alert('Subido!'); loadFiles(); }
        };
        reader.readAsDataURL(file);
    }

    async function deleteFile(name, sha) {
        if (!confirm('¿Borrar?')) return;
        const res = await fetch(apiEndpoint, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json', 'x-admin-password': password },
            body: JSON.stringify({ name, sha })
        });
        if (res.ok) loadFiles();
    }

    loadFiles();
</script>
</body>
</html>
      `);
    }

    // LIST FILES (GET)
    if (method === 'GET') {
      const response = await fetch(baseUrl, {
        headers: { 'Authorization': \`Bearer \${githubToken}\`, 'Accept': 'application/vnd.github+json' }
      });
      const data = await response.json();
      
      if (!Array.isArray(data)) return res.status(200).json([]);
      
      const files = data
        .filter(item => item.name !== '.gitkeep')
        .map(item => ({
          name: item.name,
          sha: item.sha,
          size: item.size
        }));
      
      return res.status(200).json(files);
    }

    // UPLOAD/DELETE (POST/DELETE) - Same as before but kept for API calls
    if (method === 'POST') {
      const { name, content } = req.body;
      if (!name || !content) return res.status(400).json({ error: 'Falta nombre o contenido' });

      const safeName = name.replace(/[^a-z0-9.-]/gi, '_');
      const uploadUrl = \`\${baseUrl}/\${safeName}\`;

      const uploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 
            'Authorization': \`Bearer \${githubToken}\`, 
            'Accept': 'application/vnd.github+json',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: \`Admin Upload: \${safeName}\`,
          content: content
        })
      });

      const result = await uploadRes.json();
      if (!uploadRes.ok) throw new Error(result.message);
      
      return res.status(200).json({ success: true, file: safeName });
    }

    if (method === 'DELETE') {
      const { name, sha } = req.body;
      if (!name || !sha) return res.status(400).json({ error: 'Falta nombre o sha' });

      const deleteRes = await fetch(\`\${baseUrl}/\${name}\`, {
        method: 'DELETE',
        headers: { 
            'Authorization': \`Bearer \${githubToken}\`, 
            'Accept': 'application/vnd.github+json',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: \`Admin Delete: \${name}\`,
          sha: sha
        })
      });

      if (!deleteRes.ok) {
          const err = await deleteRes.json();
          throw new Error(err.message);
      }
      
      return res.status(200).json({ success: true });
    }

    res.status(405).json({ error: \`Method \${method} Not Allowed\` });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
}
