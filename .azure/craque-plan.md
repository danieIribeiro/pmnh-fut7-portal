# Feature: Craque do Jogo

## Objetivo
Votação pública do craque da partida, liberada a partir das 21:20 (horário de Brasília) do dia do jogo.
Apenas atletas escalados (titulares + reservas, ambos os times) recebem votos. Mostrar votos,
destacar foto do craque e permitir compartilhar (Instagram/WhatsApp).

## Decisões
- 1 voto por dispositivo via localStorage (sem login) + janela de horário + painel admin.
- Fotos: upload pelo portal, guardadas no Azure Blob (container `photos`, privado), servidas via Function.
- Votos guardados em `db.json` por partida: `m.votes = {playerId: count}`. Tally público via GET /api/data.
- Janela: abre quando (now >= dia da partida 21:20 SP) e fecha por admin/finalização.
  Controles admin: `m.voteOpen` (forçar aberto), `m.voteClosed` (forçar fechado), `m.craque` (vencedor finalizado).

## Backend (Azure Functions, api/)
- [ ] api/vote: POST anônimo {matchId,playerId} -> valida escalado + janela, incrementa voto (ETag retry).
- [ ] api/photo: GET ?id= serve imagem (anônimo); POST {playerId,dataUrl} admin-only grava no blob.

## Frontend (src/index.html)
- [ ] Nova aba pública "⭐ Craque".
- [ ] renderCraque: estados (antes 21:20 c/ contagem, votação, resultados, finalizado).
- [ ] Avatar (foto ou iniciais) reutilizável.
- [ ] Upload de foto na aba Jogadores (compressão client-side ~320px JPEG).
- [ ] buildCraqueCanvas + compartilhar/baixar imagem.
- [ ] Controles admin (abrir/fechar, definir craque, zerar votos).

## Deploy
- [ ] Syntax check, preview, aprovação, git push, watch Actions.
