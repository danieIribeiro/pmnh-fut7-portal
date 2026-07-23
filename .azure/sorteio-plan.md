# Feature: Sorteio de times equilibrados (Branco × Preto)

## Requisitos do usuário
- Toda semana monta escalação a partir dos confirmados.
- Mensalistas confirmam; vagas restantes vão para avulsos (não-membros) do WhatsApp.
- 7 por lado: 6 na linha + 1 goleiro.
- Goleiro NÃO é fixo (muda toda semana, às vezes é avulso "contratado").
- Posições de linha no cadastro do jogador: ZAG, MC, ATA.
- Equilíbrio por "força" = mix de aproveitamento + vitórias + gols.

## Decisões
- `player.pos`: 'ZAG' | 'MC' | 'ATA' | null (persistido no perfil).
- Goleiro definido no sorteio (toggle 🧤), pode ser avulso.
- Avulsos: transitórios (não salvos em db.players).
- Rating 0..100 = 0.6*aproveitamento + 0.25*(winRate*100) + 0.15*(min(gols/jogo,1)*100).
  - Sem jogos → rating neutro (média do grupo).
- Aba Sorteio = admin-only (nav-admin).
- Lineup gerado client-side; botão "Copiar p/ WhatsApp". Sem persistência (v1).

## Algoritmo balanceTeams
1. jitter nos ratings (variedade ao re-sortear).
2. agrupa por posição, ordena desc, distribui alternando p/ equilibrar contagem por posição + força.
3. otimização: swaps de mesma posição entre times p/ minimizar |totalBranco - totalPreto|.
4. GK: um por time.

## Implementação (src/index.html)
- [x] CSS sorteio
- [x] Aba HTML + nav button (admin)
- [x] pos no cadastro (form + inline select na lista)
- [x] addPlayer lê pos; setPlayerPos
- [x] renderSorteio / confirmados / avulsos / GK toggle
- [x] gerarTimes + balanceTeams + renderLineup + copyLineup
- [x] nav scroll horizontal (7 abas no admin)
- [x] Preview local com admin (file:// trigger seguro)
- [ ] Aprovação + deploy + setar posições reais na produção
