import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { db, type Session, type SessionActivity } from "../db/db";
import { getStarBalance } from "../db/stars";
import "./SessionEndPage.css";
import { syncPendingResults } from "../services/resultSync";

type SessionSummary = {
  session: Session;
  firstName: string;
  activities: SessionActivity[];
  earnedStars: number | null;
  starBalance: number | null;
};

function getActivityPresentation(activityCode: string) {
  switch (activityCode) {
    case "tambour_des_sons":
      return {
        title: "Tambour des sons",
        symbol: "🥁",
      };

    case "chemin_des_syllabes":
      return {
        title: "Chemin des syllabes",
        symbol: "🪨",
      };

    default:
      return {
        title: "Mission de l’archipel",
        symbol: "🧭",
      };
  }
}

function getStatusLabel(activity: SessionActivity): string {
  switch (activity.status) {
    case "completed":
      return "Terminée";

    case "skipped":
      return "Passée";

    case "in_progress":
      return "Non terminée";

    default:
      return "Non commencée";
  }
}

export default function SessionEndPage() {
  const { sessionId } = useParams();
  const navigate = useNavigate();

  const [summary, setSummary] = useState<SessionSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [walletWarning, setWalletWarning] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    void syncPendingResults();
  }, []);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setError(null);
      setWalletWarning(null);
      setSummary(null);

      try {
        if (!sessionId) {
          throw new Error("Aucune séance n’a été sélectionnée.");
        }

        const session = await db.sessions.get(sessionId);

        if (!session) {
          throw new Error("Cette séance est introuvable.");
        }

        const student = await db.students.get(session.studentId);

        if (!student) {
          throw new Error("Le profil de cet élève est introuvable.");
        }

        const activities = await db.sessionActivities
          .where("sessionId")
          .equals(sessionId)
          .sortBy("position");

        let earnedStars: number | null = null;
        let starBalance: number | null = null;

        try {
          const transactions = await db.starTransactions
            .where("sessionId")
            .equals(sessionId)
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
          session,
          firstName: student.firstName,
          activities,
          earnedStars,
          starBalance,
        });
      } catch (err) {
        console.error("Chargement du bilan impossible :", err);

        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : "Impossible de charger le bilan de la séance.",
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
  }, [sessionId, reloadKey]);

  const completedActivities = summary
    ? summary.activities.filter((activity) => activity.status === "completed")
    : [];

  const ratingStars = completedActivities.reduce(
    (total, activity) => total + (activity.stars ?? 0),
    0,
  );

  const maxRatingStars = summary ? summary.activities.length * 3 : 0;

  const sessionStillOpen = summary?.session.status === "in_progress";

  return (
    <main className='session-expedition'>
      <div className='session-expedition__shade' />

      <header className='session-expedition__header'>
        <p>Atelier Lecture</p>

        <h1>
          {summary
            ? sessionStillOpen
              ? "Ton bilan de séance"
              : "Expédition terminée !"
            : "Ton bilan d’aventure"}
        </h1>
      </header>

      {loading ? (
        <section className='session-expedition__message' role='status'>
          <span aria-hidden='true'>✦</span>
          <h2>Préparation de ton bilan…</h2>
          <p>Nous retrouvons les étapes de ton aventure.</p>
        </section>
      ) : error || !summary ? (
        <section className='session-expedition__message' role='alert'>
          <span aria-hidden='true'>🧭</span>
          <h2>Un petit contretemps !</h2>
          <p>{error ?? "Le bilan est indisponible."}</p>

          <button
            type='button'
            className='session-expedition__button'
            onClick={() => setReloadKey((value) => value + 1)}
          >
            Réessayer
          </button>

          <button
            type='button'
            className='session-expedition__secondary'
            onClick={() => navigate("/scan", { replace: true })}
          >
            Retour à l’accueil
          </button>
        </section>
      ) : (
        <section className='session-expedition__panel'>
          <div className='session-expedition__hero'>
            <span className='session-expedition__badge'>
              Bilan de l’expédition
            </span>

            <img
              src='/tambour-des-sons/images/avatar-acceuil.png'
              alt=''
              aria-hidden='true'
              draggable={false}
            />

            <h2>Bravo {summary.firstName} !</h2>

            <p>
              {completedActivities.length === summary.activities.length &&
              summary.activities.length > 0
                ? "Tu as terminé toutes les activités de cette séance !"
                : "Voici les étapes accomplies pendant ta séance."}
            </p>

            <div className='session-expedition__rating'>
              <span aria-hidden='true'>★</span>

              <div>
                <small>Étoiles de bilan</small>
                <strong>
                  {ratingStars} / {maxRatingStars}
                </strong>
              </div>
            </div>
          </div>

          <div className='session-expedition__details'>
            <div className='session-expedition__rewards'>
              <div className='session-expedition__reward'>
                <span className='session-expedition__reward-label'>
                  Gagnées pendant cette séance
                </span>

                <strong>
                  {summary.earnedStars === null
                    ? "—"
                    : `+${summary.earnedStars}`}
                  <span aria-hidden='true'> ★</span>
                </strong>
              </div>

              <div className='session-expedition__reward'>
                <span className='session-expedition__reward-label'>
                  Ma réserve personnelle
                </span>

                <strong>
                  {summary.starBalance ?? "—"}
                  <span aria-hidden='true'> ★</span>
                </strong>
              </div>
            </div>

            {walletWarning && (
              <p className='session-expedition__warning' role='status'>
                {walletWarning}
              </p>
            )}

            <div className='session-expedition__missions-heading'>
              <h3>Mes îles explorées</h3>

              <span>
                {completedActivities.length} / {summary.activities.length}{" "}
                terminées
              </span>
            </div>

            <ul className='session-expedition__missions'>
              {summary.activities.map((activity) => {
                const presentation = getActivityPresentation(
                  activity.activityCode,
                );

                const completed = activity.status === "completed";

                const activityStars = Math.max(
                  0,
                  Math.min(3, activity.stars ?? 0),
                );

                return (
                  <li key={activity.id} className='session-mission'>
                    <span
                      className='session-mission__symbol'
                      aria-hidden='true'
                    >
                      {presentation.symbol}
                    </span>

                    <div className='session-mission__identity'>
                      <h4>{presentation.title}</h4>

                      <p>
                        {getStatusLabel(activity)}
                        {completed
                          ? ` · Score : ${activity.score ?? 0} / ${
                              activity.maxScore
                            }`
                          : ""}
                      </p>
                    </div>

                    <div className='session-mission__result'>
                      {completed ? (
                        <span
                          className='session-mission__stars'
                          role='img'
                          aria-label={`${activityStars} étoiles de bilan sur 3`}
                        >
                          {[1, 2, 3].map((star) => (
                            <span
                              key={star}
                              className={
                                star <= activityStars
                                  ? "session-mission__star--earned"
                                  : ""
                              }
                              aria-hidden='true'
                            >
                              ★
                            </span>
                          ))}
                        </span>
                      ) : (
                        <span className='session-mission__unfinished'>
                          À poursuivre
                        </span>
                      )}
                    </div>
                  </li>
                );
              })}

              {summary.activities.length === 0 && (
                <li className='session-expedition__empty'>
                  Aucune activité dans cette séance.
                </li>
              )}
            </ul>

            <p className='session-expedition__saved'>
              Les récompenses affichées proviennent des gains enregistrés sur
              cette tablette.
            </p>

            {sessionStillOpen ? (
              <>
                <p className='session-expedition__warning'>
                  Cette séance est encore ouverte. Retourne à la carte pour la
                  poursuivre ou la terminer.
                </p>

                <button
                  type='button'
                  className='session-expedition__button'
                  onClick={() =>
                    navigate(
                      `/island/${encodeURIComponent(summary.session.id)}`,
                      { replace: true },
                    )
                  }
                >
                  Retour à mon archipel
                </button>
              </>
            ) : (
              <button
                type='button'
                className='session-expedition__button'
                onClick={() => navigate("/scan", { replace: true })}
              >
                Retour à l’accueil
              </button>
            )}
          </div>
        </section>
      )}
    </main>
  );
}
