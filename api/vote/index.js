const { BlobServiceClient } = require("@azure/storage-blob");

const CONTAINER = "appdata";
const BLOB = "db.json";
const OPEN_HOUR = 21;
const OPEN_MIN = 30;
const OPEN_TOTAL = OPEN_HOUR * 60 + OPEN_MIN;
const CLOSE_TOTAL = 22 * 60 + 30;
const TZ = "America/Sao_Paulo";

function getBlob() {
  const conn = process.env.AZURE_STORAGE_CONNECTION_STRING;
  if (!conn) throw new Error("AZURE_STORAGE_CONNECTION_STRING ausente.");
  const service = BlobServiceClient.fromConnectionString(conn);
  return service.getContainerClient(CONTAINER).getBlockBlobClient(BLOB);
}

async function streamToString(readable) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    readable.on("data", (d) => chunks.push(Buffer.isBuffer(d) ? d : Buffer.from(d)));
    readable.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
    readable.on("error", reject);
  });
}

// Componentes de data/hora no fuso de Brasília.
function spParts(d) {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false
  });
  const p = {};
  fmt.formatToParts(d).forEach((x) => { if (x.type !== "literal") p[x.type] = x.value; });
  return { date: `${p.year}-${p.month}-${p.day}`, minutes: parseInt(p.hour, 10) * 60 + parseInt(p.minute, 10) };
}

function votingOpen(m) {
  if (!m) return false;
  if (m.craque) return false;
  if (m.voteClosed) return false;
  if (m.voteOpen) return true;
  const now = spParts(new Date());
  if (now.date < m.date) return false;
  if (now.date > m.date) return false;
  return now.minutes >= OPEN_TOTAL && now.minutes < CLOSE_TOTAL;
}

function eligibleIds(m) {
  const ids = new Set();
  const t = m.lineup && m.lineup.teams;
  if (!t) return ids;
  ["branco", "preto"].forEach((tk) => {
    const team = t[tk]; if (!team) return;
    if (team.gk && team.gk.id) ids.add(team.gk.id);
    (team.line || []).forEach((p) => p && p.id && ids.add(p.id));
    (team.res || []).forEach((p) => p && p.id && ids.add(p.id));
  });
  return ids;
}

module.exports = async function (context, req) {
  try {
    const matchId = req.body && req.body.matchId;
    const playerId = req.body && req.body.playerId;
    if (!matchId || !playerId) {
      context.res = { status: 400, body: { error: "matchId e playerId são obrigatórios." } };
      return;
    }
    const blob = getBlob();

    // read-modify-write com concorrência otimista (ETag)
    for (let attempt = 0; attempt < 5; attempt++) {
      const dl = await blob.download();
      const etag = dl.etag;
      const data = JSON.parse(await streamToString(dl.readableStreamBody));
      const m = (data.matches || []).find((x) => x.id === matchId);
      if (!m) { context.res = { status: 404, body: { error: "Partida não encontrada." } }; return; }
      if (!votingOpen(m)) { context.res = { status: 403, body: { error: "Votação fechada." } }; return; }
      if (!eligibleIds(m).has(playerId)) {
        context.res = { status: 400, body: { error: "Jogador não está escalado nesta partida." } };
        return;
      }
      m.votes = m.votes || {};
      m.votes[playerId] = (m.votes[playerId] || 0) + 1;
      const body = JSON.stringify(data);
      try {
        await blob.upload(body, Buffer.byteLength(body), {
          blobHTTPHeaders: { blobContentType: "application/json" },
          conditions: { ifMatch: etag }
        });
        context.res = { status: 200, body: { ok: true, votes: m.votes } };
        return;
      } catch (e) {
        if (e.statusCode === 412 || e.statusCode === 409) continue; // conflito: tenta de novo
        throw e;
      }
    }
    context.res = { status: 503, body: { error: "Muitas votações simultâneas. Tente novamente." } };
  } catch (err) {
    context.log.error(err);
    context.res = { status: 500, body: { error: String(err.message || err) } };
  }
};
