const { Octokit } = require("@octokit/rest");

module.exports = async (req, res) => {
  const { name } = req.query;
  if (!name) return res.status(400).send("Nombre de archivo requerido");

  const octokit = new Octokit({ auth: process.env.GH_TOKEN });
  const owner = "pepitogumball-lang";
  const repo = "file-host";

  const tryPaths = [`files/${name}`, `temp/${name}`];
  let fileData = null;

  for (const path of tryPaths) {
    try {
      const { data } = await octokit.repos.getContent({ owner, repo, path });
      fileData = data;
      break;
    } catch (e) { continue; }
  }

  if (!fileData) return res.status(404).send("Archivo no encontrado");

  try {
    const content = Buffer.from(fileData.content, 'base64');
    const ext = name.split('.').pop().toLowerCase();
    const types = {
      'png': 'image/png', 'jpg': 'image/jpeg', 'jpeg': 'image/jpeg',
      'gif': 'image/gif', 'pdf': 'application/pdf', 'txt': 'text/plain',
      'html': 'text/html', 'css': 'text/css', 'js': 'application/javascript',
      'zip': 'application/zip', 'mp3': 'audio/mpeg', 'mp4': 'video/mp4'
    };

    res.setHeader('Content-Type', types[ext] || 'application/octet-stream');
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');
    res.send(content);
  } catch (error) {
    res.status(500).send("Error procesando archivo");
  }
};
