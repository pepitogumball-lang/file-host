export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST,DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Admin-Password, X-User-ID');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const { method } = req;
  const adminPassword = process.env.ADMIN_PASSWORD;
  const githubToken = process.env.GH_TOKEN;
  const repo = 'pepitogumball-lang/file-host';
  const repoOwner = 'pepitogumball-lang';
  
  const authHeader = req.headers['x-admin-password'];
  const userId = req.headers['x-user-id'] || 'anonymous';
  const isAdmin = adminPassword && authHeader === adminPassword;

  const headers = {
    'Authorization': `Bearer ${githubToken}`,
    'Accept': 'application/vnd.github+json',
    'User-Agent': 'Ninja-Hub-Uploader'
  };

  // 1. Verificar Admin
  if (method === 'GET' && req.query.action === 'verify') {
    return res.status(200).json({ authorized: isAdmin });
  }

  // 2. Listar Archivos Permanentes
  if (method === 'GET') {
    try {
      const response = await fetch(`https://api.github.com/repos/${repo}/contents/files`, { headers });
      const data = await response.json();
      if (!Array.isArray(data)) return res.status(200).json([]);
      
      const files = data
        .filter(f => f.type === 'file')
        .map(f => {
          const parts = f.name.split('_');
          return {
            name: f.name,
            displayName: parts.slice(2).join('_') || f.name,
            owner: parts[1] || 'unknown',
            url: `https://pepitogumball-lang.github.io/file-host/files/${f.name}`,
            sha: f.sha,
            folder: 'files'
          };
        });
      return res.status(200).json(files);
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  // 3. Subir Archivo
  if (method === 'POST') {
    const { name, content, type } = req.body;
    if (!name || !content) return res.status(400).json({ error: 'Faltan datos' });

    const timestamp = Date.now();
    const finalName = `${timestamp}_${userId}_${name.replace(/\s+/g, '_')}`;
    const folder = type === 'temp' ? 'temp' : 'files';
    const uploadUrl = `https://api.github.com/repos/${repo}/contents/${folder}/${finalName}`;

    try {
      // Intento de Cleanup (Solo si es Admin o en cada subida para mantener limpio)
      // Nota: Para no alargar el tiempo de respuesta, podrías disparar esto sin await,
      // pero Vercel puede matar la ejecución. Lo haremos síncrono por seguridad.
      if (Math.random() < 0.3) { // 30% de probabilidad para no saturar
        try {
          const tempRes = await fetch(`https://api.github.com/repos/${repo}/contents/temp`, { headers });
          const tempFiles = await tempRes.json();
          if (Array.isArray(tempFiles)) {
            const now = Date.now();
            for (const f of tempFiles) {
              const fTime = parseInt(f.name.split('_')[0]);
              if (now - fTime > 20 * 60 * 1000) { // 20 minutos
                await fetch(`https://api.github.com/repos/${repo}/contents/temp/${f.name}`, {
                  method: 'DELETE',
                  headers,
                  body: JSON.stringify({ message: 'Cleanup Temp', sha: f.sha })
                });
              }
            }
          }
        } catch (err) { console.error("Cleanup error:", err); }
      }

      const uploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          message: `Upload [${type}]: ${finalName}`,
          content: content
        })
      });

      if (!uploadRes.ok) {
        const errBody = await uploadRes.text();
        throw new Error(`GitHub Error: ${uploadRes.status} - ${errBody}`);
      }

      const expiresAt = type === 'temp' ? new Date(Date.now() + 20 * 60 * 1000).toISOString() : null;

      return res.status(200).json({ 
        success: true, 
        type: type,
        name: finalName,
        displayName: name,
        url: `https://pepitogumball-lang.github.io/file-host/${folder}/${finalName}`,
        owner: userId,
        folder: folder,
        expiresAt: expiresAt
      });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  // 4. Borrar Archivo
  if (method === 'DELETE') {
    const { name, sha, owner, folder } = req.body;
    const targetFolder = folder || 'files';
    
    if (!isAdmin && userId !== owner) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    try {
      const deleteRes = await fetch(`https://api.github.com/repos/${repo}/contents/${targetFolder}/${name}`, {
        method: 'DELETE',
        headers,
        body: JSON.stringify({ message: `Delete: ${name}`, sha: sha })
      });

      if (!deleteRes.ok) throw new Error('Delete failed');
      return res.status(200).json({ success: true });
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }
  }

  res.status(405).json({ error: 'Method Not Allowed' });
}
