from .models import Permission, Role, PermissionGroup

# Core Groups definition
PERMISSION_GROUPS = {
    "ORG_ADMIN": {"name": "Organization Administration", "desc": "Edit settings and configure memberships."},
    "PROJECT_MGMT": {"name": "Project Space Management", "desc": "Create and read project workspace boards."},
    "TASK_MGMT": {"name": "Daily Task Management", "desc": "Create, update, and close daily task tickets."},
    "DEVOPS": {"name": "DevOps Operations", "desc": "Manage deployments and cluster profiles."},
    "ANALYTICS": {"name": "Reporting & Charts", "desc": "View dashboard charts and export sheets."},
}

# Core Permissions mapping to Groups
PERMISSIONS_MATRIX = [
    {"code": "ORG_MANAGE", "group": "ORG_ADMIN", "description": "Manage organization settings and billing."},
    {"code": "PROJECT_CREATE", "group": "PROJECT_MGMT", "description": "Create new project spaces and boards."},
    {"code": "PROJECT_VIEW", "group": "PROJECT_MGMT", "description": "Read project boards and workspaces."},
    {"code": "TASK_CREATE", "group": "TASK_MGMT", "description": "Add daily tasks and assignments."},
    {"code": "TASK_EDIT", "group": "TASK_MGMT", "description": "Update task priorities and states."},
    {"code": "TASK_CLOSE", "group": "TASK_MGMT", "description": "Mark daily tasks as completed."},
    {"code": "DEPLOY_MANAGE", "group": "DEVOPS", "description": "Trigger deployment tasks."},
    {"code": "REPORT_VIEW", "group": "ANALYTICS", "description": "Access dashboard reports and analytics."},
]

# Role mapping codes
ROLES_MAPPING = {
    "SUPER_ADMIN": ["ORG_MANAGE", "PROJECT_CREATE", "PROJECT_VIEW", "TASK_CREATE", "TASK_EDIT", "TASK_CLOSE", "DEPLOY_MANAGE", "REPORT_VIEW"],
    "PRODUCT_OWNER": ["ORG_MANAGE", "PROJECT_CREATE", "PROJECT_VIEW", "TASK_CREATE", "TASK_EDIT", "TASK_CLOSE", "REPORT_VIEW"],
    "BUSINESS_ANALYST": ["PROJECT_VIEW", "TASK_CREATE", "TASK_EDIT", "REPORT_VIEW"],
    "PROJECT_MANAGER": ["PROJECT_CREATE", "PROJECT_VIEW", "TASK_CREATE", "TASK_EDIT", "TASK_CLOSE", "REPORT_VIEW"],
    "ENGINEERING_LEAD": ["PROJECT_VIEW", "TASK_CREATE", "TASK_EDIT", "TASK_CLOSE", "REPORT_VIEW"],
    "DEVELOPER": ["PROJECT_VIEW", "TASK_EDIT", "TASK_CLOSE"],
    "QA_ENGINEER": ["PROJECT_VIEW", "TASK_EDIT", "TASK_CLOSE"],
    "DEVOPS_ENGINEER": ["PROJECT_VIEW", "DEPLOY_MANAGE"],
    "CLIENT": ["PROJECT_VIEW", "REPORT_VIEW"],
}

ROLE_NAMES = {
    "SUPER_ADMIN": "Super Admin",
    "PRODUCT_OWNER": "Product Owner",
    "BUSINESS_ANALYST": "Business Analyst",
    "PROJECT_MANAGER": "Project Manager",
    "ENGINEERING_LEAD": "Engineering Lead",
    "DEVELOPER": "Developer",
    "QA_ENGINEER": "QA Engineer",
    "DEVOPS_ENGINEER": "DevOps Engineer",
    "CLIENT": "Client",
}


def seed_rbac_permissions():
    """
    Seeds permissions, groups, and roles, establishing the baseline matrix.
    """
    seeded_groups = {}
    seeded_permissions = {}

    # 1. Create Groups
    for g_key, g_val in PERMISSION_GROUPS.items():
        grp, _ = PermissionGroup.objects.update_or_create(
            name=g_val["name"],
            defaults={"description": g_val["desc"]}
        )
        seeded_groups[g_key] = grp

    # 2. Create Permissions
    for perm_data in PERMISSIONS_MATRIX:
        grp = seeded_groups[perm_data["group"]]
        perm, _ = Permission.objects.update_or_create(
            code=perm_data["code"],
            defaults={
                "description": perm_data["description"],
                "group": grp
            }
        )
        seeded_permissions[perm.code] = perm

    # 3. Create Roles and link permissions
    for role_code, perm_codes in ROLES_MAPPING.items():
        role, _ = Role.objects.update_or_create(
            code=role_code,
            defaults={"name": ROLE_NAMES[role_code]}
        )
        
        # Link permissions
        role.permissions.set([seeded_permissions[code] for code in perm_codes])
        role.save()
        
    return len(seeded_permissions), len(ROLES_MAPPING)
