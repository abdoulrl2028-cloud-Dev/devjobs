import Link from "next/link";

export const metadata = {
  title: "Para Empresas — Publique vagas de tecnologia",
  description:
    "Publique vagas, encontre talentos e contrate mais rápido com os planos do DevJobs.",
};

const benefits = [
  {
    title: "Publique em minutos",
    text: "Crie uma conta de empresa e publique sua primeira vaga em menos de 5 minutos, sem burocracia.",
  },
  {
    title: "Alcance os candidatos certos",
    text: "Nossa audiência é de devs, designers e engenheiros de todo o Brasil, remoto ou presencial.",
  },
  {
    title: "Banco de talentos",
    text: "Nos planos Pro e Empresa, busque candidatos por tecnologia, cargo, experiência, localização e remoto.",
  },
  {
    title: "Dashboard completo",
    text: "Acompanhe candidaturas, visualizações e cliques em tempo real, e gerencie suas vagas com facilidade.",
  },
];

const steps = [
  { n: "1", title: "Crie sua conta", text: "Cadastre-se como empresa (é grátis)." },
  { n: "2", title: "Escolha um plano", text: "Grátis, Destaque, Pro ou Empresa — de acordo com suas necessidades." },
  { n: "3", title: "Publique a vaga", text: "Preencha o formulário e envie para revisão." },
  { n: "4", title: "Contrate", text: "Receba candidaturas, acompanhe métricas e escolha o melhor talento." },
];

export default function ParaEmpresasPage() {
  return (
    <div className="container">
      <section className="page-hero">
        <span className="page-hero__eyebrow">Para Empresas</span>
        <h1>
          Encontre os melhores <span>talentos em tecnologia</span>
        </h1>
        <p>
          Do estágio à liderança: publique vagas, acesse o banco de talentos e acompanhe
          tudo pelo seu painel. Sem mensalidade obrigatória.
        </p>
        <div className="page-hero__actions">
          <Link href="/publicar-vaga" className="btn btn--primary">
            Publicar vaga grátis
          </Link>
          <Link href="/cadastro" className="btn btn--ghost">
            Criar conta de empresa
          </Link>
        </div>
      </section>

      <section className="section">
        <h2 className="section__title">Como funciona</h2>
        <div className="steps-grid">
          {steps.map((step) => (
            <div className="step-card" key={step.n}>
              <span className="step-card__num">{step.n}</span>
              <h3>{step.title}</h3>
              <p>{step.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="section">
        <h2 className="section__title">Vantagens</h2>
        <div className="benefits-grid">
          {benefits.map((benefit) => (
            <div className="benefit-card" key={benefit.title}>
              <h3>{benefit.title}</h3>
              <p>{benefit.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="section section--cta">
        <h2>Pronto para contratar?</h2>
        <p>Escolha o plano que combina com o seu time e comece hoje.</p>
        <Link href="/planos" className="btn btn--primary">
          Ver planos
        </Link>
      </section>
    </div>
  );
}