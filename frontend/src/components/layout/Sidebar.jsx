import { NavLink } from "react-router-dom";
import { useState, useEffect } from "react";
import {
    LayoutDashboard,
    GraduationCap,
    BookOpen,
    FileQuestion,
    ClipboardList,
    Activity,
    FileText,
    TrendingUp,
    Settings,
    Shield,
    Archive,
    Network,
    X,
} from "lucide-react";
import clsx from "clsx";
import { getSystemSettings } from "../../services/api";

const Sidebar = ({ isOpen, setIsOpen }) => {
    // ✅ Settings state
    const [settings, setSettings] = useState(null);

    // ✅ Load settings on mount
    useEffect(() => {
        const loadSettings = async () => {
            try {
                const res = await getSystemSettings();
                setSettings(res.data.settings);
            } catch (error) {
                console.error('Failed to load settings:', error);
            }
        };
        loadSettings();
    }, []);

    const navigationItems = [
        { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, path: "/admin" },
        { id: "archive", label: "Archive Management", icon: Archive, path: "/admin/archive" },
        { id: "network", label: "Network Setup", icon: Network, path: "/admin/network" },
        { id: "students", label: "Student Management", icon: GraduationCap, path: "/admin/students" },
        { id: "subjects", label: "Subject Management", icon: BookOpen, path: "/admin/subjects" },
        { id: "questions", label: "Question Bank", icon: FileQuestion, path: "/admin/questions" },
        { id: "exams", label: "Exam Management", icon: ClipboardList, path: "/admin/exams" },
        { id: "monitoring", label: "Live Monitoring", icon: Activity, path: "/admin/monitoring" },
        // { id: "results", label: "Results Management", icon: FileText, path: "/admin/results" },
        { id: "reports", label: "Results & Analytics", icon: TrendingUp, path: "/admin/reports" },
        { id: "audit", label: "Audit Logs", icon: Shield, path: "/admin/audit-logs" },
        { id: "settings", label: "System Settings", icon: Settings, path: "/admin/settings" },
    ];

    return (
        <>
            {/* Blur backdrop for mobile when sidebar is open */}
            {isOpen && (
                <div
                    className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm lg:hidden"
                    onClick={() => setIsOpen(false)}
                    aria-hidden="true"
                />
            )}

            {/* Sidebar */}
            <aside
                className={clsx(
                    // Base styles
                    "fixed inset-y-0 left-0 z-50 w-72 bg-white shadow-lg transition-transform duration-300 ease-in-out",
                    // Desktop: Always visible, no transform
                    "lg:static lg:z-auto lg:translate-x-0",
                    // Mobile: Slide in/out based on isOpen
                    isOpen ? "translate-x-0" : "-translate-x-full"
                )}
            >
                {/* Header */}
                <div className="flex items-center justify-between border-b px-6 py-4">
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-md">
                            <span className="text-lg font-bold">
                                {(settings?.schoolName || 'Molek CBT').charAt(0).toUpperCase()}
                            </span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-lg font-bold text-gray-800">
                                {settings?.schoolName || 'Molek CBT'}
                            </span>
                            {settings?.academicSession && (
                                <span className="text-xs text-gray-500">
                                    {settings.academicSession} • {settings.currentTerm}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Close button - Only visible on mobile */}
                    <button
                        onClick={() => setIsOpen(false)}
                        className="rounded-lg p-2 hover:bg-gray-100 transition-colors lg:hidden"
                        aria-label="Close menu"
                    >
                        <X className="h-5 w-5 text-gray-600" />
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
                                    end={item.path === "/admin"}
                                    onClick={() => {
                                        // Close sidebar on mobile after clicking
                                        if (window.innerWidth < 1024) {
                                            setIsOpen(false);
                                        }
                                    }}
                                    className={({ isActive }) =>
                                        clsx(
                                            "flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium transition-all duration-150",
                                            isActive
                                                ? "bg-gradient-to-r from-blue-50 to-blue-100 text-blue-700 shadow-sm"
                                                : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                                        )
                                    }
                                >
                                    <Icon className="h-5 w-5 flex-shrink-0" />
                                    <span>{item.label}</span>
                                </NavLink>
                            );
                        })}
                    </div>
                </nav>

                {/* Footer */}
                <div className="border-t px-6 py-4">
                    <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100">
                            <span className="text-xs font-semibold text-gray-600">A</span>
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">Admin</p>
                            <p className="text-xs text-gray-500 truncate">
                                {settings?.systemName || 'Molek CBT System'}
                            </p>
                        </div>
                    </div>
                </div>
            </aside>
        </>
    );
};

export default Sidebar;