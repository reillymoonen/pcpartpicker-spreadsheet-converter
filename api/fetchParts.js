export default async function handler(req, res) {
    const url = req.query.url;

    if (!url || !/^https?:\/\/(www\.)?pcpartpicker\.com\/list\/\w+/.test(url)) {
        return res.status(400).json({ error: "Invalid PCPartPicker URL" });
    }

    try {
        const response = await fetch(url, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
                "Accept": "text/html,application/xhtml+xml",
            }
        });

        if (!response.ok) {
            return res.status(response.status).json({ error: "Failed to fetch PCPartPicker page" });
        }

        const html = await response.text();
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.status(200).send(html);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Server error fetching page" });
    }
}
