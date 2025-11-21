const { createApp } = Vue;

createApp({
	data() {
		return {
		// Mengambil sumber data dari loadData.js (global scope)
		paketList: (typeof paket !== 'undefined') ? paket : [],
		pengirimanList: (typeof pengirimanList !== 'undefined') ? pengirimanList : [],
		upbjList: (typeof upbjjList !== 'undefined') ? upbjjList : [],			// Tab active state
			activeTab: 'search',

		// Form input
		form: {
			nomorDO: "",
			nim: "",
			nama: "",
			ekspedisi: "",
			upbj: "",
			paketKode: "",
			tanggalKirim: "",
		},			// Form errors
			errors: {},

			// List Delivery Order
			orders: [],

			// Search state
			searchNomorDO: "",
			searchResult: null,
			searchAttempted: false,

			// UI helpers
			today: new Date(),
		};
	},

	computed: {
		// Detail paket yang dipilih di form
		selectedPackage() {
			const kode = this.form.paketKode;
			if (!kode) return null;
			return this.paketList.find(p => p.kode === kode) || null;
		},

		// Tampilkan orders + tracking merged
		displayedOrders() {
			const merged = [...this.orders];
			
			// Tambahkan dari tracking global jika ada
			if (typeof tracking === "object" && tracking !== null) {
				Object.keys(tracking).forEach(k => {
					const rec = tracking[k];
					// Jangan duplikasi jika sudah ada di orders
					if (!merged.find(o => o.nomorDO === (rec.nomorDO || k))) {
						merged.push({
							nomorDO: rec.nomorDO || k,
							nim: rec.nim || "",
							nama: rec.nama || "",
							paketKode: rec.paket || "",
							ekspedisi: rec.ekspedisi || "",
							tanggalKirim: rec.tanggalKirim || "",
							total: rec.total || 0,
							status: rec.status || "Dalam Proses",
							perjalanan: Array.isArray(rec.perjalanan) ? rec.perjalanan : []
						});
					}
				});
			}
			return merged;
		}
	},

	methods: {
		// Format angka ke Rupiah
		formatRupiah(value) {
			const n = Number(value) || 0;
			return n.toLocaleString("id-ID", { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 });
		},

		// Cari tracking berdasarkan nomor DO
		searchTracking() {
			const nomorDO = this.searchNomorDO.trim();
			if (!nomorDO) {
				this.searchResult = null;
				this.searchAttempted = false;
				return;
			}

			// Cari di tracking global
			if (typeof tracking === "object" && tracking !== null && tracking[nomorDO]) {
				const rec = tracking[nomorDO];
				this.searchResult = {
					nomorDO: rec.nomorDO || nomorDO,
					nim: rec.nim || "",
					nama: rec.nama || "",
					paketKode: rec.paket || "",
					ekspedisi: rec.ekspedisi || "",
					tanggalKirim: rec.tanggalKirim || "",
					total: rec.total || 0,
					status: rec.status || "Dalam Proses",
					perjalanan: Array.isArray(rec.perjalanan) ? rec.perjalanan : []
				};
				this.searchAttempted = true;
				return;
			}

			// Cari di orders lokal
			const localOrder = this.orders.find(o => o.nomorDO === nomorDO);
			if (localOrder) {
				this.searchResult = localOrder;
				this.searchAttempted = true;
				return;
			}

			// Tidak ditemukan
			this.searchResult = null;
			this.searchAttempted = true;
		},

		// Handle perubahan paket
		onPaketChange() {
			// Tidak perlu action, computed selectedPackage sudah otomatis update
		},

		// Generate nomor DO otomatis
		_generateNextDO() {
			const year = new Date().getFullYear();
			const prefix = `DO${year}-`;
			const numbers = [];

			// Cari dari orders lokal
			this.orders.forEach(o => {
				if (o.nomorDO && o.nomorDO.startsWith(prefix)) {
					numbers.push(o.nomorDO);
				}
			});

			// Cari dari tracking global
			if (typeof tracking === "object" && tracking !== null) {
				Object.keys(tracking).forEach(k => {
					const rec = tracking[k];
					const nomor = rec.nomorDO || k;
					if (nomor && nomor.toString().startsWith(prefix)) {
						numbers.push(nomor.toString());
					}
				});
			}

			// Parse sequence number
			let maxSeq = 0;
			numbers.forEach(str => {
				// Cari angka sequence dari format DO2025-0001
				const match = str.match(new RegExp(`DO${year}-(\\d+)`));
				if (match && match[1]) {
					const seq = parseInt(match[1], 10);
					if (seq > maxSeq) maxSeq = seq;
				}
			});

			const nextSeq = (maxSeq + 1).toString().padStart(4, '0');
			return `${prefix}${nextSeq}`;
		},

		// Format tanggal ke ISO
		_formatDateISO(d) {
			if (!d) return '';
			const y = d.getFullYear();
			const m = (d.getMonth() + 1).toString().padStart(2, '0');
			const day = d.getDate().toString().padStart(2, '0');
			return `${y}-${m}-${day}`;
		},

	// Validasi form
	validateForm() {
		this.errors = {};
		let isValid = true;

		if (!this.form.nim || this.form.nim.trim() === '') {
			this.errors.nim = 'NIM harus diisi';
			isValid = false;
		}

		if (!this.form.nama || this.form.nama.trim() === '') {
			this.errors.nama = 'Nama harus diisi';
			isValid = false;
		}

		if (!this.form.ekspedisi) {
			this.errors.ekspedisi = 'Ekspedisi harus dipilih';
			isValid = false;
		}

		if (!this.form.upbj) {
			this.errors.upbj = 'UPBJJ harus dipilih';
			isValid = false;
		}

		if (!this.form.paketKode) {
			this.errors.paketKode = 'Paket harus dipilih';
			isValid = false;
		}

		if (!this.form.tanggalKirim) {
			this.errors.tanggalKirim = 'Tanggal kirim harus diisi';
			isValid = false;
		}

		return isValid;
	},

	// Simpan DO
	saveDO() {
		if (!this.validateForm()) return;

		const paket = this.selectedPackage;
		const total = paket ? (paket.harga || 0) : 0;

		// Get current datetime
		const now = new Date();
		const waktuPengiriman = now.toLocaleString('id-ID', {
			year: 'numeric',
			month: '2-digit',
			day: '2-digit',
			hour: '2-digit',
			minute: '2-digit',
			second: '2-digit'
		}).replace(/\//g, '-');

		// Get selected UPBJ (from form, not default)
		const selectedUpbj = this.form.upbj || 'Universitas Terbuka';

		const order = {
			nomorDO: this.form.nomorDO,
			nim: this.form.nim,
			nama: this.form.nama,
			paketKode: this.form.paketKode,
			ekspedisi: this.form.ekspedisi,
			tanggalKirim: this.form.tanggalKirim,
			total: total,
			status: 'Dalam Proses',
			perjalanan: [
				{
					waktu: waktuPengiriman,
					keterangan: `Penerima Loket: UPBJJ ${selectedUpbj}. Pengirim: Universitas Terbuka`
				}
			]
		};

		this.orders.push(order);
		
		// Tampilkan pesan sukses
		alert('DO berhasil disimpan: ' + order.nomorDO);
		
		// Reset form
		this.resetForm();
		
		// Kembali ke tab list
		this.activeTab = 'list';
	},

	// Reset form
	resetForm() {
		this.form = {
			nomorDO: this._generateNextDO(),
			nim: "",
			nama: "",
			ekspedisi: this.pengirimanList.length ? this.pengirimanList[0].kode : "",
			upbj: this.upbjList.length ? this.upbjList[0] : "",
			paketKode: this.paketList.length ? this.paketList[0].kode : "",
		tanggalKirim: this._formatDateISO(new Date())
	};
	this.errors = {};
},

	// Tampilkan perjalanan sorted
	getPerjalananSorted(order) {
		const arr = order && Array.isArray(order.perjalanan) ? [...order.perjalanan] : [];
		return arr.sort((a, b) => {
			const ta = new Date(a.waktu).getTime() || 0;
			const tb = new Date(b.waktu).getTime() || 0;
			return tb - ta;
		});
	},

	// Initialize data (moved into methods so it's available on `this`)
	initializeData() {
		try {
			console.debug('[tracking] initializeData() (methods) globals:', {
				window_paket: window.paket,
				window_pengirimanList: window.pengirimanList,
				window_upbjjList: window.upbjjList,
				window_tracking: window.tracking
			});
			let paketData = window.paket || (typeof paket !== 'undefined' ? paket : []);
			let pengirimanData = window.pengirimanList || (typeof pengirimanList !== 'undefined' ? pengirimanList : []);
			let upbjjData = window.upbjjList || (typeof upbjjList !== 'undefined' ? upbjjList : []);

			// Fallback embedded data if empty
			if (!paketData || paketData.length === 0) {
				paketData = [
					{kode: "PAKET-UT-001", nama: "PAKET IPS Dasar", isi: ["EKMA4116","EKMA4115"], harga: 120000},
					{kode: "PAKET-UT-002", nama: "PAKET IPA Dasar", isi: ["BIOL4201","FISIP4001"], harga: 140000}
				];
			}

			if (!pengirimanData || pengirimanData.length === 0) {
				pengirimanData = [
					{kode: "REG", nama: "Reguler (3-5 hari)"},
					{kode: "EXP", nama: "Ekspres (1-2 hari)"}
				];
			}

			if (!upbjjData || upbjjData.length === 0) {
				upbjjData = ["Jakarta","Surabaya","Makassar","Padang","Denpasar"];
			}

			// Update data references
			if (paketData && paketData.length > 0) {
				this.paketList = paketData;
			}

			if (pengirimanData && pengirimanData.length > 0) {
				this.pengirimanList = pengirimanData;
			}

			if (upbjjData && upbjjData.length > 0) {
				this.upbjList = upbjjData;
			}

			// Generate nomor DO pertama
			this.form.nomorDO = this._generateNextDO();
			this.form.tanggalKirim = this._formatDateISO(new Date());
			console.debug('[tracking] initializeData() (methods) done, paketList length:', this.paketList.length, 'pengirimanList length:', this.pengirimanList.length, 'upbjList length:', this.upbjList.length);
		} catch (err) {
			console.error('[tracking] initializeData() (methods) error:', err);
		}
	},
},

// Pantau perubahan pada form input paketKode
watch: {
	'form.paketKode'(nv, ov) {
		// Reset error ketika user mulai edit
		this.errors.paketKode = '';
	},

	'form.nim'(nv, ov) {
		this.errors.nim = '';
	},

	'form.nama'(nv, ov) {
		this.errors.nama = '';
	},

	'form.ekspedisi'(nv, ov) {
		this.errors.ekspedisi = '';
	},

	'form.upbj'(nv, ov) {
		this.errors.upbj = '';
	},

	'form.tanggalKirim'(nv, ov) {
		this.errors.tanggalKirim = '';
	}
}, mounted() {
	// Initialize immediately and also listen for dataLoaded
	try {
		console.debug('[tracking] mounted() start');
		this.initializeData();
		const handler = this.initializeData.bind(this);
		window.addEventListener('dataLoaded', handler);
		console.debug('[tracking] mounted() finished, listener attached');
	} catch (err) {
		console.error('[tracking] mounted() error:', err);
	}
},

	initializeData() {
		try {
			// Debug: show globals available when initializing
			console.debug('[tracking] initializeData() globals:', {
				window_paket: window.paket,
				window_pengirimanList: window.pengirimanList,
				window_upbjjList: window.upbjjList,
				window_tracking: window.tracking
			});
			// Try to get data from window object
			let paketData = window.paket || (typeof paket !== 'undefined' ? paket : []);
			let pengirimanData = window.pengirimanList || (typeof pengirimanList !== 'undefined' ? pengirimanList : []);
			let upbjjData = window.upbjjList || (typeof upbjjList !== 'undefined' ? upbjjList : []);
		
		// Fallback embedded data if empty
		if (!paketData || paketData.length === 0) {
			paketData = [
				{kode: "PAKET-UT-001", nama: "PAKET IPS Dasar", isi: ["EKMA4116","EKMA4115"], harga: 120000},
				{kode: "PAKET-UT-002", nama: "PAKET IPA Dasar", isi: ["BIOL4201","FISIP4001"], harga: 140000}
			];
		}
		
		if (!pengirimanData || pengirimanData.length === 0) {
			pengirimanData = [
				{kode: "REG", nama: "Reguler (3-5 hari)"},
				{kode: "EXP", nama: "Ekspres (1-2 hari)"}
			];
		}
		
		if (!upbjjData || upbjjData.length === 0) {
			upbjjData = ["Jakarta","Surabaya","Makassar","Padang","Denpasar"];
		}
		
		// Update data references
		if (paketData && paketData.length > 0) {
			this.paketList = paketData;
		}
		
		if (pengirimanData && pengirimanData.length > 0) {
			this.pengirimanList = pengirimanData;
		}
		
		if (upbjjData && upbjjData.length > 0) {
			this.upbjList = upbjjData;
		}
		
		// Generate nomor DO pertama
		this.form.nomorDO = this._generateNextDO();
		this.form.tanggalKirim = this._formatDateISO(new Date());
		console.debug('[tracking] initializeData() done, paketList length:', this.paketList.length, 'pengirimanList length:', this.pengirimanList.length, 'upbjList length:', this.upbjList.length);
		} catch (err) {
			console.error('[tracking] initializeData() error:', err);
		}
		
		// Set ekspedisi default
		if (this.pengirimanList && this.pengirimanList.length) {
			this.form.ekspedisi = this.pengirimanList[0].kode;
		}

		// Set UPBJ default
		if (this.upbjList && this.upbjList.length) {
			this.form.upbj = this.upbjList[0];
		}

		// Set paket default
		if (this.paketList && this.paketList.length) {
			this.form.paketKode = this.paketList[0].kode;
		}
	}

}).mount("#app");

// Navigation toggle helper (for navbar interactions)
function initNav() {
	const hamburger = document.getElementById("hamburger");
	const navLinks = document.querySelector(".nav-links");
	const navOverlay = document.getElementById("nav-overlay");
	const dropdowns = document.querySelectorAll(".dropdown");
	if (!hamburger || !navLinks) return;

	const toggleMenu = () => {
		const isActive = navLinks.classList.toggle("active");
		hamburger.classList.toggle("active", isActive);
		if (navOverlay) navOverlay.classList.toggle("active", isActive);
		if (!isActive) dropdowns.forEach((d) => d.classList.remove("active"));
	};

	hamburger.addEventListener("click", toggleMenu);
	if (navOverlay) navOverlay.addEventListener("click", toggleMenu);

	dropdowns.forEach((dropdown) => {
		const dropbtn = dropdown.querySelector(".dropbtn");
		if (!dropbtn) return;
		dropbtn.addEventListener("click", (e) => {
			if (navLinks.classList.contains("active") || window.innerWidth <= 768) {
				e.preventDefault();
				const isThisDropdownActive = dropdown.classList.contains("active");
				dropdowns.forEach((otherDropdown) => {
					if (otherDropdown !== dropdown) otherDropdown.classList.remove("active");
				});
				dropdown.classList.toggle("active", !isThisDropdownActive);
			}
		});
	});

	window.addEventListener("resize", () => {
		if (window.innerWidth > 768) {
			hamburger.classList.remove("active");
			navLinks.classList.remove("active");
			if (navOverlay) navOverlay.classList.remove("active");
		}
		dropdowns.forEach((dropdown) => dropdown.classList.remove("active"));
	});
}

// Expose globally for pages to call
window.initNav = initNav;

// Auto-init on DOMContentLoaded (if elements exist on page)
document.addEventListener("DOMContentLoaded", () => {
	initNav();
});