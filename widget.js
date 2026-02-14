(function () {
  const STORAGE_KEY = "oaVolunteerHoursEntries";

  function formatDate(dateValue) {
    const date = new Date(dateValue + "T00:00:00");
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(date);
  }

  function toMonthKey(dateValue) {
    return dateValue.slice(0, 7);
  }

  function toYearKey(dateValue) {
    return dateValue.slice(0, 4);
  }

  function sortKeysDescending(keys) {
    return [...keys].sort((a, b) => (a < b ? 1 : -1));
  }

  function renderSummaryList(summaryMap, formatter) {
    const keys = sortKeysDescending(Object.keys(summaryMap));
    if (keys.length === 0) {
      return "<li>No entries yet.</li>";
    }

    return keys
      .map((key) => `<li><strong>${formatter(key)}:</strong> ${summaryMap[key]} hrs</li>`)
      .join("");
  }

  function monthLabel(monthKey) {
    const [year, month] = monthKey.split("-");
    const date = new Date(Number(year), Number(month) - 1, 1);
    return new Intl.DateTimeFormat("en-US", {
      month: "long",
      year: "numeric",
    }).format(date);
  }

  function saveEntries(entries) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  }

  function loadEntries() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      return parsed.filter(
        (entry) =>
          entry &&
          typeof entry.event === "string" &&
          typeof entry.date === "string" &&
          typeof entry.arrowmen === "number" &&
          typeof entry.hours === "number" &&
          typeof entry.totalHours === "number"
      );
    } catch (_error) {
      return [];
    }
  }

  window.initVolunteerHoursTracker = function initVolunteerHoursTracker(containerId) {
    const container = document.getElementById(containerId);
    if (!container) {
      return;
    }

    const state = {
      entries: loadEntries(),
    };

    container.innerHTML = `
      <section class="tracker" aria-label="Volunteer hours tracker">
        <form id="hours-form">
          <div class="grid">
            <div class="field">
              <label for="event">Event / Activity</label>
              <input id="event" name="event" type="text" required maxlength="120" placeholder="Camp cleanup" />
            </div>
            <div class="field">
              <label for="date">Date</label>
              <input id="date" name="date" type="date" required />
            </div>
            <div class="field">
              <label for="arrowmen">Arrowmen Present</label>
              <input id="arrowmen" name="arrowmen" type="number" required min="1" step="1" placeholder="10" />
            </div>
            <div class="field">
              <label for="hours">Hours Worked (per Arrowman)</label>
              <input id="hours" name="hours" type="number" required min="0.25" step="0.25" placeholder="2" />
            </div>
            <div class="field">
              <button type="submit">Add Entry</button>
            </div>
          </div>
          <p class="inline-note">Total service hours are calculated automatically: Arrowmen × Hours Worked.</p>
          <p class="inline-note">Entries are saved in this browser and reloaded automatically.</p>
          <div class="action-row">
            <button id="clear-entries" type="button" class="secondary">Clear Saved Entries</button>
          </div>
          <div id="form-message" class="message" hidden></div>
        </form>

        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Activity</th>
                <th>Arrowmen</th>
                <th>Hours / Arrowman</th>
                <th>Total Hours</th>
              </tr>
            </thead>
            <tbody id="entries-body">
              <tr>
                <td colspan="5">No entries yet.</td>
              </tr>
            </tbody>
          </table>
        </div>

        <section class="totals" aria-label="Running totals">
          <div class="total-card">
            <h3>Running Total by Month</h3>
            <ul id="month-totals" class="total-list">
              <li>No entries yet.</li>
            </ul>
          </div>
          <div class="total-card">
            <h3>Running Total by Year</h3>
            <ul id="year-totals" class="total-list">
              <li>No entries yet.</li>
            </ul>
          </div>
        </section>
      </section>
    `;

    const form = container.querySelector("#hours-form");
    const clearButton = container.querySelector("#clear-entries");
    const message = container.querySelector("#form-message");
    const entriesBody = container.querySelector("#entries-body");
    const monthTotals = container.querySelector("#month-totals");
    const yearTotals = container.querySelector("#year-totals");

    function render() {
      const sortedEntries = [...state.entries].sort((a, b) => (a.date < b.date ? 1 : -1));

      if (sortedEntries.length === 0) {
        entriesBody.innerHTML = '<tr><td colspan="5">No entries yet.</td></tr>';
      } else {
        entriesBody.innerHTML = sortedEntries
          .map(
            (entry) => `
              <tr>
                <td>${formatDate(entry.date)}</td>
                <td>${entry.event}</td>
                <td>${entry.arrowmen}</td>
                <td>${entry.hours}</td>
                <td><strong>${entry.totalHours}</strong></td>
              </tr>
            `
          )
          .join("");
      }

      const monthly = {};
      const yearly = {};
      state.entries.forEach((entry) => {
        const monthKey = toMonthKey(entry.date);
        const yearKey = toYearKey(entry.date);
        monthly[monthKey] = (monthly[monthKey] || 0) + entry.totalHours;
        yearly[yearKey] = (yearly[yearKey] || 0) + entry.totalHours;
      });

      monthTotals.innerHTML = renderSummaryList(monthly, monthLabel);
      yearTotals.innerHTML = renderSummaryList(yearly, (yearKey) => yearKey);
    }

    form.addEventListener("submit", function (event) {
      event.preventDefault();

      const formData = new FormData(form);
      const activity = String(formData.get("event") || "").trim();
      const date = String(formData.get("date") || "");
      const arrowmen = Number(formData.get("arrowmen"));
      const hours = Number(formData.get("hours"));

      if (!activity || !date || arrowmen <= 0 || hours <= 0) {
        message.textContent = "Please provide valid values for all fields.";
        message.hidden = false;
        return;
      }

      const totalHours = Number((arrowmen * hours).toFixed(2));

      state.entries.push({
        event: activity,
        date,
        arrowmen,
        hours,
        totalHours,
      });

      saveEntries(state.entries);
      message.textContent = `Entry added: ${activity} (${formatDate(date)}) = ${arrowmen} \u00d7 ${hours} = ${totalHours} hours.`;
      message.hidden = false;

      form.reset();
      render();
    });

    clearButton.addEventListener("click", function () {
      state.entries = [];
      saveEntries(state.entries);
      message.textContent = "All saved entries have been cleared for this browser.";
      message.hidden = false;
      render();
    });

    render();
  };
})();
