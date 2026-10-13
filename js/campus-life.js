function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
}

export function renderCampusLifeModule(sectionId, container) {
  if (sectionId === "hostels") {
    container.innerHTML = `
      <p class="tool-intro">AFIT Hostel & Accommodation Guide. On-campus hall allocation, porter contacts, and off-campus housing guidelines.</p>
      <div class="card-grid">
        <div class="module-card">
          <h3>Male Student Hostels</h3>
          <p>Blocks A, B, C & D. Equipped with study common rooms, laundry spaces, and security post.</p>
          <p class="fine-print">Hall Warden: Chief Porter Office</p>
        </div>
        <div class="module-card">
          <h3>Female Student Hostels</h3>
          <p>Queens Hall & Alpha Block. Restricted access, 24/7 security, power backup, and quiet study rooms.</p>
          <p class="fine-print">Hall Warden: Matron Desk</p>
        </div>
        <div class="module-card">
          <h3>Off-Campus Housing Guide</h3>
          <p>Verified off-campus student accommodation in Mando, Rigachikun, and Kawo. Ensure tenancy agreements are verified.</p>
          <p class="fine-print">Student Affairs Accommodation Desk</p>
        </div>
      </div>
    `;
    return;
  }

  if (sectionId === "transportation") {
    container.innerHTML = `
      <p class="tool-intro">AFIT Campus Shuttle Routes & Transportation Schedules.</p>
      <div class="card-grid">
        <div class="module-card">
          <h3>Main Gate ↔ Academic Complex Shuttle</h3>
          <p>Operating Hours: 07:00 AM - 07:00 PM (Monday – Friday). Fare: Campus Shuttle Card.</p>
        </div>
        <div class="module-card">
          <h3>Hostel ↔ Engineering Labs Shuttle</h3>
          <p>Operating Hours: 07:30 AM - 06:00 PM. Peak times every 15 minutes.</p>
        </div>
        <div class="module-card">
          <h3>Kawo / Mando Town Shuttle</h3>
          <p>Weekend and off-campus student shuttles available at Main Gate terminal.</p>
        </div>
      </div>
    `;
    return;
  }

  if (sectionId === "food-dining") {
    container.innerHTML = `
      <p class="tool-intro">Campus Cafeteria, Food Courts & Student Eateries.</p>
      <div class="card-grid">
        <div class="module-card">
          <h3>Central Student Cafeteria</h3>
          <p>Breakfast (07:00–10:00), Lunch (12:00–15:00), Dinner (18:00–21:00). Budget-friendly student meals.</p>
        </div>
        <div class="module-card">
          <h3>Engineering Complex Food Court</h3>
          <p>Open 08:00 AM - 08:00 PM. Snacks, pastries, fresh juice, rice dishes, and coffee.</p>
        </div>
        <div class="module-card">
          <h3>Night Market & Snack Hub</h3>
          <p>Located near Hostel Block C. Open 06:00 PM - 10:30 PM.</p>
        </div>
      </div>
    `;
    return;
  }

  if (sectionId === "health-wellness") {
    container.innerHTML = `
      <p class="tool-intro">AFIT Medical Center & Mental Health Services.</p>
      <div class="card-grid">
        <div class="module-card">
          <h3>AFIT Medical Clinic</h3>
          <p>24/7 Emergency Medical Response, outpatient care, pharmacy, and ambulance service.</p>
          <p class="fine-print">📞 Medical Emergency Hotline: 0803 000 1122</p>
        </div>
        <div class="module-card">
          <h3>Student Counseling & Mental Health</h3>
          <p>Free confidential counseling sessions, stress management, and academic support.</p>
          <p class="fine-print">📍 Student Affairs Center, Room 12</p>
        </div>
      </div>
    `;
    return;
  }

  if (sectionId === "emergency-safety") {
    container.innerHTML = `
      <p class="tool-intro">AFIT Emergency Contacts & Campus Security Services.</p>
      <div class="emergency-grid">
        <div class="emergency-card">
          <h3>Campus Security Control Room</h3>
          <p>24/7 Security Dispatch & Incident Reporting</p>
          <a class="call-btn" href="tel:08001234567">📞 Call 0800 123 4567</a>
        </div>
        <div class="emergency-card">
          <h3>Medical Center Emergency</h3>
          <p>AFIT Medical Center & Ambulance</p>
          <a class="call-btn" href="tel:08030001122">📞 Call 0803 000 1122</a>
        </div>
        <div class="emergency-card">
          <h3>Chief Porter Office</h3>
          <p>Hostel Emergency & Security</p>
          <a class="call-btn" href="tel:08021112233">📞 Call 0802 111 2233</a>
        </div>
        <div class="emergency-card">
          <h3>Dean of Student Affairs</h3>
          <p>Student Welfare Emergency</p>
          <a class="call-btn" href="tel:08059998877">📞 Call 0805 999 8877</a>
        </div>
      </div>
    `;
    return;
  }

  if (sectionId === "organizations") {
    container.innerHTML = `
      <p class="tool-intro">AFIT Student Associations, Clubs & Societies.</p>
      <div class="card-grid">
        <div class="module-card">
          <h3>National Association of Computing Students (NACOS)</h3>
          <p>Departmental association for Computer Science & Cyber Security students.</p>
        </div>
        <div class="module-card">
          <h3>AFIT Robotics & Tech Club</h3>
          <p>Hands-on engineering, drone design, automation, and programming workshops.</p>
        </div>
        <div class="module-card">
          <h3>AFIT Debate & Literary Society</h3>
          <p>Inter-university debates, public speaking, poetry, and essay contests.</p>
        </div>
      </div>
    `;
    return;
  }

  if (sectionId === "student-businesses") {
    container.innerHTML = `
      <p class="tool-intro">Directory of Student-Run Enterprises & Services on Campus.</p>
      <div class="card-grid">
        <div class="module-card">
          <h3>PixelCraft Graphics & Printing</h3>
          <p>Project printing, binding, flyer design, and customized merchandise.</p>
          <p class="fine-print">Contact: Alex (Hostel B12)</p>
        </div>
        <div class="module-card">
          <h3>CodeFlex Web & Mobile Solutions</h3>
          <p>Custom software development, UI/UX design, and IT support.</p>
          <p class="fine-print">Contact: Tech Team (Block C)</p>
        </div>
      </div>
    `;
    return;
  }

  if (sectionId === "alumni-networking") {
    container.innerHTML = `
      <p class="tool-intro">AFIT Alumni Network & Career Mentorship Program.</p>
      <div class="card-grid">
        <div class="module-card">
          <h3>Alumni Mentorship Connect</h3>
          <p>Connect with AFIT graduates working in Aerospace, Defense, Tech, and Oil & Gas.</p>
        </div>
        <div class="module-card">
          <h3>Postgraduate & International Scholarships</h3>
          <p>Guidance on PTDF, Chevening, Commonwealth, and Mastercard Foundation scholarships.</p>
        </div>
      </div>
    `;
    return;
  }

  container.innerHTML = `
    <p class="tool-intro">${escapeHtml(sectionId.replace("-", " "))} portal loaded.</p>
  `;
}
