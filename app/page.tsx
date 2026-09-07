import Link from "next/link";
import JobExplorer from "@/components/JobExplorer";
import { jsonLd, siteUrl, openGraphDefaults } from "@/lib/seo";

export const metadata = {
  title: "Vagas de tecnologia — DevJobs",
  description:
    "Encontre vagas de emprego em tecnologia no Brasil: desenvolvedor frontend, backend, mobile, dados, DevOps, UI/UX e mais. Candidate-se grátis no DevJobs.",
  alternates: { canonical: "/" },
  openGraph: {
    ...openGraphDefaults,
    title: "Vagas de tecnologia — DevJobs",
    description:
      "Vagas de emprego para devs: frontend, backend, mobile, dados e DevOps. Candidate-se grátis.",
    url: siteUrl("/"),
  },
  twitter: { card: "summary", title: "Vagas de tecnologia — DevJobs", description: "Vagas de emprego para desenvolvedores. Candidate-se grátis." },
};

const websiteLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "DevJobs",
  alternateName: "DevJobs — Vagas de tecnologia",
  url: siteUrl("/"),
  inLanguage: "pt-BR",
  potentialAction: {
    "@type": "SearchAction",
    target: { "@type": "EntryPoint", urlTemplate: siteUrl("/?busca={search_term_string}") },
    "query-input": "required name=search_term_string",
  },
};

const organizationLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "DevJobs",
  url: siteUrl("/"),
  logo: siteUrl("/icon-512.png"),
};

export default function HomePage() {
  return (
    <>
      <JobExplorer />
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(websiteLd)} />
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLd(organizationLd)} />
      <section className="container legal">
        <h2>Demanda muito por vagas de tecnologia? Nós concentramos as melhores</h2>
        <p>
          O DevJobs é uma plataforma pública de empregos para pessoas desenvolvedoras e demais
          profissionais de tecnologia no Brasil. Reunimos oportunidades de <strong>desenvolvedor frontend</strong>,{" "}
          <strong>backend</strong>, <strong>mobile</strong>, <strong>engenharia de dados</strong>,{" "}
          <strong>DevOps</strong>, <strong>infraestrutura</strong>, <strong>QA</strong>,{" "}
          <strong>design de produto (UI/UX)</strong>, <strong>gestão de produto</strong> e cibersegurança,
          em regime <strong>remoto</strong> ou presencial em qualquer cidade do país.
        </p>
        <p>
          Qualquer pessoa pode <Link href="/cadastro">criar uma conta gratuita</Link> e se candidatar em
          poucos cliques. Empresas podem{" "}
          <Link href="/para-empresas">publicar vagas de estágio a liderança</Link> e acessar o{" "}
          <Link href="/talentos">banco de talentos</Link> para encontrar desenvolvedores qualificados.
          Publicar a primeira vaga é sempre grátis, sem cartão de crédito.
        </p>
        <h2>O que você encontra no DevJobs</h2>
        <ul>
          <li>
            <strong>Vagas como dev júnior, pleno e sênior</strong> em empresas de todo o Brasil, com
            filtros por tecnologia, cargo, experiência, modelo de trabalho e salário.
          </li>
          <li>
            <strong>Oportunidades remotas</strong> para quem busca trabalho de qualquer lugar, e vagas
            presenciais nas principais capitais.
          </li>
          <li>
            <strong>Perfil de talento público</strong>: mostre suas habilidades, experiência e portfólio
            para empresas que contratam tecnologia.
          </li>
          <li><strong>Planos para empresas</strong> com destaque de vagas e banco de talentos.</li>
        </ul>
        <p>
          Atualizamos as vagas em tempo real conforme as empresas publicam. Se você está procurando{" "}
          <em>&quot;emprego de programador&quot;</em>, <em>&quot;vaga para desenvolvedor React&quot;</em> ou{" "}
          <em>&quot;trabalho remoto em tecnologia&quot;</em>, esse é o lugar certo.
        </p>
      </section>
    </>
  );
}