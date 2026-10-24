import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { db } from "../db/db";

export default function ActivityEndPage() {
  const { sessionId, sessionActivityId } = useParams();
  const navigate = useNavigate();

  const [stars, setStars] = useState(0);

  useEffect(() => {
    if (!sessionActivityId) return;

    db.sessionActivities.get(sessionActivityId).then((activity) => {
      setStars(activity?.stars ?? 0);
    });
  }, [sessionActivityId]);

  return (
    <div className='min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6'>
      <h1 className='text-3xl font-bold mb-4'>Bravo !</h1>

      <div className='flex gap-2 mb-6'>
        {[1, 2, 3].map((star) => (
          <span
            key={star}
            className={`text-5xl ${
              star <= stars ? "text-yellow-400" : "text-slate-600"
            }`}
          >
            ★
          </span>
        ))}
      </div>

      <p className='text-slate-300 mb-6'>Tu as bien écouté le rythme !</p>

      <button
        onClick={() => navigate(`/island/${sessionId}`)}
        className='bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-xl font-semibold'
      >
        Continuer
      </button>
    </div>
  );
}
