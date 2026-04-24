// Seed hiring documents from extracted HTML content
const BASE = 'http://localhost:3000';
const SECTION = 'Gestor';

const documents = [
  {
    title: "ICP Gestor",
    content: `Perfil Ideal
- Idade: de 20 até 24 anos
- Ideal: até um 1 ano de atuação no tráfego pago
- Aceitável: até 3 anos de atuação no tráfego pago/digital
- Ideal: Nunca trabalhou em agência
- Aceitável: Trabalhou em no máximo 1 agência
- Ideal: Sem clientes/projetos pessoais ativos
- Aceitável: Entre 1-3 clientes pessoais ativos
- Ideal: Perfil Tranning ou Júnior - Trabalhou em poucos projetos ao longo da jornada
- Fora do Ideal: Não contratar perfil Pleno ou Sênior para início de trabalho
- Fora do Ideal: Não pode conciliar com outra agência
- Ideal: Solteiro [Literalmente ou Namorando]
- Fora do Ideal: Casado
- Ideal: Pessoas que nasceram e residem no: Sul, Sudeste e Centro Oeste
- Fora do Ideal: Pessoas que nasceram e residem no: Norte e Nordeste
- Ideal: Homens
- Fora do Ideal: Mulheres
- Perfil Dominante e Conforme
- Disponibilidade de tempo - Sem estar prestando atividades a outras agências de marketing ou ter quantidade alta de empresas ativas na carteira de clientes
- Precisa do trabalho e conta com o dinheiro da Grape mensal para manter-se
- Não estar prospectando novos clientes
- Vontade de trabalhar, apreender novos conhecimento e chegar no próximo nível pessoa/profissional
- Extremamente adaptável a mudanças na gestão de tráfego, processos e formatos de trabalho - Tudo tem mudado muito rápido
- Necessário computador/notebook com ótimas configurações + Web Cam com boa qualidade
- Vestimenta e cenário alinhados

Soft Skills
- Extrovertido (Fundamental)
- Persistente e adaptável
- Comunicação direta e objetiva
- Aptidão para buscar ajuda com os membros da equipe - Interação em Equipe
- Segue os processos a risca, diretrizes e orientações
- Gosta de regras, padrões e processos bem definidos
- Metódico e Analista
- Preza pela precisão e qualidade no trabalho, mesmo lidando com volume
- Controle emocional elevado mesmo sob pressão
- Boa capacidade de lidar com feedbacks negativos e corrigir rapidamente a rota
- Hábil em persuadir (Preferência)
- Alta organização e planejamento antes da execução (Preferência)

Hard Skills
- Conhecimento Básico ou Intermediário prático em Meta Ads
- Conhecimento Básico ou Intermediário prático em Google Ads
- Conhecimento prático em LinkedIn Ads, Tik Tok Ads, E-mail Marketing e Vendas Consultivas (Diferencial)

Teste Disc - Foco para Contratação
- Conformidade #1
- Estabilidade #2
- Dominância #3
- Influência #4

NÃO CONTRATAR QUEM APRESENTAR CARACTERÍSTICAS ABAIXO:
- Falou mal da antiga empresa
- Falou mal do antigo líder direto
- Vítima da sociedade
- Antigos colegas de trabalho o sabotavam
- Reclamava das demandas e das entregas
- Quem não precisa de trabalho/dinheiro
- Falou de politica e é um ativo político
- Orientação política: esquerda
- Primeiro trabalho/empresa da vida toda`
  },
  {
    title: "Canais de Aquisição",
    content: `- Campanhas de Tráfego Pago [Sul, Sudeste e Centro Oeste - APENAS]
- Grupos do Facebook Relacionados ao Digital
- GTE
- Grupos do Telegram
- Grupos de WhatsApp
- Infojobs
- Indeed
- LinkedIn
- Pandapé`
  },
  {
    title: "Forms",
    content: `GRAPE MÍDIA 🍇

[VAGA PARA GESTOR DE TRÁFEGO E ANALISTA DE DADOS NO MARKETING JURÍDICO]

Faça Parte da Equipe de Excelência em Marketing Jurídico na Grape Mídia! Estamos em busca de um profissional dinâmico e proativo para assumir a vaga em nossa renomada empresa. Se você é entusiasta de estratégias digitais, apaixonado por análise de dados, soluções de problemas, resoluções de gargalos, esta é a oportunidade perfeita para integrar nossa equipe inovadora.

Modelo de Trabalho: Home Office (Necessário Residir em Curitiba - PR ou Região Metropolitana)

Cultura Grape: Temos uma cultura forte e solidificada, sendo alinhada ao resultado, pautada no relacionamento com os nossos parceiros e no LTV.

Remuneração: R$1.750 até R$3.000 [Fixo e Bonificação] + Gympass + Plano de Carreira + Cursos/Novas aprendizagens

Link abaixo para aplicar ao formulário ⬇️
https://grapemidia.typeform.com/to/Lb4Oi5tf`
  },
  {
    title: "Call I",
    content: `⭐ Perguntar sobre a vida pessoal:
- Me conta a tua história; Fez faculdade ou pretende fazer alguma? Por quê largou a faculdade? Mora com quem? Planos de casar?

⭐ Conte sobre uma situação em que você teve que assumir a liderança em um projeto.
- Qual era o desafio enfrentado? Que medidas você tomou para liderar com sucesso a equipe? O desfecho da situação foi mais negativo do que positivo?

⭐ Você mudaria algo no estilo de liderança do seu antigo gestor na última empresa que trabalhou? Como era e como você adaptava-se ao formato de cobrança dele

⭐ Os prazos, de modo geral na última empresa que trabalhou, eram:
1 - Urgentes
2 - Curtos
3 - Médios
4 - Longos

⭐ O que eu preciso fazer para te tirar do seu emprego atual?

⭐ O que você está buscando atualmente?

⭐ Atualmente, você joga algum jogo?

⭐ O que você busca na Grape?

⭐ O que te faz levantar de manhã todos os dias?

⭐ Como era o seu comportamento na época da escola?

⭐ Como era a relação com seus pais?

⭐ Se você tivesse que receber um beneficio do INSS mas demorasse mais de um ano e a sua necessidade fosse imediata - Como você reagiria? O que você faria?

⭐ Como você se satisfaz no trabalho?

⭐ Você prefere ambientes onde toma decisões por conta própria ou onde tudo é estruturado e há processos desenhados para execução? Por quê?

⭐ Já te prometeram alguma promoção de cargo e não aconteceu? Se sim, o que você fez e como se sentiu?

⭐ Mudou de setor alguma vez dentro das suas últimas empresas? Se sim, como foi o processo de adaptação?

⭐ Qual situação pessoal/profissional que você precisou usar a adaptação como ferramenta principal?

⭐ Já teve a oportunidade de trabalhar com clientes da sua antiga empresa depois que saiu de lá? Se sim, como foi?

⭐ Quando tem uma atividade simples mas que precisa ser feita, você resolve de imediato ou costuma deixar para depois?

⭐ O que você faz quando percebe que uma tarefa vai demorar mais do que o esperado?

⭐ Já aconteceu de você não ter todas as informações necessárias para uma tarefa? O que fez: esperou ou começou mesmo assim?

⭐ Prefere planejar muito antes de executar ou começar e ajustar no caminho?

⭐ Você costuma trabalhar escutando podcasts, vídeos no youtube ou música?

⭐ Onde você se vê daqui 2-3 anos?

⭐ Qual é o seu maior sonho?

⭐ Como é a sua rotina atualmente? Quando acorda até a hora que vai dormir

⭐ Qual foi o último curso que você leu e o último curso que estudou?

⭐ Quais requisitos a empresa precisar ter, para você considerar uma empresa positiva de se trabalhar?

⭐ O que gosta de fazer quando não está trabalhando?

⭐ O que faz sexta-feira pela noite e sábado pela manhã?

⭐ Quem foi seu antigo chefe? Se eu ligar para ele hoje, o que ele me falaria de você?

⭐ Qual é a sua disponibilidade de horário, hoje, para trabalhar na Grape Mídia?

⭐ Explicar sobre Otimização de campanhas diárias e Cultura de Reuniões

⭐ Diferença entre PRESSÃO X TENSÃO - Explicar que somos uma empresa de resultados

⭐ Mencionar teto de 17 Parceiros Ativos`
  },
  {
    title: "Fase Técnica",
    content: `Gostaríamos de avançar contigo a fase técnica, três situações que gostaríamos de dividir com você

Pode ser?

Vamos iniciar agora, uma nova etapa no nosso processo, ok? É uma fase técnica, que apresentaremos a você alguns dados (no documento abaixo) e gostaríamos de entender a sua forma de pensar e tomada de decisões.

Espero que consiga nos entregar respostas completas, detalhadas e com uma conclusão (Desfecho). Não tem certo ou errado, apenas pontos de vista diferentes e formas diferentes de resolver os problemas.`
  },
  {
    title: "Averiguação de Fatos",
    content: `⭐ Ligar para o antigo dono da empresa/gestor/gerente
(Não ser algo eliminatório - ter prudência para analisar e entender se faz sentido)
(O futuro dessa pessoa não pode ser medido por uma opinião de terceiro)

⭐ Pegar o nome completo da pessoa e jogar no Jusbrasil para mapearmos:
1 - Processos Trabalhistas
2 - Outras ações de processo contra empresas
3 - Condenações Criminais ou comparecimentos a delegacia`
  },
  {
    title: "Call II",
    content: `⭐ Apresentar a Universidade Grape Mídia

⭐ Apresentar, por completo, o Plano de Carreira e perguntar se está dentro das expectativas

⭐ Mostrar o Descritivo do Cargo

⭐ Alinhar se: A demanda já está na casa neste momento ou construiremos de degrau em degrau:
- Já temos uma quantidade inicial de pelo menos XX parceiros inicial - Isso seria um problema?
- Vamos prestar todo o suporte necessário, ele não vai ficar sozinho e na mão na execução das tarefas

⭐ Hoje a vaga é para gestor de tráfego e performance com foco no funil completo, campanhas e comercial - Resultado dos nossos parceiros é nosso compromisso e responsabilidade total - Alta frequência

⭐ Nosso foco enquanto empresa é ajustar o que está ruim no funil e deixar aquilo que está bom ainda melhor

⭐ Análise do CRM + Campanhas + Mensagens de colheita de Feedback - DIÁRIO ROTACIONANDO OS PARCEIROS

⭐ Espere da Grape crescimento e evolução pessoal, profissional e na maturidade e espere trabalho, de fato, rotinas definidas e execução de tarefas - Faz realmente sentido mesmo e é isso que busca atualmente?

⭐ Criativos de imagem + Edição de Vídeos

⭐ Pagamento é proporcional aos dias trabalhados no primeiro momento por a contratação ser no meio do mês

⭐ Somos uma empresa que prezamos pelo processo sendo seguido e por rotinas diárias sendo executadas - Faz sentido mesmo e é isso que busca atualmente?

⭐ Nós esperamos dos gestores e as parcerias elas dão certo quando:
- Temos análise e otimização diária nas contas - Alta frequência
- Nossas analises de dados são voltadas a estratégia e a solução de problemas
- Feedbacks nos grupos do WhatsApp é um dos pontos mais importantes do projeto

⭐ Modelo de contratação: Prestador de serviços, CNPJ e em Home Office`
  },
  {
    title: "Contratado",
    content: `Fala XXX, tudo tranquilo?

Voltando aqui para deixar com você o feedback sobre a nossa reunião de ontem, gostamos muito do seus testes, do seu perfil e acreditamos demais que poderemos construir uma parceira muito longa e próspera a todos nós. Deixo aqui o nosso convite formal, para você vir se tornar do nosso time daqui em diante e começar a vestir o roxo, o que me diz?

Bora começar a correr juntos? 🍇

Fico no aguardo do seu feedback

Próximos passos:
1 - Formulário para informações básicas
2 - Carta Proposta
3 - Contrato de prestação de serviços e nosso planejamento

Planejamento é iniciar os trabalhos na XXX, ok?

Vou deixar o formulário, consegue preencher pra gente?
https://forms.clickup.com/37032942/f/13a4ze-5583/8V3Q6XD6BB8147TZYB

Enviar a carta proposta + Contrato Prestação de Serviços

Vou deixar com você a Carta proposta e o nosso contrato de prestação de serviços. Lê os dois com calma e depois assina pra gente. Se ficar melhor, assina amanhã pela manhã também e tudo certo, ok?

Só assina a carta proposta primeiro e depois a gente parte a assinatura do contrato de fato, fechou?`
  },
  {
    title: "Desqualificado",
    content: `Oi, XXX

Queremos agradecer de coração por sua participação no nosso processo seletivo. Foi um prazer conhecer mais sobre você e sua trajetória!

Neste momento, optamos seguir por outro caminho, mas valorizamos muito seu perfil e faremos questão de mantê-lo em nosso banco de talentos para futuras oportunidades, com certeza

Desejamos muito sucesso na sua jornada e seguimos à disposição. Até breve, meu amigo 🤝`
  },
  {
    title: "Avaliação Desempenho P.E.",
    content: `Feedback 360°: 30 dias - 60 dias - 90 dias - 120 dias`
  },
  {
    title: "Desligamento",
    content: `Critérios ao Desligamento do Colaborador:

# 3 feedbacks sobre a mesma falha ou pontos semelhantes e não houve mudanças significativas

- Entrega de materiais e demandas em atraso recorrente (sem justificativa plausível)
- Prejuízo financeiro nas contas dos advogados, por falha operacional
- Orçamento do mês gasto em uma semana por falta de zelo
- Orçamento da campanha menor do que o combinado com o parceiro por falta de zelo
- Prejuízo a Grape com chruns evitáveis
- Ausência recorrente nas reuniões internas com o time
- Ausência recorrente nas reuniões externas com os advogados`
  }
];

async function seed() {
  console.log(`Seeding ${documents.length} documents into section "${SECTION}"...`);
  for (const doc of documents) {
    try {
      const res = await fetch(`${BASE}/api/hiring/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: doc.title,
          content: doc.content,
          section: SECTION,
          created_by: 'Jean Chan'
        })
      });
      const data = await res.json();
      console.log(`✅ Created: "${doc.title}" (id: ${data.id})`);
    } catch (err) {
      console.error(`❌ Error creating "${doc.title}":`, err.message);
    }
  }
  console.log('Done!');
}

seed();
