import { BrowserRouter, Routes, Route } from "react-router-dom";
import ScanCardPage from "./pages/ScanCardPage";
import ConfirmStudentPage from "./pages/ConfirmStudentPage";
import IslandPage from "./pages/IslandPage";
import GamePage from "./pages/GamePage";
import ActivityEndPage from "./pages/ActivityEndPage";
import SessionEndPage from "./pages/SessionEndPage";
import DexieTestPage from "./pages/DexieTestPage";
import PhaserTestPage from "./pages/PhaserTestPage";
import ManualLoginPage from "./pages/ManualLoginPage";

function App() {
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
        <Route path='/test/dexie' element={<DexieTestPage />} />
        <Route path='/test/phaser' element={<PhaserTestPage />} />
        <Route path='/manual-login' element={<ManualLoginPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
