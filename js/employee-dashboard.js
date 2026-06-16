/**
 * Employee Dashboard Controller
 * Handles personal clocking portal, live clock ticks, colleague cards directory, and personal leave applications.
 */

let liveClockInterval = null;

document.addEventListener("DOMContentLoaded", () => {
  // Session protection & role check
  const user = Auth.requireAuth();
  if (!user) return;

  if (user.role !== "employee") {
    window.location.href = "dashboard.html";
    return;
  }

  // Render sidebar user profile preview
  document.getElementById("user-name").textContent = user.name;
  document.getElementById("user-role").textContent = user.role;
  if (user.avatar) {
    document.getElementById("user-avatar").src = user.avatar;
  }

  // Populate data
  renderEmployeeDashboard();
});

function renderEmployeeDashboard() {
  const user = DB.getCurrentUser();
  const employees = DB.getEmployees();
  const departments = DB.getDepartments();

  // Lookup personal employee record
  const empProfile = employees.find(e => e.id === user.employeeId);
  const dept = departments.find(d => d.id === empProfile?.departmentId);

  if (!empProfile) {
    Auth.showToast("Your account lacks a linked employee profile.", "error");
    return;
  }

  // Update dynamic metrics
  document.getElementById("stat-emp-id").textContent = empProfile.employeeId;
  document.getElementById("stat-emp-dept").textContent = dept ? dept.code : "N/A";
  document.getElementById("stat-emp-dept-name").textContent = dept ? dept.name : "Unassigned";

  // Fetch clock today status
  const attendanceToday = DB.getAttendanceForEmployeeToday(empProfile.id);
  
  const statusEl = document.getElementById("stat-attendance-status");
  const timeEl = document.getElementById("stat-checkin-time");

  if (attendanceToday) {
    statusEl.textContent = attendanceToday.status;
    timeEl.textContent = formatTime(attendanceToday.checkIn);
  } else {
    statusEl.textContent = "Offline";
    timeEl.textContent = "--:--";
  }

  // Render smart clocking console card
  renderSmartClockConsole(empProfile, attendanceToday);

  // Render leaves logs list
  renderPersonalLeaves(empProfile.id);

  // Render team coworkers quick directory
  renderCoworkersQuickDirectory(empProfile.id);
}

// Tick employee attendance clock console
function renderSmartClockConsole(empProfile, attendanceToday) {
  const container = document.getElementById("attendance-portal-body");
  const liveDate = document.getElementById("attendance-live-date");

  // Date updates
  updateLiveDateLabel(liveDate);
  if (liveClockInterval) clearInterval(liveClockInterval);
  liveClockInterval = setInterval(() => updateLiveDateLabel(liveDate), 1000);

  let checkInTimeStr = "--:--";
  let checkOutTimeStr = "--:--";
  let statusBadge = `<span class="badge" style="background: rgba(255,255,255,0.05); color: var(--text-muted);">NOT LOGGED</span>`;
  let actionButton = "";

  if (!attendanceToday) {
    actionButton = `
      <button onclick="clockAction('checkin', '${empProfile.id}', '${escapeJS(empProfile.name)}')" class="btn btn-primary" style="padding: 16px 32px; font-size: 1.1rem; border-radius: var(--border-radius-lg); width: 220px;">
        <i class="fa-solid fa-play"></i> Clock In
      </button>
    `;
  } else if (attendanceToday && !attendanceToday.checkOut) {
    checkInTimeStr = formatTime(attendanceToday.checkIn);
    let badgeClass = attendanceToday.status === "Present" ? "badge-active" : "badge-leave";
    statusBadge = `<span class="badge ${badgeClass}">${attendanceToday.status}</span>`;

    actionButton = `
      <button onclick="clockAction('checkout', '${empProfile.id}', '${escapeJS(empProfile.name)}')" class="btn btn-danger" style="padding: 16px 32px; font-size: 1.1rem; border-radius: var(--border-radius-lg); width: 220px;">
        <i class="fa-solid fa-stop"></i> Clock Out
      </button>
    `;
  } else {
    checkInTimeStr = formatTime(attendanceToday.checkIn);
    checkOutTimeStr = formatTime(attendanceToday.checkOut);
    let badgeClass = attendanceToday.status === "Present" ? "badge-active" : "badge-leave";
    statusBadge = `<span class="badge ${badgeClass}">${attendanceToday.status}</span>`;

    actionButton = `
      <button class="btn btn-secondary" style="padding: 16px 32px; font-size: 1.1rem; border-radius: var(--border-radius-lg); width: 220px;" disabled>
        <i class="fa-solid fa-circle-check"></i> Shift Finished
      </button>
    `;
  }

  container.innerHTML = `
    <div style="display: flex; flex-direction: column; align-items: center; gap: 24px; padding: 10px 0;">
      <div style="font-size: 2.8rem; font-weight: 700; color: var(--text-primary); font-family: monospace; letter-spacing: 0.05em;" id="employee-live-clock">
        00:00:00 AM
      </div>
      
      <div>
        ${actionButton}
      </div>

      <div style="display: flex; gap: 20px; width: 100%; justify-content: space-around; background: rgba(255,255,255,0.02); padding: 14px; border-radius: var(--border-radius-md); border: 1px solid var(--panel-border);">
        <div style="text-align: center;">
          <span style="font-size: 0.75rem; text-transform: uppercase; color: var(--text-muted); display: block; margin-bottom: 2px;">In</span>
          <strong style="font-size: 1.1rem; color: var(--text-primary); font-family: monospace;">${checkInTimeStr}</strong>
        </div>
        <div style="text-align: center;">
          <span style="font-size: 0.75rem; text-transform: uppercase; color: var(--text-muted); display: block; margin-bottom: 2px;">Status</span>
          <div>${statusBadge}</div>
        </div>
        <div style="text-align: center;">
          <span style="font-size: 0.75rem; text-transform: uppercase; color: var(--text-muted); display: block; margin-bottom: 2px;">Out</span>
          <strong style="font-size: 1.1rem; color: var(--text-primary); font-family: monospace;">${checkOutTimeStr}</strong>
        </div>
      </div>
    </div>
  `;

  // Start tick clock
  tickLiveClock();
}

function updateLiveDateLabel(el) {
  const d = new Date();
  el.textContent = d.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

function tickLiveClock() {
  const clockEl = document.getElementById("employee-live-clock");
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

function clockAction(action, empId, name) {
  try {
    if (action === "checkin") {
      DB.logAttendanceCheckIn(empId, name);
      Auth.showToast("Checked in successfully.", "success");
    } else {
      DB.logAttendanceCheckOut(empId);
      Auth.showToast("Checked out successfully.", "success");
    }
    renderEmployeeDashboard();
  } catch (err) {
    Auth.showToast(err.message, "error");
  }
}

// ---------------- PERSONAL LEAVES SYSTEM ----------------

function renderPersonalLeaves(empId) {
  const leaves = DB.getLeavesForEmployee(empId);
  const tbody = document.getElementById("personal-leaves-body");
  tbody.innerHTML = "";

  if (leaves.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="4" style="text-align: center; padding: 32px; color: var(--text-muted);">
          No leave requests applied yet.
        </td>
      </tr>
    `;
    return;
  }

  leaves.forEach(l => {
    let badgeClass = "badge-leave"; // Pending warning (yellow)
    if (l.status === "Approved") badgeClass = "badge-active"; // Success (green)
    if (l.status === "Rejected") badgeClass = "badge-suspended"; // Danger (red)

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td style="font-weight: 600;">${escapeHTML(l.type)}</td>
      <td style="font-family: monospace; font-size: 0.8rem;">
        ${formatShortDate(l.startDate)} to ${formatShortDate(l.endDate)}
      </td>
      <td style="color: var(--text-muted); max-width: 140px; text-overflow: ellipsis; overflow: hidden; white-space: nowrap;" title="${escapeHTML(l.reason)}">
        ${escapeHTML(l.reason)}
      </td>
      <td><span class="badge ${badgeClass}">${l.status}</span></td>
    `;
    tbody.appendChild(tr);
  });
}

function openApplyLeaveModal() {
  const modal = document.getElementById("leave-modal");
  document.getElementById("leave-form").reset();
  
  // Set today's date limits
  const today = new Date().toISOString().split("T")[0];
  document.getElementById("leave-start").value = today;
  document.getElementById("leave-end").value = today;
  
  modal.classList.add("open");
}

function closeApplyLeaveModal() {
  document.getElementById("leave-modal").classList.remove("open");
}

function handleLeaveSubmit(event) {
  event.preventDefault();
  
  const user = DB.getCurrentUser();
  const employees = DB.getEmployees();
  const empProfile = employees.find(e => e.id === user.employeeId);

  if (!empProfile) return;

  const startDate = document.getElementById("leave-start").value;
  const endDate = document.getElementById("leave-end").value;
  const type = document.getElementById("leave-type").value;
  const reason = document.getElementById("leave-reason").value.trim();

  // Validate dates
  if (new Date(startDate) > new Date(endDate)) {
    Auth.showToast("Start date cannot be after end date.", "error");
    return;
  }

  DB.applyLeave({
    employeeId: empProfile.id,
    employeeName: empProfile.name,
    type,
    startDate,
    endDate,
    reason
  });

  Auth.showToast("Leave request submitted successfully.", "success");
  closeApplyLeaveModal();
  renderEmployeeDashboard();
}

// ---------------- QUICK COWORKER DIRECTORY ----------------

function renderCoworkersQuickDirectory(currentEmpId) {
  const employees = DB.getEmployees();
  const departments = DB.getDepartments();
  const listContainer = document.getElementById("coworker-directory-list");
  listContainer.innerHTML = "";

  // Filter out current employee
  const coworkers = employees.filter(e => e.id !== currentEmpId);

  if (coworkers.length === 0) {
    listContainer.innerHTML = `<p style="color: var(--text-muted); font-size: 0.9rem;">No coworkers registered yet.</p>`;
    return;
  }

  // Draw first 4 coworkers
  coworkers.slice(0, 4).forEach(emp => {
    const dept = departments.find(d => d.id === emp.departmentId);
    
    const card = document.createElement("div");
    card.style.cssText = "display: flex; align-items: center; gap: 12px; padding: 12px; background: rgba(255, 255, 255, 0.02); border: 1px solid var(--panel-border); border-radius: var(--border-radius-md);";
    card.innerHTML = `
      <img src="${emp.avatar}" alt="${emp.name}" style="width: 38px; height: 38px; border-radius: 50%; background: rgba(255,255,255,0.05);" onerror="this.src='https://api.dicebear.com/7.x/avataaars/svg?seed=placeholder'">
      <div style="display: flex; flex-direction: column; overflow: hidden;">
        <span style="font-size: 0.85rem; font-weight: 600; color: var(--text-primary); text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">${escapeHTML(emp.name)}</span>
        <span style="font-size: 0.75rem; color: var(--text-muted); text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">${escapeHTML(emp.role)} (${dept ? dept.code : 'N/A'})</span>
      </div>
    `;
    listContainer.appendChild(card);
  });
}

// ---------------- HELPERS ----------------

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
