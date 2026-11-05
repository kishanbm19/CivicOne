import { useEffect, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import GovSidebar from "../components/navigation/GovSidebar";
import GovTopBar from "../components/navigation/GovTopBar";
import { useAuth } from "../context/AuthContext";
import { listOrganizations } from "../services/services";

export default function GovernmentLayout() {
  const { user, staffProfile } = useAuth();
  const location = useLocation();
  const [organizations, setOrganizations] = useState([]);
  const [selectedOrganizationId, setSelectedOrganizationId] = useState("");

  const initialDomain =
    staffProfile?.primary_domain ||
    staffProfile?.departments?.[0]?.organization_domain ||
    null;

  const [activeDomain, setActiveDomain] = useState(initialDomain);
  const [currentDept, setCurrentDept] = useState(
    staffProfile?.departments?.[0] || null
  );

  useEffect(() => {
    if (
      user?.role !== "platform_admin"
      || location.pathname !== "/government/analytics"
    ) return;
    listOrganizations()
      .then(setOrganizations)
      .catch((err) => console.error("Error loading organization selector:", err));
  }, [location.pathname, user?.role]);

  const handleSelectOrganization = (organizationId) => {
    setSelectedOrganizationId(organizationId);
  };
  const isSystemOverview = location.pathname === "/government/analytics";
  const selectedOrganization = organizations.find(
    (organization) => organization.id === selectedOrganizationId
  );
  const sidebarDomain = isSystemOverview && selectedOrganization
    ? selectedOrganization.domain
    : activeDomain;

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex">
      {/* Dynamic Themed Sidebar */}
      <GovSidebar
        domain={sidebarDomain}
        selectedOrganizationName={isSystemOverview ? selectedOrganization?.name : undefined}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <GovTopBar
          domain={activeDomain}
          currentDepartment={currentDept}
          organizations={organizations}
          selectedOrganizationId={selectedOrganizationId}
          onSelectOrganization={handleSelectOrganization}
        />
        <main className="flex-1 p-6 md:p-8 overflow-y-auto">
          <Outlet context={{
            domain: activeDomain,
            currentDepartment: currentDept,
            setActiveDomain,
            selectedOrganizationId: isSystemOverview
              ? selectedOrganizationId || undefined
              : undefined,
          }} />
        </main>
      </div>
    </div>
  );
}
