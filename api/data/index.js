const { BlobServiceClient } = require("@azure/storage-blob");

const CONTAINER = "appdata";
const BLOB = "db.json";

// Estado inicial ZERADO: sem jogadores nem partidas. O admin cadastra tudo pelo portal.
function buildSeed() {
  return { players: [], matches: [] };
}

function getContainerClient() {
  const conn = process.env.AZURE_STORAGE_CONNECTION_STRING;
  if (!conn) throw new Error("AZURE_STORAGE_CONNECTION_STRING ausente nas configurações do app.");
  const service = BlobServiceClient.fromConnectionString(conn);
  return service.getContainerClient(CONTAINER);
}

async function streamToString(readable) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    readable.on("data", (d) => chunks.push(Buffer.isBuffer(d) ? d : Buffer.from(d)));
    readable.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
    readable.on("error", reject);
  });
}

// Lista de administradores por username do GitHub (em minúsculas).
// Para liberar mais pessoas, basta adicionar o username aqui (e no src/index.html).
const ADMINS = ["danieiribeiro", "emaildojonasvs-blip", "989550355a-design"];

function isAdmin(req) {
  try {
    const header = req.headers["x-ms-client-principal"];
    if (!header) return false;
    const principal = JSON.parse(Buffer.from(header, "base64").toString("utf-8"));
    if ((principal.userRoles || []).includes("admin")) return true;
    const uname = (principal.userDetails || "").toLowerCase();
    return ADMINS.includes(uname);
  } catch (e) {
    return false;
  }
}

function validShape(d) {
  return d && Array.isArray(d.players) && Array.isArray(d.matches);
}

module.exports = async function (context, req) {
  try {
    const container = getContainerClient();
    await container.createIfNotExists();
    const blob = container.getBlockBlobClient(BLOB);

    if (req.method === "GET") {
      let data;
      if (await blob.exists()) {
        const dl = await blob.download();
        const text = await streamToString(dl.readableStreamBody);
        data = JSON.parse(text);
      } else {
        data = buildSeed();
        const body = JSON.stringify(data);
        await blob.upload(body, Buffer.byteLength(body), {
          blobHTTPHeaders: { blobContentType: "application/json" }
        });
      }
      context.res = {
        status: 200,
        headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
        body: data
      };
      return;
    }

    // POST/PUT — gravação (somente admin; SWA já bloqueia, aqui é defesa extra)
    if (!isAdmin(req)) {
      context.res = { status: 403, body: { error: "Acesso restrito ao administrador." } };
      return;
    }
    const data = req.body;
    if (!validShape(data)) {
      context.res = { status: 400, body: { error: "Formato inválido. Esperado { players: [], matches: [] }." } };
      return;
    }
    const body = JSON.stringify(data);
    await blob.upload(body, Buffer.byteLength(body), {
      blobHTTPHeaders: { blobContentType: "application/json" }
    });
    context.res = { status: 200, body: { ok: true } };
  } catch (err) {
    context.log.error(err);
    context.res = { status: 500, body: { error: String(err.message || err) } };
  }
};
