let currentData = null;
let darkMode = false;
let dragSrcIndex = null;
let sortColumn = null;
let sortDirection = "asc";

// Function to toggle dark mode
function toggleDarkMode(enable) {
    darkMode = enable;
    document.body.classList.toggle("dark-mode", enable);
    document.querySelector(".dark-mode-toggle").classList.toggle("dark", enable);

    // Handle all form elements and containers with background colors
    const formElements = document.querySelectorAll(".bg-light, .bg-dark");
    formElements.forEach(el => {
        if (enable) {
            // Switch to dark mode
            el.classList.remove("bg-light");
            el.classList.add("bg-dark");
            el.classList.add("text-white");
        } else {
            // Switch to light mode
            el.classList.remove("bg-dark");
            el.classList.remove("text-white");
            el.classList.add("bg-light");
        }
    });
}

// Check for saved dark mode preference on page load
document.addEventListener("DOMContentLoaded", function() {
    // Initialize dark mode from localStorage
    const savedDarkMode = localStorage.getItem("darkMode") === "true";
    if (savedDarkMode) {
        toggleDarkMode(true);
    }

    // Set up dark mode toggle button
    document.querySelector(".dark-mode-toggle")
        .addEventListener("click", function() {
            darkMode = !darkMode;
            localStorage.setItem("darkMode", darkMode);
            toggleDarkMode(darkMode);
        });

    // Ensure help window is completely hidden on load
    const helpModel = document.querySelector(".help-model");
    helpModel.style.display = "none";
    helpModel.classList.remove("show");

    // Add delegation for sort buttons
    document.querySelector("thead").addEventListener("click", function(e) {
        if (e.target.classList.contains("sort-btn")) {
            sortTable(e.target.dataset.sort);
        }
    });
});

document.getElementById("pasteButton").addEventListener("click", async () => {
    try {
        const text = await navigator.clipboard.readText();
        document.getElementById("url").value = text;
    } catch (err) {
        console.error("Failed to read clipboard contents: ", err);
    }
});

// Form submission handler
document.getElementById("scraperForm")
    .addEventListener("submit", async function(e) {
        e.preventDefault();
        const url = document.getElementById("url").value;
        const loading = document.getElementById("loading");
        const downloadSection = document.getElementById("downloadSection");
        const table = document.getElementById("partsTable");

        loading.style.display = "block";
        downloadSection.style.display = "none";
        table.style.display = "none";

        try {
            const response = await fetch("/fetch_parts", {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                },
                body: `url=${encodeURIComponent(url)}`
            });
            const result = await response.json();
            if (result.success) {
                currentData = result.data;
                displayData(result.data);
            } else {
                if (result.message.includes("Invalid URL")) {
                    alert("Invalid URL. Please enter a valid PCPartPicker " +
                          "list URL.");
                } else {
                    alert("Failed to fetch parts. Please try again.");
                }
            }
        } catch (error) {
            alert("An error occurred. Please try again.");
            console.error("Error:", error);
        } finally {
            loading.style.display = "none";
        }
    });

// Date/Time button handler
document.getElementById("datetimeButton").addEventListener("click", function() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    const seconds = String(now.getSeconds()).padStart(2, "0");
    const timestamp = `pcparts_${year}-${month}-${day}_${hours}-${minutes}-` +
                     `${seconds}`;
    document.getElementById("filename").value = timestamp;
});

// Download button handler
document.getElementById("downloadButton")
    .addEventListener("click", async function() {
        if (!currentData) return;
        const filename = document.getElementById("filename").value ||
                        "parts_list";
        try {
            const numberedData = currentData.map((part, index) =>
                ({ Number: index + 1, ...part }));
            const totalCost = calculateTotal(currentData);
            numberedData.push({
                Number: "",
                Component: "TOTAL",
                Name: "",
                Price: totalCost
            });

            const response = await fetch("/download_csv", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ data: numberedData, filename: filename })
            });
            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `${filename}.csv`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                a.remove();
            } else {
                alert("Failed to download CSV. Please try again.");
            }
        } catch (error) {
            alert("An error occurred while downloading. Please try again.");
            console.error("Error:", error);
        }
    });

// Function to calculate total cost
function calculateTotal(data) {
    let total = 0;
    data.forEach(part => {
        const priceStr = part.Price;
        if (priceStr && priceStr !== "N/A") {
            const priceValue = parseFloat(priceStr.replace(/[^0-9.-]+/g, ""));
            if (!isNaN(priceValue)) {
                total += priceValue;
            }
        }
    });
    const currencySymbol = data.length > 0 && data[0].Price &&
                          data[0].Price !== "N/A" ?
                          data[0].Price.replace(/[0-9.-]+/g, "").trim() : "$";
    return currencySymbol + total.toFixed(2);
}

// Display data function
function displayData(data) {
    const tbody = document.querySelector("#partsTable tbody");
    const table = document.getElementById("partsTable");
    const downloadSection = document.getElementById("downloadSection");

    // Clear existing rows
    tbody.innerHTML = "";

    if (data.length === 0) {
        // Hide table and download section if no data
        table.style.display = "none";
        downloadSection.style.display = "none";
        document.getElementById("url").value = "";
    } else {
        // Show table and populate rows
        table.style.display = "table";
        data.forEach((part, index) => {
            const row = document.createElement("tr");
            row.setAttribute("draggable", "true");
            row.dataset.index = index;
            row.classList.add("draggable-row");

            // Add drag event listeners
            row.addEventListener("dragstart", handleDragStart);
            row.addEventListener("dragover", handleDragOver);
            row.addEventListener("dragleave", handleDragLeave);
            row.addEventListener("drop", handleDrop);
            row.addEventListener("dragend", handleDragEnd);

            // Create link button if link exists
            const linkButton = part.Link ? `
                <a href="${part.Link}" target="_blank" class="link-button"
                   title="View product">
                    <svg width="16" height="16" viewBox="0 0 24 24"
                         fill="currentColor" xmlns="http://www.w3.org/2000/svg"
                         fill-rule="evenodd" clip-rule="evenodd">
                        <path d="M14.851 11.923c-.179-.641-.521-1.246-1.025-1.749-1.562-1.562-4.095-1.563-5.657 0l-4.998 4.998c-1.562 1.563-1.563 4.095 0 5.657 1.562 1.563 4.096 1.561 5.656 0l3.842-3.841.333.009c.404 0 .802-.04 1.189-.117l-4.657 4.656c-.975.976-2.255 1.464-3.535 1.464-1.28 0-2.56-.488-3.535-1.464-1.952-1.951-1.952-5.12 0-7.071l4.998-4.998c.975-.976 2.256-1.464 3.536-1.464 1.279 0 2.56.488 3.535 1.464.493.493.861 1.063 1.105 1.672l-.787.784zm-5.703.147c.178.643.521 1.25 1.026 1.756 1.562 1.563 4.096 1.561 5.656 0l4.999-4.998c1.563-1.562 1.563-4.095 0-5.657-1.562-1.562-4.095-1.563-5.657 0l-3.841 3.841-.333-.009c-.404 0-.802.04-1.189.117l4.656-4.656c.975-.976 2.256-1.464 3.536-1.464 1.279 0 2.56.488 3.535 1.464 1.951 1.951 1.951 5.119 0 7.071l-4.999 4.998c-.975.976-2.255 1.464-3.535 1.464-1.28 0-2.56-.488-3.535-1.464-.494-.495-.863-1.067-1.107-1.678l.788-.785z"/>
                    </svg>
                </a>
            ` : "";

            row.innerHTML = `
                <td class="number-column">${index + 1}</td>
                <td>${part.Component}</td>
                <td>${part.Name}</td>
                <td class="link-column">${linkButton}</td>
                <td>${part.Price}</td>
                <td><button class="delete-btn" onclick="deleteRow(${index})">×</button></td>
            `;
            tbody.appendChild(row);
        });

        // Add total row only once
        const totalRow = document.createElement("tr");
        totalRow.classList.add("total-row");
        totalRow.innerHTML = `
            <td colspan="3" style="text-align: right;">Total:</td>
            <td></td>
            <td>${calculateTotal(data)}</td>
            <td></td>
        `;
        tbody.appendChild(totalRow);

        // Show download section
        downloadSection.style.display = "block";

        // Apply dark mode to newly created elements if needed
        if (darkMode) {
            const downloadSection = document.getElementById("downloadSection");
            if (downloadSection) {
                downloadSection.classList.remove("bg-light");
                downloadSection.classList.add("bg-dark");
                downloadSection.classList.add("text-white");
            }
        }

        // Update sort button indicators if sorting was previously applied
        updateSortButtons();
    }
}

// Drag and drop handlers
function handleDragStart(e) {
    this.style.opacity = "0.4";
    dragSrcIndex = parseInt(this.dataset.index);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", dragSrcIndex);
}

function handleDragOver(e) {
    if (e.preventDefault) {
        e.preventDefault(); // Necessary to allow drop
    }
    e.dataTransfer.dropEffect = "move";
    this.classList.add("drag-over");
    return false;
}

function handleDragLeave(e) {
    this.classList.remove("drag-over");
}

function handleDrop(e) {
    if (e.stopPropagation) {
        e.stopPropagation(); // Stops some browsers from redirecting
    }

    this.classList.remove("drag-over");

    // Don"t do anything if dropping on the same row
    const dragTargetIndex = parseInt(this.dataset.index);
    if (dragSrcIndex === dragTargetIndex) {
        return false;
    }

    // Reorder the array
    const movedItem = currentData.splice(dragSrcIndex, 1)[0];
    currentData.splice(dragTargetIndex, 0, movedItem);

    // Reset sorting state
    sortColumn = null;
    sortDirection = "asc";

    // Update the display
    displayData(currentData);

    return false;
}

function handleDragEnd(e) {
    // Reset the opacity of all rows
    document.querySelectorAll(".draggable-row").forEach(row => {
        row.style.opacity = "1";
        row.classList.remove("drag-over");
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
        sortDirection = sortDirection === "asc" ? "desc" : "asc";
    } else {
        // Set new column and default to ascending
        sortColumn = column;
        sortDirection = "asc";
    }

    if (!currentData || currentData.length === 0) return;

    currentData.sort((a, b) => {
        let valueA, valueB;

        if (column === "component") {
            valueA = a.Component.toLowerCase();
            valueB = b.Component.toLowerCase();
            return sortDirection === "asc" ?
                valueA.localeCompare(valueB) :
                valueB.localeCompare(valueA);
        }
        else if (column === "name") {
            valueA = a.Name.toLowerCase();
            valueB = b.Name.toLowerCase();
            return sortDirection === "asc" ?
                valueA.localeCompare(valueB) :
                valueB.localeCompare(valueA);
        }
        else if (column === "price") {
            // Parse price values
            valueA = parsePriceValue(a.Price);
            valueB = parsePriceValue(b.Price);

            // Handle N/A values
            if (isNaN(valueA)) valueA = sortDirection === "asc" ?
                                        Infinity : -Infinity;
            if (isNaN(valueB)) valueB = sortDirection === "asc" ?
                                        Infinity : -Infinity;

            return sortDirection === "asc" ? valueA - valueB : valueB - valueA;
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
    if (!priceStr || priceStr === "N/A") return NaN;
    return parseFloat(priceStr.replace(/[^0-9.-]+/g, ""));
}

// Update sort button indicators
function updateSortButtons() {
    document.querySelectorAll(".sort-btn").forEach(btn => {
        const column = btn.dataset.sort;
        if (column === sortColumn) {
            btn.textContent = sortDirection === "asc" ? "↑" : "↓";
            btn.classList.add("active-sort");
        } else {
            btn.textContent = "↕";
            btn.classList.remove("active-sort");
        }
    });
}

// Help modal open/close functions
document.addEventListener("DOMContentLoaded", function() {
    document.querySelector(".help-button").addEventListener("click", function() {
        const helpModel = document.querySelector(".help-model");
        helpModel.style.display = "flex";
        // Use a small timeout to ensure display is set before adding show class
        setTimeout(() => {
            helpModel.classList.add("show");
        }, 10);
        document.body.classList.add("body"); // Disable scrolling
    });

    document.querySelector(".help-close").addEventListener("click", function() {
        const helpModel = document.querySelector(".help-model");
        helpModel.classList.remove("show");
        // Wait for transition before hiding
        setTimeout(() => {
            helpModel.style.display = "none";
        }, 300);
        document.body.classList.remove("body"); // Enable scrolling
    });

    // Close model if user clicks outside of it
    window.addEventListener("click", function(event) {
        const helpModel = document.querySelector(".help-model");
        if (event.target === helpModel) {
            helpModel.classList.remove("show");
            setTimeout(() => {
                helpModel.style.display = "none";
            }, 300);
            document.body.classList.remove("body"); // Enable scrolling
        }
    });
});

// Add click event to help images for fullscreen view
document.addEventListener("DOMContentLoaded", function() {
    // This needs to be delegated since images are loaded dynamically
    document.querySelector(".help-model").addEventListener("click", function(e) {
        if (e.target.tagName === "IMG" &&
            e.target.closest(".help-sections")) {
            openFullscreenImage(e.target.src);
        }
    });
});

function openFullscreenImage(src) {
    const fullscreenDiv = document.createElement("div");
    fullscreenDiv.className = "fullscreen-image";

    const fullscreenImg = document.createElement("img");
    fullscreenImg.src = src;

    fullscreenDiv.appendChild(fullscreenImg);
    document.body.appendChild(fullscreenDiv);

    fullscreenDiv.addEventListener("click", function() {
        document.body.removeChild(fullscreenDiv);
    });

    // Also close on ESC key
    document.addEventListener("keydown", function closeOnEsc(e) {
        if (e.key === "Escape") {
            document.body.removeChild(fullscreenDiv);
            document.removeEventListener("keydown", closeOnEsc);
        }
    });
}