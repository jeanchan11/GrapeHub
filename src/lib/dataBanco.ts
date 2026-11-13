// Colunas DATE (`data`, `data_reuniao`, `periodo_*`) chegam na API como "2026-10-27T00:00:00.000Z":
// o pg converte a data em meia-noite no fuso do SERVIDOR, que em produção é UTC. No navegador
// (UTC−3) isso vira 21h do dia anterior — a data aparecia um dia para trás (relato de 16/10/2026).
// Use só a parte AAAA-MM-DD e fixe meio-dia local.
export function dataDoBanco(iso: string): Date {
  return new Date(String(iso).slice(0, 10) + 'T12:00:00');
}

// "Hoje" em AAAA-MM-DD no fuso do navegador. `toISOString()` é UTC: depois das 21h dá amanhã.
export function hojeLocal(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
