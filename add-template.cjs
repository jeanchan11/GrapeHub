const fs = require('fs');
const target = 'src/pages/OnboardingOperacional.tsx';
let content = fs.readFileSync(target, 'utf8');

const templateStr = `
const ATA_TEMPLATE = \`# ATA DA REUNIÃO

### ____________________________________________________
### **APRESENTAÇÃO**
### 🍇| Bom dia/Boa tarde/Boa noite aos participantes da reunião;
### 🍇| Perguntar do lado pessoal, final de semana e como foi o dia;
### 🍇| Apresente-se (Qual a tua função);
_________________________________________________________________________________
## PÚBLICO
 🍇| VERBA para INVESTIMENTO em anúncios

🍇| Qual AÇÃO e PLATAFORMA iremos iniciar

🍇| Quais são as CARACTERÍSTICAS DO PÚBLICO

🍇| DETALHES Adicionais do Projeto

🍇| Local para rodar as campanhas

## NOVOS ENCONTROS
- [ ] Explicar o motivo de dividir as reuniões desta maneira
- [ ] Agendar a Criação/Coleta de Acessos
- [ ] Agendar o treinamento comercial

_________________________________________________________________________________
## ACESSOS CRM + IA

- [ ] Faz sentido utiliza-lo?

- [ ] Teremos IA no atendimento

- [ ] Quantas contas (Limite 4) e para Quais E-mails podemos criar os acessos:

_________________________________________________________________________________
## ALINHAMENTOS DE EXPECTATIVAS
*   Criativos
    - [ ] Criativos em vídeo no Facebook Ads [Importância na qualificação do público]
    - [ ] Faremos Criativos de Imagem e Edição nos Vídeos
    - [ ] Adicionaremos legendas, faremos cortes pontuais e melhoraremos o áudio - Edições simples conectam muito melhor com um público mais simples
    - [ ] Link do Google Drive na Descrição (Tudo que forem nos enviar, precisa estar lá para termos salvo e manter a qualidade das imagens)
    
*   Campanhas
    - [ ] Processo para Início das Campanhas: DEPOIS DO TREINAMENTO COMERCIAL - QUANTO ANTES NOS ENVIAREM OS MATERIAIS QUANTO ANTES INICIAMOS
    
*   Financeiro
    - [ ] Explicar sobre a Marvee - A empresa terceirizada que cuida do nosso Financeiro (Eles farão as cobranças porém o boleto chegará em nome da Grape Mídia com nossos dados)
    - [ ] Quem ficará responsável pelo Financeiro do escritório + Número do Responsável?
    - [ ] Por onde será a comunicação financeira (Campanhas/anúncio)
    

Gostariam de receber as nossas faturas por:

- [ ] E-mail
- [ ] WhatsApp

  

A data do pagamento ficou alinhada com o seu fluxo de caixa do seu escritório?

- [ ] A data é sempre a do mesmo dia que o primeiro pagamento foi feito
- [ ] Caso não, qual outro dia fica melhor dentro do mesmo mês?
- [ ] NÃO HÁ POSSIBILIDADE DE PAGAMENTO PROPORCIONAL (SE ELE PERGUNTAR)

  

Não é necessário enviar o comprovante de depósito dos nossos honorários:

- [ ] Assas contabiliza certinho (nosso banco digital) e temos um financeiro trabalhando nessas demandas diariamente
- [ ] O grupo somente para assuntos de campanhas

  

*   Comunicação
    - [ ] Canais oficiais de comunicação da Grape Mídia: Grupo do WhatsApp + WhatsApp da Direção (Jean) e Gerência (Seu WhatsApp)
    - [ ] Feedback de Campanhas + Ajustes no Funil + CRM é com o número do squad/gestor de tráfego
    - [ ] Honorários Grape é diretamente com a Marvee
    - [ ] Demais assuntos é diretamente com a Liderança da Grape
    
      
    
*    Alinhamento de contratos
    
    Quantos contratos fechados te deixaria feliz neste primeiro momento: (META PROGRESSIVA - ALINHAR QUE PODEMOS NÃO FECHAR CONTRATOS NESTE PRIMEIRO MOMENTO)
    

Nossa principal missão será descobrir: **O CAC da nossa operação**
- [ ] Trazendo muito mais previsibilidade ao escritório de aportar mais dinheiro vs retorno em contratos
- [ ] Nós baseamos nosso CAC na régua do mercado, contabilizando apenas o valor de investimento em anúncio visto que os honorários da Grape são referente a nossa mão de obra apenas
- [ ] Relatório semanal Padrão Grape Mídia [PDF]
- [ ] Falar que: "Nosso contato será diário no WhatsApp"
- [ ] Feedback do Advogado [Frisar importância e faturamento como aumenta]
- [ ] Reunião de Alinhamento Quinzenal [Frisar importância e faturamento como aumenta]

  

- [ ] Explicar sobre o SIG - Sistema de Indicação Grape
- [ ] Cada indicação que fechar conosco um contrato de pelo menos 4 meses
- [ ] Faremos um Pix no valor de R$500.00 ou abateremos R$500.00 no próximo honorário da nossa empresa

### ____________________________________________________
## FEEDBACK REVERSO + GOOGLE MEU NEGÓCIO
- [ ]  O que você espera dos nossos serviços e como a Grape Mídia conseguirá ajudar na fase atual - Além da rentabilidade, contratos fechados e novas oportunidades:

- [ ] Qual foi o maior diferencial que identificou na nossa empresa que foi o motivo da contratação?

- [ ] NPS Mensal - Nos ajudará como Empresa e a Melhorar no nosso projeto - Ganha Ganha

- [ ]     Gostaríamos muito de ter esse feedback positivo dentro do nosso Google Meu Negócio
    - [ ] Consegue nos ajudar deixando esse feedback na nossa vitrine?
    - [ ] ENVIAR O LINK DO NOSSO GOOGLE MEU NEGÓCIO ABAIXO NO GRUPO DO WHATSAPP: http://bit.ly/44YP1O2

SEU RESULTADO: É NOSSO COMPROMISSO E RESPONSABILIDADE TOTAL
POR ISSO PREZAMOS PELOS ALINHAMENTOS INICIAIS COMERCIAIS
### ______________________________________________________________________________________\`;
`;

// Insert ATA_TEMPLATE before SubtaskDetailModal
const searchStr = 'const SubtaskDetailModal =';
content = content.replace(searchStr, templateStr + '\n' + searchStr);

fs.writeFileSync(target, content);
console.log('Template inserted.');
