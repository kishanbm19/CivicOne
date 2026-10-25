"""CivicOne Seed Script
Creates demonstration organizations, departments, users, complaints, notices, facilities, and consent grants.
Run: python -m app.seed
"""
from datetime import datetime, timezone, timedelta
from sqlalchemy import select, delete
from .core.database import Base, engine, SessionLocal
from .core.security import hash_password
from .models import (
    User, Organization, Department, DepartmentMembership,
    Complaint, StatusHistory, ComplaintInternalNote,
    Document, HealthcareFacility, ConsentGrant, Notification
)

def run():
    Base.metadata.create_all(engine)
    with SessionLocal() as db:
        # Clear existing data for clean idempotent seed
        for model in (
            Notification, ConsentGrant, ComplaintInternalNote,
            StatusHistory, Complaint, Document, HealthcareFacility,
            DepartmentMembership, Department, Organization, User
        ):
            db.execute(delete(model))
        db.commit()

        now = datetime.now(timezone.utc)

        # 1. Organizations
        org_transport = Organization(
            name="Transport Organization",
            domain="transport",
            description="Unified public transit, bus operations, and commuter infrastructure."
        )
        org_municipal = Organization(
            name="Municipal Organization",
            domain="municipal",
            description="Civic infrastructure, sanitation, solid waste, and urban public works."
        )
        org_healthcare = Organization(
            name="Healthcare Organization",
            domain="healthcare",
            description="Public healthcare infrastructure, primary health centres, and medical welfare."
        )
        db.add_all([org_transport, org_municipal, org_healthcare])
        db.flush()

        # 2. Departments
        depts = {}
        # Transport depts
        d_bus_ops = Department(organization_id=org_transport.id, name="Bus Operations", category_key="bus_delay")
        d_bus_infra = Department(organization_id=org_transport.id, name="Bus Stops and Infrastructure", category_key="bus_stop_damage")
        d_trans_safe = Department(organization_id=org_transport.id, name="Transport Safety", category_key="general")
        db.add_all([d_bus_ops, d_bus_infra, d_trans_safe])
        db.flush()
        depts["transport_bus"] = d_bus_ops
        depts["transport_infra"] = d_bus_infra

        # Municipal depts
        d_sanitation = Department(organization_id=org_municipal.id, name="Sanitation", category_key="garbage")
        d_roads = Department(organization_id=org_municipal.id, name="Roads and Infrastructure", category_key="pothole")
        d_lights = Department(organization_id=org_municipal.id, name="Streetlights", category_key="streetlight")
        d_water = Department(organization_id=org_municipal.id, name="Water Supply", category_key="water_supply")
        d_drainage = Department(organization_id=org_municipal.id, name="Drainage", category_key="drainage")
        db.add_all([d_sanitation, d_roads, d_lights, d_water, d_drainage])
        db.flush()
        depts["sanitation"] = d_sanitation
        depts["roads"] = d_roads
        depts["streetlights"] = d_lights
        depts["water"] = d_water
        depts["drainage"] = d_drainage

        # Healthcare depts
        d_fac_mgmt = Department(organization_id=org_healthcare.id, name="Facility Management", category_key="facility_cleanliness")
        d_hosp = Department(organization_id=org_healthcare.id, name="Hospitals and Clinics", category_key="equipment")
        db.add_all([d_fac_mgmt, d_hosp])
        db.flush()
        depts["healthcare_fac"] = d_fac_mgmt
        depts["healthcare_hosp"] = d_hosp

        # 3. Users
        def create_user(email, name, role, pw, phone="9876543210"):
            u = User(
                email=email.lower(),
                full_name=name,
                role=role,
                phone=phone,
                password_hash=hash_password(pw),
                is_active=True
            )
            db.add(u)
            db.flush()
            return u

        # Citizen from screenshot
        u_citizen = create_user("citizen@demo.civicone.test", "Ananya Sharma", "citizen", "Citizen#1234", "9845012345")

        # Staff accounts from screenshot
        u_trans_staff = create_user("transport@demo.civicone.test", "Rajesh Kumar", "staff", "Staff#1234", "9845054321")
        u_muni_staff = create_user("sanitation@demo.civicone.test", "Priya Singh", "staff", "Staff#1234", "9845067890")
        u_muni_alt = create_user("municipal@demo.civicone.test", "Priya Singh", "staff", "Staff#1234", "9845067890")
        u_health_staff = create_user("healthcare@demo.civicone.test", "Dr. Amit Patel", "staff", "Staff#1234", "9845098765")

        # Administrators
        u_dept_admin = create_user("admin.dept@demo.civicone.test", "Kavita Rao", "dept_admin", "Admin#1234", "9845011223")
        u_plat_admin = create_user("admin@demo.civicone.test", "Suresh Mehta", "platform_admin", "Admin#1234", "9845099887")

        # Department Memberships
        db.add(DepartmentMembership(user_id=u_trans_staff.id, department_id=d_bus_ops.id, role_in_dept="staff"))
        db.add(DepartmentMembership(user_id=u_trans_staff.id, department_id=d_bus_infra.id, role_in_dept="staff"))

        db.add(DepartmentMembership(user_id=u_muni_staff.id, department_id=d_sanitation.id, role_in_dept="staff"))
        db.add(DepartmentMembership(user_id=u_muni_staff.id, department_id=d_roads.id, role_in_dept="staff"))
        db.add(DepartmentMembership(user_id=u_muni_alt.id, department_id=d_sanitation.id, role_in_dept="staff"))

        db.add(DepartmentMembership(user_id=u_health_staff.id, department_id=d_hosp.id, role_in_dept="staff"))
        db.add(DepartmentMembership(user_id=u_health_staff.id, department_id=d_fac_mgmt.id, role_in_dept="staff"))

        db.add(DepartmentMembership(user_id=u_dept_admin.id, department_id=d_roads.id, role_in_dept="supervisor"))
        db.flush()

        # 4. Healthcare Facilities
        fac_dist = HealthcareFacility(
            name="District Hospital",
            facility_type="Hospital",
            address="Civic Ring Road, Medical Enclave",
            locality="Central District",
            contact_phone="080-2234001",
            services_offered="General Medicine, 24/7 Emergency, ICU, Radiology & X-Ray, Surgery",
            timings="24/7 Emergency & Inpatient"
        )
        fac_hunsur = HealthcareFacility(
            name="PHC at Hunsur Road",
            facility_type="PHC",
            address="Plot 14, Hunsur Main Road",
            locality="Hunsur Corridor",
            contact_phone="080-2234002",
            services_offered="Primary Health Care, Immunization, Maternal Care, OPD",
            timings="8:00 AM - 4:00 PM (Mon-Sat)"
        )
        fac_kuvempu = HealthcareFacility(
            name="Urban Health Centre",
            facility_type="Clinic",
            address="Kuvempunagar 5th Cross",
            locality="Kuvempunagar",
            contact_phone="080-2234003",
            services_offered="Outpatient Consultation, Essential Diagnostics, Family Welfare",
            timings="9:00 AM - 5:00 PM"
        )
        fac_chc = HealthcareFacility(
            name="CHC Nanjangud",
            facility_type="Hospital",
            address="Main Gate, South Civic Circle",
            locality="Nanjangud Zone",
            contact_phone="080-2234004",
            services_offered="Community Health, Pediatric Care, Emergency Stabilization",
            timings="24/7 Emergency"
        )
        db.add_all([fac_dist, fac_hunsur, fac_kuvempu, fac_chc])
        db.flush()

        # 5. Complaints exactly matching the screenshot
        # Helper to seed complaint and history
        def add_c(ref, domain, title, cat, loc, priority, status_val, dept, staff_user, desc, time_delta):
            c_time = now - time_delta
            c = Complaint(
                reference=ref,
                citizen_id=u_citizen.id,
                domain=domain,
                title=title,
                description=desc,
                category=cat,
                address=f"{loc}, Civic Zone",
                locality=loc,
                priority=priority,
                status=status_val,
                department_id=dept.id if dept else None,
                assigned_to_user_id=staff_user.id if staff_user else None,
                needs_review=False,
                classified_by="ai",
                ai_confidence="0.94",
                ai_explanation=f"Categorized under {cat} based on issue keywords.",
                created_at=c_time,
                updated_at=c_time
            )
            db.add(c)
            db.flush()

            # Status history
            db.add(StatusHistory(
                complaint_id=c.id,
                previous_status="submitted",
                new_status=status_val,
                actor_id=staff_user.id if staff_user else u_citizen.id,
                reason=f"Assigned and marked {status_val.replace('_', ' ')}",
                citizen_visible=True,
                created_at=c_time
            ))
            return c

        # Transport Complaints
        add_c("#T-2024-0012", "transport", "Bus delay on Route 45", "bus_delay", "Kuvempunagar", "high", "in_progress", d_bus_ops, u_trans_staff, "Route 45 buses delayed consistently during morning peak hours by over 40 minutes.", timedelta(hours=2))
        add_c("#T-2024-0015", "transport", "Damaged bus stop", "bus_stop_damage", "Jayanagar", "high", "assigned", d_bus_infra, u_trans_staff, "Damaged shelter canopy with shattered glass panel posing safety hazard.", timedelta(hours=4))
        add_c("#T-2024-0018", "transport", "Overcrowding", "bus_delay", "City Bus Stand", "medium", "in_progress", d_bus_ops, u_trans_staff, "Platform 3 experiences severe crowding due to low frequency of route 12.", timedelta(days=1))
        add_c("#T-2024-0021", "transport", "No bus on weekend", "bus_delay", "Vishweshwaranagar", "medium", "assigned", d_bus_ops, u_trans_staff, "Weekend service on feeder line discontinued without notice.", timedelta(days=1))

        # Municipal Complaints
        add_c("#M-2024-0042", "municipal", "Garbage not collected", "garbage", "Ward 12", "high", "in_progress", d_sanitation, u_muni_staff, "Community waste collection vehicle has not visited Ward 12 for 3 consecutive days.", timedelta(hours=1))
        add_c("#M-2024-0045", "municipal", "Pothole on MG Road", "pothole", "MG Road", "high", "in_progress", d_roads, u_muni_staff, "Large deep pothole near junction causing two-wheeler skids and traffic congestion.", timedelta(hours=2))
        add_c("#M-2024-0048", "municipal", "Streetlight not working", "streetlight", "Vijay Nagar", "medium", "assigned", d_lights, u_muni_staff, "Continuous stretch of 5 streetlights dark creating unsafe night conditions.", timedelta(hours=5))
        add_c("#M-2024-0051", "municipal", "Drainage blockage", "drainage", "Hebbal", "medium", "assigned", d_drainage, u_muni_staff, "Stormwater drain choked with plastic silt overflowing onto pedestrian walkway.", timedelta(days=1))

        # Healthcare Complaints
        add_c("#H-2024-0031", "healthcare", "Non-functional X-Ray", "equipment", "District Hospital", "high", "in_progress", d_hosp, u_health_staff, "Digital X-Ray imaging unit down in casualty ward since yesterday evening.", timedelta(hours=2))
        add_c("#H-2024-0045", "healthcare", "Cleanliness issue", "facility_cleanliness", "PHC Hunsur", "high", "in_progress", d_fac_mgmt, u_health_staff, "OPD waiting room sanitation and washrooms require immediate maintenance.", timedelta(hours=5))
        add_c("#H-2024-0072", "healthcare", "Medicine shortage", "equipment", "Urban Health Centre", "medium", "assigned", d_hosp, u_health_staff, "Shortage of basic hypertension maintenance medications at pharmacy dispensary.", timedelta(days=1))
        add_c("#H-2024-0078", "healthcare", "Waiting time too long", "facility_cleanliness", "CHC Nanjangud", "medium", "assigned", d_hosp, u_health_staff, "Tokens queue experiencing extended delays over 3 hours due to single operational desk.", timedelta(days=1))

        # Resolved Complaints for stats
        add_c("#T-2024-0008", "transport", "Defective electronic bus sign", "bus_stop_damage", "Suburban Terminal", "low", "resolved", d_bus_infra, u_trans_staff, "LED destination board was flickering. Display module replaced.", timedelta(days=4))
        add_c("#M-2024-0022", "municipal", "Fallen branch cleared", "pothole", "Park Avenue", "medium", "resolved", d_roads, u_muni_staff, "Large tree limb obstructing lane cleared.", timedelta(days=3))
        add_c("#H-2024-0019", "healthcare", "Water dispenser filter replaced", "facility_cleanliness", "District Hospital", "low", "resolved", d_fac_mgmt, u_health_staff, "Drinking water filter serviced and certified clean.", timedelta(days=5))

        # 6. Documents & Published Notices matching screenshot
        # Transport notices
        db.add(Document(
            title="Route 45 Schedule Updated",
            description="New timetable effective from Oct 25, 2026. Added four additional air-conditioned buses during rush hours.",
            service_domain="transport",
            department_id=d_bus_ops.id,
            category="announcement",
            status="published",
            author_id=u_trans_staff.id,
            reviewer_id=u_plat_admin.id,
            is_public=True,
            publication_timestamp=now - timedelta(days=3)
        ))
        db.add(Document(
            title="New Bus Stop Shelter at Kuvempunagar",
            description="Installation completed with covered seating, digital arrival display, and solar illumination.",
            service_domain="transport",
            department_id=d_bus_infra.id,
            category="infrastructure",
            status="published",
            author_id=u_trans_staff.id,
            reviewer_id=u_plat_admin.id,
            is_public=True,
            publication_timestamp=now - timedelta(days=5)
        ))
        db.add(Document(
            title="Night Services Extended",
            description="Extended services on key routes during festival season with 30-minute intervals until 1:00 AM.",
            service_domain="transport",
            department_id=d_bus_ops.id,
            category="service_update",
            status="published",
            author_id=u_trans_staff.id,
            reviewer_id=u_plat_admin.id,
            is_public=True,
            publication_timestamp=now - timedelta(days=7)
        ))

        # Municipal notices
        db.add(Document(
            title="Garbage Collection Schedule",
            description="Updated schedule for Ward 12. Segregated dry and wet waste pickup timings adjusted to 7:00 AM - 10:00 AM.",
            service_domain="municipal",
            department_id=d_sanitation.id,
            category="notice",
            status="published",
            author_id=u_muni_staff.id,
            reviewer_id=u_plat_admin.id,
            is_public=True,
            publication_timestamp=now - timedelta(days=3)
        ))
        db.add(Document(
            title="Pothole Repair Drive",
            description="Major road repair work in Central Zone covering arterial roads and bus corridors.",
            service_domain="municipal",
            department_id=d_roads.id,
            category="infrastructure",
            status="published",
            author_id=u_muni_staff.id,
            reviewer_id=u_plat_admin.id,
            is_public=True,
            publication_timestamp=now - timedelta(days=6)
        ))
        db.add(Document(
            title="Water Supply Interruption",
            description="Planned maintenance work on Oct 25. Supply affected in northern wards between 9:00 AM and 2:00 PM.",
            service_domain="municipal",
            department_id=d_water.id,
            category="alert",
            status="published",
            author_id=u_muni_staff.id,
            reviewer_id=u_plat_admin.id,
            is_public=True,
            publication_timestamp=now - timedelta(days=7)
        ))

        # Healthcare notices
        db.add(Document(
            title="Free Health Check-up Camp",
            description="General health check-up camp on Oct 28, 2026 at Community Centre. Free BP, sugar, and vision screenings.",
            service_domain="healthcare",
            department_id=d_hosp.id,
            category="health_camp",
            status="published",
            author_id=u_health_staff.id,
            reviewer_id=u_plat_admin.id,
            is_public=True,
            publication_timestamp=now - timedelta(days=4)
        ))
        db.add(Document(
            title="New PHC at Hunsur Road",
            description="Primary health centre now open for citizens offering diagnostic labs and pediatric care.",
            service_domain="healthcare",
            department_id=d_fac_mgmt.id,
            category="facility_update",
            status="published",
            author_id=u_health_staff.id,
            reviewer_id=u_plat_admin.id,
            is_public=True,
            publication_timestamp=now - timedelta(days=7)
        ))
        db.add(Document(
            title="Vaccination Drive",
            description="COVID-19 booster dose drive at all PHCs and community centers without prior appointment.",
            service_domain="healthcare",
            department_id=d_hosp.id,
            category="announcement",
            status="published",
            author_id=u_health_staff.id,
            reviewer_id=u_plat_admin.id,
            is_public=True,
            publication_timestamp=now - timedelta(days=10)
        ))

        # 7. Consent records for Ananya Sharma
        db.add(ConsentGrant(
            user_id=u_citizen.id,
            recipient_organization_id=org_healthcare.id,
            data_scope="profile,synthetic_records",
            purpose="Enabling synthetic clinic consultation and appointment notifications.",
            status="active",
            granted_at=now - timedelta(days=14),
            expires_at=now + timedelta(days=351)
        ))
        db.add(ConsentGrant(
            user_id=u_citizen.id,
            recipient_organization_id=org_transport.id,
            data_scope="profile,commute_alerts",
            purpose="Receiving public transit delay alerts and timetable revisions.",
            status="active",
            granted_at=now - timedelta(days=20),
            expires_at=now + timedelta(days=345)
        ))

        # 8. Notifications for Ananya Sharma
        db.add(Notification(
            user_id=u_citizen.id,
            title="Complaint Status: In Progress",
            message="Your complaint regarding Bus delay on Route 45 (#T-2024-0012) is being investigated by Transport Operations.",
            link="/app/complaints",
            notification_type="complaint_status",
            is_read=False,
            created_at=now - timedelta(hours=2)
        ))
        db.add(Notification(
            user_id=u_citizen.id,
            title="New Notice: Route 45 Schedule Updated",
            message="A revised timetable for Route 45 has been published by the Transport Department.",
            link="/services/transport",
            notification_type="announcement",
            is_read=False,
            created_at=now - timedelta(days=3)
        ))
        db.add(Notification(
            user_id=u_citizen.id,
            title="Health Camp Alert",
            message="Free General Health Check-up Camp scheduled on Oct 28, 2026.",
            link="/services/healthcare",
            notification_type="health",
            is_read=True,
            created_at=now - timedelta(days=4)
        ))

        db.commit()
    print("CivicOne database successfully seeded with synthetic demo accounts, organizations, departments, and complaints.")

if __name__ == "__main__":
    run()
