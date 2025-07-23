
document.addEventListener('DOMContentLoaded', () => {
  const filters = {
    role: document.getElementById('roleFilter'),
    department: document.getElementById('departmentFilter'),
    risk: document.getElementById('riskFilter'),
    time: document.getElementById('timeFilter')
  };

  const userRoleDisplay = document.getElementById('userRole');

  Object.values(filters).forEach(select => {
    select.addEventListener('change', () => {
      userRoleDisplay.innerText = filters.role.value || '[Select a role below]';
      fetchFromSheetDB(filters);
    });
  });
});

const SHEETDB_URL = 'https://sheetdb.io/api/v1/avv2xl4lw5vfy'; // Replace with your actual API URL

function fetchFromSheetDB(filters) {
  fetch(SHEETDB_URL)
    .then(res => res.json())
    .then(data => {
      const filtered = data.filter(row => {
        return (!filters.role.value || (row.Role || '').trim().toLowerCase() === filters.role.value.toLowerCase()) &&
               (!filters.department.value || filters.department.value === 'All' || (row.Department || '').trim().toLowerCase() === filters.department.value.toLowerCase()) &&
               (!filters.risk.value || filters.risk.value === 'All' || (row.Risk || '').trim().toLowerCase() === filters.risk.value.toLowerCase());
      });
      console.log('Filtered Data:', filtered);
      updateChart(filtered);
      updateAlerts(filtered);
      window.currentData = filtered;
    })
    .catch(err => {
      console.error('Error fetching SheetDB data:', err);
      alert('Unable to fetch data. Check API or CORS settings.');
    });
}

function updateAlerts(data) {
  const alertList = document.getElementById('alertList');
  if (!data.length) {
    alertList.innerHTML = '<li>No alerts for this selection.</li>';
    return;
  }

  const alerts = data.map(user => {
    const missed = parseInt(user['Missed Trainings'] || '0');
    return `${user.Name} has ${missed} missed trainings.`;
  });

  alertList.innerHTML = alerts.map(a => `<li>${a}</li>`).join('');
}

function updateChart(data) {
  if (!data.length) {
    alert('No matching data found!');
    return;
  }

  const compliant = data.filter(u => parseInt(u['Trainings Completed'] || '0') > 0).length;
  const nonCompliant = data.length - compliant;

  const ctx = document.getElementById('progressChart').getContext('2d');
  if (window.chart) window.chart.destroy();

  window.chart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Compliant', 'Non-compliant'],
      datasets: [{
        data: [compliant, nonCompliant],
        backgroundColor: ['#4caf50', '#f44336']
      }]
    }
  });
}

function exportReport(format) {
  if (!window.currentData || !window.currentData.length) {
    alert('No data to export.');
    return;
  }

  if (format === 'csv') {
    const headers = Object.keys(window.currentData[0]);
    const rows = [
      headers.join(','),
      ...window.currentData.map(row => headers.map(h => `"${(row[h] || '').replace(/"/g, '""')}"`).join(','))
    ];
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'compliance_data.csv';
    link.click();
  } else if (format === 'pdf') {
    const canvas = document.getElementById('progressChart');
    const imgData = canvas.toDataURL('image/png');
    const win = window.open();
    win.document.write('<html><head><title>Chart PDF</title></head><body><img src="' + imgData + '" style="width:100%"/></body></html>');
    win.document.close();
  }
}
