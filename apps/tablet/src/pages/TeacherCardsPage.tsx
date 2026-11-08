import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import QRCode from "qrcode";
import { getAvatarImageUrl } from "../data/avatars";
import { fetchStudentCards, type StudentCard } from "../services/teacherApi";
import "./TeacherPages.css";

export default function TeacherCardsPage() {
  const [cards, setCards] = useState<StudentCard[]>([]);
  const [qrImages, setQrImages] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // /adulte/cartes?eleve=ID : une seule carte ; sans paramètre : toutes les cartes.
  const [searchParams] = useSearchParams();
  const onlyStudentId = searchParams.get("eleve");

  useEffect(() => {
    let isActive = true;

    async function load() {
      try {
        const allCards = await fetchStudentCards();
        const loadedCards = onlyStudentId
          ? allCards.filter((card) => card.studentId === onlyStudentId)
          : allCards;

        const entries = await Promise.all(
          loadedCards.map(async (card) => {
            const image = await QRCode.toDataURL(card.qrToken, {
              errorCorrectionLevel: "M",
              margin: 1,
              width: 400,
            });

            return [card.studentId, image] as const;
          }),
        );

        if (isActive) {
          setCards(loadedCards);
          setQrImages(Object.fromEntries(entries));
        }
      } catch (err) {
        if (isActive) {
          setError(
            err instanceof Error
              ? err.message
              : "Impossible de préparer les cartes.",
          );
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    }

    void load();

    return () => {
      isActive = false;
    };
  }, [onlyStudentId]);

  return (
    <main className='teacher-app'>
      <div className='teacher-app__container'>
        <div className='teacher-cards__toolbar no-print'>
          <Link className='teacher-back' to='/adulte/eleves'>
            ← Retour aux élèves
          </Link>

          {onlyStudentId && (
            <Link className='teacher-back' to='/adulte/cartes'>
              Voir toutes les cartes
            </Link>
          )}

          <button
            className='teacher-button teacher-button--primary'
            type='button'
            onClick={() => window.print()}
            disabled={cards.length === 0}
          >
            {onlyStudentId ? "Imprimer la carte" : "Imprimer les cartes"}
          </button>
        </div>

        <h1 className='teacher-page-title no-print'>Cartes des élèves</h1>
        <p className='teacher-page-subtitle no-print'>
          Imprime, découpe et plastifie les cartes. L’élève présente son QR
          code devant la tablette pour se connecter. Seul le prénom figure sur
          la carte.
        </p>

        {isLoading && <p>Préparation des cartes…</p>}
        {error && <p className='teacher-alert'>{error}</p>}

        {!isLoading && !error && cards.length === 0 && (
          <div className='teacher-empty'>
            Aucun élève : ajoute d’abord des élèves.
          </div>
        )}

        <div className='teacher-cards'>
          {cards.map((card) => (
            <article className='teacher-card-print' key={card.studentId}>
              <img
                className='teacher-card-print__avatar'
                src={getAvatarImageUrl(card.avatarKey, card.avatarVariant)}
                alt=''
              />

              <div className='teacher-card-print__body'>
                <p className='teacher-card-print__brand'>Atelier Lecture</p>
                <p className='teacher-card-print__name'>{card.firstName}</p>
              </div>

              {qrImages[card.studentId] && (
                <img
                  className='teacher-card-print__qr'
                  src={qrImages[card.studentId]}
                  alt={`QR code de ${card.firstName}`}
                />
              )}
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}
