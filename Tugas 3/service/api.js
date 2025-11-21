/**
 * service/api.js
 * Small data service that loads `Data/dataBahanAjar.json` and exposes data
 * to the global scope for backwards compatibility, plus a `window.api`
 * programmatic wrapper: `load()`, `get()` and `reload()`.
 * Include this file BEFORE Vue app scripts.
 */

// Backwards-compatible globals (apps read these directly)
window.upbjjList = window.upbjjList || [];
window.kategoriList = window.kategoriList || [];
window.pengirimanList = window.pengirimanList || [];
window.paket = window.paket || [];
window.stok = window.stok || [];
window.tracking = window.tracking || {};

// Core loader: returns parsed JSON data (or throws on failure)
async function loadDataFromJSON() {
    try {
        const fetchPath = './Data/dataBahanAjar.json';
        console.debug('[api] attempting fetch:', fetchPath);
        const resp = await fetch(fetchPath);
        if (!resp.ok) {
            const e = new Error('HTTP error ' + resp.status);
            e.status = resp.status;
            throw e;
        }
        const data = await resp.json();

        console.debug('[api] fetched JSON successfully, keys:', Object.keys(data || {}));

        // Assign to globals for compatibility
        window.upbjjList = Array.isArray(data.upbjjList) ? data.upbjjList : [];
        window.kategoriList = Array.isArray(data.kategoriList) ? data.kategoriList : [];
        window.pengirimanList = Array.isArray(data.pengirimanList) ? data.pengirimanList : [];
        window.paket = Array.isArray(data.paket) ? data.paket : [];
        window.stok = Array.isArray(data.stok) ? data.stok : [];
        window.tracking = (data && typeof data.tracking === 'object') ? data.tracking : {};

        // Save into service wrapper if present
        if (window.api) window.api._last = data;

        // Notify listeners that data ready
        window.dispatchEvent(new Event('dataLoaded'));
        return data;
    } catch (err) {
        console.warn('[api] fetch failed, using embedded fallback data. Error:', err && (err.message || err));
        if (window.api) window.api._lastError = err;
        // Fallback: embed minimal data so the app works even when fetch fails
        try {
            const embedded = {
                upbjjList: ["Jakarta","Surabaya","Makassar","Padang","Denpasar"],
                kategoriList: ["MK Wajib","MK Pilihan","Praktikum","Problem-Based"],
                pengirimanList: [{kode: "REG", nama: "Reguler (3-5 hari)"}, {kode: "EXP", nama: "Ekspres (1-2 hari)"}],
                paket: [{kode: "PAKET-UT-001", nama: "PAKET IPS Dasar", isi: ["EKMA4116","EKMA4115"], harga: 120000},{kode: "PAKET-UT-002", nama: "PAKET IPA Dasar", isi: ["BIOL4201","FISIP4001"], harga: 140000}],
                stok: [
                    {kode: "EKMA4116", judul: "Pengantar Manajemen", kategori: "MK Wajib", upbjj: "Jakarta", lokasiRak: "R1-A3", harga: 65000, qty: 28, safety: 20, catatanHTML: "<em>Edisi 2024, cetak ulang</em>"},
                    {kode: "EKMA4115", judul: "Pengantar Akuntansi", kategori: "MK Wajib", upbjj: "Jakarta", lokasiRak: "R1-A4", harga: 60000, qty: 7, safety: 15, catatanHTML: "<strong>Cover baru</strong>"},
                    {kode: "BIOL4201", judul: "Biologi Umum (Praktikum)", kategori: "Praktikum", upbjj: "Surabaya", lokasiRak: "R3-B2", harga: 80000, qty: 12, safety: 10, catatanHTML: "Butuh <u>pendingin</u> untuk kit basah"},
                    {kode: "FISIP4001", judul: "Dasar-Dasar Sosiologi", kategori: "MK Pilihan", upbjj: "Makassar", lokasiRak: "R2-C1", harga: 55000, qty: 2, safety: 8, catatanHTML: "Stok <i>menipis</i>, prioritaskan reorder"}
                ],
                tracking: {
                    "DO2025-0001": {nim: "123456789", nama: "Rina Wulandari", status: "Dalam Perjalanan", ekspedisi: "JNE", tanggalKirim: "2025-08-25", paket: "PAKET-UT-001", total: 120000, perjalanan: [{waktu: "2025-08-25 10:12:20", keterangan: "Penerimaan di Loket: TANGSEL"},{waktu: "2025-08-25 14:07:56", keterangan: "Tiba di Hub: JAKSEL"},{waktu: "2025-08-26 08:44:01", keterangan: "Diteruskan ke Kantor Tujuan"}]}
                }
            };

            window.upbjjList = embedded.upbjjList;
            window.kategoriList = embedded.kategoriList;
            window.pengirimanList = embedded.pengirimanList;
            window.paket = embedded.paket;
            window.stok = embedded.stok;
            window.tracking = embedded.tracking;
            if (window.api) window.api._last = embedded;
            console.info('[api] embedded fallback data loaded, items:', embedded.stok.length);
        } catch (e) {
            // If even fallback fails, ensure globals are defined
            window.upbjjList = window.upbjjList || [];
            window.kategoriList = window.kategoriList || [];
            window.pengirimanList = window.pengirimanList || [];
            window.paket = window.paket || [];
            window.stok = window.stok || [];
            window.tracking = window.tracking || {};
        }

        // Notify apps that fallback data is ready
        window.dispatchEvent(new Event('dataLoaded'));
        return embedded;
    }
}

// Auto-load on script execution (safely ignore unhandled rejection)
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => loadDataFromJSON().catch(()=>{}));
} else {
    loadDataFromJSON().catch(()=>{});
}

// Lightweight programmatic API
window.api = window.api || {};
window.api.load = loadDataFromJSON; // returns Promise<data>
window.api.get = function() {
    return {
        upbjjList: window.upbjjList,
        kategoriList: window.kategoriList,
        pengirimanList: window.pengirimanList,
        paket: window.paket,
        stok: window.stok,
        tracking: window.tracking
    };
};
window.api.reload = function() { return loadDataFromJSON(); };
window.api._last = null;
window.api._lastError = null;
