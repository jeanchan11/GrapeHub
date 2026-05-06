const fs = require('fs');
const target = 'src/pages/OnboardingOperacional.tsx';
let content = fs.readFileSync(target, 'utf8');

const regex = /const ATA_TEMPLATE = `.*?`;/s;
const newTemplate = `const ATA_TEMPLATE = \`<h1>ATA DA REUNIÃO</h1>

<hr>
<h3><strong>APRESENTAÇÃO</strong></h3>
<h3>🍇| Bom dia/Boa tarde/Boa noite aos participantes da reunião;</h3>
<h3>🍇| Perguntar do lado pessoal, final de semana e como foi o dia;</h3>
<h3>🍇| Apresente-se (Qual a tua função);</h3>
<hr>
<h2>PÚBLICO</h2>
<p>🍇| VERBA para INVESTIMENTO em anúncios</p>
<p>🍇| Qual AÇÃO e PLATAFORMA iremos iniciar</p>
<p>🍇| Quais são as CARACTERÍSTICAS DO PÚBLICO</p>
<p>🍇| DETALHES Adicionais do Projeto</p>
<p>🍇| Local para rodar as campanhas</p>

<h2>NOVOS ENCONTROS</h2>
<ul data-type="taskList">
  <li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Explicar o motivo de dividir as reuniões desta maneira</p></div></li>
  <li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Agendar a Criação/Coleta de Acessos</p></div></li>
  <li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Agendar o treinamento comercial</p></div></li>
</ul>

<hr>
<h2>ACESSOS CRM + IA</h2>
<ul data-type="taskList">
  <li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Faz sentido utiliza-lo?</p></div></li>
  <li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Teremos IA no atendimento</p></div></li>
  <li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Quantas contas (Limite 4) e para Quais E-mails podemos criar os acessos:</p></div></li>
</ul>

<hr>
<h2>ALINHAMENTOS DE EXPECTATIVAS</h2>
<ul>
  <li>Criativos
    <ul data-type="taskList">
      <li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Criativos em vídeo no Facebook Ads [Importância na qualificação do público]</p></div></li>
      <li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Faremos Criativos de Imagem e Edição nos Vídeos</p></div></li>
      <li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Adicionaremos legendas, faremos cortes pontuais e melhoraremos o áudio - Edições simples conectam muito melhor com um público mais simples</p></div></li>
      <li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Link do Google Drive na Descrição (Tudo que forem nos enviar, precisa estar lá para termos salvo e manter a qualidade das imagens)</p></div></li>
    </ul>
  </li>
  <li>Campanhas
    <ul data-type="taskList">
      <li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Processo para Início das Campanhas: DEPOIS DO TREINAMENTO COMERCIAL - QUANTO ANTES NOS ENVIAREM OS MATERIAIS QUANTO ANTES INICIAMOS</p></div></li>
    </ul>
  </li>
  <li>Financeiro
    <ul data-type="taskList">
      <li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Explicar sobre a Marvee - A empresa terceirizada que cuida do nosso Financeiro</p></div></li>
      <li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Quem ficará responsável pelo Financeiro do escritório + Número do Responsável?</p></div></li>
      <li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Por onde será a comunicação financeira (Campanhas/anúncio)</p></div></li>
    </ul>
  </li>
</ul>

<p>Gostariam de receber as nossas faturas por:</p>
<ul data-type="taskList">
  <li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>E-mail</p></div></li>
  <li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>WhatsApp</p></div></li>
</ul>

<p>A data do pagamento ficou alinhada com o seu fluxo de caixa do seu escritório?</p>
<ul data-type="taskList">
  <li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>A data é sempre a do mesmo dia que o primeiro pagamento foi feito</p></div></li>
  <li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Caso não, qual outro dia fica melhor dentro do mesmo mês?</p></div></li>
  <li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>NÃO HÁ POSSIBILIDADE DE PAGAMENTO PROPORCIONAL (SE ELE PERGUNTAR)</p></div></li>
</ul>

<p>Não é necessário enviar o comprovante de depósito dos nossos honorários:</p>
<ul data-type="taskList">
  <li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Assas contabiliza certinho (nosso banco digital) e temos um financeiro trabalhando nessas demandas diariamente</p></div></li>
  <li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>O grupo somente para assuntos de campanhas</p></div></li>
</ul>

<ul>
  <li>Comunicação
    <ul data-type="taskList">
      <li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Canais oficiais de comunicação da Grape Mídia: Grupo do WhatsApp + WhatsApp da Direção (Jean) e Gerência (Seu WhatsApp)</p></div></li>
      <li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Feedback de Campanhas + Ajustes no Funil + CRM é com o número do squad/gestor de tráfego</p></div></li>
      <li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Honorários Grape é diretamente com a Marvee</p></div></li>
      <li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Demais assuntos é diretamente com a Liderança da Grape</p></div></li>
    </ul>
  </li>
  <li>Alinhamento de contratos
    <p>Quantos contratos fechados te deixaria feliz neste primeiro momento: (META PROGRESSIVA)</p>
  </li>
</ul>

<p>Nossa principal missão será descobrir: <strong>O CAC da nossa operação</strong></p>
<ul data-type="taskList">
  <li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Trazendo muito mais previsibilidade ao escritório de aportar mais dinheiro vs retorno em contratos</p></div></li>
  <li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Nós baseamos nosso CAC na régua do mercado, contabilizando apenas o valor de investimento em anúncio</p></div></li>
  <li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Relatório semanal Padrão Grape Mídia [PDF]</p></div></li>
  <li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Falar que: "Nosso contato será diário no WhatsApp"</p></div></li>
  <li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Feedback do Advogado [Frisar importância e faturamento como aumenta]</p></div></li>
  <li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Reunião de Alinhamento Quinzenal [Frisar importância e faturamento como aumenta]</p></div></li>
  <li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Explicar sobre o SIG - Sistema de Indicação Grape</p></div></li>
  <li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Cada indicação que fechar conosco um contrato de pelo menos 4 meses</p></div></li>
  <li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Faremos um Pix no valor de R$500.00 ou abateremos R$500.00 no próximo honorário da nossa empresa</p></div></li>
</ul>

<hr>
<h2>FEEDBACK REVERSO + GOOGLE MEU NEGÓCIO</h2>
<ul data-type="taskList">
  <li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>O que você espera dos nossos serviços e como a Grape Mídia conseguirá ajudar na fase atual</p></div></li>
  <li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Qual foi o maior diferencial que identificou na nossa empresa que foi o motivo da contratação?</p></div></li>
  <li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>NPS Mensal - Nos ajudará como Empresa e a Melhorar no nosso projeto - Ganha Ganha</p></div></li>
  <li data-type="taskItem" data-checked="false"><label><input type="checkbox"><span></span></label><div><p>Gostaríamos muito de ter esse feedback positivo dentro do nosso Google Meu Negócio</p></div></li>
</ul>

<p>SEU RESULTADO: É NOSSO COMPROMISSO E RESPONSABILIDADE TOTAL<br>
POR ISSO PREZAMOS PELOS ALINHAMENTOS INICIAIS COMERCIAIS</p>
<hr>\`;`;

content = content.replace(regex, newTemplate);
fs.writeFileSync(target, content);
console.log('Template replaced');
