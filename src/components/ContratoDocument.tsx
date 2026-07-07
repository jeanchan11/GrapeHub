import React, { useMemo, useRef, useState, useLayoutEffect } from 'react';
import { toJpeg } from 'html-to-image';
import { jsPDF } from 'jspdf';
import timbrado from '../assets/contrato-timbrado.png';

// ── Dados preenchíveis do contrato ─────────────────────────────────────────────
export interface ContratoData {
  nome: string;
  tipoPessoa: 'juridica' | 'fisica';
  documento: string;
  valorNumero: string;
  valorExtenso: string;
  dataAssinatura: string;
}

// A4 @ 96dpi
const PAGE_W = 794;
const PAGE_H = 1123;
const PAD_TOP = 120;    // limpa o logo do timbrado
const PAD_BOTTOM = 118; // limpa o rodapé do timbrado
const PAD_X = 74; // margem lateral do texto no documento
const CONTENT_W = PAGE_W - PAD_X * 2;
const CONTENT_H = PAGE_H - PAD_TOP - PAD_BOTTOM - 6; // -6 de folga

// Exporta cada página A4 (com timbrado) para o PDF, rasterizando página a página.
export async function exportContratoPdf(container: HTMLElement, fileName: string) {
  const pages = Array.from(container.querySelectorAll<HTMLElement>('[data-contrato-page]'));
  if (pages.length === 0) return;
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
  const W = 210, H = 297;
  let added = 0;
  for (let i = 0; i < pages.length; i++) {
    const dataUrl = await toJpeg(pages[i], {
      pixelRatio: 2, quality: 0.92, backgroundColor: '#ffffff', width: PAGE_W, height: PAGE_H, cacheBust: true,
    });
    if (added > 0) pdf.addPage();
    pdf.addImage(dataUrl, 'JPEG', 0, 0, W, H);
    added++;
  }
  pdf.save(fileName);
}

// ── Blocos do contrato (dados) ─────────────────────────────────────────────────
type Block =
  | { kind: 'title'; node: React.ReactNode }
  | { kind: 'sec'; text: string }
  | { kind: 'p'; node: React.ReactNode; bold?: boolean; indent?: boolean; center?: boolean }
  | { kind: 'sign'; data: ContratoData };

function buildBlocks(d: ContratoData): Block[] {
  const pessoa = d.tipoPessoa === 'juridica' ? 'jurídica' : 'física';
  const inscr = d.tipoPessoa === 'juridica' ? 'inscrita' : 'inscrito';
  const docLabel = d.tipoPessoa === 'juridica' ? 'CNPJ' : 'CPF';
  const nome = d.nome?.trim() || 'CLIENTE';
  const doc = d.documento?.trim() || '000.000.000-00';
  const valorNum = d.valorNumero?.trim() || 'R$ 0,00';
  const valorExt = d.valorExtenso?.trim() || '';
  const dataAss = d.dataAssinatura?.trim() || '00 de mês de 0000';

  const itens1_3 = [
    'Gerenciamento de Anúncios nas plataformas de anúncio;',
    'Definição estratégica dos tipos de anúncios com maior potencial de engajamento e conversão;',
    'Análise contínua de desempenho e otimização de campanhas;',
    'Publicação e monitoramento de anúncios;',
    'Gerenciamento de Anúncios;',
    'Elaboração de relatórios semanais detalhados, referentes às campanhas;',
    'Planejamento estratégico das campanhas publicitárias;',
    'Estruturação e otimização do funil de vendas, completo, ao escritório;',
    'Análise de tendências do mercado;',
    'Gestão eficiente da alocação dos investimentos em publicidade;',
    'Criação de Landing Page de alta conversão;',
    'Treinamento comercial ao time de vendas;',
    'Implementação e gestão de plataforma CRM para organização e atendimento de leads;',
    'Treinamento da equipe no uso do CRM;',
    'Criação de grupo no WhatsApp para facilitar a comunicação e agilizar os processos;',
    'Realização de reuniões periódicas para acompanhamento estratégico dos resultados;',
  ];

  const B: Block[] = [];
  B.push({ kind: 'title', node: 'CONTRATO DE PRESTAÇÃO DE SERVIÇO' });
  B.push({ kind: 'p', node: (<>
    Por este instrumento particular, de um lado, <b>{nome}</b>, pessoa {pessoa}, {inscr} no <b>{docLabel} nº: {doc}</b>,
    doravante simplesmente CONTRATANTE e, de outro lado, GRAPE MÍDIA LTDA, pessoa jurídica, inscrita no CNPJ nº
    50.684.938/0001-46, com sede na Rua, AV. CANDIDO DE ABREU 526, Bairro CENTRO CÍVICO, CEP 80530-905, Curitiba, PR,
    por seu representante legal, JEAN BARRETO CHAN, inscrito no CPF sob o nº 102.412.209-39, doravante simplesmente
    CONTRATADA, têm entre si, justo e contratado, o que mutuamente aceitam e outorgam, mediante as cláusulas e condições seguintes.
  </>) });

  B.push({ kind: 'sec', text: '1 – DO OBJETO CLÁUSULA' });
  B.push({ kind: 'p', node: '1.1. O presente contrato tem por objeto a prestação de serviços de consultoria em vendas e assessoria em propaganda e publicidade, de forma totalmente autônoma, com foco em tráfego pago e marketing jurídico. Os serviços compreendem a utilização de ferramentas de comunicação paga essenciais à consecução dos objetivos publicitários, incluindo o desenvolvimento e a implementação da identidade de marca, a promoção de produtos e a divulgação dos serviços do CONTRATANTE dentro do seu mercado de atuação.' });
  B.push({ kind: 'p', bold: true, node: '1.2. O serviço será executado com base no material fornecido pelo CONTRATANTE à CONTRATADA, incluindo orientações sobre as funções essenciais e os relacionamentos operacionais necessários, bem como fotos, imagens e logotipos. Fica expressamente proibida a interferência de terceiros no desempenho das atividades da CONTRATADA.' });
  B.push({ kind: 'p', bold: true, node: '1.3. A CONTRATADA desempenhará suas atividades com base no serviço selecionado pelo CONTRATANTE no formulário de contratação. A prestação de serviços compreenderá, exemplificativamente, as seguintes atividades:' });
  itens1_3.forEach(t => B.push({ kind: 'p', indent: true, node: t }));

  B.push({ kind: 'sec', text: '2 - DAS OBRIGAÇÕES DA CONTRATADA' });
  B.push({ kind: 'p', bold: true, node: '2.1. Além das demais obrigações previstas neste contrato, a CONTRATADA se compromete a:' });
  B.push({ kind: 'p', node: 'a) Informar à CONTRATANTE qualquer anormalidade identificada na execução dos serviços que possa comprometer o andamento ou a qualidade do processo;' });
  B.push({ kind: 'p', node: 'b) Manter a CONTRATANTE ciente de todas as ações a serem realizadas no âmbito deste contrato;' });
  B.push({ kind: 'p', node: 'c) Enviar relatórios semanais à CONTRATANTE, ou sempre que solicitado, com informações detalhadas sobre o desempenho das campanhas.' });
  B.push({ kind: 'p', bold: true, node: '2.2. A CONTRATADA não será responsável pelos encargos de natureza fiscal, tributária e trabalhista decorrentes da execução do objeto desta contratação no escritório da CONTRATANTE, os quais serão de inteira responsabilidade da CONTRATANTE.' });
  B.push({ kind: 'p', bold: true, node: '2.3. A CONTRATADA deverá fornecer Nota Fiscal de Serviços, referente ao(s) pagamento(s) efetuado(s) pelo CONTRATANTE.' });
  B.push({ kind: 'p', bold: true, node: '2.4. Não há por força deste contrato qualquer relação de emprego entre a CONTRATADA e o CONTRATANTE.' });
  B.push({ kind: 'p', bold: true, node: '2.5. A gestão de tráfego pago e os treinamentos comerciais serão realizados por profissional especializado, indicado e remunerado pela CONTRATADA, sob sua supervisão e fiscalização. Para tanto, será criado um grupo no WhatsApp, no qual também estará presente os sócios da CONTRATADA, a fim de assegurar o acompanhamento das atividades.' });
  B.push({ kind: 'p', bold: true, node: '2.6. Cabe à CONTRATADA a responsabilidade de manter-se atualizada em relação às normas de marketing estabelecidas pela OAB.' });
  B.push({ kind: 'p', bold: true, node: '2.7. A CONTRATADA fica totalmente isenta de qualquer responsabilidade por situações relacionadas à CONTRATANTE com a OAB (Ordem dos Advogados do Brasil), incluindo, mas não se limitando a, questões de conformidade com as normas e regulamentos estabelecidos pela referida entidade.' });

  B.push({ kind: 'sec', text: '3 - DAS OBRIGAÇÕES DO CONTRATANTE' });
  B.push({ kind: 'p', bold: true, node: '3.1. Além de outras obrigações previstas neste contrato, a CONTRATANTE compromete-se a:' });
  B.push({ kind: 'p', node: 'a) Efetuar o pagamento dos valores fixos no prazo previsto no presente contrato;' });
  B.push({ kind: 'p', node: 'b) Respeitar a autonomia funcional da CONTRATADA;' });
  B.push({ kind: 'p', node: 'c) Fornecer as orientações necessárias para que a CONTRATADA possa realizar a gestão de tráfego pago de forma eficiente, reconhecendo que a CONTRATANTE é a melhor fonte de informações sobre a dinâmica de seu nicho de atuação;' });
  B.push({ kind: 'p', node: 'd) Indicar ajustes e pré-aprovar o material enviado pela CONTRATADA, fornecendo condições básicas e necessárias ao fiel cumprimento deste contrato;' });
  B.push({ kind: 'p', bold: true, node: '3.2. A CONTRATANTE se obriga a realizar o pagamento dos anúncios diretamente às plataformas de anúncio. Em caso de inadimplemento, o presente contrato poderá ser rescindido, a critério exclusivo da CONTRATADA, por culpa única e exclusiva da CONTRATANTE. O valor dos anúncios será determinado com base em acordo entre a CONTRATADA e a CONTRATANTE;' });
  B.push({ kind: 'p', bold: true, node: '3.3. Cabe à CONTRATADA orientar a CONTRATANTE sobre os procedimentos e prazos para os pagamentos diretamente às plataformas de anúncios, a fim de garantir a continuidade da campanha publicitária.' });

  B.push({ kind: 'sec', text: '4 – DOS HONORÁRIOS' });
  B.push({ kind: 'p', node: 'A remuneração pelos serviços prestados obedecerá às seguintes condições:' });
  B.push({ kind: 'p', bold: true, node: (<>
    4.1. Pela elaboração e execução dos serviços contratados neste contrato, o CONTRATANTE pagará à CONTRATADA o valor de{' '}
    <b>{valorNum} ({valorExt})</b> mensalmente, na data previamente acordada entre as partes, sendo admitida a cobrança de
    juros e multa por atraso/inadimplência no pagamento.
  </>) });
  B.push({ kind: 'p', node: '4.2. O pagamento da primeira parcela deverá ser efetuado através do link de pagamento enviado pela CONTRATADA. As parcelas subsequentes deverão ser pagas por meio de boletos, que serão enviados ao CONTRATANTE, via e-mail ou WhatsApp, através do sistema de geração de cobranças Asaas Gestão Financeira Instituição de Pagamento S.A. As demais parcelas deverão ser pagas por meio dos boletos enviados ao CONTRATANTE, via e-mail e WhatsApp, por meio do sistema de geração de cobranças Asaas Gestão Financeira Instituição de Pagamento S.A.' });
  B.push({ kind: 'p', node: '4.3. A CONTRATADA não realiza reembolso de valores, em razão da natureza intelectual, personalizada e de execução imediata dos serviços contratados. A CONTRATANTE declara estar ciente de que, uma vez iniciado o serviço, não haverá devolução, total ou parcial, dos valores pagos, mesmo em caso de cancelamento ou desistência.' });
  B.push({ kind: 'p', node: '4.4. A CONTRATANTE autoriza, de forma expressa, irrevogável e irretratável, o uso de sua imagem, nome e voz pela CONTRATADA em materiais institucionais, conteúdos audiovisuais, campanhas publicitárias, redes sociais, websites, apresentações internas, peças gráficas e demais formatos de comunicação, com a finalidade de promover os serviços prestados, fortalecer a presença institucional da CONTRATADA e servir como referência ou modelo para a atuação de outros profissionais. A CONTRATANTE também consente, de forma expressa, que os resultados obtidos em sua campanha ou projeto sejam divulgados pela CONTRATADA.' });
  B.push({ kind: 'p', node: '4.5. As partes acordam que os honorários contratados contemplam a gestão de até 4 (quatro) campanhas simultâneas, com investimento mensal em anúncios de até R$ 5.000,00 (cinco mil reais).' });
  B.push({ kind: 'p', node: '4.6. Caso o investimento mensal em anúncios ultrapasse o valor de R$ 5.000,00 (cinco mil reais), os honorários da CONTRATADA serão automaticamente acrescidos do valor de R$ 250,00 (duzentos e cinquenta reais) a cada incremento de R$ 1.000,00 (mil reais) adicionais investidos em anúncios, considerando-se tal reajuste como compensação proporcional pelo aumento da demanda operacional, técnica, tecnológica e estratégica.' });
  B.push({ kind: 'p', node: '4.7. Independentemente do valor investido em anúncios, caso a CONTRATANTE opte pela execução de mais de 4 (quatro) campanhas simultâneas, os honorários mensais da CONTRATADA sofrerão acréscimo automático de 50% (cinquenta por cento) sobre o valor vigente à época, em razão do aumento substancial da complexidade, volume de gestão, monitoramento, otimizações e acompanhamento das campanhas.' });
  B.push({ kind: 'p', node: '4.8. Alternativamente, a CONTRATANTE poderá optar por limitar o investimento mensal em anúncios ao teto de R$ 5.000,00 (cinco mil reais), mantendo-se, nesse caso, os honorários originalmente pactuados e o limite máximo de 2 (duas) campanhas simultâneas, sem aplicação dos acréscimos previstos nesta cláusula.' });
  B.push({ kind: 'p', node: '4.9. Os reajustes previstos nesta cláusula possuem natureza automática, objetiva e proporcional, dispensando a celebração de aditivo contratual específico, passando a vigorar no mês subsequente à verificação do aumento de investimento ou de campanhas.' });
  B.push({ kind: 'p', bold: true, center: true, node: 'Parágrafo único: O comprovante das transferências bancárias e/ou pagamento de boletos feitos pelo CONTRATANTE servirão como comprovação do pagamento e quitação dos valores previstos em 3.1.' });

  B.push({ kind: 'sec', text: '5 – DO PRAZO DO CONTRATO' });
  B.push({ kind: 'p', node: '5.1 O presente instrumento inicia-se na data de assinatura deste contrato, dando início aos trabalhos, que será feita logo após o envio do comprovante de pagamento pela CONTRATANTE.' });
  B.push({ kind: 'p', node: '5.2 O presente contrato terá vigência de 4 (quatro) meses.' });
  B.push({ kind: 'p', node: '5.3: O presente contrato será renovado automaticamente por igual período ao término de sua vigência, salvo manifestação em contrário por qualquer das partes.' });

  B.push({ kind: 'sec', text: '6 – DESPESAS E CUSTOS' });
  B.push({ kind: 'p', bold: true, node: '6.1. O Contratante declara que foi orientado e entende que os valores devem ser pagos diretamente as plataformas para os anúncios e publicidades gerarem resultados.' });
  B.push({ kind: 'p', bold: true, node: '6.2. O CONTRATANTE declara que foi orientado e entende que, se as plataformas não pagas corretamente, irão parar a veiculação dos anúncios publicitários, assim afetando diretamente o trabalho assim feito pela CONTRATADA.' });

  B.push({ kind: 'sec', text: '7 – DA RESCISÃO' });
  B.push({ kind: 'p', bold: true, node: '7.1. Em caso de distrato, caso a rescisão do presente contrato seja solicitada por qualquer uma das partes antes do término do prazo de vigência, não haverá multa contratual.' });
  B.push({ kind: 'p', bold: true, node: '7.2. O presente contrato poderá ser rescindido por qualquer uma das partes a qualquer momento, mediante aviso prévio de 30 (trinta) dias antes do encerramento efetivo. Durante esse período de aviso prévio, permanecem devidos os honorários integrais, correspondentes ao mês.' });
  B.push({ kind: 'p', node: '7.3. Durante o período de aviso prévio, a CONTRATANTE poderá, a seu exclusivo critério, optar por não dar continuidade à execução das campanhas, suspender atividades ou dispensar a realização de determinados serviços pela CONTRATADA. Tal opção, contudo, não exime a CONTRATANTE da obrigação de efetuar o pagamento integral dos honorários correspondentes ao período do aviso prévio, considerando que a disponibilidade contratual da CONTRATADA permanecerá garantida até o encerramento efetivo do contrato. A CONTRATADA permanecerá à disposição da CONTRATANTE durante todo o período de aviso prévio, empenhando-se em concluir suas obrigações e entregas.' });
  B.push({ kind: 'p', bold: true, node: '7.4. Este contrato poderá também ser rescindido a qualquer tempo, mediante comunicação por escrito, na ocorrência de inadimplemento de qualquer das partes em relação às cláusulas ou condições estabelecidas, observando-se as disposições do art. 475 do Código Civil.' });
  B.push({ kind: 'p', bold: true, node: '7.5. Em nenhuma hipótese as partes serão responsáveis por quaisquer perdas e danos indiretos, ilimitados, e lucros cessantes de qualquer natureza.' });
  B.push({ kind: 'p', node: '7.6. Fica expressamente vedada a suspensão, interrupção, pausa temporária ou qualquer outra medida que implique a descontinuidade da execução dos serviços objeto do presente contrato, uma vez iniciada a prestação. As partes reconhecem que a natureza dos serviços exige continuidade operacional, planejamento estratégico e execução ininterrupta, razão pela qual a vigência contratual deverá ser cumprida integralmente até seu encerramento formal, nos termos previstos neste instrumento, não sendo admitidas paralisações unilaterais por iniciativa da CONTRATANTE.' });
  B.push({ kind: 'p', node: '7.7. Fica expressamente vedada a suspensão dos serviços, campanhas ou atividades contratadas, especificamente durante o mês de dezembro ou janeiro, independentemente de eventual recesso, férias coletivas, pausas operacionais, períodos festivos ou qualquer outro intervalo compreendido entre os meses de dezembro e janeiro. Ainda que, por liberalidade da CONTRATANTE, não haja execução prática de campanhas, anúncios ou ações durante referido período, permanecem devidos integralmente os honorários contratados, considerando-se mantida a disponibilidade técnica, estratégica e operacional da CONTRATADA, bem como a preservação da estrutura necessária à continuidade dos serviços após o referido período.' });

  B.push({ kind: 'sec', text: '8 – DA LIQUIDEZ DO CONTRATO' });
  B.push({ kind: 'p', bold: true, node: '8.1. O presente contrato consiste em título executivo extrajudicial, nos termos do Art. 784, inc. III do CPC.' });

  B.push({ kind: 'sec', text: '9 – OBSERVÂNCIA À LGPD' });
  B.push({ kind: 'p', node: 'O Contratante declara expresso CONSENTIMENTO para o Contratado coletar, tratar e compartilhar:' });
  B.push({ kind: 'p', indent: true, node: 'Os dados necessários ao cumprimento do contrato, nos termos do Art. 7º, inc. V da LGPD;' });
  B.push({ kind: 'p', indent: true, node: 'Os dados necessários para cumprimento de obrigações legais, nos termos do Art. 7º, inc. II da LGPD;' });
  B.push({ kind: 'p', indent: true, node: 'Os dados, se necessários para proteção ao crédito, conforme autorizado pelo Art. 7º, inc. V da LGPD.' });
  B.push({ kind: 'p', node: 'Outros dados poderão ser coletados, tratados e compartilhados conforme termo de consentimento específico.' });

  B.push({ kind: 'sec', text: '10 – DISPOSIÇÕES GERAIS' });
  B.push({ kind: 'p', node: '10.1. As partes reconhecem e declaram que o Grupo de WhatsApp será considerado a forma oficial de comunicação entre elas, sendo que todos os conteúdos trocados nesse meio terão pleno efeito jurídico, para todos os fins e efeitos deste contrato.' });
  B.push({ kind: 'p', bold: true, node: '10.2. O CONTRATANTE entende que o CONTRATADO não pode garantir resultados específicos relacionados à demanda, comprometendo-se, contudo, a empregar todos os esforços e recursos disponíveis e possíveis, à entrega de um trabalho de excelência.' });
  B.push({ kind: 'p', bold: true, node: '10.3. O CONTRATANTE reconhece que é integralmente responsável pelo atendimento ao cliente final, incluindo, mas não se limitando, à responsabilidade pelo fechamento de negócios com seus leads.' });
  B.push({ kind: 'p', node: 'DEFINIÇÃO DE LEAD: Um Lead é uma oportunidade de negócio para a empresa. De forma mais concreta, Lead é alguém que entrou em contato com o advogado para se informar e entender sobre os serviços jurídicos prestados pelo mesmo.' });

  B.push({ kind: 'sec', text: '11 – DO FORO' });
  B.push({ kind: 'p', node: 'As partes elegem o foro da cidade de Curitiba - PR para dirimir quaisquer questões relativas à presente relação contratual, com a renúncia de qualquer outro, por mais privilegiado que possa ser.' });
  B.push({ kind: 'p', bold: true, center: true, node: `Curitiba - PR, ${dataAss}` });
  B.push({ kind: 'sign', data: d });

  return B;
}

// ── Render de um bloco ──────────────────────────────────────────────────────────
function renderBlock(b: Block, key: React.Key): React.ReactNode {
  if (b.kind === 'title') {
    return <p key={key} style={{ textAlign: 'center', fontWeight: 700, fontSize: 15, margin: 0 }}>{b.node}</p>;
  }
  if (b.kind === 'sec') {
    return <p key={key} style={{ fontWeight: 700, textAlign: 'left', margin: '14px 0 0 0' }}>{b.text}</p>;
  }
  if (b.kind === 'sign') {
    const d = b.data;
    const docLabel = d.tipoPessoa === 'juridica' ? 'CNPJ' : 'CPF';
    const nome = d.nome?.trim() || 'CLIENTE';
    const doc = d.documento?.trim() || '000.000.000-00';
    // Espaço amplo acima das linhas para o assinador automático posicionar a assinatura.
    const ASSINATURA_ESPACO = 72;
    return (
      <div key={key} style={{ marginTop: 80, display: 'flex', justifyContent: 'space-around', textAlign: 'center', gap: 24 }}>
        <div style={{ flex: 1 }}>
          <div style={{ height: ASSINATURA_ESPACO }} />
          <div style={{ borderTop: '1px solid #111', margin: '0 6px 5px', paddingTop: 5 }} />
          <p style={{ margin: 0, fontWeight: 700 }}>{nome}</p>
          <p style={{ margin: 0, fontWeight: 700 }}>{docLabel} nº: {doc}</p>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ height: ASSINATURA_ESPACO }} />
          <div style={{ borderTop: '1px solid #111', margin: '0 6px 5px', paddingTop: 5 }} />
          <p style={{ margin: 0, fontWeight: 700 }}>Grape Mídia LTDA</p>
          <p style={{ margin: 0, fontWeight: 700 }}>CNPJ nº 50.684.938/0001-46</p>
        </div>
      </div>
    );
  }
  // parágrafo
  return (
    <p key={key} style={{
      margin: `${b.indent ? 4 : 8}px 0 0 0`,
      fontWeight: b.bold ? 700 : 400,
      textAlign: b.center ? 'center' : 'justify',
      paddingLeft: b.indent ? 18 : 0,
      lineHeight: 1.5,
    }}>{b.node}</p>
  );
}

const FONT = 'Calibri, Carlito, "Segoe UI", Arial, sans-serif';

// ── Uma página A4 com o timbrado de fundo ──────────────────────────────────────
const ContratoPage: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div data-contrato-page style={{ position: 'relative', width: PAGE_W, height: PAGE_H, background: '#fff', overflow: 'hidden' }}>
    <img src={timbrado} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'fill' }} />
    <div style={{
      position: 'absolute', top: PAD_TOP, left: PAD_X, right: PAD_X, bottom: PAD_BOTTOM,
      fontFamily: FONT, fontSize: 12.5, color: '#111', lineHeight: 1.5,
    }}>
      {children}
    </div>
  </div>
);

// ── Documento paginado ─────────────────────────────────────────────────────────
const ContratoDocument = React.forwardRef<HTMLDivElement, { data: ContratoData }>(({ data }, ref) => {
  const blocks = useMemo(() => buildBlocks(data), [data]);
  const [pages, setPages] = useState<number[][]>([]);
  const measureRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const el = measureRef.current;
    if (!el) return;
    const kids = Array.from(el.children) as HTMLElement[];
    if (!kids.length) return;
    // footprint de cada bloco (altura + espaçamento até o próximo)
    const foot = kids.map((k, i) =>
      (i + 1 < kids.length ? kids[i + 1].offsetTop : el.scrollHeight) - k.offsetTop
    );
    const result: number[][] = [];
    let cur: number[] = [];
    let h = 0;
    foot.forEach((ft, i) => {
      if (h + ft > CONTENT_H && cur.length) { result.push(cur); cur = []; h = 0; }
      cur.push(i);
      h += ft;
    });
    if (cur.length) result.push(cur);
    setPages(result);
  }, [blocks]);

  return (
    <div ref={ref} style={{ fontFamily: FONT }}>
      {/* container de medição — mesmo width/estilo da área de conteúdo, fora da tela */}
      <div
        ref={measureRef}
        style={{
          position: 'absolute', left: -99999, top: 0, width: CONTENT_W,
          fontFamily: FONT, fontSize: 12.5, color: '#111', lineHeight: 1.5, visibility: 'hidden',
        }}
        aria-hidden
      >
        {blocks.map((b, i) => renderBlock(b, i))}
      </div>

      {/* páginas reais */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {pages.map((idxs, p) => (
          <ContratoPage key={p}>
            {idxs.map(i => renderBlock(blocks[i], i))}
          </ContratoPage>
        ))}
      </div>
    </div>
  );
});

ContratoDocument.displayName = 'ContratoDocument';
export default ContratoDocument;
