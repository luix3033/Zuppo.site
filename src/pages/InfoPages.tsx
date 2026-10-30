import { ArrowRight, CircleCheck, ExternalLink, Instagram, Mail, MessageCircle, Search, Send, ShoppingBag, Sparkles, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import {useSiteSettings} from '../hooks/useSiteSettings';

const steps = [
  { icon: Search, title: 'A gente encontra.', text: 'A Zuppo reúne oportunidades de lojas parceiras para facilitar a sua descoberta.' },
  { icon: Sparkles, title: 'Organiza para você.', text: 'Categorias, busca e filtros ajudam a encontrar o que faz sentido para o seu momento.' },
  { icon: ShoppingBag, title: 'Você escolhe e economiza.', text: 'Ao escolher uma oferta, você acessa a loja parceira e confere as condições antes de comprar.' },
];

export function AboutPage() {
  return (
    <main className="container info-page">
      <div className="info-hero">
        <span className="eyebrow"><Zap size={15} /> PRAZER, ZUPPO.</span>
        <h1>Menos tempo procurando.<br /><span>Mais bons achados.</span></h1>
        <p>A Zuppo reúne ofertas selecionadas para facilitar a comparação e a descoberta de oportunidades. Organizamos as informações por categoria e loja, com preços, condições e acesso direto ao vendedor.</p>
        <Link className="btn btn-primary" to="/ofertas">Explorar ofertas <ArrowRight size={18} /></Link>
      </div>

      <section className="info-section" aria-labelledby="about-how">
        <span className="eyebrow">DO ACHADO À SUA CASA</span>
        <h2 id="about-how">Funciona assim. Simples assim.</h2>
        <div className="how-grid">
          {steps.map(({ icon: Icon, title, text }, index) => (
            <article className="info-card how-card" key={title}>
              <div className="step-top"><span className="step-icon"><Icon size={25} /></span><span className="step-number">0{index + 1}</span></div>
              <h3>{title}</h3><p>{text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="info-card transparency-card">
        <span className="step-icon"><CircleCheck size={25} /></span>
        <div><h2>Transparência faz parte da oferta.</h2><p>A Zuppo divulga ofertas e não realiza a venda dos produtos. Pagamento, entrega, troca e atendimento da compra ficam com a loja escolhida. Podemos receber comissões pelos links divulgados, sem custo adicional para você.</p><p>Consulte sempre o vendedor, a descrição e o preço final na loja antes de concluir uma compra.</p></div>
      </section>
    </main>
  );
}

export function ContactPage() {
  const siteConfig=useSiteSettings();
  const channels = [
    { name: 'WhatsApp', icon: MessageCircle, url: siteConfig.whatsappUrl, text: 'Acompanhe os próximos achados pelo WhatsApp.' },
    { name: 'Telegram', icon: Send, url: siteConfig.telegramUrl, text: 'Receba novidades no seu canal de ofertas.' },
    { name: 'Instagram', icon: Instagram, url: siteConfig.instagramUrl, text: siteConfig.instagramUrl.includes('/zuppo.site') ? '@zuppo.site — novidades, dúvidas e parcerias.' : 'Encontre a Zuppo também no seu feed.' },
    { name: 'E-mail', icon: Mail, url: siteConfig.contactEmail ? `mailto:${siteConfig.contactEmail}` : null, text: siteConfig.contactEmail || 'Um canal para dúvidas, sugestões e parcerias.' },
  ].filter(c=>c.url);

  return (
    <main className="container info-page">
      <header className="page-heading contact-heading"><div><span className="eyebrow">VAMOS CONVERSAR</span><h1>Um bom papo também é um achado.</h1><p>Dúvidas, sugestões ou uma ideia de parceria? Estes são os canais de contato da Zuppo.</p></div><img className="contact-mascot" src="/images/zuppinho-contato.png" alt="Zuppinho colocando uma carta na caixa de correio" width="300" height="275" decoding="async" fetchPriority="high" /></header>
      <div className="contact-grid">
        {channels.map(({ name, icon: Icon, url, text }) => (
          <article className="info-card contact-card" key={name}>
            <span className="step-icon"><Icon size={26} /></span><h2>{name}</h2><p>{text}</p>
            <a className="btn btn-secondary" href={url!} target={name === 'E-mail' ? undefined : '_blank'} rel="noopener noreferrer">{name === 'E-mail' ? 'Enviar e-mail' : `Abrir ${name}`} <ExternalLink size={16} /></a>
          </article>
        ))}
      </div>
      <div className="info-note"><CircleCheck size={20} /><p>Comprou em uma loja parceira? Para acompanhar pedidos, solicitar trocas ou tratar de pagamentos, fale diretamente com a loja em que a compra foi realizada.</p></div>
    </main>
  );
}

function LegalContact() {
  const {contactEmail}=useSiteSettings();
  return <p>Para dúvidas, correções ou solicitações sobre seus dados, utilize {contactEmail?<a href={`mailto:${contactEmail}`}>{contactEmail}</a>:<>os canais da <Link to="/contato">página de contato</Link></>}. Informe o assunto e apenas os dados necessários para localizar sua solicitação. Não envie senhas, códigos de autenticação ou dados de pagamento.</p>;
}

export function PrivacyPage() {
  return <main className="container info-page legal-page">
    <header className="page-heading"><span className="eyebrow">DADOS PESSOAIS E TRANSPARÊNCIA</span><h1>Política de Privacidade</h1><p>Saiba quais informações são utilizadas pela Zuppo, para quais finalidades e como exercer seus direitos.</p><p>Última atualização: 29 de outubro de 2026.</p></header>
    <article className="info-card legal-copy">
      <section><h2>1. Abrangência e responsabilidade</h2><p>Esta política se aplica ao site Zuppo e às operações de tratamento de dados realizadas para disponibilizar seu catálogo, recursos de navegação e administração. A Zuppo organiza e divulga ofertas; a compra é concluída no ambiente da loja escolhida. Não solicitamos dados de cartão, processamos pagamentos ou mantemos contas de compradores.</p><p>A Zuppo é responsável pelas decisões de tratamento relacionadas ao funcionamento de seu site. Lojas, redes sociais e aplicativos externos são responsáveis por suas próprias atividades e políticas de privacidade.</p></section>
      <section><h2>2. Informações utilizadas</h2><p><strong>Preferências no dispositivo.</strong> Favoritos e preferência de tema são armazenados no seu navegador. Os favoritos não são associados a uma conta de comprador e não são sincronizados entre dispositivos.</p><p><strong>Interações com ofertas.</strong> Registramos o identificador da oferta, o tipo de interação e o horário de visualizações e cliques de saída. Esses registros da aplicação não incluem nome, e-mail, IP ou identificador de visitante. Eles indicam interações e não comprovam compras nem identificam clientes únicos.</p><p><strong>Informações técnicas.</strong> Os serviços de infraestrutura podem processar endereço IP, características do navegador, horários e registros técnicos para entregar o conteúdo, prevenir abusos e diagnosticar falhas.</p><p><strong>Administração.</strong> Contas administrativas utilizam e-mail, credenciais de autenticação e vínculo de autorização. Cookies de sessão são usados para manter o acesso às funções restritas.</p><p><strong>Contato.</strong> Quando você entra em contato, podemos tratar as informações enviadas voluntariamente, como nome, endereço de resposta e conteúdo da mensagem, para atender à solicitação.</p></section>
      <section><h2>3. Finalidades e bases legais</h2><p>Utilizamos as informações para disponibilizar o site, manter as preferências escolhidas, proteger a administração, responder a solicitações, corrigir problemas e entender o interesse pelas ofertas. O tratamento observa as bases legais aplicáveis da Lei nº 13.709/2018 (LGPD), incluindo execução de contrato ou procedimentos solicitados pelo titular, cumprimento de obrigações legais, exercício regular de direitos e legítimo interesse, conforme a finalidade e as circunstâncias.</p><p>O legítimo interesse deve considerar a necessidade do tratamento e os direitos do titular. Quando uma atividade depender de consentimento, ele deverá ser solicitado de maneira específica e poderá ser revogado pelos canais de atendimento, respeitados os tratamentos anteriores lícitos.</p></section>
      <section><h2>4. Cookies e armazenamento local</h2><p>O site utiliza armazenamento local para favoritos e tema. A administração utiliza cookies protegidos de autenticação e renovação de sessão. A infraestrutura também pode utilizar recursos necessários à segurança e à entrega do serviço.</p><p>Você pode remover favoritos na interface ou apagar os dados do site no navegador. A exclusão desses dados pode remover suas preferências e encerrar sessões. O site não utiliza ferramentas de publicidade comportamental ou pixels de remarketing nesta configuração.</p></section>
      <section><h2>5. Compartilhamento e serviços contratados</h2><p>Utilizamos Cloudflare para hospedagem, entrega de conteúdo e armazenamento de arquivos, e Supabase para banco de dados e autenticação. Essas operações envolvem os dados necessários à prestação e à proteção dos respectivos serviços.</p><p>Informações também podem ser compartilhadas quando necessário ao cumprimento de obrigação legal, ordem de autoridade competente ou exercício regular de direitos, nos limites da legislação. Não comercializamos dados pessoais de visitantes.</p></section>
      <section><h2>6. Lojas, afiliados e canais externos</h2><p>Ao escolher uma oferta, você visualiza um aviso de saída e pode prosseguir para a loja. Links de afiliados podem incluir identificadores de atribuição da Zuppo. A loja pode utilizar cookies e outras tecnologias conforme sua própria política, inclusive para atribuir uma compra ao link utilizado.</p><p>Pagamentos, pedidos, entregas e o tratamento de dados no destino seguem as condições da loja. O mesmo se aplica a WhatsApp, Telegram, Instagram e outros canais externos acessados por links do site. Acessar a Zuppo não inscreve você automaticamente nesses canais.</p></section>
      <section><h2>7. Armazenamento e conservação</h2><p>As preferências permanecem no seu navegador até serem removidas por você ou pelo próprio navegador. Os demais registros são mantidos pelo período necessário às finalidades descritas, à segurança, ao atendimento de solicitações e ao cumprimento de obrigações legais ou exercício de direitos.</p><p>A exclusão pode depender da natureza do registro e das obrigações aplicáveis. O período exibido nos indicadores do painel não corresponde, necessariamente, ao prazo de conservação dos registros. Você pode solicitar informações sobre o tratamento relacionado ao seu caso pelos canais de contato.</p></section>
      <section><h2>8. Segurança e transferências internacionais</h2><p>Adotamos controles de acesso, autenticação e restrições de permissão para reduzir acessos não autorizados. Nenhum serviço conectado à internet elimina integralmente os riscos de segurança. Contas administrativas devem manter suas credenciais confidenciais e comunicar suspeitas de uso indevido.</p><p>A infraestrutura dos fornecedores pode envolver armazenamento ou processamento fora do Brasil. Nessas situações, o tratamento deve observar os requisitos da LGPD e a regulamentação aplicável às transferências internacionais de dados.</p></section>
      <section><h2>9. Direitos dos titulares</h2><p>Nos termos da LGPD, você pode solicitar confirmação de tratamento, acesso, correção, informações sobre compartilhamento, anonimização, bloqueio ou eliminação de dados desnecessários, excessivos ou tratados em desconformidade, além de portabilidade quando aplicável. Também pode solicitar a eliminação de dados tratados com consentimento, conhecer as consequências de não consentir e revogar consentimentos.</p><p>As solicitações são avaliadas conforme os direitos e exceções legais. Poderemos pedir informações proporcionais para confirmar a identidade e evitar que dados sejam entregues a terceiros. Você também pode apresentar petição à Autoridade Nacional de Proteção de Dados (ANPD).</p><LegalContact/></section>
      <section><h2>10. Crianças e adolescentes</h2><p>O site não exige cadastro de compradores nem solicita intencionalmente dados de crianças. Caso um responsável identifique o envio indevido de informações de criança ou adolescente, poderá entrar em contato para avaliação e providências cabíveis, considerando o melhor interesse e a legislação aplicável.</p></section>
      <section><h2>11. Atualizações desta política</h2><p>Esta política pode ser atualizada para refletir mudanças no serviço, nos fornecedores ou nas exigências legais. A data da versão vigente permanece no início da página. Mudanças que exijam comunicação específica ou novo consentimento serão tratadas conforme a legislação.</p></section>
    </article>
  </main>;
}

export function TermsPage() {
  return <main className="container info-page legal-page">
    <header className="page-heading"><span className="eyebrow">CONDIÇÕES DE USO DA PLATAFORMA</span><h1>Termos de Uso</h1><p>Condições para acessar o catálogo e utilizar os recursos da Zuppo.</p><p>Última atualização: 29 de outubro de 2026.</p></header>
    <article className="info-card legal-copy">
      <section><h2>1. Objeto e funcionamento</h2><p>A Zuppo é uma plataforma de curadoria e divulgação de ofertas de lojas e marketplaces. O serviço permite consultar informações, pesquisar produtos, filtrar ofertas, salvar favoritos no navegador e acessar o ambiente do vendedor por meio de links.</p><p>A Zuppo não realiza o checkout nem recebe o pagamento da compra. A contratação, quando realizada, ocorre entre o comprador e o vendedor identificado na loja ou marketplace de destino.</p></section>
      <section><h2>2. Informações das ofertas</h2><p>As ofertas apresentam informações cadastradas pela administração, como imagem, preço, loja e última atualização. Mesmo após a publicação, preço, estoque, frete, condições de pagamento, cupons e regras do vendedor podem mudar. Confira as informações e o valor final diretamente na loja antes de comprar.</p><p>O percentual de desconto, quando exibido, é calculado a partir do preço anterior informado no cadastro e do preço atual da oferta. Essa comparação não representa, por si só, uma certificação do menor preço histórico ou do menor preço disponível no mercado. Imagens podem ser ilustrativas; confira modelo, variação e especificações no destino.</p></section>
      <section><h2>3. Redirecionamento e compra</h2><p>Ao selecionar uma oferta, o site informa a loja e o endereço de destino antes de prosseguir. A abertura do link não constitui compra ou reserva de estoque. Recomenda-se verificar a reputação do vendedor, condições de entrega, garantia, trocas e devoluções na loja.</p><p>Dúvidas sobre pagamento, nota fiscal, pedido, entrega, cancelamento ou garantia devem ser encaminhadas ao vendedor ou à plataforma em que a compra foi concluída. Solicitações relativas ao funcionamento da Zuppo podem ser enviadas pelos nossos canais de contato.</p></section>
      <section><h2>4. Programa de afiliados e transparência</h2><p>A Zuppo pode receber comissões por compras realizadas através dos links divulgados, sem custo adicional para você. A atribuição dessas comissões depende das regras do programa de afiliados e das condições da loja. A divulgação de uma oferta não constitui garantia de qualidade, estoque, resultado ou desempenho do vendedor.</p></section>
      <section><h2>5. Favoritos e acesso</h2><p>A consulta ao catálogo não exige conta de comprador. Favoritos são salvos no navegador e podem ser perdidos ao limpar os dados, trocar de dispositivo ou utilizar outro navegador. Esse recurso não reserva produtos nem congela preços.</p><p>A área administrativa é restrita a usuários autorizados. É proibido compartilhar credenciais, tentar contornar permissões ou utilizar contas de terceiros sem autorização.</p></section>
      <section><h2>6. Uso permitido</h2><p>O usuário deve utilizar o serviço de forma lícita, respeitando a segurança da plataforma e os direitos de terceiros. Não é permitido tentar obter acesso indevido, introduzir código malicioso, manipular indicadores, sobrecarregar a infraestrutura ou utilizar o conteúdo para práticas fraudulentas.</p><p>A Zuppo poderá restringir acessos ou adotar medidas proporcionais diante de abuso, incidentes de segurança ou determinação legal, sem prejuízo dos direitos assegurados pela legislação.</p></section>
      <section><h2>7. Propriedade intelectual</h2><p>A marca, a identidade visual e os elementos próprios da Zuppo são protegidos pela legislação aplicável. Imagens de produtos, marcas de lojas, bibliotecas e outros materiais de terceiros pertencem aos respectivos titulares e permanecem sujeitos às suas licenças e condições de uso. O acesso ao site não transfere direitos sobre esses materiais.</p></section>
      <section><h2>8. Disponibilidade e responsabilidade</h2><p>O serviço poderá passar por manutenção, atualização ou interrupção, inclusive por falhas de fornecedores externos. Buscamos manter as informações corretas e corrigir erros comunicados, mas não asseguramos disponibilidade ininterrupta nem permanência de ofertas nas lojas.</p><p>A responsabilidade de cada participante será apurada conforme sua atuação e a legislação aplicável. Estes termos não afastam direitos previstos em lei, não excluem responsabilidade que não possa ser legalmente limitada e não representam renúncia a direitos do consumidor.</p></section>
      <section><h2>9. Privacidade</h2><p>O tratamento de informações relacionado ao uso do site está descrito na <Link to="/privacidade">Política de Privacidade</Link>. Sites e aplicativos de terceiros acessados por links possuem condições próprias, que devem ser consultadas antes de fornecer dados ou concluir uma compra.</p></section>
      <section><h2>10. Alterações, atendimento e legislação</h2><p>Estes termos podem ser atualizados em razão de mudanças no serviço ou na legislação. A versão vigente e sua data de atualização ficam disponíveis nesta página. As alterações não prejudicam direitos adquiridos ou garantias legais.</p><p>Aplica-se a legislação brasileira. Eventuais controvérsias serão submetidas ao foro competente segundo as regras legais, respeitados os direitos do consumidor quando aplicáveis.</p><LegalContact/></section>
    </article>
  </main>;
}
