import React, { useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import GovSidebar from "../components/navigation/GovSidebar";
import GovTopBar from "../components/navigation/GovTopBar";
import { useAuth } from "../context/AuthContext";

export default function GovernmentLayout() {
  const { staffProfile } = useAuth();
  const navigate = useNavigate();

  const initialDomain =
    staffProfile?.primary_domain ||
    staffProfile?.departments?.[0]?.organization_domain ||
    null;

  const [activeDomain, setActiveDomain] = useState(initialDomain);
  const [currentDept, setCurrentDept] = useState(
    staffProfile?.departments?.[0] || null
  );

  const handleSelectDepartment = (dept) => {
    setCurrentDept(dept);
    if (dept.organization_domain) {
      setActiveDomain(dept.organization_domain);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex">
      {/* Dynamic Themed Sidebar */}
      <GovSidebar domain={activeDomain} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <GovTopBar
          domain={activeDomain}
          currentDepartment={currentDept}
          onSelectDepartment={handleSelectDepartment}
        />
        <main className="flex-1 p-6 md:p-8 overflow-y-auto">
          <Outlet context={{ domain: activeDomain, currentDepartment: currentDept, setActiveDomain }} />
        </main>
      </div>
    </div>
  );
}
