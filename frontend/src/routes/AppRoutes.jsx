
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
import GovConsentGrants from "../pages/GovConsentGrants";
import { NotFound } from "../pages/Misc";

const CITIZEN_ROLES = ["citizen"];
const DEPARTMENT_ROLES = [
  "staff",
  "lead",
  "supervisor",
  "admin",
  "public_information_officer",
  "information_officer",
];
function Guard({ roles, children, government = false, departmentRoles = [] }) {
  const { user, staffProfile, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-500 text-sm">
        Authenticating CivicOne session...
      </div>
    );
  }

  if (!user) {
    return <Navigate to={government ? "/government/login" : "/login"} replace />;
  }

  const hasDepartmentRole = user.role === "staff"
    && staffProfile?.departments?.some((department) =>
      departmentRoles.includes(department.role_in_dept)
    );
  if (!roles.includes(user.role) && !hasDepartmentRole) {
    const hasActiveDepartment = staffProfile?.departments?.some((department) =>
      DEPARTMENT_ROLES.includes(department.role_in_dept)
    );
    const destination = user.role === "platform_admin"
      ? "/government/analytics"
      : user.role === "org_admin"
        ? "/government/dashboard"
        : user.role === "staff" && hasActiveDepartment
        ? "/government"
        : user.role === "citizen"
          ? "/app"
          : "/login";
    return <Navigate to={destination} replace />;
  }

  return children;
}

function GovernmentIndex() {
  const { user } = useAuth();
  return <Navigate to={user?.role === "platform_admin" ? "/government/analytics" : "/government/dashboard"} replace />;
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
          <Guard roles={CITIZEN_ROLES}>
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
          <Guard
            roles={["org_admin", "platform_admin"]}
            departmentRoles={DEPARTMENT_ROLES}
            government
          >
            <GovernmentLayout />
          </Guard>
        }
      >
        <Route index element={<GovernmentIndex />} />
        <Route path="dashboard" element={<Guard roles={["org_admin"]} departmentRoles={DEPARTMENT_ROLES}><GovDashboard /></Guard>} />
        <Route path="complaints" element={<Guard roles={["org_admin"]} departmentRoles={DEPARTMENT_ROLES}><GovComplaints /></Guard>} />
        <Route path="complaints/:id" element={<Guard roles={["org_admin"]} departmentRoles={DEPARTMENT_ROLES}><ComplaintDetail /></Guard>} />
        <Route path="documents" element={<Guard roles={["org_admin"]} departmentRoles={DEPARTMENT_ROLES}><GovDocuments /></Guard>} />
        <Route path="analytics" element={<Guard roles={["org_admin", "platform_admin"]} departmentRoles={DEPARTMENT_ROLES}><GovAnalytics /></Guard>} />
        <Route path="staff" element={<Guard roles={["org_admin", "platform_admin"]}><GovStaffManagement /></Guard>} />
        <Route path="admin/organizations" element={<Guard roles={["platform_admin"]}><GovOrganizations /></Guard>} />
        <Route path="consents" element={<Guard roles={["org_admin"]}><GovConsentGrants /></Guard>} />
        <Route path="audit-logs" element={<Guard roles={["org_admin", "platform_admin"]}><GovAuditLogs /></Guard>} />
        <Route path="settings" element={<ProfileSettings />} />
      </Route>

      {/* Fallback 404 */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
