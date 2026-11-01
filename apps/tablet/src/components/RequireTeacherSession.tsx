import { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import {
  fetchCurrentTeacher,
  type TeacherProfile,
} from "../services/teacherApi";

export default function RequireTeacherSession() {
  const location = useLocation();

  const [teacher, setTeacher] = useState<TeacherProfile | null>(null);
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    let isActive = true;

    async function checkSession() {
      const currentTeacher = await fetchCurrentTeacher();

      if (isActive) {
        setTeacher(currentTeacher);
        setIsChecking(false);
      }
    }

    void checkSession();

    return () => {
      isActive = false;
    };
  }, []);

  if (isChecking) {
    return <p>Vérification de la session enseignante…</p>;
  }

  if (!teacher) {
    return (
      <Navigate
        to='/adulte/connexion'
        replace
        state={{ from: location.pathname }}
      />
    );
  }

  return <Outlet context={{ teacher }} />;
}
