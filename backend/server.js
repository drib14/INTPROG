const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

dotenv.config();

const app = express();

app.use(cors()); // Allow all for now
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || "supersecretkey";

// In-memory data store
const db = {
  accounts: [
    {
      firstName: "System",
      lastName: "Admin",
      email: "admin@example.com",
      password: "$2b$10$bhX9rh9UvvuxeU5MaM.G.eZ2Raju9jxLV8AOOrf1jmG08iybE1Yvm",
      role: "admin",
      verified: true,
    },
    {
      firstName: "Jane",
      lastName: "Doe",
      email: "employee@example.com",
      password: "$2b$10$bhX9rh9UvvuxeU5MaM.G.eZ2Raju9jxLV8AOOrf1jmG08iybE1Yvm",
      role: "user",
      verified: true,
    },
  ],
  departments: [
    {
      id: 1,
      name: "Engineering",
      description: "Software development and deployment operations",
    },
    {
      id: 2,
      name: "HR",
      description:
        "Human Resource acquisition and employee benefits administration",
    },
    {
      id: 3,
      name: "Finance",
      description: "Accounting, payroll, and asset management",
    },
  ],
  employees: [],
  requests: [],
};

// --- Middleware ---
const authenticateJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader) {
    const token = authHeader.split(" ")[1];
    jwt.verify(token, JWT_SECRET, (err, user) => {
      if (err) return res.sendStatus(403);
      req.user = user;
      next();
    });
  } else {
    res.sendStatus(401);
  }
};

const requireAdmin = (req, res, next) => {
  if (req.user && req.user.role === "admin") {
    next();
  } else {
    res.status(403).json({ message: "Admin privileges required" });
  }
};

// --- Authentication Endpoints ---

app.post("/api/register", async (req, res) => {
  const { firstName, lastName, email, password } = req.body;
  if (!email || !password) return res.status(400).json({ message: "Email and password required" });

  if (db.accounts.find(a => a.email === email)) {
    return res.status(400).json({ message: "Email already registered" });
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  db.accounts.push({
    firstName,
    lastName,
    email,
    password: hashedPassword,
    role: "user",
    verified: false,
  });

  res.status(201).json({ message: "Registered successfully" });
});

app.post("/api/verify", (req, res) => {
  const { email } = req.body;
  const acc = db.accounts.find(a => a.email === email);
  if (acc) {
    acc.verified = true;
    res.json({ message: "Verified successfully" });
  } else {
    res.status(404).json({ message: "Account not found" });
  }
});

app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;
  const acc = db.accounts.find(a => a.email === email);

  if (!acc) {
    return res.status(401).json({ message: "Incorrect email or password." });
  }

  const isValidPassword = await bcrypt.compare(password, acc.password);

  if (!isValidPassword) {
    return res.status(401).json({ message: "Incorrect email or password." });
  }

  if (!acc.verified) {
    return res.status(403).json({ unverified: true, message: "Email address is not verified." });
  }

  const token = jwt.sign({ email: acc.email, role: acc.role, firstName: acc.firstName, lastName: acc.lastName }, JWT_SECRET);
  res.json({ token, user: { email: acc.email, role: acc.role, firstName: acc.firstName, lastName: acc.lastName } });
});

app.get("/api/me", authenticateJWT, (req, res) => {
  const acc = db.accounts.find(a => a.email === req.user.email);
  if (acc) {
    const { password, ...userWithoutPassword } = acc;
    res.json(userWithoutPassword);
  } else {
    res.status(404).json({ message: "User not found" });
  }
});

app.put("/api/profile", authenticateJWT, (req, res) => {
  const { firstName, lastName } = req.body;
  const acc = db.accounts.find(a => a.email === req.user.email);
  if (acc) {
    acc.firstName = firstName;
    acc.lastName = lastName;
    res.json({ message: "Profile updated" });
  } else {
    res.status(404).json({ message: "User not found" });
  }
});

app.post("/api/reset-password", async (req, res) => {
  const { email, password } = req.body;
  const acc = db.accounts.find(a => a.email === email);
  if (acc) {
    const hashedPassword = await bcrypt.hash(password, 10);
    acc.password = hashedPassword;
    res.json({ message: "Password reset successfully" });
  } else {
    res.status(404).json({ message: "Account not found" });
  }
});


// --- Accounts Endpoints ---

app.get("/api/accounts", authenticateJWT, requireAdmin, (req, res) => {
  const safeAccounts = db.accounts.map(a => {
    const { password, ...rest } = a;
    return rest;
  });
  res.json(safeAccounts);
});

app.post("/api/accounts", authenticateJWT, requireAdmin, async (req, res) => {
  const { firstName, lastName, email, password, role, verified } = req.body;
  if (db.accounts.find(a => a.email === email)) {
    return res.status(400).json({ message: "Email already registered" });
  }
  const hashedPassword = await bcrypt.hash(password, 10);
  db.accounts.push({ firstName, lastName, email, password: hashedPassword, role, verified });
  res.status(201).json({ message: "Account created" });
});

app.put("/api/accounts/:email", authenticateJWT, requireAdmin, (req, res) => {
  const { firstName, lastName, role, verified } = req.body;
  const acc = db.accounts.find(a => a.email === req.params.email);
  if (acc) {
    acc.firstName = firstName;
    acc.lastName = lastName;
    acc.role = role;
    acc.verified = verified;
    res.json({ message: "Account updated" });
  } else {
    res.status(404).json({ message: "Account not found" });
  }
});

app.delete("/api/accounts/:email", authenticateJWT, requireAdmin, (req, res) => {
  db.accounts = db.accounts.filter(a => a.email !== req.params.email);
  db.employees = db.employees.filter(e => e.email !== req.params.email);
  res.json({ message: "Account deleted" });
});

// --- Departments Endpoints ---

app.get("/api/departments", authenticateJWT, requireAdmin, (req, res) => {
  res.json(db.departments);
});

app.post("/api/departments", authenticateJWT, requireAdmin, (req, res) => {
  const { name, description } = req.body;
  const maxId = db.departments.reduce((max, d) => (d.id > max ? d.id : max), 0);
  const newDept = { id: maxId + 1, name, description };
  db.departments.push(newDept);
  res.status(201).json(newDept);
});

app.put("/api/departments/:id", authenticateJWT, requireAdmin, (req, res) => {
  const id = parseInt(req.params.id);
  const { name, description } = req.body;
  const dept = db.departments.find(d => d.id === id);
  if (dept) {
    dept.name = name;
    dept.description = description;
    res.json(dept);
  } else {
    res.status(404).json({ message: "Department not found" });
  }
});

app.delete("/api/departments/:id", authenticateJWT, requireAdmin, (req, res) => {
  const id = parseInt(req.params.id);
  db.departments = db.departments.filter(d => d.id !== id);
  res.json({ message: "Department deleted" });
});


// --- Employees Endpoints ---

app.get("/api/employees", authenticateJWT, requireAdmin, (req, res) => {
  res.json(db.employees);
});

app.post("/api/employees", authenticateJWT, requireAdmin, (req, res) => {
  const { empId, email, firstName, lastName, position, department, hireDate } = req.body;

  if (!db.accounts.find(a => a.email === email)) {
      return res.status(400).json({ message: "The email address must belong to a registered account." });
  }

  if (db.employees.find(e => e.email === email)) {
      return res.status(400).json({ message: "User account already linked to another employee" });
  }

  const newEmp = { empId, email, firstName, lastName, position, department, hireDate };
  db.employees.push(newEmp);
  res.status(201).json(newEmp);
});

app.put("/api/employees/:empId", authenticateJWT, requireAdmin, (req, res) => {
  const empId = req.params.empId;
  const { firstName, lastName, position, department, hireDate } = req.body;
  const emp = db.employees.find(e => e.empId === empId);
  if (emp) {
    emp.firstName = firstName;
    emp.lastName = lastName;
    emp.position = position;
    emp.department = department;
    emp.hireDate = hireDate;
    res.json(emp);
  } else {
    res.status(404).json({ message: "Employee not found" });
  }
});

app.delete("/api/employees/:empId", authenticateJWT, requireAdmin, (req, res) => {
  const empId = req.params.empId;
  db.employees = db.employees.filter(e => e.empId !== empId);
  res.json({ message: "Employee deleted" });
});


// --- Requests Endpoints ---

app.get("/api/requests", authenticateJWT, (req, res) => {
  if (req.user.role === "admin") {
    res.json(db.requests);
  } else {
    const userReqs = db.requests.filter(r => r.employeeEmail === req.user.email);
    res.json(userReqs);
  }
});

app.post("/api/requests", authenticateJWT, (req, res) => {
  const { type, items, status, date } = req.body;
  const newReq = {
    id: Date.now(),
    type,
    items,
    status: status || "Pending",
    date,
    employeeEmail: req.user.email,
  };
  db.requests.push(newReq);
  res.status(201).json(newReq);
});

app.put("/api/requests/:id/status", authenticateJWT, requireAdmin, (req, res) => {
  const id = parseInt(req.params.id);
  const { status } = req.body;
  const reqItem = db.requests.find(r => r.id === id);
  if (reqItem) {
    reqItem.status = status;
    res.json(reqItem);
  } else {
    res.status(404).json({ message: "Request not found" });
  }
});

app.delete("/api/requests/:id", authenticateJWT, (req, res) => {
  const id = parseInt(req.params.id);
  const reqItem = db.requests.find(r => r.id === id);
  if (!reqItem) return res.status(404).json({ message: "Request not found" });

  if (req.user.role !== "admin" && reqItem.employeeEmail !== req.user.email) {
      return res.status(403).json({ message: "Forbidden" });
  }

  db.requests = db.requests.filter(r => r.id !== id);
  res.json({ message: "Request deleted" });
});


// Stats endpoint for Dashboard
app.get("/api/stats", authenticateJWT, (req, res) => {
  if (req.user.role === "admin") {
      res.json({
          accountsCount: db.accounts.length,
          deptsCount: db.departments.length,
          empsCount: db.employees.length,
          pendingReqsCount: db.requests.filter(r => r.status === "Pending").length
      });
  } else {
      const userReqs = db.requests.filter(r => r.employeeEmail === req.user.email);
      res.json({
          totalRequests: userReqs.length,
          pendingCount: userReqs.filter(r => r.status === "Pending").length,
          approvedCount: userReqs.filter(r => r.status === "Approved").length
      });
  }
});


const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
