let currentData = null;
let darkMode = false;
let dragSrcIndex = null;
let sortColumn = null;
let sortDirection = 'asc';

// Function to toggle dark mode
function toggleDarkMode(enable) {
    darkMode = enable;
    document.body.classList.toggle('dark-mode', enable);
    const toggleButton = document.querySelector('.dark-mode-toggle');
    toggleButton.classList.toggle('dark', enable);
    toggleButton.setAttribute('aria-pressed', enable);

    // Handle all form elements and containers with background colors
    const formElements = document.querySelectorAll('.bg-light, .bg-dark');
    formElements.forEach(el => {
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

// Check for saved dark mode preference on page load
document.addEventListener('DOMContentLoaded', function() {
    // Initialize dark mode from localStorage
    const savedDarkMode = localStorage.getItem('darkMode') === 'true';
    if (savedDarkMode) {
        toggleDarkMode(true);
    }

    // Set up dark mode toggle button
    const darkModeToggle = document.querySelector('.dark-mode-toggle');
    darkModeToggle.addEventListener('click', function() {
        darkMode = !darkMode;
        localStorage.setItem('darkMode', darkMode);
        toggleDarkMode(darkMode);
    });

    // Add keyboard support for dark mode toggle
    darkModeToggle.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            darkMode = !darkMode;
            localStorage.setItem('darkMode', darkMode);
            toggleDarkMode(darkMode);
        }
    });

    // Initialize elements with proper ARIA states
    document.getElementById('loading').setAttribute('hidden', 'true');
    document.getElementById('partsTable').setAttribute('hidden', 'true');
    document.getElementById('downloadSection').setAttribute('hidden', 'true');
    document.getElementById('helpModel').setAttribute('hidden', 'true');

    // Add delegation for sort buttons
    document.querySelector('thead').addEventListener('click', function(e) {
        if (e.target.classList.contains('sort-btn')) {
            sortTable(e.target.dataset.sort);
        }
    });
});

document.getElementById('pasteButton').addEventListener('click', async () => {
    try {
        const text = await navigator.clipboard.readText();
        document.getElementById('url').value = text;
        document.getElementById('url').focus();
    } catch (err) {
        console.error('Failed to read clipboard contents: ', err);
        alert('Clipboard access denied. Please paste manually.');
    }
});

// Form submission handler
document.getElementById('scraperForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const url = document.getElementById('url').value;
    const loading = document.getElementById('loading');
    const downloadSection = document.getElementById('downloadSection');
    const table = document.getElementById('partsTable');

    loading.removeAttribute('hidden');
    loading.setAttribute('aria-busy', 'true');
    downloadSection.setAttribute('hidden', 'true');
    table.setAttribute('hidden', 'true');

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
        loading.setAttribute('hidden', 'true');
        loading.setAttribute('aria-busy', 'false');
    }
});

// Date/Time button handler
document.getElementById('datetimeButton').addEventListener('click', function() {
    const now = new Date();
    const timestamp = `pcparts_${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}-${String(now.getMinutes()).padStart(2, '0')}-${String(now.getSeconds()).padStart(2, '0')}`;
    document.getElementById('filename').value = timestamp;
    document.getElementById('filename').focus();
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
            a.setAttribute('aria-label', 'Download CSV file');
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
        table.setAttribute('hidden', 'true');
        downloadSection.setAttribute('hidden', 'true');
        document.getElementById('url').value = '';
    } else {
        // Show table and populate rows
        table.removeAttribute('hidden');
        data.forEach((part, index) => {
            const row = document.createElement('tr');
            row.setAttribute('draggable', 'true');
            row.dataset.index = index;
            row.classList.add('draggable-row');
            row.setAttribute('aria-label', `${part.Component}: ${part.Name}, Price: ${part.Price}`);

            // Add drag event listeners
            row.addEventListener('dragstart', handleDragStart);
            row.addEventListener('dragover', handleDragOver);
            row.addEventListener('dragleave', handleDragLeave);
            row.addEventListener('drop', handleDrop);
            row.addEventListener('dragend', handleDragEnd);
            row.addEventListener('keydown', function(e) {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    this.click();
                }
            });

            row.innerHTML = `
                <td class="number-column">${index + 1}</td>
                <td>${part.Component}</td>
                <td>${part.Name}</td>
                <td>${part.Price}</td>
                <td><button class="delete-btn" onclick="deleteRow(${index})" aria-label="Delete ${part.Component}">×</button></td>
            `;
            tbody.appendChild(row);
        });

        // Add total row only once
        const totalRow = document.createElement('tr');
        totalRow.classList.add('total-row');
        totalRow.setAttribute('aria-label', 'Total cost');
        totalRow.innerHTML = `
            <td colspan="3" style="text-align: right;">Total:</td>
            <td>${calculateTotal(data)}</td>
            <td></td>
        `;
        tbody.appendChild(totalRow);

        // Show download section
        downloadSection.removeAttribute('hidden');

        // Apply dark mode to newly created elements if needed
        if (darkMode) {
            const downloadSection = document.getElementById('downloadSection');
            if (downloadSection) {
                downloadSection.classList.remove('bg-light');
                downloadSection.classList.add('bg-dark');
                downloadSection.classList.add('text-white');
            }
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
    this.setAttribute('aria-grabbed', 'true');
}

function handleDragOver(e) {
    if (e.preventDefault) {
        e.preventDefault();
    }
    e.dataTransfer.dropEffect = 'move';
    this.classList.add('drag-over');
    this.setAttribute('aria-dropeffect', 'move');
    return false;
}

function handleDragLeave(e) {
    this.classList.remove('drag-over');
    this.removeAttribute('aria-dropeffect');
}

function handleDrop(e) {
    if (e.stopPropagation) {
        e.stopPropagation();
    }

    this.classList.remove('drag-over');
    this.removeAttribute('aria-dropeffect');

    const dragTargetIndex = parseInt(this.dataset.index);
    if (dragSrcIndex === dragTargetIndex) {
        return false;
    }

    const movedItem = currentData.splice(dragSrcIndex, 1)[0];
    currentData.splice(dragTargetIndex, 0, movedItem);

    sortColumn = null;
    sortDirection = 'asc';

    displayData(currentData);

    // Focus the moved row for keyboard users
    const rows = document.querySelectorAll('.draggable-row');
    if (rows[dragTargetIndex]) {
        rows[dragTargetIndex].focus();
    }

    return false;
}

function handleDragEnd(e) {
    document.querySelectorAll('.draggable-row').forEach(row => {
        row.style.opacity = '1';
        row.classList.remove('drag-over');
        row.removeAttribute('aria-grabbed');
        row.removeAttribute('aria-dropeffect');
    });
}

// Delete row function
function deleteRow(index) {
    if (confirm('Are you sure you want to delete this item?')) {
        currentData.splice(index, 1);
        displayData(currentData);
        if (currentData.length === 0) {
            displayData([]);
        }
    }
}

// Sort table function
function sortTable(column) {
    if (sortColumn === column) {
        sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
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
            valueA = parsePriceValue(a.Price);
            valueB = parsePriceValue(b.Price);

            if (isNaN(valueA)) valueA = sortDirection === 'asc' ? Infinity : -Infinity;
            if (isNaN(valueB)) valueB = sortDirection === 'asc' ? Infinity : -Infinity;

            return sortDirection === 'asc' ? valueA - valueB : valueB - valueA;
        }
        return 0;
    });

    displayData(currentData);
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
        const th = btn.closest('th');
        if (column === sortColumn) {
            btn.textContent = sortDirection === 'asc' ? '↑' : '↓';
            btn.classList.add('active-sort');
            th.setAttribute('aria-sort', sortDirection);
        } else {
            btn.textContent = '↕';
            btn.classList.remove('active-sort');
            th.setAttribute('aria-sort', 'none');
        }
    });
}

// Help modal open/close functions
document.addEventListener('DOMContentLoaded', function() {
    const helpButton = document.querySelector('.help-button');
    const helpModel = document.querySelector('.help-model');

    helpButton.addEventListener('click', function() {
        helpModel.removeAttribute('hidden');
        helpButton.setAttribute('aria-expanded', 'true');
        setTimeout(() => {
            helpModel.classList.add('show');
            document.querySelector('.help-model-content').focus();
        }, 10);
        document.body.classList.add('body');
    });

    document.querySelector('.help-close').addEventListener('click', function() {
        closeHelpModel();
    });

    // Close model if user clicks outside of it
    window.addEventListener('click', function(event) {
        if (event.target === helpModel) {
            closeHelpModel();
        }
    });

    // Close on ESC key
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape' && helpModel.classList.contains('show')) {
            closeHelpModel();
        }
    });

    function closeHelpModel() {
        helpModel.classList.remove('show');
        helpButton.setAttribute('aria-expanded', 'false');
        setTimeout(() => {
            helpModel.setAttribute('hidden', 'true');
        }, 300);
        document.body.classList.remove('body');
        helpButton.focus();
    }
});

// Add click event to help images for fullscreen view
document.addEventListener('DOMContentLoaded', function() {
    document.querySelector('.help-model').addEventListener('click', function(e) {
        if (e.target.tagName === 'IMG' && e.target.closest('.help-sections')) {
            openFullscreenImage(e.target.src, e.target.alt);
        }
    });
});

function openFullscreenImage(src, alt) {
    const fullscreenDiv = document.createElement('div');
    fullscreenDiv.className = 'fullscreen-image';
    fullscreenDiv.setAttribute('role', 'dialog');
    fullscreenDiv.setAttribute('aria-label', 'Enlarged image view');
    fullscreenDiv.setAttribute('aria-modal', 'true');
    fullscreenDiv.tabIndex = -1;

    const fullscreenImg = document.createElement('img');
    fullscreenImg.src = src;
    fullscreenImg.alt = alt;

    fullscreenDiv.appendChild(fullscreenImg);
    document.body.appendChild(fullscreenDiv);
    fullscreenDiv.focus();

    fullscreenDiv.addEventListener('click', function() {
        document.body.removeChild(fullscreenDiv);
    });

    document.addEventListener('keydown', function closeOnEsc(e) {
        if (e.key === 'Escape') {
            document.body.removeChild(fullscreenDiv);
            document.removeEventListener('keydown', closeOnEsc);
        }
    });
}