import { BrowserRouter, Routes, Route } from "react-router-dom";
import ScanCardPage from "./pages/ScanCardPage";
import ConfirmStudentPage from "./pages/ConfirmStudentPage";
import IslandPage from "./pages/IslandPage";
import GamePage from "./pages/GamePage";
import ActivityEndPage from "./pages/ActivityEndPage";
import SessionEndPage from "./pages/SessionEndPage";
import ManualLoginPage from "./pages/ManualLoginPage";
import TeacherStudentsPage from "./pages/TeacherStudentsPage.tsx";
import TeacherStudentPage from "./pages/TeacherStudentPage";
import TeacherSessionPage from "./pages/TeacherSessionPage";
import TeacherLoginPage from "./pages/TeacherLoginPage";
import RequireTeacherSession from "./components/RequireTeacherSession";
import { useEffect, useState } from "react";
import { fetchStudentsFromServer } from "./services/studentApi";
import { replaceServerStudents } from "./db/students";

function App() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    async function loadStudents() {
      try {
        const students = await fetchStudentsFromServer();
        await replaceServerStudents(students);
      } catch (error) {
        console.error("Chargement des élèves impossible :", error);
      } finally {
        setIsReady(true);
      }
    }

    loadStudents();
  }, []);

  if (!isReady) {
    return <div>Chargement des élèves...</div>;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path='/' element={<ScanCardPage />} />
        <Route path='/scan' element={<ScanCardPage />} />
        <Route path='/confirm/:studentId' element={<ConfirmStudentPage />} />
        <Route path='/island/:sessionId' element={<IslandPage />} />
        <Route path='/game/:sessionId' element={<GamePage />} />
        <Route
          path='/activity-end/:sessionId/:sessionActivityId'
          element={<ActivityEndPage />}
        />
        <Route path='/session-end/:sessionId' element={<SessionEndPage />} />
        <Route path='/manual-login' element={<ManualLoginPage />} />
        <Route element={<RequireTeacherSession />}>
          <Route path='/adulte/eleves' element={<TeacherStudentsPage />} />
          <Route
            path='/adulte/eleves/:studentId'
            element={<TeacherStudentPage />}
          />
          <Route
            path='/adulte/eleves/:studentId/seances/:sessionId'
            element={<TeacherSessionPage />}
          />
        </Route>
        <Route path='/adulte/connexion' element={<TeacherLoginPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
