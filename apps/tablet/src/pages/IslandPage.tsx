import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { db, type SessionActivity } from "../db/db";
import { getStarBalance } from "../db/stars";
import { endSession } from "../db/sessions";
import "./IslandPage.css";

type IslandStudent = {
  id: string;
  firstName: string;
  avatarKey: string;
  avatarVariant: string;
};

function getAvatarSymbol(avatarKey: string): string {
  const key = avatarKey
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

  const symbols: Record<string, string> = {
    renard: "🦊",
    renarde: "🦊",
    hibou: "🦉",
    robot: "🤖",
    chat: "🐱",
    tortue: "🐢",
    lapin: "🐰",
    ours: "🐻",
    grenouille: "🐸",
    dragon: "🐲",
    pieuvre: "🐙",
  };

  return symbols[key] ?? "✦";
}

function getActivityPresentation(activity: SessionActivity) {
  switch (activity.activityCode) {
    case "tambour_des_sons":
      return {
        title: "Île du Rythme",
        description: "Écoute les tambours et rejoue les sons.",
        symbol: "🥁",
      };

    case "chemin_des_syllabes":
      return {
        title: "Île des Syllabes",
        description: "Écoute les mots et avance sur le chemin.",
        symbol: "🪨",
      };

    default:
      return {
        title: "Île de l’aventure",
        description: "Une nouvelle mission t’attend.",
        symbol: "🧭",
      };
  }
}

export default function IslandPage() {
  const { sessionId } = useParams();
  const navigate = useNavigate();

  const [student, setStudent] = useState<IslandStudent | null>(null);
  const [activities, setActivities] = useState<SessionActivity[]>([]);

  const [starBalance, setStarBalance] = useState<number | null>(null);
  const [sessionStatus, setSessionStatus] = useState("");
  const [expired, setExpired] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [finishing, setFinishing] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setError(null);
      setActionError(null);
      setStudent(null);
      setActivities([]);
      setStarBalance(null);

      try {
        if (!sessionId) {
          throw new Error("Aucune séance n’a été sélectionnée.");
        }

        const session = await db.sessions.get(sessionId);

        if (!session) {
          throw new Error("Cette séance est introuvable.");
        }

        const foundStudent = await db.students.get(session.studentId);

        if (!foundStudent) {
          throw new Error("Le profil de cet élève est introuvable.");
        }

        const sessionActivities = await db.sessionActivities
          .where("sessionId")
          .equals(sessionId)
          .sortBy("position");

        let balance: number | null = null;

        try {
          balance = await getStarBalance(foundStudent.id);
        } catch (walletError) {
          console.error("Lecture de la réserve impossible :", walletError);
        }

        if (!active) return;

        setStudent({
          id: foundStudent.id,
          firstName: foundStudent.firstName,
          avatarKey: foundStudent.avatarKey,
          avatarVariant: foundStudent.avatarVariant,
        });

        setActivities(sessionActivities);
        setStarBalance(balance);
        setSessionStatus(session.status);

        setExpired(
          session.timingMode === "active_time"
            ? (session.activeDurationMs ?? 0) >=
                session.durationLimitSeconds * 1000
            : Date.now() - session.startedAt >=
                session.durationLimitSeconds * 1000,
        );
      } catch (err) {
        console.error("Chargement de l’archipel impossible :", err);

        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : "Impossible de charger ton archipel.",
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

  const completedCount = activities.filter(
    (activity) => activity.status === "completed",
  ).length;

  const resolvedCount = activities.filter(
    (activity) =>
      activity.status === "completed" || activity.status === "skipped",
  ).length;

  const sessionStars = activities.reduce(
    (total, activity) => total + (activity.stars ?? 0),
    0,
  );

  const nextActivity = activities.find(
    (activity) =>
      activity.status === "pending" || activity.status === "in_progress",
  );

  const allResolved =
    activities.length > 0 && resolvedCount === activities.length;

  const sessionClosed = sessionStatus !== "" && sessionStatus !== "in_progress";

  const canPlay = !sessionClosed && !expired && Boolean(nextActivity);

  const openGame = () => {
    if (!sessionId || !canPlay) return;

    navigate(`/game/${encodeURIComponent(sessionId)}`);
  };

  const finishSession = async () => {
    if (!sessionId || finishing) return;

    setFinishing(true);
    setActionError(null);

    try {
      if (!sessionClosed) {
        await endSession(sessionId);
      }

      navigate(`/session-end/${encodeURIComponent(sessionId)}`);
    } catch (err) {
      console.error("Fin de séance impossible :", err);

      setActionError("Impossible de terminer la séance. Tu peux réessayer.");

      setFinishing(false);
    }
  };

  const nextPresentation = nextActivity
    ? getActivityPresentation(nextActivity)
    : null;

  return (
    <main className='island-adventure'>
      <header className='island-adventure__header'>
        <button
          type='button'
          className='island-adventure__change'
          onClick={() => navigate("/scan")}
          disabled={finishing}
        >
          ← Changer d’élève
        </button>

        <div className='island-adventure__heading'>
          <p>Atelier Lecture</p>
          <h1>Mon archipel</h1>
        </div>

        <div
          className='island-adventure__wallet'
          aria-label={
            starBalance === null
              ? "Réserve d’étoiles indisponible"
              : `Réserve personnelle : ${starBalance} étoiles`
          }
        >
          <span aria-hidden='true'>★</span>

          <div>
            <small>Ma réserve</small>
            <strong>{starBalance === null ? "—" : starBalance}</strong>
          </div>
        </div>
      </header>

      {loading ? (
        <section className='island-adventure__message' role='status'>
          <h2>Préparation de ton archipel…</h2>
          <p>Les îles t’attendent.</p>
        </section>
      ) : error || !student ? (
        <section className='island-adventure__message' role='alert'>
          <h2>Un petit contretemps !</h2>
          <p>{error ?? "Ton profil est indisponible."}</p>

          <button
            type='button'
            className='island-adventure__primary'
            onClick={() => setReloadKey((value) => value + 1)}
          >
            Réessayer
          </button>
        </section>
      ) : (
        <>
          <section className='island-adventure__summary'>
            <div className='island-adventure__student'>
              <span
                className='island-adventure__student-symbol'
                aria-hidden='true'
              >
                {getAvatarSymbol(student.avatarKey)}
              </span>

              <div>
                <h2>Bonjour {student.firstName} !</h2>
                <p>
                  {student.avatarKey} {student.avatarVariant}
                </p>
              </div>
            </div>

            <div className='island-adventure__progress'>
              <span>
                {completedCount} / {activities.length} activités terminées
              </span>

              <span>★ {sessionStars} étoiles de bilan</span>
            </div>
          </section>

          <section
            className='island-adventure__map'
            aria-label='Les îles de ta séance'
          >
            <div
              className='island-adventure__sea-mark island-adventure__sea-mark--one'
              aria-hidden='true'
            >
              ≋
            </div>

            <div
              className='island-adventure__sea-mark island-adventure__sea-mark--two'
              aria-hidden='true'
            >
              ≋
            </div>

            <div className='island-adventure__route'>
              {activities.map((activity, index) => {
                const presentation = getActivityPresentation(activity);

                const completed = activity.status === "completed";
                const skipped = activity.status === "skipped";
                const current = canPlay && activity.id === nextActivity?.id;

                const statusLabel = completed
                  ? "Terminée"
                  : skipped
                    ? "Passée"
                    : current
                      ? "À toi de jouer"
                      : sessionClosed || expired
                        ? "Non terminée"
                        : "À débloquer";

                return (
                  <div
                    key={activity.id}
                    className={[
                      "island-stop",
                      current ? "island-stop--current" : "",
                      completed ? "island-stop--completed" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    <span className='island-stop__number'>
                      Étape {index + 1}
                    </span>

                    <button
                      type='button'
                      className='island-stop__land'
                      onClick={openGame}
                      disabled={!current}
                      aria-label={`${presentation.title} : ${statusLabel}`}
                    >
                      <span className='island-stop__palm' aria-hidden='true'>
                        🌴
                      </span>

                      <span
                        className='island-stop__instrument'
                        aria-hidden='true'
                      >
                        {presentation.symbol}
                      </span>

                      {completed && (
                        <span className='island-stop__check' aria-hidden='true'>
                          ✓
                        </span>
                      )}
                    </button>

                    <div className='island-stop__plaque'>
                      <h3>{presentation.title}</h3>

                      <span
                        className={[
                          "island-stop__status",
                          current ? "island-stop__status--current" : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                      >
                        {statusLabel}
                      </span>

                      {completed && (
                        <span className='island-stop__stars'>
                          ★ {activity.stars ?? 0} étoiles de bilan
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}

              {activities.length === 0 && (
                <p className='island-adventure__empty'>
                  Aucune activité n’a été préparée pour cette séance.
                </p>
              )}
            </div>
          </section>

          <section className='island-adventure__mission'>
            <div>
              <h2>
                {sessionClosed
                  ? "Cette séance est terminée"
                  : expired
                    ? "Le temps de la séance est écoulé"
                    : allResolved
                      ? "Ton parcours est terminé !"
                      : nextPresentation
                        ? nextPresentation.title
                        : "Aucune mission disponible"}
              </h2>

              <p>
                {sessionClosed || expired || allResolved
                  ? "Retrouve le bilan de ton aventure."
                  : (nextPresentation?.description ??
                    "Demande à ton enseignant de vérifier la séance.")}
              </p>

              {actionError && (
                <p className='island-adventure__error' role='alert'>
                  {actionError}
                </p>
              )}
            </div>

            {canPlay ? (
              <button
                type='button'
                className='island-adventure__primary'
                onClick={openGame}
              >
                {nextActivity?.status === "in_progress"
                  ? "Rejoindre mon île"
                  : "Embarquer !"}
              </button>
            ) : sessionClosed || expired || allResolved ? (
              <button
                type='button'
                className='island-adventure__primary'
                onClick={() => void finishSession()}
                disabled={finishing}
              >
                {finishing
                  ? "Préparation du bilan…"
                  : "Voir ma séance terminée"}
              </button>
            ) : null}
          </section>
        </>
      )}
    </main>
  );
}
