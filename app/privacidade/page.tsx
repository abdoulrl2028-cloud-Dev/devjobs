import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Política de Privacidade",
  description:
    "Política de privacidade do DevJobs: quais dados coletamos, como usamos e os seus direitos.",
  alternates: { canonical: "/privacidade" },
};

export default function PrivacidadePage() {
  return (
    <div className="container">
      <section className="page-hero page-hero--pricing">
        <span className="page-hero__eyebrow">Privacidade</span>
        <h1>
          Política de <span>Privacidade</span>
        </h1>
        <p>Como o DevJobs coleta, usa e protege os seus dados. Atualizada em setembro de 2026.</p>
      </section>

      <div className="legal">
        <h2>1. Quais dados coletamos</h2>
        <p>
          Ao criar uma conta ou usar o DevJobs, podemos coletar: nome, e-mail, senha (armazenada de
          forma segura e com criptografia), informações de perfil (cargo, habilidades, experiência,
          localização, links de portfólio), currículos, vagas publicadas e interações na plataforma
          (candidaturas, vagas favoritas e visualizações).
        </p>

        <h2>2. Como usamos seus dados</h2>
        <p>
          Usamos os dados para: oferecer e operar o serviço, permitir candidaturas a vagas, exibir
          perfis públicos para empresas, processar pagamentos (quando aplicável), aplicar cupons de
          desconto, enviar comunicações importantes sobre a conta e prevenir fraudes ou uso
          indevido.
        </p>

        <h2>3. Senhas e segurança</h2>
        <p>
          As senhas nunca são armazenadas em texto puro. Elas passam por um algoritmo de derivação
          de chaves (scrypt) com salt único por usuário, e as sessões usam tokens assinados
          criptograficamente. Utilizamos HTTPS em toda a aplicação e medidas contra tentativas de
          força bruta, scripts de ataque e injeção de código.
        </p>

        <h2>4. Compartilhamento de dados</h2>
        <p>
          Não vendemos seus dados. Informações de perfil público (nome, cargo, habilidades) podem
          aparecer para empresas que buscam talentos. Dados de pagamento são processados por
          parceiros de pagamento seguros. Podemos compartilhar dados quando exigido por lei.
        </p>

        <h2>5. Cookies e armazenamento local</h2>
        <p>
          Usamos armazenamento local do navegador para manter sua sessão, o tema escolhido, vagas
          favoritas e o status da aplicação web (PWA). Isso melhora a experiência e permite o
          funcionamento offline parcial.
        </p>

        <h2>6. Retenção e exclusão</h2>
        <p>
          Mantemos seus dados enquanto sua conta estiver ativa e por períodos necessários para
          cumprir obrigações legais. Você pode pedir a exclusão da sua conta e de seus dados a
          qualquer momento pelos canais de contato abaixo.
        </p>

        <h2>7. Seus direitos</h2>
        <p>
          Você pode solicitar acesso, correção, portabilidade ou exclusão dos seus dados pessoais,
          além de revogar consentimentos. Atendemos solicitações em conformidade com a LGPD.
        </p>

        <h2>8. Contato e responsável</h2>
        <p>
          Para dúvidas ou solicitações sobre privacidade, entre em contato pelo e-mail{" "}
          <strong>devjobs@contato.com</strong>.
        </p>
      </div>
    </div>
  );
}