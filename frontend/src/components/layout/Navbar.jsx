import { Menu } from "lucide-react";

const Navbar = ({ toggleSidebar }) => {
    return (
        <nav className="border-b border-gray-200 bg-white px-6 py-4">
            <div className="flex items-center justify-between">
                {/* Left section */}
                <div className="flex items-center gap-4">
                    <button
                        onClick={toggleSidebar}
                        className="rounded-lg p-2 hover:bg-gray-100"
                    >
                        <Menu className="h-6 w-6 text-gray-600" />
                    </button>
                    <h1 className="text-xl font-bold text-gray-800">Molek CBT</h1>
                </div>

                {/* Right section (empty now) */}
                <div></div>
            </div>
        </nav>
    );
};

export default Navbar;
