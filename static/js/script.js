let currentData = null;
let darkMode = false;

// Form submission handler
document.getElementById('scraperForm').addEventListener('submit', async function(e) {
    e.preventDefault();

    const url = document.getElementById('url').value;
    const loading = document.getElementById('loading');
    const downloadSection = document.getElementById('downloadSection');

    loading.style.display = 'block';
    downloadSection.style.display = 'none';

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
            downloadSection.style.display = 'block';
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

    // Format: YYYY-MM-DD_HH-MM-SS
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');

    const timestamp = `pcparts_${year}-${month}-${day}_${hours}-${minutes}-${seconds}`;

    // Set the value in the filename input
    document.getElementById('filename').value = timestamp;
});

// Download button handler
document.getElementById('downloadButton').addEventListener('click', async function() {
    if (!currentData) return;

    const filename = document.getElementById('filename').value || 'parts_list';

    try {
        // Add numbering to the data before downloading
        const numberedData = currentData.map((part, index) => {
            return {
                Number: index + 1,
                ...part
            };
        });

        // Add total row to CSV
        const totalCost = calculateTotal(currentData);
        numberedData.push({
            Number: "",
            Component: "TOTAL",
            Name: "",
            Price: totalCost
        });

        const response = await fetch('/download_csv', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                data: numberedData,
                filename: filename
            })
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
        // Extract numerical value from price string (removing currency symbols, etc.)
        const priceStr = part.Price;
        if (priceStr && priceStr !== 'N/A') {
            // Extract numbers from price string (handles different currencies)
            const priceValue = parseFloat(priceStr.replace(/[^0-9.-]+/g, ""));
            if (!isNaN(priceValue)) {
                total += priceValue;
            }
        }
    });

    // Format total with currency symbol (using the same format as the price values)
    // This assumes the currency symbol is consistent across all prices
    const currencySymbol = data.length > 0 && data[0].Price && data[0].Price !== 'N/A'
        ? data[0].Price.replace(/[0-9.-]+/g, "").trim()
        : "$";

    return currencySymbol + total.toFixed(2);
}

// Display data function
function displayData(data) {
    const tbody = document.querySelector('#partsTable tbody');
    tbody.innerHTML = '';

    data.forEach((part, index) => {
        const row = document.createElement('tr');

        row.innerHTML = `
            <td class="number-column">${index + 1}</td>
            <td>${part.Component}</td>
            <td>${part.Name}</td>
            <td>${part.Price}</td>
            <td>
                <button class="btn btn-danger btn-sm delete-btn" data-index="${index}" style="
                    border-radius: 50%;
                    width: 24px;
                    height: 24px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    padding: 0;
                    font-size: 14px;">
                    ✕
                </button>
            </td>
        `;

        tbody.appendChild(row);
    });

    // Update total price
    document.getElementById('totalPrice').textContent = calculateTotal(data);

    document.getElementById('partsTable').style.display = 'table';

    // Add event listeners for delete buttons
    document.querySelectorAll('.delete-btn').forEach(button => {
        button.addEventListener('click', function () {
            const index = this.getAttribute('data-index');
            deleteItem(index);
        });
    });
}

// Function to delete an item
function deleteItem(index) {
    currentData.splice(index, 1);
    displayData(currentData);
}

// Dark mode toggle
document.getElementById('darkModeToggle').addEventListener('click', function() {
    darkMode = !darkMode;
    document.body.classList.toggle('dark-mode', darkMode);
    document.querySelector('.container').classList.toggle('dark-mode', darkMode);
    document.querySelector('.footer').classList.toggle('dark-mode', darkMode);
    document.querySelector('#scraperForm').classList.toggle('bg-dark', darkMode);
    document.querySelector('#downloadSection').classList.toggle('bg-dark', darkMode);
    this.classList.toggle('dark', darkMode);
});