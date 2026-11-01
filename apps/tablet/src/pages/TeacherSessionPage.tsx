import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  fetchSessionDetail,
  decodeSoundHuntContentLabel,
  type ActivityRound,
  type SessionDetail,
} from "../services/teacherApi";
import "./TeacherPages.css";

function getRoundIndexFromId(id: string): number {
  const match = id.match(/:round:(\d+):result$/);
  return match ? Number(match[1]) : 0;
}

function groupErrors(rounds: ActivityRound[]) {
  const errors = rounds.filter((round) => !round.correct);

  return Object.entries(
    errors.reduce<Record<string, number>>((groups, round) => {
      const key = round.errorType ?? "reponse_incorrecte";
      groups[key] = (groups[key] ?? 0) + 1;
      return groups;
    }, {}),
  );
}

function buildSkillSummary(activities: SessionDetail["activities"]) {
  const summary = new Map<
    string,
    {
      skillCode: string;
      roundsTotal: number;
      correctCount: number;
      hintsUsed: number;
      totalTimeMs: number;
    }
  >();

  for (const activity of activities) {
    const current = summary.get(activity.skillCode) ?? {
      skillCode: activity.skillCode,
      roundsTotal: 0,
      correctCount: 0,
      hintsUsed: 0,
      totalTimeMs: 0,
    };

    current.roundsTotal += activity.rounds.length;
    current.correctCount += activity.rounds.filter(
      (round) => round.correct,
    ).length;
    current.hintsUsed += activity.rounds.reduce(
      (total, round) => total + round.hintsUsed,
      0,
    );
    current.totalTimeMs += activity.rounds.reduce(
      (total, round) => total + round.responseTimeMs,
      0,
    );

    summary.set(activity.skillCode, current);
  }

  return [...summary.values()];
}

export default function TeacherSessionPage() {
  const { studentId, sessionId } = useParams<{
    studentId: string;
    sessionId: string;
  }>();

  const [session, setSession] = useState<SessionDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [activityFilter, setActivityFilter] = useState<string>("all");
  const [resultFilter, setResultFilter] = useState<
    "all" | "correct" | "incorrect"
  >("all");

  useEffect(() => {
    if (!studentId || !sessionId) {
      return;
    }

    let isActive = true;

    async function loadSession() {
      try {
        const result = await fetchSessionDetail(studentId!, sessionId!);

        if (isActive) {
          setSession(result);
        }
      } catch {
        if (isActive) {
          setError("Impossible de charger le détail de cette séance.");
        }
      }
    }

    loadSession();

    return () => {
      isActive = false;
    };
  }, [studentId, sessionId]);

  if (!studentId || !sessionId) {
    return (
      <main>
        <p>Séance introuvable.</p>
        <Link to='/adulte/eleves'>Retour à la liste des élèves</Link>
      </main>
    );
  }

  if (error) {
    return (
      <main>
        <p>{error}</p>
        <Link to={`/adulte/eleves/${studentId}`}>Retour à la fiche élève</Link>
      </main>
    );
  }

  if (!session) {
    return <p>Chargement du détail de la séance…</p>;
  }

  const skillSummary = buildSkillSummary(session.activities);

  const visibleActivities = session.activities.filter(
    (activity) =>
      activityFilter === "all" || activity.activityCode === activityFilter,
  );

  return (
    <main className='teacher-app'>
      <div className='teacher-app__container'>
        <Link className='teacher-back' to={`/adulte/eleves/${studentId}`}>
          ← Retour à la fiche de {session.student.displayName}
        </Link>

        <h1 className='teacher-page-title'>Détail de la séance</h1>
        <p className='teacher-page-subtitle'>
          Élève : <strong>{session.student.displayName}</strong>
        </p>

        <div className='teacher-summary'>
          {skillSummary.map((skill) => {
            const successRate = Math.round(
              (skill.correctCount / skill.roundsTotal) * 100,
            );

            const averageTimeMs = Math.round(
              skill.totalTimeMs / skill.roundsTotal,
            );

            return (
              <article className='teacher-stat' key={skill.skillCode}>
                <p className='teacher-stat__label'>{skill.skillCode}</p>
                <p className='teacher-stat__value'>
                  {skill.correctCount}/{skill.roundsTotal}
                </p>
                <p className='teacher-stat__detail'>
                  {successRate} % de réussite · {skill.hintsUsed} aide(s) ·{" "}
                  {Math.round(averageTimeMs / 100) / 10} s en moyenne
                </p>
              </article>
            );
          })}
        </div>

        <section className='teacher-filters'>
          <label className='teacher-field'>
            <span className='teacher-field__label'>Activité</span>
            <select
              className='teacher-input'
              value={activityFilter}
              onChange={(event) => setActivityFilter(event.target.value)}
            >
              <option value='all'>Toutes les activités</option>
              {session.activities.map((activity) => (
                <option
                  key={activity.activityCode}
                  value={activity.activityCode}
                >
                  {activity.activityCode}
                </option>
              ))}
            </select>
          </label>

          <label className='teacher-field'>
            <span className='teacher-field__label'>Résultat</span>
            <select
              className='teacher-input'
              value={resultFilter}
              onChange={(event) =>
                setResultFilter(
                  event.target.value as "all" | "correct" | "incorrect",
                )
              }
            >
              <option value='all'>Toutes les réponses</option>
              <option value='correct'>Réussites</option>
              <option value='incorrect'>Erreurs</option>
            </select>
          </label>
        </section>

        {visibleActivities.length === 0 && (
          <div className='teacher-empty'>
            Aucune activité ne correspond à ces filtres.
          </div>
        )}

        {visibleActivities.map((activity) => {
          const correctCount = activity.rounds.filter(
            (round) => round.correct,
          ).length;

          const visibleRounds = activity.rounds.filter((round) => {
            if (resultFilter === "correct") {
              return round.correct;
            }

            if (resultFilter === "incorrect") {
              return !round.correct;
            }

            return true;
          });

          const activityErrors = groupErrors(activity.rounds);

          return (
            <section className='teacher-activity' key={activity.activityCode}>
              <div className='teacher-activity__header'>
                <h2 className='teacher-activity__title'>
                  {activity.activityCode}
                </h2>
                <p className='teacher-activity__skill'>
                  {activity.skillCode} · {correctCount}/{activity.rounds.length}{" "}
                  réussites
                </p>
              </div>

              {visibleRounds.length === 0 ? (
                <div className='teacher-empty'>
                  Aucune réponse ne correspond à ce filtre.
                </div>
              ) : (
                <table className='teacher-table'>
                  <thead>
                    <tr>
                      <th>Tour</th>
                      <th>Contenu</th>
                      <th>Résultat</th>
                      <th>Erreur</th>
                      <th>Aides</th>
                      <th>Temps</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleRounds.map((round) => (
                      <tr key={round.id}>
                        <td>{getRoundIndexFromId(round.id) + 1}</td>
                        <td>
                          {(() => {
                            const soundHunt = decodeSoundHuntContentLabel(
                              round.contentLabel,
                            );

                            if (!soundHunt) {
                              return round.contentLabel;
                            }

                            return (
                              <>
                                <strong>{soundHunt.word}</strong>
                                <br />
                                Son ciblé : {soundHunt.targetSound}
                                <br />
                                Attendu :{" "}
                                {
                                  soundHunt.syllables[
                                    soundHunt.targetSyllableIndex
                                  ]
                                }
                                <br />
                                Choisi :{" "}
                                {
                                  soundHunt.syllables[
                                    soundHunt.selectedSyllableIndex
                                  ]
                                }
                                {soundHunt.replayUsed && (
                                  <>
                                    <br />
                                    Réécoute utilisée
                                  </>
                                )}
                              </>
                            );
                          })()}
                        </td>
                        <td>
                          <span
                            className={
                              round.correct
                                ? "teacher-badge teacher-badge--success"
                                : "teacher-badge teacher-badge--danger"
                            }
                          >
                            {round.correct ? "Réussi" : "Erreur"}
                          </span>
                        </td>
                        <td>{round.errorType ?? "—"}</td>
                        <td>{round.hintsUsed}</td>
                        <td>{Math.round(round.responseTimeMs / 100) / 10} s</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {activityErrors.length > 0 && (
                <div className='teacher-errors'>
                  <h3 className='teacher-errors__title'>Erreurs regroupées</h3>
                  <ul className='teacher-errors__list'>
                    {activityErrors.map(([errorType, count]) => (
                      <li key={errorType}>
                        {errorType} : {count}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          );
        })}
      </div>
    </main>
  );
}
