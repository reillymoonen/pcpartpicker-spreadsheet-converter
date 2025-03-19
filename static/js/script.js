let currentData = null;
let darkMode = false;

// Form submission handler
document.getElementById('scraperForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const url = document.getElementById('url').value;
    const loading = document.getElementById('loading');
    const downloadSection = document.getElementById('downloadSection');
    const table = document.getElementById('partsTable');

    loading.style.display = 'block';
    downloadSection.style.display = 'none';
    table.style.display = 'none';

    try {
        const response = await fetch('/fetch_parts', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: `url=${encodeURIComponent(url)}`
        });
        const result = await response.json();
        if (result.success) {
            currentData = result.data;
            displayData(result.data);
        } else {
            if (result.message.includes("Invalid URL")) {
                alert('Invalid URL. Please enter a valid PCPartPicker list URL.');
            } else {
                alert('Failed to fetch parts. Please try again.');
            }
        }
    } catch (error) {
        alert('An error occurred. Please try again.');
        console.error('Error:', error);
    } finally {
        loading.style.display = 'none';
    }
});

// Date/Time button handler
document.getElementById('datetimeButton').addEventListener('click', function() {
    const now = new Date();
    const timestamp = `pcparts_${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}-${String(now.getSeconds()).padStart(2, '0')}`;
    document.getElementById('filename').value = timestamp;
});

// Download button handler
document.getElementById('downloadButton').addEventListener('click', async function() {
    if (!currentData) return;
    const filename = document.getElementById('filename').value || 'parts_list';
    try {
        const numberedData = currentData.map((part, index) => ({ Number: index + 1, ...part }));
        const totalCost = calculateTotal(currentData);
        numberedData.push({ Number: "", Component: "TOTAL", Name: "", Price: totalCost });

        const response = await fetch('/download_csv', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ data: numberedData, filename: filename })
        });
        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${filename}.csv`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            a.remove();
        } else {
            alert('Failed to download CSV. Please try again.');
        }
    } catch (error) {
        alert('An error occurred while downloading. Please try again.');
        console.error('Error:', error);
    }
});

// Function to calculate total cost
function calculateTotal(data) {
    let total = 0;
    data.forEach(part => {
        const priceStr = part.Price;
        if (priceStr && priceStr !== 'N/A') {
            const priceValue = parseFloat(priceStr.replace(/[^0-9.-]+/g, ""));
            if (!isNaN(priceValue)) {
                total += priceValue;
            }
        }
    });
    const currencySymbol = data.length > 0 && data[0].Price && data[0].Price !== 'N/A' ? data[0].Price.replace(/[0-9.-]+/g, "").trim() : "$";
    return currencySymbol + total.toFixed(2);
}

// Display data function
function displayData(data) {
    const tbody = document.querySelector('#partsTable tbody');
    const table = document.getElementById('partsTable');
    const downloadSection = document.getElementById('downloadSection');

    // Clear existing rows
    tbody.innerHTML = '';

    if (data.length === 0) {
        // Hide table and download section if no data
        table.style.display = 'none';
        downloadSection.style.display = 'none';
        document.getElementById('url').value = '';
    } else {
        // Show table and populate rows
        table.style.display = 'table';
        data.forEach((part, index) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td class="number-column">${index + 1}</td>
                <td>${part.Component}</td>
                <td>${part.Name}</td>
                <td>${part.Price}</td>
                <td><button class="delete-btn" onclick="deleteRow(${index})">×</button></td>
            `;
            tbody.appendChild(row);
        });

        // Add total row only once
        const totalRow = document.createElement('tr');
        totalRow.classList.add('total-row');
        totalRow.innerHTML = `
            <td colspan="3" style="text-align: right;">Total:</td>
            <td>${calculateTotal(data)}</td>
            <td></td>
        `;
        tbody.appendChild(totalRow);

        // Show download section
        downloadSection.style.display = 'block';
    }
}



// Delete row function
function deleteRow(index) {
    currentData.splice(index, 1);
    displayData(currentData);
    if (currentData.length === 0) {
        displayData([]);
    }
}

// Dark mode toggle
document.querySelector('.dark-mode-toggle').addEventListener('click', function() {
    darkMode = !darkMode;
    document.body.classList.toggle('dark-mode');
    this.classList.toggle('dark');
});
