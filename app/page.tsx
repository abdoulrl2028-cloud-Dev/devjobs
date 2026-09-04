import JobExplorer from "@/components/JobExplorer";

export const metadata = {
  title: "Vagas de tecnologia",
  description: "Busque vagas de emprego em tecnologia: frontend, backend, mobile, dados e mais.",
};

export default function HomePage() {
  return <JobExplorer />;
}