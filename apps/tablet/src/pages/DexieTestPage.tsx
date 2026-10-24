import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../db/db";

export default function DexieTestPage() {
  const students = useLiveQuery(() => db.students.toArray());

  return (
    <div className="min-h-screen bg-slate-900 text-white p-6">
      <h1 className="text-2xl font-bold mb-4">Test Dexie</h1>

      {!students && <p>Chargement…</p>}

      {students && students.length === 0 && (
        <p>Aucun élève trouvé.</p>
      )}

      {students && students.length > 0 && (
        <div className="space-y-3">
          {students.map((student) => (
            <div
              key={student.id}
              className="bg-slate-800 p-4 rounded-xl"
            >
              <p className="font-semibold">
                {student.firstName} — {student.fullName}
              </p>
              <p className="text-slate-300">
                Avatar : {student.avatarKey} ({student.avatarVariant})
              </p>
              <p className="text-slate-400">
                Token : {student.qrToken}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}