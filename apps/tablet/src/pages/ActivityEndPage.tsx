import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { db, type SessionActivity } from "../db/db";
import { getStarBalance } from "../db/stars";
import "./ActivityEndPage.css";

type ActivitySummary = {
  firstName: string;
  activity: SessionActivity;
  earnedStars: number | null;
  starBalance: number | null;
  hasNextActivity: boolean;
};

function getActivityPresentation(activityCode: string) {
  switch (activityCode) {
    case "tambour_des_sons":
      return {
        title: "Tambour des sons",
        symbol: "🥁",
        message: "Ton défi musical est terminé !",
      };

    case "chemin_des_syllabes":
      return {
        title: "Chemin des syllabes",
        symbol: "🪨",
        message: "Ton exploration des syllabes est terminée !",
      };

    default:
      return {
        title: "Mission terminée",
        symbol: "🧭",
        message: "Tu as terminé cette étape de ton aventure !",
      };
  }
}

export default function ActivityEndPage() {
  const { sessionId, sessionActivityId } = useParams();
  const navigate = useNavigate();

  const [summary, setSummary] = useState<ActivitySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [walletWarning, setWalletWarning] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setError(null);
      setWalletWarning(null);
      setSummary(null);

      try {
        if (!sessionId || !sessionActivityId) {
          throw new Error("Le bilan demandé est incomplet.");
        }

        const session = await db.sessions.get(sessionId);

        if (!session) {
          throw new Error("Cette séance est introuvable.");
        }

        const activity = await db.sessionActivities.get(sessionActivityId);

        if (!activity || activity.sessionId !== sessionId) {
          throw new Error("Cette activité ne correspond pas à la séance.");
        }

        if (activity.status !== "completed") {
          throw new Error("Cette activité n’est pas encore terminée.");
        }

        const student = await db.students.get(session.studentId);

        if (!student) {
          throw new Error("Le profil de cet élève est introuvable.");
        }

        const activities = await db.sessionActivities
          .where("sessionId")
          .equals(sessionId)
          .toArray();

        const hasNextActivity = activities.some(
          (item) => item.status === "pending" || item.status === "in_progress",
        );

        let earnedStars: number | null = null;
        let starBalance: number | null = null;

        try {
          const transactions = await db.starTransactions
            .where("sessionActivityId")
            .equals(sessionActivityId)
            .toArray();

          earnedStars = transactions
            .filter((item) => item.studentId === student.id)
            .reduce((total, item) => total + Math.max(0, item.amount), 0);

          starBalance = await getStarBalance(student.id);
        } catch (walletError) {
          console.error("Chargement des récompenses impossible :", walletError);

          if (active) {
            setWalletWarning(
              "Les informations de réserve ne sont pas entièrement disponibles.",
            );
          }
        }

        if (!active) return;

        setSummary({
          firstName: student.firstName,
          activity,
          earnedStars,
          starBalance,
          hasNextActivity,
        });
      } catch (err) {
        console.error("Chargement du bilan impossible :", err);

        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : "Impossible de charger ce bilan.",
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, [sessionId, sessionActivityId, reloadKey]);

  const presentation = summary
    ? getActivityPresentation(summary.activity.activityCode)
    : null;

  const earnedRating = Math.max(0, Math.min(3, summary?.activity.stars ?? 0));

  const returnToMap = () => {
    if (!sessionId) {
      navigate("/scan");
      return;
    }

    navigate(`/island/${encodeURIComponent(sessionId)}`, {
      replace: true,
    });
  };

  return (
    <main className='activity-reward'>
      <div className='activity-reward__shade' />

      <header className='activity-reward__header'>
        <p>Atelier Lecture</p>
        <h1>Une étape de plus dans l’aventure !</h1>
      </header>

      <section className='activity-reward__panel' aria-busy={loading}>
        {loading ? (
          <div className='activity-reward__message' role='status'>
            <span aria-hidden='true'>✦</span>
            <h2>Préparation de ton bilan…</h2>
          </div>
        ) : error || !summary || !presentation ? (
          <div className='activity-reward__message' role='alert'>
            <span aria-hidden='true'>🧭</span>
            <h2>Un petit contretemps !</h2>
            <p>{error ?? "Le bilan est indisponible."}</p>

            <button
              type='button'
              className='activity-reward__button'
              onClick={() => setReloadKey((value) => value + 1)}
            >
              Réessayer
            </button>

            <button
              type='button'
              className='activity-reward__secondary'
              onClick={returnToMap}
            >
              Retour à la carte
            </button>
          </div>
        ) : (
          <>
            <div className='activity-reward__medallion' aria-hidden='true'>
              {presentation.symbol}
            </div>

            <p className='activity-reward__activity-name'>
              {presentation.title}
            </p>

            <h2 className='activity-reward__title'>
              Bravo {summary.firstName} !
            </h2>

            <p className='activity-reward__description'>
              {presentation.message}
            </p>

            <div
              className='activity-reward__rating'
              role='img'
              aria-label={`${earnedRating} étoiles de bilan sur 3`}
            >
              {[1, 2, 3].map((star) => (
                <span
                  key={star}
                  className={[
                    "activity-reward__rating-star",
                    star <= earnedRating
                      ? "activity-reward__rating-star--earned"
                      : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  style={{
                    animationDelay: `${(star - 1) * 160}ms`,
                  }}
                  aria-hidden='true'
                >
                  ★
                </span>
              ))}
            </div>

            <p className='activity-reward__rating-label'>Étoiles de bilan</p>

            <div className='activity-reward__statistics'>
              <div className='activity-reward__stat'>
                <span className='activity-reward__stat-label'>Ton score</span>

                <strong>
                  {summary.activity.score ?? 0}
                  <small> / {summary.activity.maxScore}</small>
                </strong>
              </div>

              <div className='activity-reward__stat'>
                <span className='activity-reward__stat-label'>
                  Étoiles gagnées ici
                </span>

                <strong className='activity-reward__gold'>
                  {summary.earnedStars === null
                    ? "—"
                    : `+${summary.earnedStars}`}
                  <span aria-hidden='true'> ★</span>
                </strong>
              </div>

              <div className='activity-reward__stat'>
                <span className='activity-reward__stat-label'>Ma réserve</span>

                <strong className='activity-reward__gold'>
                  {summary.starBalance ?? "—"}
                  <span aria-hidden='true'> ★</span>
                </strong>
              </div>
            </div>

            {walletWarning && (
              <p className='activity-reward__warning' role='status'>
                {walletWarning}
              </p>
            )}

            <p className='activity-reward__next'>
              {summary.hasNextActivity
                ? "Une autre île t’attend sur la carte."
                : "Ton parcours est terminé. Retrouve ton bilan sur la carte."}
            </p>

            <button
              type='button'
              className='activity-reward__button'
              onClick={returnToMap}
            >
              {summary.hasNextActivity
                ? "Continuer l’aventure"
                : "Retour à mon archipel"}
            </button>

            <p className='activity-reward__footnote'>
              Les étoiles de réserve sont déjà enregistrées.
            </p>
          </>
        )}
      </section>
    </main>
  );
}
