const { Octokit } = require("@octokit/rest");

module.exports = async (req, res) => {
  const { name } = req.query;
  if (!name) return res.status(400).send("Nombre de archivo requerido");

  const octokit = new Octokit({ auth: process.env.GH_TOKEN });
  const owner = "pepitogumball-lang";
  const repo = "file-host";

  try {
    const { data } = await octokit.repos.getContent({
      owner,
      repo,
      path: `files/${name}`,
    });

    const content = Buffer.from(data.content, 'base64');
    
    // Intentar adivinar el content-type
    const ext = name.split('.').pop().toLowerCase();
    const types = {
      'png': 'image/png', 'jpg': 'image/jpeg', 'jpeg': 'image/jpeg',
      'gif': 'image/gif', 'pdf': 'application/pdf', 'txt': 'text/plain',
      'html': 'text/html', 'css': 'text/css', 'js': 'application/javascript',
      'zip': 'application/zip', 'mp3': 'audio/mpeg', 'mp4': 'video/mp4'
    };

    res.setHeader('Content-Type', types[ext] || 'application/octet-stream');
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate'); // Temporal (1 hora cache)
    res.send(content);

  } catch (error) {
    res.status(404).send("Archivo no encontrado");
  }
};
