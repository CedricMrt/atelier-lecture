import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { db } from "../db/db";

export default function IslandPage() {
  const { sessionId } = useParams();
  const navigate = useNavigate();

  const [student, setStudent] = useState<
    | {
        id: string;
        firstName: string;
        avatarKey: string;
        avatarVariant: string;
      }
    | undefined
  >();

  const [totalStars, setTotalStars] = useState(0);
  const [hasRemainingActivity, setHasRemainingActivity] = useState(false);

  useEffect(() => {
    if (!sessionId) return;

    const load = async () => {
      const session = await db.sessions.get(sessionId);

      if (!session) {
        navigate("/scan");
        return;
      }

      const student = await db.students.get(session.studentId);

      const activities = await db.sessionActivities
        .where("sessionId")
        .equals(sessionId)
        .sortBy("position");

      const remaining = activities.filter(
        (activity) => activity.status !== "completed",
      );

      const stars = activities.reduce(
        (total, activity) => total + (activity.stars ?? 0),
        0,
      );

      setStudent(student);
      setTotalStars(stars);
      setHasRemainingActivity(remaining.length > 0);
    };

    load();
  }, [sessionId, navigate]);

  const startGame = () => {
    if (!sessionId) return;
    navigate(`/game/${sessionId}`);
  };

  if (!student) {
    return (
      <div className='min-h-screen bg-slate-900 text-white flex items-center justify-center'>
        <p>Chargement…</p>
      </div>
    );
  }

  return (
    <div className='min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6'>
      <div className='w-24 h-24 rounded-full bg-slate-700 flex items-center justify-center text-4xl mb-4'>
        🦊
      </div>

      <h1 className='text-2xl font-bold mb-2'>Bonjour {student.firstName} !</h1>

      <p className='text-yellow-400 text-xl mb-6'>★ {totalStars} étoiles</p>

      <div className='bg-slate-800 p-6 rounded-2xl mb-6 text-center'>
        <h2 className='text-xl font-semibold mb-2'>Île du Rythme</h2>

        {hasRemainingActivity ? (
          <>
            <p className='text-slate-300 mb-4'>
              Ta prochaine activité est prête.
            </p>

            <button
              onClick={startGame}
              className='bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-xl font-semibold'
            >
              Commencer ma séance
            </button>
          </>
        ) : (
          <>
            <p className='text-slate-300 mb-4'>
              Tu as terminé toutes les activités !
            </p>

            <button
              onClick={() => navigate(`/session-end/${sessionId}`)}
              className='bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-xl font-semibold'
            >
              Voir ma séance terminée
            </button>
          </>
        )}
      </div>

      <button
        onClick={() => navigate("/scan")}
        className='text-slate-400 underline'
      >
        Changer d’élève
      </button>
    </div>
  );
}
