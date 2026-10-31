import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  fetchSessionDetail,
  decodeSoundHuntContentLabel,
  type SessionDetail,
} from "../services/teacherApi";

function getRoundIndexFromId(id: string): number {
  const match = id.match(/:round:(\d+):result$/);
  return match ? Number(match[1]) : 0;
}

export default function TeacherSessionPage() {
  const { studentId, sessionId } = useParams<{
    studentId: string;
    sessionId: string;
  }>();

  const [session, setSession] = useState<SessionDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <main>
      <p>
        <Link to={`/adulte/eleves/${studentId}`}>
          ← Retour à la fiche de {session.student.displayName}
        </Link>
      </p>

      <h1>Détail de la séance</h1>
      <p>
        Élève : <strong>{session.student.displayName}</strong>
      </p>

      {session.activities.map((activity) => {
        const correctCount = activity.rounds.filter(
          (round) => round.correct,
        ).length;

        return (
          <section key={activity.activityCode}>
            <h2>{activity.activityCode}</h2>
            <p>
              Compétence : {activity.skillCode} — {correctCount}/
              {activity.rounds.length} réussites
            </p>

            <table>
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
                {activity.rounds.map((round) => (
                  <tr key={round.roundIndex}>
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
                            Syllabe attendue :{" "}
                            {soundHunt.syllables[soundHunt.targetSyllableIndex]}
                            <br />
                            Syllabe choisie :{" "}
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
                    <td>{round.correct ? "Réussi" : "Erreur"}</td>
                    <td>{round.errorType ?? "—"}</td>
                    <td>{round.hintsUsed}</td>
                    <td>{Math.round(round.responseTimeMs / 100) / 10} s</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {activity.activityCode === "chasse_aux_sons" && (
              <p>
                Contenus versionnés :{" "}
                {activity.rounds
                  .map(
                    (round) =>
                      `${round.contentId ?? "inconnu"} (v${round.contentVersion ?? "?"})`,
                  )
                  .join(", ")}
              </p>
            )}
          </section>
        );
      })}
    </main>
  );
}
