/**
 * Dashboard Logic Module
 * Pulls relational aggregates from database.js and outputs visualizations
 * Updated to support Philippine Peso (₱), leaves approval panel, and attendance clock-in for all roles.
 */

let liveClockInterval = null;

document.addEventListener("DOMContentLoaded", () => {
  // Session protection guard
  const user = Auth.requireAuth();
  if (!user) return;

  // Employee guard redirection
  if (user.role === "employee") {
    window.location.href = "employee-dashboard.html";
    return;
  }

  // Render sidebar user profile preview
  document.getElementById("user-name").textContent = user.name;
  document.getElementById("user-role").textContent = user.role;
  if (user.avatar) {
    document.getElementById("user-avatar").src = user.avatar;
  }

  // Render Stats & Charts
  renderDashboardStats();
});

function renderDashboardStats() {
  const user = DB.getCurrentUser();
  const employees = DB.getEmployees();
  const departments = DB.getDepartments();
  const activities = DB.getActivities();

  // 1. Render numeric aggregates metrics in PHP Peso
  const totalEmployees = employees.length;
  const totalDepts = departments.length;
  const annualPayroll = employees.reduce((sum, e) => sum + (Number(e.salary) || 0), 0);
  const monthlyPayroll = Math.round(annualPayroll / 12);
  const avgSalary = totalEmployees > 0 ? Math.round(annualPayroll / totalEmployees) : 0;

  document.getElementById("stat-total-employees").textContent = totalEmployees;
  document.getElementById("stat-total-depts").textContent = totalDepts;
  document.getElementById("stat-total-payroll").textContent = formatCurrency(monthlyPayroll);
  document.getElementById("stat-avg-salary").textContent = formatCurrency(avgSalary) + "/yr";

  // 2. Render Status Ratios
  let activeCount = 0, leaveCount = 0, suspendedCount = 0;
  employees.forEach(emp => {
    if (emp.status === "Active") activeCount++;
    else if (emp.status === "On Leave") leaveCount++;
    else if (emp.status === "Suspended") suspendedCount++;
  });

  const activePct = totalEmployees > 0 ? Math.round((activeCount / totalEmployees) * 100) : 0;
  const leavePct = totalEmployees > 0 ? Math.round((leaveCount / totalEmployees) * 100) : 0;
  const suspendedPct = totalEmployees > 0 ? Math.round((suspendedCount / totalEmployees) * 100) : 0;

  document.getElementById("status-active-count").textContent = `${activeCount} (${activePct}%)`;
  document.getElementById("status-active-bar").style.width = `${activePct}%`;
  document.getElementById("status-leave-count").textContent = `${leaveCount} (${leavePct}%)`;
  document.getElementById("status-leave-bar").style.width = `${leavePct}%`;
  document.getElementById("status-suspended-count").textContent = `${suspendedCount} (${suspendedPct}%)`;
  document.getElementById("status-suspended-bar").style.width = `${suspendedPct}%`;

  // 3. Render SVG Donut Chart
  renderDepartmentDonutChart(employees, departments);

  // 4. Render Smart Attendance Portal (Clock In/Out + Coworker list checklist)
  renderSmartAttendancePortal(user);

  // 5. Render Leaves Approval Table
  renderLeavesApprovalTable();

  // 6. Render Activities Feed
  renderActivityFeed(activities);
}

// Draw custom SVG Donut segment blocks
function renderDepartmentDonutChart(employees, departments) {
  const sectorsGroup = document.getElementById("donut-sectors");
  const legendContainer = document.getElementById("donut-legend");
  const totalCountEl = document.getElementById("chart-total-count");

  sectorsGroup.innerHTML = "";
  legendContainer.innerHTML = "";
  totalCountEl.textContent = employees.length;

  if (employees.length === 0) {
    sectorsGroup.innerHTML = `<circle cx="21" cy="21" r="15.915" fill="transparent" stroke="var(--input-border)" stroke-width="3"></circle>`;
    legendContainer.innerHTML = `<span class="legend-item"><span class="legend-color" style="background: var(--text-muted)"></span>No Employees registered</span>`;
    return;
  }

  const deptCounts = {};
  departments.forEach(d => {
    deptCounts[d.id] = { name: d.name, count: 0 };
  });

  employees.forEach(e => {
    if (deptCounts[e.departmentId]) {
      deptCounts[e.departmentId].count++;
    }
  });

  const activeSectors = Object.keys(deptCounts)
    .map(key => ({
      id: key,
      name: deptCounts[key].name,
      count: deptCounts[key].count
    }))
    .filter(d => d.count > 0);

  const chartColors = ["#6366f1", "#10b981", "#f59e0b", "#06b6d4", "#ec4899", "#8b5cf6"];
  let accumulatedPercentage = 0;
  
  activeSectors.forEach((sector, idx) => {
    const pct = (sector.count / employees.length) * 100;
    const color = chartColors[idx % chartColors.length];
    const strokeDashArray = `${pct} ${100 - pct}`;
    const strokeDashOffset = 100 - accumulatedPercentage;
    
    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute("cx", "21");
    circle.setAttribute("cy", "21");
    circle.setAttribute("r", "15.915");
    circle.setAttribute("fill", "transparent");
    circle.setAttribute("stroke", color);
    circle.setAttribute("stroke-width", "3.2");
    circle.setAttribute("stroke-dasharray", strokeDashArray);
    circle.setAttribute("stroke-dashoffset", strokeDashOffset.toString());
    
    circle.style.transition = "stroke-width 0.2s ease";
    circle.addEventListener("mouseenter", () => circle.setAttribute("stroke-width", "4.2"));
    circle.addEventListener("mouseleave", () => circle.setAttribute("stroke-width", "3.2"));
    
    sectorsGroup.appendChild(circle);

    const legendItem = document.createElement("span");
    legendItem.className = "legend-item";
    legendItem.innerHTML = `
      <span class="legend-color" style="background: ${color}"></span>
      ${sector.name} (${sector.count})
    `;
    legendContainer.appendChild(legendItem);

    accumulatedPercentage += pct;
  });

  departments.forEach(d => {
    if (!deptCounts[d.id] || deptCounts[d.id].count === 0) {
      const legendItem = document.createElement("span");
      legendItem.className = "legend-item";
      legendItem.style.opacity = "0.5";
      legendItem.innerHTML = `
        <span class="legend-color" style="background: var(--input-border)"></span>
        ${d.name} (0)
      `;
      legendContainer.appendChild(legendItem);
    }
  });
}

// Smart Attendance Portal (Clock widget + Coworkers attendance checklist table logs side-by-side)
function renderSmartAttendancePortal(user) {
  const container = document.getElementById("attendance-portal-body");
  const liveDate = document.getElementById("attendance-live-date");

  // Date updates
  updateLiveDateText(liveDate);
  if (liveClockInterval) clearInterval(liveClockInterval);
  liveClockInterval = setInterval(() => updateLiveDateText(liveDate), 1000);

  const attendanceLogs = DB.getAttendanceToday();
  const employees = DB.getEmployees();

  // Find personal clock details today (using userId or employeeId)
  const clockId = user.employeeId || user.id;
  const personalCheckToday = DB.getAttendanceForEmployeeToday(clockId);

  let checkInTimeStr = "--:--";
  let checkOutTimeStr = "--:--";
  let clockButton = "";

  if (!personalCheckToday) {
    clockButton = `
      <button onclick="handleClockAction('checkin')" class="btn btn-primary" style="padding: 10px 24px; font-size: 0.95rem; border-radius: var(--border-radius-md); width: 100%;">
        <i class="fa-solid fa-play"></i> Clock In
      </button>
    `;
  } else if (personalCheckToday && !personalCheckToday.checkOut) {
    checkInTimeStr = formatTime(personalCheckToday.checkIn);
    clockButton = `
      <button onclick="handleClockAction('checkout')" class="btn btn-danger" style="padding: 10px 24px; font-size: 0.95rem; border-radius: var(--border-radius-md); width: 100%;">
        <i class="fa-solid fa-stop"></i> Clock Out
      </button>
    `;
  } else {
    checkInTimeStr = formatTime(personalCheckToday.checkIn);
    checkOutTimeStr = formatTime(personalCheckToday.checkOut);
    clockButton = `
      <button class="btn btn-secondary" style="padding: 10px 24px; font-size: 0.95rem; border-radius: var(--border-radius-md); width: 100%;" disabled>
        <i class="fa-solid fa-check"></i> Finished
      </button>
    `;
  }

  // Draw logs list checklist table rows
  let tableRows = "";
  employees.forEach(emp => {
    const log = attendanceLogs.find(a => a.employeeId === emp.id);
    let checkInStr = "--:--";
    let checkOutStr = "--:--";
    let badgeMarkup = `<span class="badge" style="background: rgba(255,255,255,0.03); color: var(--text-muted)">ABSENT</span>`;

    if (log) {
      checkInStr = formatTime(log.checkIn);
      checkOutStr = log.checkOut ? formatTime(log.checkOut) : "Active Shift";
      
      let badgeClass = log.status === "Present" ? "badge-active" : "badge-leave";
      badgeMarkup = `<span class="badge ${badgeClass}">${log.status}</span>`;
    }

    tableRows += `
      <tr>
        <td>
          <div class="employee-profile-td" style="gap: 8px;">
            <img src="${emp.avatar}" alt="${emp.name}" style="width: 28px; height: 28px;" onerror="this.src='https://api.dicebear.com/7.x/avataaars/svg?seed=placeholder'">
            <div class="employee-info-meta">
              <span class="employee-name-td" style="font-size: 0.85rem;">${escapeHTML(emp.name)}</span>
              <span class="employee-email-td" style="font-size: 0.7rem;">${emp.employeeId}</span>
            </div>
          </div>
        </td>
        <td style="font-family: monospace; font-size: 0.8rem;">${checkInStr}</td>
        <td style="font-family: monospace; font-size: 0.8rem;">${checkOutStr}</td>
        <td>${badgeMarkup}</td>
      </tr>
    `;
  });

  if (employees.length === 0) {
    tableRows = `<tr><td colspan="4" style="text-align: center; color: var(--text-muted); padding: 20px;">No employees registered.</td></tr>`;
  }

  container.innerHTML = `
    <div style="display: grid; grid-template-columns: 1fr 2fr; gap: 24px; min-height: 250px;">
      <!-- Left side: Personal clock Widget -->
      <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px; background: rgba(255,255,255,0.02); border: 1px solid var(--panel-border); border-radius: var(--border-radius-md); padding: 20px;">
        <span style="font-size: 0.8rem; text-transform: uppercase; color: var(--text-muted); font-weight: 600;">Personal Console</span>
        <div style="font-size: 1.8rem; font-weight: 700; color: var(--text-primary); font-family: monospace;" id="live-portal-clock">00:00:00 AM</div>
        
        <div style="width: 100%;">
          ${clockButton}
        </div>
        
        <div style="display: flex; width: 100%; justify-content: space-between; font-size: 0.8rem; border-top: 1px solid var(--panel-border); padding-top: 12px; margin-top: 4px; color: var(--text-secondary);">
          <span>In: <strong style="font-family: monospace;">${checkInTimeStr}</strong></span>
          <span>Out: <strong style="font-family: monospace;">${checkOutTimeStr}</strong></span>
        </div>
      </div>

      <!-- Right side: Staff Checklists Table -->
      <div class="table-container" style="margin-bottom: 0; max-height: 260px; overflow-y: auto; border-radius: var(--border-radius-md);">
        <table class="ems-table" style="font-size: 0.85rem;">
          <thead>
            <tr>
              <th>Employee</th>
              <th>Check In</th>
              <th>Check Out</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
      </div>
    </div>
  `;

  tickLiveClock();
}

function updateLiveDateText(el) {
  const d = new Date();
  el.textContent = d.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

function tickLiveClock() {
  const clockEl = document.getElementById("live-portal-clock");
  if (clockEl) {
    const tick = () => {
      const d = new Date();
      clockEl.textContent = d.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      });
    };
    tick();
    setInterval(tick, 1000);
  }
}

function handleClockAction(action) {
  const user = DB.getCurrentUser();
  const clockId = user.employeeId || user.id;
  
  try {
    if (action === "checkin") {
      DB.logAttendanceCheckIn(clockId, user.name);
      Auth.showToast("Logged Check-In entry successfully.", "success");
    } else {
      DB.logAttendanceCheckOut(clockId);
      Auth.showToast("Logged Check-Out entry successfully.", "success");
    }
    renderDashboardStats();
  } catch (err) {
    Auth.showToast(err.message, "error");
  }
}

// ---------------- LEAVE REQUESTS APPROVAL PANEL ----------------
function renderLeavesApprovalTable() {
  const leaves = DB.getLeaves();
  const pendingLeaves = leaves.filter(l => l.status === "Pending");
  const tbody = document.getElementById("leaves-approval-body");
  tbody.innerHTML = "";

  if (pendingLeaves.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="4" style="text-align: center; color: var(--text-muted); padding: 40px 0;">
          <i class="fa-solid fa-envelope-open" style="font-size: 2rem; margin-bottom: 8px; opacity: 0.4; display: block;"></i>
          No pending leave applications.
        </td>
      </tr>
    `;
    return;
  }

  pendingLeaves.forEach(l => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td style="font-weight: 600;">${escapeHTML(l.employeeName)}</td>
      <td>${escapeHTML(l.type)}</td>
      <td style="font-family: monospace; font-size: 0.8rem;" title="Reason: ${escapeHTML(l.reason)}">
        ${formatShortDate(l.startDate)} - ${formatShortDate(l.endDate)}
      </td>
      <td>
        <div class="actions-td">
          <button onclick="changeLeaveState('${l.id}', 'Approved')" class="action-btn action-btn-view" style="color: var(--success);" title="Approve Request">
            <i class="fa-solid fa-check"></i>
          </button>
          <button onclick="changeLeaveState('${l.id}', 'Rejected')" class="action-btn action-btn-delete" style="color: var(--danger);" title="Reject Request">
            <i class="fa-solid fa-xmark"></i>
          </button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function changeLeaveState(leaveId, state) {
  DB.updateLeaveStatus(leaveId, state);
  Auth.showToast(`Leave application status updated to: ${state}`, "success");
  renderDashboardStats();
}

// ---------------- ACTIVITY FEEDS ----------------
function renderActivityFeed(activities) {
  const container = document.getElementById("activity-feed");
  container.innerHTML = "";

  if (activities.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; color: var(--text-muted); padding: 40px 0;">
        <i class="fa-solid fa-list-check" style="font-size: 2rem; margin-bottom: 12px; opacity: 0.5;"></i>
        <p>No activity recorded yet.</p>
      </div>
    `;
    return;
  }

  activities.forEach(act => {
    const item = document.createElement("div");
    item.className = "activity-item";
    
    let iconClass = "fa-info";
    if (act.action.toLowerCase().includes("added") || act.action.toLowerCase().includes("registered")) {
      iconClass = "fa-plus";
    } else if (act.action.toLowerCase().includes("deleted") || act.action.toLowerCase().includes("removed")) {
      iconClass = "fa-trash-can";
    } else if (act.action.toLowerCase().includes("updated") || act.action.toLowerCase().includes("changed")) {
      iconClass = "fa-pen-to-square";
    } else if (act.action.toLowerCase().includes("checked in") || act.action.toLowerCase().includes("clocked")) {
      iconClass = "fa-clock";
    } else if (act.action.toLowerCase().includes("leave")) {
      iconClass = "fa-calendar-minus";
    }

    item.innerHTML = `
      <div class="activity-avatar">
        <i class="fa-solid ${iconClass}"></i>
      </div>
      <div class="activity-details">
        <p class="activity-text">
          <strong>${escapeHTML(act.userName)}</strong> ${escapeHTML(act.action)}
        </p>
        <span class="activity-time">${formatTimeAgo(act.timestamp)}</span>
      </div>
    `;
    container.appendChild(item);
  });
}

function clearActivityLogs() {
  window.showConfirmDialog(
    "Clear Audit Logs",
    "Are you sure you want to clear all system activity logs? This cannot be undone.",
    () => {
      const currUser = DB.getCurrentUser();
      DB._write(DB.KEYS.ACTIVITIES, []);
      DB.logActivity(currUser?.id, currUser?.name, "Cleared the system activity audit log");
      Auth.showToast("Activity logs cleared successfully.", "success");
      
      renderDashboardStats();
    }
  );
}

// ---------------- HELPERS ----------------

function formatCurrency(amount) {
  // Convert currency to Philippine Peso (PHP, ₱)
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    maximumFractionDigits: 0
  }).format(amount);
}

function formatTime(timestampString) {
  if (!timestampString) return "--:--";
  const date = new Date(timestampString);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
}

function formatShortDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function escapeHTML(str) {
  if (!str) return '';
  return str.replace(/[&<>'"]/g, 
    tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag)
  );
}

function escapeJS(str) {
  if (!str) return "";
  return str.replace(/'/g, "\\'");
}

function formatTimeAgo(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  
  if (isNaN(diffMs)) return "some time ago";
  
  const diffSecs = Math.round(diffMs / 1000);
  const diffMins = Math.round(diffSecs / 60);
  const diffHrs = Math.round(diffMins / 60);
  const diffDays = Math.round(diffHrs / 24);

  if (diffSecs < 60) return "Just now";
  if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? 's' : ''} ago`;
  if (diffHrs < 24) return `${diffHrs} hour${diffHrs > 1 ? 's' : ''} ago`;
  return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
}
