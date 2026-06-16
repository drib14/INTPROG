/**
 * Database Layer for Employee Management System (EMS)
 * Operates purely on LocalStorage to simulate a real relational database.
 * Updated to support PHP, smart attendance, leaves management, and purely numeric Employee ID numbers.
 */

const DB_PREFIX = "ems_";

const DB = {
  // Core localStorage keys
  KEYS: {
    USERS: `${DB_PREFIX}users`,
    EMPLOYEES: `${DB_PREFIX}employees`,
    DEPARTMENTS: `${DB_PREFIX}departments`,
    ACTIVITIES: `${DB_PREFIX}activities`,
    CURRENT_USER: `${DB_PREFIX}current_user`,
    ATTENDANCE: `${DB_PREFIX}attendance`,
    LEAVES: `${DB_PREFIX}leaves`
  },

  // Initialize and Seed Database if empty
  init() {
    // Self-cleaning migration for old alphanumeric EMP- formats to ensure pure numeric format
    const currentEmployees = localStorage.getItem(this.KEYS.EMPLOYEES);
    if (currentEmployees && currentEmployees.includes("EMP-")) {
      localStorage.removeItem(this.KEYS.USERS);
      localStorage.removeItem(this.KEYS.EMPLOYEES);
      localStorage.removeItem(this.KEYS.ATTENDANCE);
      localStorage.removeItem(this.KEYS.LEAVES);
      localStorage.removeItem(this.KEYS.ACTIVITIES);
      localStorage.removeItem(this.KEYS.CURRENT_USER);
    }

    if (!localStorage.getItem(this.KEYS.USERS)) {
      const initialUsers = [
        {
          id: "usr_1",
          name: "Admin System",
          email: "admin@company.com",
          password: "admin123", // Simplified plain-text for template mock purposes
          role: "admin",
          avatar: "https://api.dicebear.com/7.x/adventurer/svg?seed=admin"
        },
        {
          id: "usr_2",
          name: "HR Manager",
          email: "hr@company.com",
          password: "hrpassword",
          role: "manager",
          avatar: "https://api.dicebear.com/7.x/adventurer/svg?seed=manager"
        },
        {
          id: "usr_3",
          name: "John Doe",
          email: "john@company.com",
          password: "johnpassword",
          role: "employee",
          employeeId: "emp_1", // Linked directly to employee profile emp_1
          avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=John"
        }
      ];
      localStorage.setItem(this.KEYS.USERS, JSON.stringify(initialUsers));
    }

    if (!localStorage.getItem(this.KEYS.DEPARTMENTS)) {
      const initialDepts = [
        { id: "dept_1", name: "Engineering", code: "ENG", manager: "Sarah Jenkins", description: "Design, build and maintain enterprise products and infrastructure." },
        { id: "dept_2", name: "Human Resources", code: "HR", manager: "Michael Chang", description: "Talent acquisition, employee relations, and professional development." },
        { id: "dept_3", name: "Sales & Accounts", code: "SAL", manager: "David Miller", description: "Driving revenue growth and managing client partnerships." },
        { id: "dept_4", name: "Marketing", code: "MKT", manager: "Elena Rostova", description: "Brand development, campaigns, public relations and user growth." }
      ];
      localStorage.setItem(this.KEYS.DEPARTMENTS, JSON.stringify(initialDepts));
    }

    if (!localStorage.getItem(this.KEYS.EMPLOYEES)) {
      const initialEmployees = [
        {
          id: "emp_1",
          employeeId: "20230001", // Pure numeric IDs
          name: "John Doe",
          email: "john.doe@company.com",
          phone: "+63 (917) 123-4567",
          role: "Lead Systems Engineer",
          departmentId: "dept_1",
          status: "Active",
          salary: 1150000, // Stored in PHP pesos annually (e.g. ₱1,150,000)
          joinDate: "2023-04-12",
          age: 28,
          gender: "Male",
          address: "123 Dev Lane, Ortigas, Pasig City",
          avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=John"
        },
        {
          id: "emp_2",
          employeeId: "20230002",
          name: "Jane Smith",
          email: "jane.smith@company.com",
          phone: "+63 (918) 234-5678",
          role: "Senior Product Marketing Manager",
          departmentId: "dept_4",
          status: "Active",
          salary: 920000,
          joinDate: "2023-08-19",
          age: 32,
          gender: "Female",
          address: "456 Market St, Eastwood, Quezon City",
          avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Jane"
        },
        {
          id: "emp_3",
          employeeId: "20240001",
          name: "Robert Johnson",
          email: "robert.johnson@company.com",
          phone: "+63 (919) 345-6789",
          role: "Frontend Specialist",
          departmentId: "dept_1",
          status: "On Leave",
          salary: 850000,
          joinDate: "2024-01-10",
          age: 25,
          gender: "Male",
          address: "789 Front Dr, IT Park, Cebu City",
          avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Robert"
        },
        {
          id: "emp_4",
          employeeId: "20220001",
          name: "Emily Davis",
          email: "emily.davis@company.com",
          phone: "+63 (906) 456-7890",
          role: "HR Specialist",
          departmentId: "dept_2",
          status: "Active",
          salary: 680000,
          joinDate: "2022-11-01",
          age: 29,
          gender: "Female",
          address: "321 HR Rd, Lanang, Davao City",
          avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Emily"
        },
        {
          id: "emp_5",
          employeeId: "20240002",
          name: "William Wilson",
          email: "william.wilson@company.com",
          phone: "+63 (922) 567-8901",
          role: "Enterprise Sales Lead",
          departmentId: "dept_3",
          status: "Suspended",
          salary: 1050000,
          joinDate: "2024-03-22",
          age: 35,
          gender: "Male",
          address: "654 Sales Ave, Legaspi Village, Makati City",
          avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=William"
        }
      ];
      localStorage.setItem(this.KEYS.EMPLOYEES, JSON.stringify(initialEmployees));
    }

    if (!localStorage.getItem(this.KEYS.ACTIVITIES)) {
      const initialActivities = [
        {
          id: "act_1",
          timestamp: new Date(Date.now() - 3600000 * 24 * 3).toISOString(), // 3 days ago
          userId: "usr_1",
          userName: "Admin System",
          action: "Database initialized and seeded successfully with PHP details"
        },
        {
          id: "act_2",
          timestamp: new Date(Date.now() - 3600000 * 2).toISOString(), // 2 hrs ago
          userId: "usr_1",
          userName: "Admin System",
          action: "Engineering Department record manager assigned"
        }
      ];
      localStorage.setItem(this.KEYS.ACTIVITIES, JSON.stringify(initialActivities));
    }

    if (!localStorage.getItem(this.KEYS.ATTENDANCE)) {
      const today = new Date().toISOString().split("T")[0];
      const yesterday = new Date(Date.now() - 3600000 * 24).toISOString().split("T")[0];

      const initialAttendance = [
        {
          id: "att_1",
          employeeId: "emp_1",
          employeeName: "John Doe",
          date: yesterday,
          checkIn: `${yesterday}T08:45:00.000Z`,
          checkOut: `${yesterday}T17:02:00.000Z`,
          status: "Present"
        },
        {
          id: "att_2",
          employeeId: "emp_2",
          employeeName: "Jane Smith",
          date: yesterday,
          checkIn: `${yesterday}T09:15:00.000Z`,
          checkOut: `${yesterday}T17:30:00.000Z`,
          status: "Late"
        },
        {
          id: "att_3",
          employeeId: "emp_4",
          employeeName: "Emily Davis",
          date: yesterday,
          checkIn: `${yesterday}T08:52:00.000Z`,
          checkOut: `${yesterday}T17:00:00.000Z`,
          status: "Present"
        }
      ];
      localStorage.setItem(this.KEYS.ATTENDANCE, JSON.stringify(initialAttendance));
    }

    if (!localStorage.getItem(this.KEYS.LEAVES)) {
      const yesterday = new Date(Date.now() - 3600000 * 24).toISOString().split("T")[0];
      const futureDate = new Date(Date.now() + 3600000 * 24 * 5).toISOString().split("T")[0];
      const futureEndDate = new Date(Date.now() + 3600000 * 24 * 7).toISOString().split("T")[0];
      
      const initialLeaves = [
        {
          id: "lv_1",
          employeeId: "emp_1",
          employeeName: "John Doe",
          type: "Sick Leave",
          startDate: yesterday,
          endDate: yesterday,
          reason: "Mild fever and flu recovery",
          status: "Approved"
        },
        {
          id: "lv_2",
          employeeId: "emp_3",
          employeeName: "Robert Johnson",
          type: "Vacation Leave",
          startDate: futureDate,
          endDate: futureEndDate,
          reason: "Family trip out of town",
          status: "Pending"
        }
      ];
      localStorage.setItem(this.KEYS.LEAVES, JSON.stringify(initialLeaves));
    }
  },

  // Helper reader / writers
  _read(key) {
    return JSON.parse(localStorage.getItem(key)) || [];
  },

  _write(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
  },

  // ================= USERS & SESSIONS =================
  getUsers() {
    return this._read(this.KEYS.USERS);
  },

  createUser(user) {
    const users = this.getUsers();
    user.id = `usr_${Date.now()}`;
    user.avatar = `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(user.name)}`;
    
    // Safety link during self-registration
    if (user.role === "employee" && !user.employeeId) {
      const emp = this.createEmployee({
        name: user.name,
        email: user.email,
        phone: "",
        role: "Team Associate",
        departmentId: "dept_1",
        status: "Active",
        salary: 300000,
        joinDate: new Date().toISOString().split("T")[0],
        age: 21,
        gender: "Male",
        address: "N/A"
      }, user.password);
      user.employeeId = emp.id;
      return user;
    }

    users.push(user);
    this._write(this.KEYS.USERS, users);
    this.logActivity(user.id, user.name, "Created user credentials card");
    return user;
  },

  getCurrentUser() {
    return JSON.parse(localStorage.getItem(this.KEYS.CURRENT_USER)) || null;
  },

  setCurrentUser(user) {
    localStorage.setItem(this.KEYS.CURRENT_USER, JSON.stringify(user));
  },

  clearCurrentUser() {
    localStorage.removeItem(this.KEYS.CURRENT_USER);
  },

  // ================= EMPLOYEES CRUD =================
  getEmployees() {
    return this._read(this.KEYS.EMPLOYEES);
  },

  getEmployeeById(id) {
    return this.getEmployees().find(emp => emp.id === id);
  },

  // Expanded to synchronously create user logins
  createEmployee(employee, password) {
    const employees = this.getEmployees();
    employee.id = `emp_${Date.now()}`;
    
    // Auto-generate employeeId in purely numeric formatting (e.g. 20260006)
    if (!employee.employeeId) {
      const year = new Date().getFullYear();
      const count = employees.length + 1;
      employee.employeeId = `${year}${String(count).padStart(4, "0")}`;
    }

    if (!employee.avatar) {
      employee.avatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(employee.name)}`;
    }
    
    employees.push(employee);
    this._write(this.KEYS.EMPLOYEES, employees);
    
    // Synchronously create user login profile in local storage
    if (password) {
      const users = this.getUsers();
      const newUser = {
        id: `usr_${Date.now()}`,
        name: employee.name,
        email: employee.email.toLowerCase(),
        password: password,
        role: "employee", // Defaults to employee role login
        employeeId: employee.id,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(employee.name)}`
      };
      users.push(newUser);
      this._write(this.KEYS.USERS, users);
    }

    const currUser = this.getCurrentUser();
    this.logActivity(currUser?.id, currUser?.name, `Created employee: ${employee.name} (${employee.employeeId}) & synced user account`);
    return employee;
  },

  updateEmployee(id, updatedData) {
    const employees = this.getEmployees();
    const index = employees.findIndex(emp => emp.id === id);
    if (index !== -1) {
      const oldEmail = employees[index].email;
      const oldName = employees[index].name;

      employees[index] = { ...employees[index], ...updatedData };
      this._write(this.KEYS.EMPLOYEES, employees);
      
      // Update matching user details relational sync
      const users = this.getUsers();
      const userIndex = users.findIndex(u => u.employeeId === id);
      if (userIndex !== -1) {
        users[userIndex].name = employees[index].name;
        users[userIndex].email = employees[index].email.toLowerCase();
        this._write(this.KEYS.USERS, users);
      }

      const currUser = this.getCurrentUser();
      this.logActivity(currUser?.id, currUser?.name, `Updated details for employee: ${employees[index].name}`);
      return employees[index];
    }
    return null;
  },

  deleteEmployee(id) {
    const employees = this.getEmployees();
    const emp = employees.find(e => e.id === id);
    if (emp) {
      const filtered = employees.filter(e => e.id !== id);
      this._write(this.KEYS.EMPLOYEES, filtered);
      
      // Relational delete matching user credentials card
      const users = this.getUsers();
      const filteredUsers = users.filter(u => u.employeeId !== id);
      this._write(this.KEYS.USERS, filteredUsers);

      const currUser = this.getCurrentUser();
      this.logActivity(currUser?.id, currUser?.name, `Deleted employee profile: ${emp.name} & deleted user credentials`);
      return true;
    }
    return false;
  },

  // ================= DEPARTMENTS CRUD =================
  getDepartments() {
    return this._read(this.KEYS.DEPARTMENTS);
  },

  getDepartmentById(id) {
    return this.getDepartments().find(dept => dept.id === id);
  },

  createDepartment(dept) {
    const depts = this.getDepartments();
    dept.id = `dept_${Date.now()}`;
    depts.push(dept);
    this._write(this.KEYS.DEPARTMENTS, depts);
    
    const currUser = this.getCurrentUser();
    this.logActivity(currUser?.id, currUser?.name, `Created department: ${dept.name}`);
    return dept;
  },

  updateDepartment(id, updatedData) {
    const depts = this.getDepartments();
    const index = depts.findIndex(dept => dept.id === id);
    if (index !== -1) {
      depts[index] = { ...depts[index], ...updatedData };
      this._write(this.KEYS.DEPARTMENTS, depts);
      
      const currUser = this.getCurrentUser();
      this.logActivity(currUser?.id, currUser?.name, `Updated department details: ${depts[index].name}`);
      return depts[index];
    }
    return null;
  },

  deleteDepartment(id) {
    const depts = this.getDepartments();
    const dept = depts.find(d => d.id === id);
    if (dept) {
      const employees = this.getEmployees();
      const hasEmployees = employees.some(emp => emp.departmentId === id);
      if (hasEmployees) {
        throw new Error("Cannot delete department because it contains active employees. Reassign them first.");
      }

      const filtered = depts.filter(d => d.id !== id);
      this._write(this.KEYS.DEPARTMENTS, filtered);
      
      const currUser = this.getCurrentUser();
      this.logActivity(currUser?.id, currUser?.name, `Removed department: ${dept.name}`);
      return true;
    }
    return false;
  },

  // ================= SMART ATTENDANCE =================
  getAttendance() {
    return this._read(this.KEYS.ATTENDANCE);
  },

  getAttendanceToday() {
    const today = new Date().toISOString().split("T")[0];
    return this.getAttendance().filter(a => a.date === today);
  },

  getAttendanceForEmployeeToday(employeeId) {
    const today = new Date().toISOString().split("T")[0];
    return this.getAttendance().find(a => a.employeeId === employeeId && a.date === today);
  },

  logAttendanceCheckIn(employeeId, employeeName) {
    const attendance = this.getAttendance();
    const today = new Date().toISOString().split("T")[0];
    
    const existing = attendance.find(a => a.employeeId === employeeId && a.date === today);
    if (existing) {
      throw new Error("Already checked in today.");
    }

    const checkInTime = new Date();
    const cutoff = new Date();
    cutoff.setHours(9, 0, 0, 0); // 9:00 AM clock cutoff
    
    const status = checkInTime > cutoff ? "Late" : "Present";

    const newLog = {
      id: `att_${Date.now()}`,
      employeeId,
      employeeName,
      date: today,
      checkIn: checkInTime.toISOString(),
      checkOut: null,
      status
    };

    attendance.push(newLog);
    this._write(this.KEYS.ATTENDANCE, attendance);
    this.logActivity(employeeId, employeeName, `Checked in at ${checkInTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} (Status: ${status})`);
    return newLog;
  },

  logAttendanceCheckOut(employeeId) {
    const attendance = this.getAttendance();
    const today = new Date().toISOString().split("T")[0];
    const index = attendance.findIndex(a => a.employeeId === employeeId && a.date === today);

    if (index === -1) {
      throw new Error("No check-in record found for today.");
    }

    if (attendance[index].checkOut) {
      throw new Error("Already checked out today.");
    }

    const checkOutTime = new Date();
    attendance[index].checkOut = checkOutTime.toISOString();

    this._write(this.KEYS.ATTENDANCE, attendance);
    this.logActivity(employeeId, attendance[index].employeeName, `Checked out at ${checkOutTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`);
    return attendance[index];
  },

  // ================= LEAVE MANAGEMENT =================
  getLeaves() {
    return this._read(this.KEYS.LEAVES);
  },

  getLeavesForEmployee(employeeId) {
    return this.getLeaves().filter(l => l.employeeId === employeeId);
  },

  applyLeave(leave) {
    const leaves = this.getLeaves();
    leave.id = `lv_${Date.now()}`;
    leave.status = "Pending"; // Always pending initially
    
    leaves.push(leave);
    this._write(this.KEYS.LEAVES, leaves);
    
    this.logActivity(leave.employeeId, leave.employeeName, `Applied for ${leave.type} from ${leave.startDate} to ${leave.endDate}`);
    return leave;
  },

  updateLeaveStatus(leaveId, status) {
    const leaves = this.getLeaves();
    const index = leaves.findIndex(l => l.id === leaveId);
    if (index !== -1) {
      leaves[index].status = status;
      this._write(this.KEYS.LEAVES, leaves);
      
      const currUser = this.getCurrentUser();
      this.logActivity(currUser?.id, currUser?.name, `Set leave status of ${leaves[index].employeeName} to ${status}`);
      return leaves[index];
    }
    return null;
  },

  // ================= ACTIVITY AUDITING =================
  getActivities() {
    const activities = this._read(this.KEYS.ACTIVITIES);
    return activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  },

  logActivity(userId, userName, action) {
    const activities = this._read(this.KEYS.ACTIVITIES);
    const activity = {
      id: `act_${Date.now()}`,
      timestamp: new Date().toISOString(),
      userId: userId || "system",
      userName: userName || "System Event",
      action: action
    };
    activities.push(activity);
    
    const trimmed = activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 50);
    this._write(this.KEYS.ACTIVITIES, trimmed);
  }
};

// Initialize DB immediately upon scripts inclusion
DB.init();
