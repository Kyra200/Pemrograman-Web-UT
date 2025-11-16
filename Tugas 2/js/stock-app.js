
// Vue.js Stock App - Inventory Management dengan Bootstrap Modal Support
const { createApp } = Vue;

createApp({
  // ════════════════════════════════════════════════════════════════════════════════
  // BAGIAN 1: DATA() - STATE MANAGEMENT (Reactive Data)
  // ════════════════════════════════════════════════════════════════════════════════
  // Semua data yang bersifat reaktif di-deklarasikan di sini.
  // Ketika data berubah, Vue otomatis me-trigger re-render pada template.
  //
  data() {
    return {
      // Data utama (CRUD)
      items: [],              // Array inventory items
      
      // Search & Filter
      filter: '',             // Search text input (v-model binding)
      selectedUpbjj: '',      // Filter by UPBJJ (v-model binding)
      selectedKategori: '',   // Filter by kategori (v-model binding)
      filterLowStock: false,  // Checkbox filter (v-model binding)
      sortBy: 'judul',        // Radio button sort (v-model binding)
      
      // Modal Management
      showModal: false,       // Detail modal visibility (v-if binding)
      showAddModal: false,    // Add modal visibility (v-if binding)
      showEditModal: false,   // Edit modal visibility (v-if binding)
      showErrMsg: false,      // Error message visibility

      // Tooltip for kode catatanHTML preview
      tooltipVisible: false,
      tooltipContent: '',
      tooltipX: 0,
      tooltipY: 0,
      
      // Selected/Current Item
      selectedItem: null,     // Item yang di-detail/edit (v-if untuk view/edit mode)
      currentItem: null,      // Deep copy untuk edit modal
      editMode: false,        // Toggle view/edit mode (v-if untuk template)
      
      // Form Data
      newItem: {              // Form tambah stok (v-model pada setiap input)
        kode: '',
        judul: '',
        kategori: '',
        upbjj: '',
        lokasiRak: '',
        harga: 0,
        qty: 0,
        safety: 0,
        catatanHTML: ''
      },
      
      // Dropdown Options
      kategoriList: ['MK Wajib', 'MK Pilihan', 'Praktikum', 'Problem-Based'],
      upbjjList: ['Jakarta', 'Surabaya', 'Makassar', 'Padang', 'Denpasar']
    };
  },

  // ════════════════════════════════════════════════════════════════════════════════
  // BAGIAN 2: COMPUTED PROPERTIES - DERIVED STATE
  // ════════════════════════════════════════════════════════════════════════════════
  // Computed properties adalah fungsi yang mengembalikan nilai derived dari data.
  // Vue otomatis meng-cache hasil sampai dependencies-nya berubah.
  // Digunakan untuk: filtering, sorting, transformasi data.
  //
  computed: {
    // Break filtering into smaller computed steps so Vue can cache intermediate
    // results and avoid recomputing unrelated parts when filters change.
    searchedItems() {
      if (!this.filter || !this.filter.trim()) return this.items;
      const search = this.filter.toLowerCase();
      return this.items.filter(item =>
        item.kode.toLowerCase().includes(search) ||
        item.judul.toLowerCase().includes(search) ||
        item.lokasiRak.toLowerCase().includes(search)
      );
    },

    upbjjFilteredItems() {
      if (!this.selectedUpbjj) return this.searchedItems;
      return this.searchedItems.filter(item => item.upbjj === this.selectedUpbjj);
    },

    kategoriFilteredItems() {
      if (!this.selectedKategori) return this.upbjjFilteredItems;
      return this.upbjjFilteredItems.filter(item => item.kategori === this.selectedKategori);
    },

    lowStockFilteredItems() {
      if (!this.filterLowStock) return this.kategoriFilteredItems;
      // show items with qty <= safety (includes qty === 0)
      return this.kategoriFilteredItems.filter(item => item.qty <= item.safety);
    },

    sortedItems() {
      // create shallow copy before sorting to avoid mutating source array
      const arr = this.lowStockFilteredItems.slice();
      if (this.sortBy === 'judul') {
        return arr.sort((a, b) => a.judul.localeCompare(b.judul));
      } else if (this.sortBy === 'qty') {
        return arr.sort((a, b) => a.qty - b.qty);
      } else if (this.sortBy === 'harga') {
        return arr.sort((a, b) => a.harga - b.harga);
      }
      return arr;
    },

    // Final computed used by template
    filteredItems() {
      return this.sortedItems;
    },

    // Aggregated stock info (remains simple and depends on base items array)
    stokInfo() {
      const total = this.items.length;
      const lowStock = this.items.filter(item => item.qty <= item.safety).length;
      const kosong = this.items.filter(item => item.qty === 0).length;
      const aman = total - lowStock;

      return {
        total,
        lowStock,
        kosong,
        aman
      };
    }
  },

  // ════════════════════════════════════════════════════════════════════════════════
  // BAGIAN 3: METHODS - BUSINESS LOGIC & EVENT HANDLERS
  // ════════════════════════════════════════════════════════════════════════════════
  // Methods mengandung semua fungsi aplikasi: CRUD, modal control, formatting, etc.
  // Setiap method dipanggil melalui event handler (@click, @submit) di template.
  //
  methods: {
    // ─────────────────────────────────────────────────────────────────────────────
    // DISPLAY & FORMATTING METHODS
    // ─────────────────────────────────────────────────────────────────────────────
    
    // Tentukan class CSS berdasarkan jumlah stock
    // Return: 'stock-rendah' (qty=0), 'stock-sedang' (qty<=safety), 'stock-tinggi' (qty>safety)
    jumlahStok(qty, safety) {
      if (qty === 0) return "stock-rendah";
      if (qty <= safety) return "stock-sedang";
      return "stock-tinggi";
    },

    // Format harga ke format Rupiah menggunakan Intl.NumberFormat API
    // Contoh input: 50000 → Output: "Rp 50.000,00"
    formatRupiah(harga) {
      return new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR'
      }).format(harga);
    },

    // Render status badge HTML berdasarkan qty vs safety limit
    // Output HTML: <span class="badge bg-danger/warning/success">KOSONG/MENIPIS/AMAN</span>
    statusBadge(item) {
      if (item.qty === 0) {
        return '<span class="badge bg-danger">KOSONG</span>';
      } else if (item.qty <= item.safety) {
        return '<span class="badge bg-warning">MENIPIS</span>';
      } else {
        return '<span class="badge bg-success">AMAN</span>';
      }
    },

    // ─────────────────────────────────────────────────────────────────────────────
    // STOCK OPERATION METHODS
    // ─────────────────────────────────────────────────────────────────────────────
    
    // Tambah stock (increment qty sebesar 1)
    // Menggunakan Math.max() untuk memastikan qty tidak negatif
    addStock(item) {
      if (item.qty !== null && item.qty !== undefined) {
        item.qty = Math.max(0, item.qty + 1);
      }
    },

    // Kurangi stock (decrement qty sebesar 1)
    // Menggunakan Math.max() untuk memastikan qty tidak negatif
    reduceStock(item) {
      if (item.qty !== null && item.qty !== undefined) {
        item.qty = Math.max(0, item.qty - 1);
      }
    },
    // Ubah qty dengan button +/- (delta dapat +1 atau -1)
    // Menggunakan Math.max() untuk memastikan qty tidak negatif
    changeQty(item, field, delta) {
      if (item[field] !== null && item[field] !== undefined) {
        item[field] = Math.max(0, item[field] + delta);
      }
    },

    // ─────────────────────────────────────────────────────────────────────────────
    // MODAL DETAIL MANAGEMENT (Custom Modal)
    // ─────────────────────────────────────────────────────────────────────────────
    // Modal detail menggunakan custom HTML + CSS (bukan Bootstrap modal)
    // State management: showModal (visibility), editMode (view/edit toggle), selectedItem (data)
    
    // Tampilkan modal detail dengan deep copy item untuk mencegah mutasi
    // Disable scroll pada body saat modal terbuka
    showDetail(item) {
      this.selectedItem = JSON.parse(JSON.stringify(item));  // Deep copy
      this.editMode = false;
      this.showModal = true;
      document.body.style.overflow = "hidden";
    },

    // Tutup modal detail dan reset semua state
    closeModal() {
      this.showModal = false;
      this.selectedItem = null;
      this.editMode = false;
      document.body.style.overflow = "";  // Re-enable scroll
    },

    // Tutup modal jika user klik di luar modal (background)
    // Menggunakan event.target.id untuk memastikan klik di backdrop, bukan isi modal
    handleModalClick(event) {
      if (event.target.id === 'modalDetailBahanAjar') {
        this.closeModal();
      }
    },

    // Toggle antara view mode dan edit mode di modal detail
    toggleEditMode() {
      this.editMode = !this.editMode;
    },

    // Simpan perubahan qty dan catatan dari edit mode ke items array
    // Log perubahan qty ke console untuk audit trail
    saveChanges() {
      if (this.selectedItem) {
        const idx = this.items.findIndex(i => i.kode === this.selectedItem.kode);
        if (idx !== -1) {
          const oldQty = this.items[idx].qty;
          this.items[idx].qty = this.selectedItem.qty;
          this.items[idx].catatanHTML = this.selectedItem.catatanHTML || '';

          if (oldQty !== this.selectedItem.qty) {
            const perubahan = this.selectedItem.qty > oldQty ? '+' : '';
            console.log(`${this.selectedItem.kode}: Stock berubah dari ${oldQty} → ${this.selectedItem.qty} (${perubahan}${this.selectedItem.qty - oldQty})`);
          }
        }
      }
      this.editMode = false;
      alert('Perubahan berhasil disimpan!');
      this.closeModal();
    },

    // Batalkan edit - reload data original dari items array
    // Menggunakan deep copy untuk mencegah mutasi data original
    cancelEdit() {
      this.editMode = false;
      if (this.selectedItem) {
        const original = this.items.find(i => i.kode === this.selectedItem.kode);
        if (original) {
          this.selectedItem = JSON.parse(JSON.stringify(original));
        }
      }
    },

    // Tutup modal jika user klik di luar modal (background)
    handleAddModalClick(event) {
      if (event.target.id === 'modalAddBahanAjar') {
        this.closeAddModal();
      }
    },

    // Tooltip handlers for kode-barang hover preview
    showTooltip(item, event) {
      if (!item || !item.catatanHTML) return;
      this.tooltipContent = item.catatanHTML || '';
      this.tooltipVisible = true;
      // initial placement next to element (top-right)
      this.$nextTick(() => {
        const rect = event.target.getBoundingClientRect();
        const scrollX = window.scrollX || window.pageXOffset;
        const scrollY = window.scrollY || window.pageYOffset;
        let x = rect.right + 8 + scrollX;
        let y = rect.top - 6 + scrollY;
        // If tooltip would overflow to the right, place it to the left
        const vw = document.documentElement.clientWidth;
        const tooltipWidth = 340; // matches CSS max-width
        if (x + tooltipWidth > vw) {
          x = rect.left - tooltipWidth - 12 + scrollX;
        }
        // If tooltip would be above viewport, push it below element
        if (y < 0) {
          y = rect.bottom + 6 + scrollY;
        }
        this.tooltipX = Math.round(x);
        this.tooltipY = Math.round(y);
      });
    },

    moveTooltip(event) {
      // update vertical position to follow small pointer movements
      if (!this.tooltipVisible) return;
      const rect = event.target.getBoundingClientRect();
      const scrollX = window.scrollX || window.pageXOffset;
      const scrollY = window.scrollY || window.pageYOffset;
      let x = rect.right + 8 + scrollX;
      let y = rect.top - 6 + scrollY;
      const vw = document.documentElement.clientWidth;
      const tooltipWidth = 340;
      if (x + tooltipWidth > vw) {
        x = rect.left - tooltipWidth - 12 + scrollX;
      }
      if (y < 0) {
        y = rect.bottom + 6 + scrollY;
      }
      this.tooltipX = Math.round(x);
      this.tooltipY = Math.round(y);
    },

    hideTooltip() {
      this.tooltipVisible = false;
      this.tooltipContent = '';
    },

    // ─────────────────────────────────────────────────────────────────────────────
    // MODAL ADD MANAGEMENT (Bootstrap Modal)
    // ─────────────────────────────────────────────────────────────────────────────
    // Modal tambah stock menggunakan Bootstrap 5.3.8 modal component
    // Form inputs di-bind dengan v-model ke newItem data object (two-way binding)

    // Reset form tambah stock ke nilai default kosong
    // Dipanggil saat buka modal dan saat tutup modal
    resetNewItem() {
      this.newItem = {
        kode: '',
        judul: '',
        kategori: '',
        upbjj: '',
        lokasiRak: '',
        harga: 0,
        qty: 0,
        safety: 0,
        catatanHTML: ''
      };
    },

    // Buka modal tambah stock
    // Clear error message dan reset form sebelum menampilkan modal
    showAddModalForm() {
      this.showErrMsg = false;
      this.resetNewItem();
      this.showAddModal = true;
    },

    // Tutup modal tambah stock dan reset form
    closeAddModal() {
      this.showAddModal = false;
      this.resetNewItem();
    },

    // Tambah item stock baru (CREATE operation)
    // 1. Validasi: kode dan judul harus diisi
    // 2. Cek duplikat kode di items array
    // 3. Push deep copy newItem ke array (mencegah reference mutation)
    // 4. Close modal dan alert success
    addItem() {
      this.showErrMsg = false;

      // Validasi field required
      if (!this.newItem.kode.trim() || !this.newItem.judul.trim()) {
        alert('Kode dan Judul harus diisi!');
        return;
      }

      // Cek duplikat kode
      if (this.items.some(i => i.kode === this.newItem.kode)) {
        this.showErrMsg = true;
        return;
      }

      // Tambah ke array (deep copy untuk mencegah reference issues)
      this.items.push(JSON.parse(JSON.stringify(this.newItem)));
      this.closeAddModal();
      alert('Stock baru berhasil ditambahkan!');
    },

    // ─────────────────────────────────────────────────────────────────────────────
    // MODAL EDIT MANAGEMENT (Bootstrap Modal)
    // ─────────────────────────────────────────────────────────────────────────────
    // Modal edit menggunakan Bootstrap 5.3.8 modal untuk update data item existing
    // Form inputs di-bind dengan v-model ke currentItem data object (two-way binding)

    // Edit item - copy item ke currentItem dan tampilkan modal
    // Menggunakan deep copy untuk mencegah mutasi data original
    editItem(item) {
      this.showErrMsg = false;
      this.currentItem = JSON.parse(JSON.stringify(item));
      this.showEditModal = true;
    },

    // Update item (UPDATE operation)
    // 1. Validasi: kode dan judul harus diisi
    // 2. Cek duplikat kode (exclude current item)
    // 3. Find index dalam items array dan update data
    // 4. Close modal dan alert success
    updateItem() {
      this.showErrMsg = false;

      // Validasi field required
      if (!this.currentItem.kode.trim() || !this.currentItem.judul.trim()) {
        alert('Kode dan Judul harus diisi!');
        return;
      }

      // Cek duplikat kode (exclude current item)
      const otherItem = this.items.find(i => 
        i.kode === this.currentItem.kode && 
        i.kode !== this.currentItem.kode
      );
      
      if (otherItem && otherItem.kode !== this.currentItem.kode) {
        this.showErrMsg = true;
        return;
      }

      // Update item di array (deep copy untuk konsistensi)
      const idx = this.items.findIndex(i => i.kode === this.currentItem.kode);
      if (idx !== -1) {
        this.items[idx] = JSON.parse(JSON.stringify(this.currentItem));
      }

      this.showEditModal = false;
      alert('Stock berhasil diperbarui!');
    },

    // ─────────────────────────────────────────────────────────────────────────────
    // CRUD OPERATION METHODS
    // ─────────────────────────────────────────────────────────────────────────────
    
    // Hapus item (DELETE operation)
    // 1. Confirm dialog untuk user confirmation
    // 2. Find index by kode
    // 3. Splice dari items array (modify in-place)
    deleteItem(item) {
      if (confirm(`Hapus "${item.judul}"?`)) {
        const idx = this.items.findIndex(i => i.kode === item.kode);
        if (idx !== -1) {
          this.items.splice(idx, 1);
        }
      }
    },

    // ─────────────────────────────────────────────────────────────────────────────
    // UTILITY METHODS
    // ─────────────────────────────────────────────────────────────────────────────
    
    // Reset semua filter dan sort kembali ke default state
    // Dipanggil dari tombol "Reset Filter" di template
    resetFilters() {
      this.filter = '';
      this.selectedUpbjj = '';
      this.selectedKategori = '';
      this.filterLowStock = false;
      this.sortBy = 'judul';
    }
  },

  // ════════════════════════════════════════════════════════════════════════════════
  // BAGIAN 4: WATCHERS - MONITORING STATE CHANGES (CRITERION 5: Watcher Functions)
  // ════════════════════════════════════════════════════════════════════════════════
  // Watchers adalah fungsi yang di-execute ketika dependency-nya berubah.
  // Digunakan untuk: side effects seperti logging, localStorage, API calls, etc.
  //
  // Terdapat 2 jenis watcher:
  // 1. Simple Watcher: monitor property atau computed property yang sederhana
  // 2. Deep Watcher: monitor nested properties di objects atau arrays (dengan deep: true option)
  //
  watch: {
    // ─────────────────────────────────────────────────────────────────────────────
    // SIMPLE WATCHERS (monitoring primitive values)
    // ─────────────────────────────────────────────────────────────────────────────
    
    // Watcher 1: Monitor perubahan filter text input
    // Side effect: Log ke console untuk audit/debugging
    // Dipicu ketika user mengetik di search input (v-model="filter")
    filter(newVal, oldVal) {
      if (newVal !== oldVal) {
        console.log(`Filter berubah dari "${oldVal}" menjadi "${newVal}"`);
      }
    },

    // Watcher 2: Monitor perubahan selectedUpbjj (region filter)
    // Side effect: Log ke console ketika user memilih region
    // Dipicu ketika user mengubah <select v-model="selectedUpbjj">
    selectedUpbjj(newVal, oldVal) {
      if (newVal !== oldVal) {
        console.log(`UPBJJ dipilih: ${newVal || 'Semua'}`);
      }
    },

    // ─────────────────────────────────────────────────────────────────────────────
    // DEEP WATCHERS (monitoring nested properties dalam objects/arrays)
    // ─────────────────────────────────────────────────────────────────────────────
    
    // Watcher 3: Deep watch items array
    // Digunakan karena items adalah array yang berisi objects dengan nested properties
    // Side effect: 
    //   - Log ke console setiap ada perubahan (add/edit/delete item)
    //   - Save ke localStorage untuk persistence (setiap perubahan qty/catatan)
    // Deep option: true → detect nested property changes (qty, catatan, dll)
    // Dipicu ketika:
    //   - Ditambah item baru (push)
    //   - Diubah qty item (items[i].qty = ...)
    //   - Diubah catatan item (items[i].catatanHTML = ...)
    //   - Dihapus item (splice)
    items: {
      handler(newItems) {
        console.log(`Data items berubah. Total items: ${newItems.length}`);
        localStorage.setItem('stockData', JSON.stringify(newItems));
      },
      deep: true
    },

    // Watcher 4: Deep watch newItem form object
    // Digunakan untuk monitor input form saat user menambah stock baru
    // Side effect: Log ke console untuk debugging form input
    // Deep option: true → detect nested property changes (kode, judul, qty, dll)
    // Dipicu ketika:
    //   - User mengetik di input kode (newItem.kode = ...)
    //   - User mengetik di input judul (newItem.judul = ...)
    //   - User mengubah qty/harga/safety (newItem.qty = ...)
    newItem: {
      handler(newItem) {
        console.log('Form tambah stock sedang diisi:', newItem.kode, newItem.judul);
      },
      deep: true
    }
  },

  // ════════════════════════════════════════════════════════════════════════════════
  // BAGIAN 5: LIFECYCLE HOOKS - Initialization & Cleanup
  // ════════════════════════════════════════════════════════════════════════════════
  // Lifecycle hooks adalah fungsi yang di-execute pada tahap tertentu lifecycle Vue app
  //
  // Tahapan lifecycle Vue 3:
  // 1. setup() - Composition API setup
  // 2. beforeCreate() - sebelum instance dibuat
  // 3. created() - instance sudah dibuat, data ready, belum render DOM
  // 4. beforeMount() - sebelum mount ke DOM
  // 5. mounted() ← Digunakan di sini - component sudah di-render dan siap
  // 6. beforeUpdate() - sebelum update
  // 7. updated() - sudah update
  // 8. beforeUnmount() - sebelum dihapus
  // 9. unmounted() - sudah dihapus
  //
  mounted() {
    // Load data dari global variable stok (dataBahanAjar.js)
    // Dijalankan setelah component selesai di-render ke DOM
    // Gunakan typeof check untuk memastikan variable sudah di-define
    
    console.log('✅ Vue app mounted. Checking global variables...');
    console.log('typeof stok:', typeof stok);
    console.log('typeof kategoriList:', typeof kategoriList);
    console.log('typeof upbjjList:', typeof upbjjList);
    
    if (typeof stok !== 'undefined') {
      this.items = JSON.parse(JSON.stringify(stok));  // Deep copy for safety
      console.log('✅ Data stock berhasil dimuat:', this.items.length, 'item');
      console.log('Items:', this.items);
    } else {
      console.error('❌ Variable stock tidak ditemukan di dataBahanAjar.js');
      console.error('Available globals:', Object.keys(window));
    }

    // Load kategori dan upbjj dari global jika ada
    if (typeof kategoriList !== 'undefined') {
      this.kategoriList = kategoriList;
      console.log('✅ kategoriList dimuat:', this.kategoriList);
    }
    if (typeof upbjjList !== 'undefined') {
      this.upbjjList = upbjjList;
      console.log('✅ upbjjList dimuat:', this.upbjjList);
    }
    
    console.log('✅ Vue app ready. All data loaded.');
    console.log('Methods available:', typeof this.showDetail, typeof this.addItem, typeof this.showAddModalForm);
  }
}).mount('#stockApp');
