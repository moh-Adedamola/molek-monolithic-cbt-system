import { NavLink } from "react-router-dom";
import {
    LayoutDashboard,
    Users,
    GraduationCap,
    BookOpen,
    FileQuestion,
    ClipboardList,
    Activity,
    FileText,
    TrendingUp,
    Settings,
    Shield,
    Menu,
    X,
} from "lucide-react";
import clsx from "clsx";

const Sidebar = ({ isOpen, setIsOpen }) => {
    const navigationItems = [
        { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, path: "/admin" },
        // { id: "users", label: "User Management", icon: Users, path: "/admin/users" },
        { id: "students", label: "Student Management", icon: GraduationCap, path: "/admin/students" },
        { id: "subjects", label: "Subject Management", icon: BookOpen, path: "/admin/subjects" },
        { id: "questions", label: "Question Bank", icon: FileQuestion, path: "/admin/questions" },
        { id: "exams", label: "Exam Management", icon: ClipboardList, path: "/admin/exams" },
        { id: "monitoring", label: "Live Monitoring", icon: Activity, path: "/admin/monitoring" },
        { id: "results", label: "Results Management", icon: FileText, path: "/admin/results" },
        { id: "reports", label: "Reports & Analytics", icon: TrendingUp, path: "/admin/reports" },
        { id: "audit", label: "Audit Logs", icon: Shield, path: "/admin/audit-logs" },
        { id: "settings", label: "System Settings", icon: Settings, path: "/admin/settings" },
    ];

    return (
        <>
            {/* Overlay for mobile when sidebar is open */}
            {isOpen && (
                <div
                    className="fixed inset-0 z-20 bg-black bg-opacity-50 lg:hidden"
                    onClick={() => setIsOpen(false)}
                />
            )}

            <aside
                className={clsx(
                    "fixed inset-y-0 left-0 z-30 w-64 bg-white shadow-lg transition-transform duration-300 lg:static lg:translate-x-0",
                    isOpen ? "translate-x-0" : "-translate-x-full"
                )}
            >
                {/* Header */}
                <div className="flex items-center justify-between border-b px-6 py-4">
                    <div className="flex items-center gap-2">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white">
                            <span className="font-bold">M</span>
                        </div>
                        <span className="text-lg font-bold">Molek CBT</span>
                    </div>
                    {/* Toggle button for both mobile and desktop */}
                    <button
                        onClick={() => setIsOpen(!isOpen)}
                        className="rounded-lg p-2 hover:bg-gray-100 transition-colors"
                    >
                        {isOpen ? (
                            <X className="h-5 w-5 text-gray-600 lg:hidden" />
                        ) : (
                            <Menu className="h-5 w-5 text-gray-600" />
                        )}
                        <Menu className="h-5 w-5 text-gray-600 hidden lg:block" />
                    </button>
                </div>

                {/* Navigation */}
                <nav className="flex-1 overflow-y-auto px-3 py-4">
                    <div className="space-y-1">
                        {navigationItems.map((item) => {
                            const Icon = item.icon;
                            return (
                                <NavLink
                                    key={item.id}
                                    to={item.path}
                                    onClick={() => {
                                        // Only close on mobile
                                        if (window.innerWidth < 1024) {
                                            setIsOpen(false);
                                        }
                                    }}
                                    className={({ isActive }) =>
                                        clsx(
                                            "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                                            isActive
                                                ? "bg-blue-50 text-blue-700"
                                                : "text-gray-700 hover:bg-gray-100"
                                        )
                                    }
                                >
                                    <Icon className="h-5 w-5" />
                                    <span>{item.label}</span>
                                </NavLink>
                            );
                        })}
                    </div>
                </nav>
            </aside>
        </>
    );
};

export default Sidebar;