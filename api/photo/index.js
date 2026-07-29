const { BlobServiceClient } = require("@azure/storage-blob");

const CONTAINER = "photos";
const MAX_BYTES = 600 * 1024; // ~600KB já comprimido no cliente

const ADMINS = ["danieiribeiro", "emaildojonasvs-blip", "989550355a-design"];

function isAdmin(req) {
  try {
    const header = req.headers["x-ms-client-principal"];
    if (!header) return false;
    const principal = JSON.parse(Buffer.from(header, "base64").toString("utf-8"));
    if ((principal.userRoles || []).includes("admin")) return true;
    return ADMINS.includes((principal.userDetails || "").toLowerCase());
  } catch (e) {
    return false;
  }
}

function getContainer() {
  const conn = process.env.AZURE_STORAGE_CONNECTION_STRING;
  if (!conn) throw new Error("AZURE_STORAGE_CONNECTION_STRING ausente.");
  return BlobServiceClient.fromConnectionString(conn).getContainerClient(CONTAINER);
}

function safeId(id) {
  return String(id || "").replace(/[^a-zA-Z0-9_-]/g, "");
}

async function streamToBuffer(readable) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    readable.on("data", (d) => chunks.push(Buffer.isBuffer(d) ? d : Buffer.from(d)));
    readable.on("end", () => resolve(Buffer.concat(chunks)));
    readable.on("error", reject);
  });
}

module.exports = async function (context, req) {
  try {
    const container = getContainer();

    if (req.method === "GET") {
      const id = safeId(req.query.id);
      if (!id) { context.res = { status: 400, body: "id obrigatório" }; return; }
      const blob = container.getBlockBlobClient(id + ".jpg");
      if (!(await blob.exists())) { context.res = { status: 404, body: "sem foto" }; return; }
      const dl = await blob.download();
      const buf = await streamToBuffer(dl.readableStreamBody);
      context.res = {
        status: 200,
        headers: { "Content-Type": "image/jpeg", "Cache-Control": "public, max-age=86400" },
        body: buf,
        isRaw: true
      };
      return;
    }

    // POST — gravar foto (somente admin)
    if (!isAdmin(req)) {
      context.res = { status: 403, body: { error: "Acesso restrito ao administrador." } };
      return;
    }
    await container.createIfNotExists();
    const id = safeId(req.body && req.body.playerId);
    const dataUrl = req.body && req.body.dataUrl;
    if (!id || !dataUrl) {
      context.res = { status: 400, body: { error: "playerId e dataUrl são obrigatórios." } };
      return;
    }
    const match = /^data:image\/(jpeg|jpg|png);base64,(.+)$/i.exec(dataUrl);
    if (!match) { context.res = { status: 400, body: { error: "Formato de imagem inválido." } }; return; }
    const buf = Buffer.from(match[2], "base64");
    if (buf.length > MAX_BYTES) { context.res = { status: 413, body: { error: "Imagem muito grande." } }; return; }
    const blob = container.getBlockBlobClient(id + ".jpg");
    await blob.upload(buf, buf.length, { blobHTTPHeaders: { blobContentType: "image/jpeg", blobCacheControl: "public, max-age=31536000, immutable" } });
    context.res = { status: 200, body: { ok: true } };
  } catch (err) {
    context.log.error(err);
    context.res = { status: 500, body: { error: String(err.message || err) } };
  }
};
