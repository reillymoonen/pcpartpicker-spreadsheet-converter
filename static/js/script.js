let currentData = null;
let darkMode = false;
let dragSrcIndex = null;
let sortColumn = null;
let sortDirection = "asc";

// CHANGE THIS to your deployed Vercel proxy URL
const PROXY_URL = "https://pcpartpicker-proxy.vercel.app/api/fetchParts?url=";

// -------------------- Dark Mode --------------------
function toggleDarkMode(enable) {
    darkMode = enable;
    document.body.classList.toggle("dark-mode", enable);
    document.querySelector(".dark-mode-toggle").classList.toggle("dark", enable);
    document.querySelectorAll(".bg-light, .bg-dark").forEach(el => {
        if (enable) {
            el.classList.remove("bg-light");
            el.classList.add("bg-dark", "text-white");
        } else {
            el.classList.remove("bg-dark", "text-white");
            el.classList.add("bg-light");
        }
    });
}

document.addEventListener("DOMContentLoaded", function () {
    if (localStorage.getItem("darkMode") === "true") toggleDarkMode(true);
    document.querySelector(".dark-mode-toggle").addEventListener("click", function () {
        darkMode = !darkMode;
        localStorage.setItem("darkMode", darkMode);
        toggleDarkMode(darkMode);
    });
    document.querySelector("thead").addEventListener("click", function (e) {
        if (e.target.classList.contains("sort-btn")) sortTable(e.target.dataset.sort);
    });
    document.getElementById("pasteButton").addEventListener("click", async () => {
        try {
            document.getElementById("url").value = await navigator.clipboard.readText();
        } catch (err) {
            console.error("Clipboard read failed:", err);
        }
    });
});

// -------------------- Form Submit (Fetch via Proxy) --------------------
document.getElementById("scraperForm").addEventListener("submit", async function (e) {
    e.preventDefault();
    const url = document.getElementById("url").value;
    const loading = document.getElementById("loading");
    const table = document.getElementById("partsTable");
    const downloadSection = document.getElementById("downloadSection");

    loading.style.display = "block";
    table.style.display = "none";
    downloadSection.style.display = "none";

    try {
        const htmlText = await fetch(PROXY_URL + encodeURIComponent(url)).then(res => res.text());
        currentData = parsePCPartPickerHTML(htmlText);
        if (currentData.length > 0) {
            displayData(currentData);
        } else {
            alert("No parts found. Make sure your list is public.");
        }
    } catch (err) {
        console.error(err);
        alert("Error fetching list.");
    } finally {
        loading.style.display = "none";
    }
});

// -------------------- HTML Parsing --------------------
function parsePCPartPickerHTML(html) {
    const doc = new DOMParser().parseFromString(html, "text/html");
    const rows = doc.querySelectorAll(".tr__product");
    let parts = [];

    rows.forEach(row => {
        const component = row.querySelector(".td__component")?.textContent.trim() || "";
        const name = row.querySelector(".td__name")?.textContent.trim() || "";
        const price = row.querySelector(".td__price")?.textContent.trim().replace(/Price/i, "").trim() || "N/A";

        let link = "";
        const linkEl = row.querySelector(".td__name a");
        if (linkEl && linkEl.getAttribute("href") !== "#view_custom_part") {
            link = linkEl.href.startsWith("http") ? linkEl.href : "https://pcpartpicker.com" + linkEl.getAttribute("href");
        }
        parts.push({ Component: component, Name: name, Link: link, Price: price });
    });

    return parts;
}

// -------------------- CSV Download --------------------
function generateTimestampFilename() {
    const now = new Date();
    return `pcparts_${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}_${String(now.getHours()).padStart(2, "0")}-${String(now.getMinutes()).padStart(2, "0")}`;
}

document.getElementById("datetimeButton").addEventListener("click", function () {
    document.getElementById("filename").value = generateTimestampFilename();
});

document.getElementById("downloadButton").addEventListener("click", function () {
    if (!currentData) return;
    const filename = document.getElementById("filename").value.trim() || generateTimestampFilename();
    const numberedData = currentData.map((part, index) => ({ Number: index + 1, ...part }));
    const totalCost = calculateTotal(currentData);
    numberedData.push({ Number: "", Component: "TOTAL", Name: "", Price: totalCost });
    const csv = convertToCSV(numberedData);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filename}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
});

function convertToCSV(data) {
    const headers = Object.keys(data[0]);
    const rows = data.map(obj => headers.map(field => `"${String(obj[field] || "").replace(/"/g, '""')}"`).join(","));
    return [headers.join(","), ...rows].join("\n");
}

function calculateTotal(data) {
    let total = 0;
    data.forEach(part => {
        const num = parseFloat(part.Price.replace(/[^0-9.-]+/g, ""));
        if (!isNaN(num)) total += num;
    });
    const symbol = data[0]?.Price?.replace(/[0-9.,-]/g, "").trim() || "$";
    return `${symbol}${total.toFixed(2)}`;
}

// -------------------- Display Data --------------------
function displayData(data) {
    const tbody = document.querySelector("#partsTable tbody");
    const table = document.getElementById("partsTable");
    const downloadSection = document.getElementById("downloadSection");
    tbody.innerHTML = "";

    if (data.length === 0) {
        table.style.display = "none";
        downloadSection.style.display = "none";
        document.getElementById("url").value = "";
    } else {
        table.style.display = "table";
        data.forEach((part, index) => {
            const row = document.createElement("tr");
            row.setAttribute("draggable", "true");
            row.dataset.index = index;
            row.classList.add("draggable-row");
            row.addEventListener("dragstart", handleDragStart);
            row.addEventListener("dragover", handleDragOver);
            row.addEventListener("dragleave", handleDragLeave);
            row.addEventListener("drop", handleDrop);
            row.addEventListener("dragend", handleDragEnd);
            const linkButton = part.Link ? `<a href="${part.Link}" target="_blank" class="link-button">🔗</a>` : "";
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
        const totalRow = document.createElement("tr");
        totalRow.classList.add("total-row");
        totalRow.innerHTML = `<td colspan="3" style="text-align: right;">Total:</td><td></td><td>${calculateTotal(data)}</td><td></td>`;
        tbody.appendChild(totalRow);
        downloadSection.style.display = "block";
        if (darkMode) {
            downloadSection.classList.remove("bg-light");
            downloadSection.classList.add("bg-dark", "text-white");
        }
        updateSortButtons();
    }
}

// -------------------- Drag & Drop --------------------
function handleDragStart(e) {
    this.style.opacity = "0.4";
    dragSrcIndex = parseInt(this.dataset.index);
    e.dataTransfer.effectAllowed = "move";
}
function handleDragOver(e) { e.preventDefault(); this.classList.add("drag-over"); return false; }
function handleDragLeave(e) { this.classList.remove("drag-over"); }
function handleDrop(e) {
    e.stopPropagation();
    this.classList.remove("drag-over");
    const dragTargetIndex = parseInt(this.dataset.index);
    if (dragSrcIndex !== dragTargetIndex) {
        const movedItem = currentData.splice(dragSrcIndex, 1)[0];
        currentData.splice(dragTargetIndex, 0, movedItem);
        sortColumn = null; sortDirection = "asc";
        displayData(currentData);
    }
}
function handleDragEnd(e) {
    document.querySelectorAll(".draggable-row").forEach(row => {
        row.style.opacity = "1";
        row.classList.remove("drag-over");
    });
}
function deleteRow(index) {
    currentData.splice(index, 1);
    displayData(currentData);
    if (currentData.length === 0) displayData([]);
}

// -------------------- Sorting --------------------
function sortTable(column) {
    if (sortColumn === column) {
        sortDirection = sortDirection === "asc" ? "desc" : "asc";
    } else {
        sortColumn = column; sortDirection = "asc";
    }
    if (!currentData || currentData.length === 0) return;
    currentData.sort((a, b) => {
        let valueA, valueB;
        if (column === "component") {
            valueA = a.Component.toLowerCase(); valueB = b.Component.toLowerCase();
            return sortDirection === "asc" ? valueA.localeCompare(valueB) : valueB.localeCompare(valueA);
        } else if (column === "name") {
            valueA = a.Name.toLowerCase(); valueB = b.Name.toLowerCase();
            return sortDirection === "asc" ? valueA.localeCompare(valueB) : valueB.localeCompare(valueA);
        } else if (column === "price") {
            valueA = parsePriceValue(a.Price); valueB = parsePriceValue(b.Price);
            if (isNaN(valueA)) valueA = sortDirection === "asc" ? Infinity : -Infinity;
            if (isNaN(valueB)) valueB = sortDirection === "asc" ? Infinity : -Infinity;
            return sortDirection === "asc" ? valueA - valueB : valueB - valueA;
        }
        return 0;
    });
    displayData(currentData);
    updateSortButtons();
}
function parsePriceValue(priceStr) {
    if (!priceStr || priceStr === "N/A") return NaN;
    return parseFloat(priceStr.replace(/[^0-9.-]+/g, ""));
}
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
