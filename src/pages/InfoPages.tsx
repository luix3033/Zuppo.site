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
        <p>Acreditamos que encontrar uma boa oportunidade deve ser simples. Por isso, estamos construindo um lugar para descobrir ofertas com clareza, praticidade e a sua cara.</p>
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
    { name: 'Instagram', icon: Instagram, url: siteConfig.instagramUrl, text: 'Encontre a Zuppo também no seu feed.' },
    { name: 'E-mail', icon: Mail, url: siteConfig.contactEmail ? `mailto:${siteConfig.contactEmail}` : null, text: siteConfig.contactEmail || 'Um canal para dúvidas, sugestões e parcerias.' },
  ].filter(c=>c.url);

  return (
    <main className="container info-page">
      <header className="page-heading"><span className="eyebrow">VAMOS CONVERSAR</span><h1>Um bom papo também é um achado.</h1><p>Dúvidas, sugestões ou uma ideia de parceria? Estes são os canais de contato da Zuppo.</p></header>
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

function DraftNotice() {
  return <div className="legal-draft"><span className="demo-badge">RASCUNHO PARA REVISÃO JURÍDICA</span><p>Este é um conteúdo inicial para avaliação. Precisa ser adaptado aos dados da empresa, às integrações e aos processos reais antes do lançamento comercial.</p></div>;
}

export function PrivacyPage() {
  return (
    <main className="container info-page legal-page">
      <header className="page-heading"><span className="eyebrow">TRANSPARÊNCIA, SEM LETRAS MIÚDAS</span><h1>Privacidade</h1><p>Como esta versão da Zuppo lida com suas informações.</p></header>
      <DraftNotice />
      <article className="info-card legal-copy">
        <section><h2>1. Sobre esta versão</h2><p>A Zuppo é uma plataforma de descoberta e divulgação de ofertas. O catálogo apresenta ofertas cadastradas na administração. O site não possui checkout ou cadastro obrigatório de clientes. A administração utiliza autenticação pelo ChatGPT e autorização no servidor.</p></section>
        <section><h2>2. Informações armazenadas no navegador</h2><p>Seus favoritos e sua preferência de tema são salvos localmente no navegador, por meio de localStorage. Esses dados permitem manter suas escolhas ao retornar ao site no mesmo navegador. Você pode remover favoritos na interface e limpar os dados do site nas configurações do navegador.</p><p>Os favoritos desta versão não são sincronizados entre dispositivos. Não os tratamos como uma conta de usuário.</p></section>
        <section><h2>3. Serviços de hospedagem e lojas externas</h2><p>A infraestrutura de hospedagem pode processar informações técnicas de acesso necessárias para disponibilizar e proteger o site. As regras, os prazos e os responsáveis por esse tratamento deverão ser detalhados na versão final desta política.</p><p>Ao acessar uma loja parceira ou um canal externo, você passa a estar sujeito às práticas de privacidade daquele serviço. Links de afiliados poderão incluir identificadores de atribuição da Zuppo, conforme as regras do respectivo programa.</p></section>
        <section><h2>4. Integrações futuras</h2><p>O painel administrativo registra eventos anônimos de visualização de produtos e cliques em ofertas, com identificador do produto e horário. Não registra IP, e-mail ou identificador de visitante nesses eventos. O painel consulta os últimos 30 dias, com limite de 1.000 eventos por consulta. Cliques de saída são registrados pelo servidor ao redirecionar para uma oferta válida. Esses eventos não representam clientes únicos ou compras. Não há publicidade comportamental, disparos de mensagens ou integrações comerciais automáticas. A política final deverá definir prazo de retenção e processo de exclusão dos eventos. Se esses recursos forem adicionados, esta política deverá ser atualizada com as finalidades, bases legais, compartilhamentos e escolhas aplicáveis.</p></section>
        <section><h2>5. Direitos e contato</h2><p>A política final deverá identificar o controlador, seu canal de privacidade e o procedimento para exercer os direitos previstos na Lei Geral de Proteção de Dados, incluindo acesso, correção e eliminação, quando aplicáveis.</p><p>Os canais disponíveis podem ser consultados na <Link to="/contato">página de contato</Link>. Dados de identificação da empresa, contato de privacidade e prazos de retenção permanecem pendentes de revisão jurídica.</p></section>
      </article>
    </main>
  );
}

export function TermsPage() {
  return (
    <main className="container info-page legal-page">
      <header className="page-heading"><span className="eyebrow">BONS ACHADOS, REGRAS CLARAS</span><h1>Termos de uso</h1><p>Informações iniciais sobre o uso da plataforma Zuppo.</p></header>
      <DraftNotice />
      <article className="info-card legal-copy">
        <section><h2>1. O papel da Zuppo</h2><p>A Zuppo organiza e divulga ofertas de lojas parceiras. A plataforma não é a vendedora dos produtos e não processa pagamentos, pedidos, entregas ou devoluções. A compra é concluída diretamente na loja escolhida, sob as condições apresentadas por ela.</p></section>
        <section><h2>2. Informações do catálogo</h2><p>As informações são cadastradas pela administração e podem mudar na loja. Somente ofertas publicadas, com imagem e link de destino válidos, são exibidas no catálogo. A última atualização aparece em cada oferta.</p></section>
        <section><h2>3. Preços e condições nas lojas</h2><p>Preços, estoque, frete, cupons e condições podem mudar nas lojas parceiras. Antes de finalizar uma compra, confira o valor total, a descrição do produto, o vendedor e todas as condições diretamente na loja.</p><p>Um desconto é calculado somente quando existe um preço anterior informado. O preço anterior corresponde ao valor informado no cadastro.</p></section>
        <section><h2>4. Links de afiliados</h2><p>A Zuppo pode receber comissões por compras realizadas através dos links divulgados, sem custo adicional para você. A atribuição e o pagamento dessas comissões seguem as regras dos respectivos programas de afiliados.</p></section>
        <section><h2>5. Favoritos e uso da plataforma</h2><p>Os favoritos são mantidos no navegador do usuário e podem ser perdidos ao limpar os dados locais, trocar de navegador ou de dispositivo. A plataforma deve ser utilizada de forma lícita, respeitando os direitos da marca, de terceiros e as regras das lojas parceiras.</p></section>
        <section><h2>6. Atualizações e atendimento</h2><p>Estes termos deverão ser revisados antes do lançamento comercial, incluindo identificação da empresa, regras de responsabilidade, foro, vigência e meios de atendimento. Consulte a <Link to="/contato">página de contato</Link> para verificar os canais configurados e a <Link to="/privacidade">política de privacidade</Link> para informações sobre dados pessoais.</p></section>
      </article>
    </main>
  );
}
