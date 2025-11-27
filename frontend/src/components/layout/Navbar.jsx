import { Menu } from "lucide-react";

const Navbar = ({ toggleSidebar }) => {
    return (
        <nav className=" px-4 py-3 lg:px-6 lg:py-4">
            <div className="flex items-center justify-between">
                {/* Left section */}
                <div className="flex items-center gap-3">
                    {/* Hamburger menu - Only visible on mobile */}
                    <button
                        onClick={toggleSidebar}
                        className="rounded-lg p-2 hover:bg-gray-100 lg:hidden"
                        aria-label="Toggle menu"
                    >
                        <Menu className="h-6 w-6 text-gray-600" />
                    </button>

                    {/*<h1 className="text-lg font-bold text-gray-800 lg:text-xl">Molek CBT</h1>*/}
                </div>

                {/* Right section - Can add notifications, profile, etc. */}
                <div className="flex items-center gap-2">
                    {/* Add user profile, notifications here if needed */}
                </div>
            </div>
        </nav>
    );
};

export default Navbar;