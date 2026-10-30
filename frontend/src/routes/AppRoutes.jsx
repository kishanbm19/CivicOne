import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

// Layouts
import PublicLayout from "../layouts/PublicLayout";
import CitizenLayout from "../layouts/CitizenLayout";
import GovernmentLayout from "../layouts/GovernmentLayout";

// Public & Citizen Pages
import Landing from "../pages/Landing";
import Login from "../pages/Login";
import Register from "../pages/Register";
import PasswordReset from "../pages/PasswordReset";
import TransportCitizenPortal from "../pages/TransportCitizenPortal";
import MunicipalCitizenPortal from "../pages/MunicipalCitizenPortal";
import HealthcareCitizenPortal from "../pages/HealthcareCitizenPortal";
import CitizenDashboard from "../pages/CitizenDashboard";
import MyComplaints from "../pages/MyComplaints";
import NewComplaint from "../pages/NewComplaint";
import ComplaintDetail from "../pages/ComplaintDetail";
import PublishedNotices from "../pages/PublishedNotices";
import ConsentManagement from "../pages/ConsentManagement";
import HealthcareServices from "../pages/HealthcareServices";
import NotificationsPage from "../pages/NotificationsPage";
import ProfileSettings from "../pages/ProfileSettings";
import HelpSupport from "../pages/HelpSupport";

// Government Staff Pages
import GovDashboard from "../pages/GovDashboard";
import GovComplaints from "../pages/GovComplaints";
import GovDocuments from "../pages/GovDocuments";
import GovAnalytics from "../pages/GovAnalytics";
import GovStaffManagement from "../pages/GovStaffManagement";
import GovOrganizations from "../pages/GovOrganizations";
import GovAuditLogs from "../pages/GovAuditLogs";
import { Unauthorized, NotFound } from "../pages/Misc";

function Guard({ gov = false, children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500 text-sm">
        Authenticating CivicOne session...
      </div>
    );
  }

  if (!user) {
    return <Navigate to={gov ? "/government/login" : "/login"} replace />;
  }

  const isStaff = user.role !== "citizen";
  if (gov && !isStaff) {
    return <Unauthorized />;
  }
  if (!gov && isStaff) {
    // If staff accesses citizen routes, allow or route to government
  }

  return children;
}

export default function AppRoutes() {
  return (
    <Routes>
      {/* Public Pages with PublicLayout */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<Landing />} />
        <Route path="/services/transport" element={<TransportCitizenPortal />} />
        <Route path="/services/municipal" element={<MunicipalCitizenPortal />} />
        <Route path="/services/healthcare" element={<HealthcareCitizenPortal />} />
        <Route path="/notices" element={<PublishedNotices />} />
        <Route path="/help" element={<HelpSupport />} />
      </Route>

      {/* Standalone Authentication Pages */}
      <Route path="/login" element={<Login portal="citizen" />} />
      <Route path="/register" element={<Register />} />
      <Route path="/password-reset" element={<PasswordReset />} />
      <Route path="/government/login" element={<Login portal="government" />} />

      {/* Protected Citizen Portal with CitizenLayout */}
      <Route
        path="/app"
        element={
          <Guard>
            <CitizenLayout />
          </Guard>
        }
      >
        <Route index element={<CitizenDashboard />} />
        <Route path="complaints" element={<MyComplaints />} />
        <Route path="complaints/new" element={<NewComplaint />} />
        <Route path="complaints/:id" element={<ComplaintDetail />} />
        <Route path="notices" element={<PublishedNotices />} />
        <Route path="consent" element={<ConsentManagement />} />
        <Route path="healthcare/appointments" element={<HealthcareServices />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="profile" element={<ProfileSettings />} />
        <Route path="help" element={<HelpSupport />} />
      </Route>

      {/* Protected Government Portal with GovernmentLayout */}
      <Route
        path="/government"
        element={
          <Guard gov>
            <GovernmentLayout />
          </Guard>
        }
      >
        <Route index element={<GovDashboard />} />
        <Route path="complaints" element={<GovComplaints />} />
        <Route path="complaints/:id" element={<ComplaintDetail />} />
        <Route path="documents" element={<GovDocuments />} />
        <Route path="analytics" element={<GovAnalytics />} />
        <Route path="staff" element={<GovStaffManagement />} />
        <Route path="admin/organizations" element={<GovOrganizations />} />
        <Route path="audit-logs" element={<GovAuditLogs />} />
        <Route path="settings" element={<ProfileSettings />} />
        <Route path="services/transport" element={<TransportCitizenPortal />} />
        <Route path="services/municipal" element={<MunicipalCitizenPortal />} />
        <Route path="services/healthcare" element={<HealthcareCitizenPortal />} />
      </Route>

      {/* Fallback 404 */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
