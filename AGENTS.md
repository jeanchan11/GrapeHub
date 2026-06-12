# Instruções de Desenvolvimento - GrapeHub

- **obrigatorio:** Não use comandos git ou Python. O ambiente do usuário não suporta essas ferramentas.
- **Design System:** Sempre siga as diretrizes definidas em `/DESIGN_SYSTEM.md` para qualquer alteração de UI (cards, modais, cores, etc.).
- **Consistência:** Garanta que todos os componentes sigam o padrão do sistema definido.
- **Comunicação:** Informe ao usuário sempre que uma alteração seguir o padrão definido.

- **autorização:** Sempre pessa permissão ao mexer em qualquer coisa do banco de dados.  Como criar tabelas, apagar registros ou apagar qualquer coisa.


- **Dashboards:** Ao criar qualquer nova página de dashboard ou métricas, siga **obrigatoriamente** a seção 4 do `/DESIGN_SYSTEM.md`. Isso inclui:
  - Headline com título branco + última palavra em `text-violet-500` + subtítulo uppercase 10px
  - Fundo da página: `bg-dark-bg`
  - Cards: `bg-dark-card border border-white/10 rounded-2xl`
  - Texto: `text-dark-text`
  - Loading spinner: `border-violet-500/30 border-t-violet-500`
  - Referência de componentes: `CrmMetricas.tsx` (KpiCard, DeltaBadge, MonthPicker)
