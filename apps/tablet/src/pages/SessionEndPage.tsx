import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { db } from "../db/db";

export default function SessionEndPage() {
  const { sessionId } = useParams();
  const navigate = useNavigate();

  const [session, setSession] = useState<
    | {
        id: string;
        studentId: string;
        totalStars: number;
      }
    | undefined
  >();

  useEffect(() => {
    if (!sessionId) return;

    db.sessions.get(sessionId).then((foundSession) => {
      setSession(foundSession);
    });
  }, [sessionId]);

  return (
    <div className='min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6'>
      <h1 className='text-3xl font-bold mb-4'>Séance terminée !</h1>

      <div className='w-24 h-24 rounded-full bg-slate-700 flex items-center justify-center text-4xl mb-4'>
        🦊
      </div>

      <p className='text-yellow-400 text-xl mb-6'>
        ★ {session?.totalStars ?? 0} étoiles
      </p>

      <button
        onClick={() => navigate("/scan")}
        className='bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-xl font-semibold'
      >
        Retour à l’accueil
      </button>
    </div>
  );
}
