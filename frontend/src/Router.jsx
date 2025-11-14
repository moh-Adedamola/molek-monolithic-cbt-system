import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/layout/Layout";

// Student Pages
import StudentLogin from "./pages/student/StudentLogin";
import ExamSelect from "./pages/student/ExamSelect";
import ExamScreen from "./pages/student/ExamScreen";

// Admin Pages
import AdminDashboard from "./pages/admin/Dashboard";
import StudentManagement from "./pages/admin/StudentManagement";
import QuestionBank from "./pages/admin/QuestionBank";
import ResultsManagement from "./pages/admin/ResultsManagement";
import ExamManagement from "./pages/admin/ExamManagement";
import CreateExam from "./pages/admin/CreateExam";
import EditExam from "./pages/admin/EditExam";
import ViewExam from "./pages/admin/ViewExam";
import SubjectManagement from "./pages/admin/SubjectManagement";
import UserManagement from "./pages/admin/UserManagement";
import ExamMonitoring from "./pages/admin/ExamMonitoring";
import Reports from "./pages/admin/Reports";
import AuditLogs from "./pages/admin/AuditLogs";
import SystemSettings from "./pages/admin/SystemSettings";

const Router = () => {
    return (
        <Routes>
            {/* ---------------- STUDENT FLOW ---------------- */}
            <Route path="/" element={<StudentLogin />} />
            <Route path="/exam-select" element={<ExamSelect />} />
            <Route path="/exam/:subject" element={<ExamScreen />} />

            {/* ---------------- ADMIN FLOW WITH LAYOUT ---------------- */}
            <Route path="/admin" element={<Layout />}>
                <Route index element={<AdminDashboard />} />

                <Route path="students" element={<StudentManagement />} />
                <Route path="questions" element={<QuestionBank />} />
                <Route path="results" element={<ResultsManagement />} />

                <Route path="exams" element={<ExamManagement />} />
                <Route path="exams/create" element={<CreateExam />} />
                <Route path="exams/edit/:examId" element={<EditExam />} />
                <Route path="exams/:examId" element={<ViewExam />} />

                <Route path="subjects" element={<SubjectManagement />} />
                <Route path="users" element={<UserManagement />} />
                <Route path="monitoring" element={<ExamMonitoring />} />
                <Route path="reports" element={<Reports />} />
                <Route path="audit-logs" element={<AuditLogs />} />
                <Route path="settings" element={<SystemSettings />} />
            </Route>

            {/* ---------------- CATCH-ALL REDIRECT ---------------- */}
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
};

export default Router;
