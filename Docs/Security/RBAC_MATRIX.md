# Smart-HR: Role-Based Access Control (RBAC) Matrix

Smart-HR uses a strict Role-Based Access Control system to ensure data privacy and security. The system defines multiple roles, each with specific permissions over various modules (Employees, Leaves, Payroll, Recruitment).

## Roles Definition

- **ADMIN**: Super administrator. Has full access to all modules and configurations.
- **RH (HR Manager)**: Human Resources Manager. Can manage employees, approve all leaves, run payroll, and post job offers.
- **MANAGER (Department Manager)**: An employee who manages a specific department. Can approve leaves for their direct reports but cannot view payroll or modify other employees.
- **EMPLOYEE**: A standard employee. Can view their own profile, submit leave requests, view their own payslips, and see tasks assigned to them.
- **CANDIDATE**: An external user applying for a job. Can only view job offers and submit applications.

## Permissions Matrix

| Feature / Module | ADMIN | RH | MANAGER | EMPLOYEE | CANDIDATE |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **User Login** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **View Dashboard** | ✅ | ✅ | ⚠️ (Own dept) | ❌ | ❌ |
| **Manage Users** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **View All Employees** | ✅ | ✅ | ⚠️ (Own dept) | ❌ | ❌ |
| **Create/Edit Employee**| ✅ | ✅ | ❌ | ❌ | ❌ |
| **View Own Profile** | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Submit Leave** | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Approve Leave** | ✅ | ✅ | ⚠️ (Direct reports) | ❌ | ❌ |
| **View All Leaves** | ✅ | ✅ | ⚠️ (Own dept) | ❌ | ❌ |
| **View Own Leaves** | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Generate Payroll** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **View All Payslips** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **View Own Payslips** | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Manage Recruitment** | ✅ | ✅ | ❌ | ❌ | ❌ |
| **View Job Offers** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Submit Application** | ❌ | ❌ | ❌ | ❌ | ✅ |
| **Assign Tasks** | ✅ | ✅ | ✅ | ❌ | ❌ |
| **View Own Tasks** | ✅ | ✅ | ✅ | ✅ | ❌ |
| **View Churn Risk** | ✅ | ✅ | ❌ | ❌ | ❌ |

## Implementation Notes

- **Django Backend**: Permissions are enforced using custom permission classes in `Backend/smart_hr/users/permissions.py` (e.g., `IsAdmin`, `IsRH`, `IsEmployee`, `IsDepartmentManager`). Object-level permissions are used for checking if a user can access a specific employee's data.
- **React Frontend**: The UI conditionally renders links and buttons based on the user's role stored in the Context API state (`authContext`). Note that UI hiding is only for UX; the backend *always* strictly enforces permissions.
