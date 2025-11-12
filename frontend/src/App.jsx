import { BrowserRouter, Routes, Route } from 'react-router-dom';
import StudentLogin from './pages/StudentLogin';
import ExamSelect from './pages/ExamSelect';
import ExamScreen from './pages/ExamScreen';
import AdminDashboard from './pages/AdminDashboard';

function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<StudentLogin />} />
                <Route path="/exam-select" element={<ExamSelect />} />
                <Route path="/exam/:subject" element={<ExamScreen />} />
                <Route path="/admin" element={<AdminDashboard />} />
            </Routes>
        </BrowserRouter>
    );
}

export default App;