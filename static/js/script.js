let currentData = null;
let darkMode = false;
let dragSrcIndex = null;
let sortColumn = null;
let sortDirection = 'asc';

// Check for saved dark mode preference on page load
document.addEventListener('DOMContentLoaded', function() {
    const savedDarkMode = localStorage.getItem('darkMode') === 'true';
    if (savedDarkMode) {
        darkMode = true;
        document.body.classList.add('dark-mode');
        document.querySelector('.dark-mode-toggle').classList.add('dark');

        // Apply dark mode to Bootstrap elements
        const lightElements = document.querySelectorAll('.bg-light');
        lightElements.forEach(el => {
            el.classList.remove('bg-light');
            el.classList.add('bg-dark');
            el.classList.add('text-white');
        });
    }

    // Ensure help window is closed by default
    const helpModel = document.querySelector('.help-model');
    helpModel.style.display = 'none';

    // Add delegation for sort buttons
    document.querySelector('thead').addEventListener('click', function(e) {
        if (e.target.classList.contains('sort-btn')) {
            sortTable(e.target.dataset.sort);
        }
    });
});

document.getElementById('pasteButton').addEventListener('click', async () => {
    try {
        const text = await navigator.clipboard.readText(); // Get text from clipboard
        document.getElementById('url').value = text; // If using an input or textarea
    } catch (err) {
        console.error('Failed to read clipboard contents: ', err);
    }
});

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
            row.setAttribute('draggable', 'true');
            row.dataset.index = index;
            row.classList.add('draggable-row');

            // Add drag event listeners
            row.addEventListener('dragstart', handleDragStart);
            row.addEventListener('dragover', handleDragOver);
            row.addEventListener('dragleave', handleDragLeave);
            row.addEventListener('drop', handleDrop);
            row.addEventListener('dragend', handleDragEnd);

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

        // Apply dark mode to newly created elements if needed
        if (darkMode) {
            const lightElements = document.querySelectorAll('.bg-light');
            lightElements.forEach(el => {
                el.classList.remove('bg-light');
                el.classList.add('bg-dark');
                el.classList.add('text-white');
            });
        }

        // Update sort button indicators if sorting was previously applied
        updateSortButtons();
    }
}

// Drag and drop handlers
function handleDragStart(e) {
    this.style.opacity = '0.4';
    dragSrcIndex = parseInt(this.dataset.index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', dragSrcIndex);
}

function handleDragOver(e) {
    if (e.preventDefault) {
        e.preventDefault(); // Necessary to allow drop
    }
    e.dataTransfer.dropEffect = 'move';
    this.classList.add('drag-over');
    return false;
}

function handleDragLeave(e) {
    this.classList.remove('drag-over');
}

function handleDrop(e) {
    if (e.stopPropagation) {
        e.stopPropagation(); // Stops some browsers from redirecting
    }

    this.classList.remove('drag-over');

    // Don't do anything if dropping on the same row
    const dragTargetIndex = parseInt(this.dataset.index);
    if (dragSrcIndex === dragTargetIndex) {
        return false;
    }

    // Reorder the array
    const movedItem = currentData.splice(dragSrcIndex, 1)[0];
    currentData.splice(dragTargetIndex, 0, movedItem);

    // Update the display
    displayData(currentData);

    return false;
}

function handleDragEnd(e) {
    // Reset the opacity of all rows
    document.querySelectorAll('.draggable-row').forEach(row => {
        row.style.opacity = '1';
        row.classList.remove('drag-over');
    });
}

// Delete row function
function deleteRow(index) {
    currentData.splice(index, 1);
    displayData(currentData);
    if (currentData.length === 0) {
        displayData([]);
    }
}

// Sort table function
function sortTable(column) {
    if (sortColumn === column) {
        // Toggle direction if clicking the same column
        sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
        // Set new column and default to ascending
        sortColumn = column;
        sortDirection = 'asc';
    }

    if (!currentData || currentData.length === 0) return;

    currentData.sort((a, b) => {
        let valueA, valueB;

        if (column === 'component') {
            valueA = a.Component.toLowerCase();
            valueB = b.Component.toLowerCase();
            return sortDirection === 'asc' ?
                valueA.localeCompare(valueB) :
                valueB.localeCompare(valueA);
        }
        else if (column === 'name') {
            valueA = a.Name.toLowerCase();
            valueB = b.Name.toLowerCase();
            return sortDirection === 'asc' ?
                valueA.localeCompare(valueB) :
                valueB.localeCompare(valueA);
        }
        else if (column === 'price') {
            // Parse price values
            valueA = parsePriceValue(a.Price);
            valueB = parsePriceValue(b.Price);

            // Handle N/A values
            if (isNaN(valueA)) valueA = sortDirection === 'asc' ? Infinity : -Infinity;
            if (isNaN(valueB)) valueB = sortDirection === 'asc' ? Infinity : -Infinity;

            return sortDirection === 'asc' ? valueA - valueB : valueB - valueA;
        }
        return 0;
    });

    // Update display after sorting
    displayData(currentData);

    // Update sort button indicators
    updateSortButtons();
}

// Helper function to parse price values
function parsePriceValue(priceStr) {
    if (!priceStr || priceStr === 'N/A') return NaN;
    return parseFloat(priceStr.replace(/[^0-9.-]+/g, ""));
}

// Update sort button indicators
function updateSortButtons() {
    document.querySelectorAll('.sort-btn').forEach(btn => {
        const column = btn.dataset.sort;
        if (column === sortColumn) {
            btn.textContent = sortDirection === 'asc' ? '↑' : '↓';
            btn.classList.add('active-sort');
        } else {
            btn.textContent = '↕';
            btn.classList.remove('active-sort');
        }
    });
}

// Check for saved dark mode preference on page load and set up event listeners
document.addEventListener('DOMContentLoaded', function() {
    // Initialize dark mode from localStorage
    const savedDarkMode = localStorage.getItem('darkMode') === 'true';
    if (savedDarkMode) {
        toggleDarkMode(true);
    }

    // Set up dark mode toggle button
    document.querySelector('.dark-mode-toggle').addEventListener('click', function() {
        darkMode = !darkMode;
        localStorage.setItem('darkMode', darkMode);
        toggleDarkMode(darkMode);
    });

    // Rest of your initialization code...
    const helpModel = document.querySelector('.help-model');
    helpModel.style.display = 'none';

    // Add delegation for sort buttons
    document.querySelector('thead').addEventListener('click', function(e) {
        if (e.target.classList.contains('sort-btn')) {
            sortTable(e.target.dataset.sort);
        }
    });
});

// Function to toggle dark mode
function toggleDarkMode(enable) {
    darkMode = enable;
    document.body.classList.toggle('dark-mode', enable);
    document.querySelector('.dark-mode-toggle').classList.toggle('dark', enable);

    // Apply dark mode to Bootstrap elements
    const lightElements = document.querySelectorAll('.bg-light');
    lightElements.forEach(el => {
        if (enable) {
            el.classList.remove('bg-light');
            el.classList.add('bg-dark');
            el.classList.add('text-white');
        } else {
            el.classList.remove('bg-dark');
            el.classList.remove('text-white');
            el.classList.add('bg-light');
        }
    });
}

    // Ensure help window is completely hidden on load
    const helpModel = document.querySelector('.help-model');
    helpModel.style.display = 'none';
    helpModel.classList.remove('show');

    // Add delegation for sort buttons
    document.querySelector('thead').addEventListener('click', function(e) {
        if (e.target.classList.contains('sort-btn')) {
            sortTable(e.target.dataset.sort);
        }
    });

// Modify existing help model open/close functions
document.querySelector('.help-button').addEventListener('click', function() {
    const helpModel = document.querySelector('.help-model');
    helpModel.style.display = 'flex';
    // Use a small timeout to ensure display is set before adding show class
    setTimeout(() => {
        helpModel.classList.add('show');
    }, 10);
    document.body.classList.add('body'); // Disable scrolling
});

document.querySelector('.help-close').addEventListener('click', function() {
    const helpModel = document.querySelector('.help-model');
    helpModel.classList.remove('show');
    // Wait for transition before hiding
    setTimeout(() => {
        helpModel.style.display = 'none';
    }, 300);
    document.body.classList.remove('body'); // Enable scrolling
});

// Close model if user clicks outside of it
window.addEventListener('click', function(event) {
    const helpModel = document.querySelector('.help-model');
    if (event.target === helpModel) {
        helpModel.classList.remove('show');
        setTimeout(() => {
            helpModel.style.display = 'none';
        }, 300);
    }
});