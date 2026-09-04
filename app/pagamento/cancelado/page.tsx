import Link from "next/link";

export const metadata = { title: "Pagamento cancelado" };

export default function PagamentoCanceladoPage() {
  return (
    <div className="container">
      <div className="login-card payment-result">
        <div className="payment-result__icon payment-result__icon--error">×</div>
        <h1>Pagamento cancelado</h1>
        <p>
          Você saiu antes de concluir o pagamento. Sua vaga foi salva no rascunho e estará
          esperando no painel. Quando quiser, é só tentar novamente.
        </p>
        <div className="form-row form-row--center">
          <Link href="/dashboard" className="btn btn--primary">
            Ir para o painel
          </Link>
          <Link href="/planos" className="btn btn--ghost">
            Ver planos
          </Link>
        </div>
      </div>
    </div>
  );
}