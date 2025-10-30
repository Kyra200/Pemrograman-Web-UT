/* Gabungan script untuk semua halaman.
  File ini menggabungkan login.js, dashboard.js, stock.js dan tracking.js
  serta melindungi akses DOM sehingga bisa di-include pada halaman mana
  pun tanpa menyebabkan error jika elemen tertentu tidak ada.
  Fungsi yang direferensikan secara inline (mis. showDetail) tetap
  diekspos pada scope global.
*/

// -- Shared keys
const userTokenKey = "authToken";
const userNameKey = "user";

// -- Utility helpers
/* safeGet(id)
   - Tujuan: pembungkus kecil untuk document.getElementById yang mengembalikan
     null jika elemen tidak ada. Digunakan untuk mencegah error runtime ketika
     script gabungan dimuat pada halaman yang tidak punya semua elemen.
   - Dipakai di: semua halaman (login, dashboard, stock, tracking)
*/
function safeGet(id) {
  return document.getElementById(id);
}

function showPesan(element, text, type) {
  /* showPesan(element, text, type)
     - Tujuan: menampilkan pesan singkat (error atau success) di dalam elemen
       kontainer. Menambahkan kelas `pesan error` atau `pesan success` dan
       menghapus kelas success setelah beberapa detik.
     - Digunakan oleh: alur login/daftar (index.html) dan modal reset password.
  */
  if (!element) return;
  element.textContent = text;
  element.className = `pesan ${type}`;

  if (type === "success") {
    setTimeout(() => {
      if (element) element.className = "pesan";
    }, 3000);
  }
}

function setLoading(button, isLoading) {
  /* setLoading(button, isLoading)
    - Tujuan: men-toggle state loading pada tombol (mendisable + menampilkan teks spinner).
    - Digunakan oleh: login/daftar/reset password pada `index.html`.
  */
  if (!button) return;
  button.disabled = isLoading;
  if (isLoading) {
    button.innerHTML = '<span class="spinner"></span>Loading...';
  } else {
    const buttonArray = {
      login: "Login",
      kirimLink: "Kirim Link Reset",
      simpanDaftar: "Daftar Sekarang",
    };
    button.textContent = buttonArray[button.id] || "submit";
  }
}

function openModal(modal) {
  /* openModal(modal)
     - Tujuan: menampilkan modal overlay secara konsisten (menambahkan kelas
       `active` dan mencegah scroll pada body). Digunakan oleh modal daftar,
       lupa password, dan modal detail stock.
     - Digunakan oleh: index.html (register/lupa), stock.html (detail modal)
  */
  if (!modal) return;
  modal.classList.add("active");
  document.body.style.overflow = "hidden";
}

function closeModal(modal) {
  /* closeModal(modal)
    - Tujuan: menutup modal yang sebelumnya dibuka dengan openModal.
    - Digunakan oleh: index.html dan stock.html
  */
  if (!modal) return;
  modal.classList.remove("active");
  document.body.style.overflow = "";
}

// -- Dashboard / auth helpers
function cekLogin() {
  /* cekLogin()
     - Tujuan: menerapkan cek otentikasi sederhana di sisi klien menggunakan
       localStorage (`authToken`, `user`). Jika halaman berisi elemen dashboard
       namun user belum login, akan diarahkan ke `index.html`.
     - Digunakan oleh: dashboard.html (dipanggil saat DOMContentLoaded). Catatan:
       ini hanya guard ringan untuk demo statis (bukan pengamanan server-side).
  */
  const token = localStorage.getItem(userTokenKey);
  const username = localStorage.getItem(userNameKey);

  // Only run protection if the page contains dashboard-specific elements
  const needsAuth = !!(
    safeGet("greeting") || safeGet("logoutButton") || safeGet("loggedInUser")
  );

  if (!needsAuth) return; // not a protected page

  if (token && username) {
    const userDisplay = safeGet("loggedInUser");
    if (userDisplay) userDisplay.textContent = username;
    updateGreeting(username);
  } else {
    alert("Anda belum login. Silakan masuk kembali.");
    window.location.href = "index.html";
  }

  const logoutButton = safeGet("logoutButton");
  if (logoutButton) logoutButton.addEventListener("click", logoutUser);
}

function updateGreeting(username) {
  /* updateGreeting(username)
     - Tujuan: mengisi teks sapaan di elemen `#greeting` berdasarkan waktu hari ini.
     - Digunakan oleh: dashboard.html (dan halaman lain yang menyertakan elemen
       greeting secara tersembunyi).
  */
  const el = safeGet("greeting");
  if (!el) return;
  const date = new Date();
  const hour = date.getHours();
  let greetingText;

  if (hour >= 4 && hour < 12) {
    greetingText = "Selamat Pagi";
  } else if (hour >= 12 && hour < 15) {
    greetingText = "Selamat Siang";
  } else if (hour >= 15 && hour < 18) {
    greetingText = "Selamat Sore";
  } else {
    greetingText = "Selamat Malam";
  }

  el.textContent = `${greetingText}, ${username}!`;
}

function logoutUser() {
  /* logoutUser()
     - Tujuan: menghapus kunci otentikasi dari localStorage dan mengarahkan
       kembali ke `index.html`.
     - Digunakan oleh: dashboard.html melalui tombol `Keluar` (`onclick="logoutUser()"`).
  */
  localStorage.removeItem(userTokenKey);
  localStorage.removeItem(userNameKey);
  alert("Anda telah logout.");
  window.location.href = "index.html";
}

// -- Stock / UI helpers
function jumlahStok(stok) {
  /* jumlahStok(stok)
     - Tujuan: helper kecil yang memetakan angka stok ke kelas CSS untuk badge
       visual (`stok-tinggi`, `stok-sedang`, `stok-rendah`).
     - Digunakan oleh: stock.html saat merender tabel bahan ajar.
  */
  if (stok > 400) return "stok-tinggi";
  if (stok > 150) return "stok-sedang";
  return "stok-rendah";
}

function dataTabel() {
  /* dataTabel()
     - Tujuan: merender isi tabel inventori dari array global `dataBahanAjar`.
       Membuat baris dan menambahkan `onclick` inline untuk membuka modal detail
       melalui fungsi global `showDetail(index)`.
     - Digunakan oleh: stock.html (dipanggil saat inisialisasi bila tabel ada).
  */
  const tableBody = safeGet("tableBody");
  if (!tableBody || typeof dataBahanAjar === "undefined") return;
  tableBody.innerHTML = "";

  dataBahanAjar.forEach((item, index) => {
    const row = document.createElement("tr");
    row.innerHTML = `
          <td><span class="badge">${item.kodeLokasi}</span></td>
          <td><span class="kode-barang">${item.kodeBarang}</span></td>
          <td>${item.namaBarang}</td>
          <td><span class="badge">${item.jenisBarang}</span></td>
          <td>${item.edisi}</td>
          <td><span class="stok-badge ${jumlahStok(item.stok)}">${item.stok} unit</span></td>
          <td><button class="btn-details" onclick="showDetail(${index})">Detail</button></td>
        `;
    tableBody.appendChild(row);
  });
}

function showDetail(index) {
  /* showDetail(index)
     - Tujuan: mengisi dan membuka modal detail bahan ajar untuk item yang
       dipilih. Dibiarkan global karena dipanggil dari attribute inline
       `onclick` pada baris tabel.
     - Digunakan oleh: stock.html (modal detail). Diekspos global di bagian bawah.
  */
  if (typeof dataBahanAjar === "undefined") return;
  const item = dataBahanAjar[index];
  if (!item) return;
  const modal = safeGet("modalDetailBahanAjar");
  const modalBody = safeGet("modalBody");
  if (!modal || !modalBody) return;

  modalBody.innerHTML = `
    <img src="img/${item.cover}" alt="${item.namaBarang}" class="book-cover">
    <div class="detail-item">
      <div class="detail-label">Kode Lokasi:</div>
      <div class="detail-value">${item.kodeLokasi}</div>
    </div>
    <div class="detail-item">
      <div class="detail-label">Kode Barang:</div>
      <div class="detail-value">${item.kodeBarang}</div>
    </div>
    <div class="detail-item">
      <div class="detail-label">Nama Barang:</div>
      <div class="detail-value">${item.namaBarang}</div>
    </div>
    <div class="detail-item">
      <div class="detail-label">Jenis Barang:</div>
      <div class="detail-value">${item.jenisBarang}</div>
    </div>
    <div class="detail-item">
      <div class="detail-label">Edisi:</div>
      <div class="detail-value">Edisi ${item.edisi}</div>
    </div>
    <div class="detail-item">
      <div class="detail-label">Stok:</div>
      <div class="detail-value"><span class="stok-badge ${jumlahStok(item.stok)}">${item.stok} unit</span></div>
    </div>
  `;

  openModal(modal);
}

// Close button handler for stock modal
const closeBahanAjar = safeGet("closeBahanAjar");
if (closeBahanAjar) {
  closeBahanAjar.addEventListener("click", () => {
    closeModal(safeGet("modalDetailBahanAjar"));
  });
}

// Global click to close modal if clicked outside (only acts if modal exists)
window.addEventListener("click", (event) => {
  const modal = safeGet("modalDetailBahanAjar");
  if (modal && event.target === modal) {
    closeModal(modal);
  }
});

// -- Tracking page
function initTracking() {
  /* initTracking()
     - Tujuan: menghubungkan form pelacakan (`#formLacak`) untuk mencari data
       di `dataTracking[noResi]` dan merender kartu hasil + timeline perjalanan.
     - Digunakan oleh: tracking.html saja (fungsi menjadi no-op bila elemen tidak ada).
  */
  const noResi = safeGet("noResi");
  const formResi = safeGet("formLacak");
  if (!noResi || !formResi || typeof dataTracking === "undefined") return;

  formResi.addEventListener("submit", (e) => {
    e.preventDefault();
    const nomerResi = noResi.value.trim();
    if (!nomerResi) {
      alert("No Resi kosong, harap isi terlebih dahulu");
      return;
    }
    const validasiTracking = dataTracking[nomerResi];

    if (validasiTracking) {
      const cardResult = safeGet("cardResult");
      const timelineResult = safeGet("timelineResult");
      if (cardResult) cardResult.style.display = "block";
      if (timelineResult) timelineResult.style.display = "block";

      const header = document.querySelector(".card-header");
      const number = document.querySelector(".card-number");
      const details = document.querySelector(".card-details");
      if (header) header.textContent = validasiTracking.nama;
      if (number) number.textContent = validasiTracking.nomorDO;
      if (details)
        details.innerHTML = `
      ${validasiTracking.status} >> ${validasiTracking.ekspedisi}<br />
      Paket: ${validasiTracking.paket} | Total: ${validasiTracking.total}
    `;

      const timeline = document.querySelector(".timeline");
      if (timeline) {
        timeline.innerHTML = "";
        validasiTracking.perjalanan.forEach((item) => {
          const timelineItem = document.createElement("div");
          timelineItem.className = "timeline-item";
          timelineItem.innerHTML = `
        <div class="timeline-content">
          <div class="timeline-text">${item.keterangan}</div>
          <div class="timeline-date">${item.waktu}</div>
        </div>
      `;
          timeline.appendChild(timelineItem);
        });
      }
    } else {
      const cardResult = safeGet("cardResult");
      const timelineResult = safeGet("timelineResult");
      if (cardResult) cardResult.style.display = "none";
      if (timelineResult) timelineResult.style.display = "none";
      alert("Nomor resi tidak ditemukan");
    }
  });
}

// -- Login page
function initLogin() {
  /* initLogin()
     - Tujuan: memasang handler untuk form login, modal lupa password, dan
       form pendaftaran. Semua operasi dilakukan terhadap data in-memory
       `dataPengguna` dari `js/data.js`.
     - Digunakan oleh: index.html (alur login/daftar). Pada halaman lain
       fungsi ini tidak melakukan apa-apa jika elemen tidak ditemukan.
  */
  const userEl = safeGet("email");
  const passEl = safeGet("password");
  const loginBtn = safeGet("login");
  const kirimBtn = safeGet("kirimLink");
  const daftarBtn = safeGet("simpanDaftar");
  const loginForm = safeGet("loginForm");
  const formLupaPass = safeGet("lupaPaswordForm");
  const registerForm = safeGet("registerForm");
  const registerPesan = safeGet("registerPesan");
  const pesanLupaPass = safeGet("pesanPasswordModal");
  const pesan = safeGet("pesan");
  const lupaPasswordBtn = safeGet("lupaPassword");
  const modalLupaPassword = safeGet("lupaPasswordModal");
  const closeModalLupaPassword = safeGet("closelupaPassword");
  const registerBtn = safeGet("register");
  const modalRegister = safeGet("registerModal");
  const closeModalRegister = safeGet("closeRegister");

  if (loginForm) {
    loginForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const username = (userEl && userEl.value) ? userEl.value.trim() : "";
      const password = (passEl && passEl.value) ? passEl.value.trim() : "";
      const validasiLogin = typeof dataPengguna !== "undefined"
        ? dataPengguna.find((pengguna) => pengguna.email === username && pengguna.password === password)
        : null;

      setLoading(loginBtn, true);
      const tempToken = `Prz${Date.now()}${Math.random().toString(20).substring(2, 9)}`;
      localStorage.setItem(userTokenKey, tempToken);

      const token = localStorage.getItem(userTokenKey);

      setTimeout(() => {
        if (validasiLogin && token) {
          let nama = validasiLogin.nama;
          localStorage.setItem(userNameKey, nama);

          showPesan(pesan, "Login berhasil! Mengalihkan...", "success");
          loginForm.reset();
          setTimeout(() => {
            window.location = "dashboard.html";
          }, 1500);
        } else {
          showPesan(pesan, "Gagal Email atau Password Salah", "error");
          loginForm.reset();
        }
        setLoading(loginBtn, false);
      }, 1000);
    });
  }

  if (registerBtn && modalRegister) {
    registerBtn.addEventListener("click", () => openModal(modalRegister));
  }
  if (lupaPasswordBtn && modalLupaPassword) {
    lupaPasswordBtn.addEventListener("click", () => openModal(modalLupaPassword));
  }
  if (closeModalLupaPassword) {
    closeModalLupaPassword.addEventListener("click", () => closeModal(modalLupaPassword));
  }
  if (closeModalRegister) {
    closeModalRegister.addEventListener("click", () => closeModal(modalRegister));
  }

  if (formLupaPass) {
    formLupaPass.addEventListener("submit", function (e) {
      e.preventDefault();
      const email = (safeGet("lupaEmail") && safeGet("lupaEmail").value) ? safeGet("lupaEmail").value.trim() : "";
      if (!email) {
        showPesan(pesanLupaPass, "Email tidak boleh kosong", "error");
        return;
      }
      setLoading(kirimBtn, true);

      const validasiEmail = typeof dataPengguna !== "undefined" ? dataPengguna.find((pengguna) => pengguna.email === email) : null;
      if (validasiEmail) {
        setTimeout(() => {
          showPesan(pesanLupaPass, "Link reset password telah dikirim ke email Anda!", "success");
          setLoading(kirimBtn, false);
          setTimeout(() => {
            closeModal(modalLupaPassword);
            formLupaPass.reset();
            if (pesanLupaPass) pesanLupaPass.className = "message";
          }, 2000);
        }, 1500);
      } else {
        setTimeout(() => {
          showPesan(pesanLupaPass, "Email tidak ditemukan, masukan email dengan benar!", "error");
          setLoading(kirimBtn, false);
        }, 2000);
      }
    });
  }

  if (registerForm) {
    registerForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const namaLengkap = (safeGet("namaLengkap") && safeGet("namaLengkap").value) ? safeGet("namaLengkap").value.trim() : "";
      const email = (safeGet("emailBaru") && safeGet("emailBaru").value) ? safeGet("emailBaru").value.trim() : "";
      const password = (safeGet("passwordBaru") && safeGet("passwordBaru").value) ? safeGet("passwordBaru").value : "";
      const lokasi = (safeGet("lokasiBaru") && safeGet("lokasiBaru").value) ? safeGet("lokasiBaru").value : "";

      if (password.length < 8) {
        setTimeout(() => showPesan(registerPesan, "Password minimal 8 karakter!", "error"), 1500);
        return;
      }

      const cekEmail = typeof dataPengguna !== "undefined" ? dataPengguna.some((pengguna) => pengguna.email === email) : false;
      if (cekEmail) {
        setTimeout(() => showPesan(registerPesan, "Email sudah terdaftar. Silakan gunakan email lain.", "error"), 1500);
        return;
      }

      setLoading(daftarBtn, true);

      const newId = (typeof dataPengguna !== "undefined") ? dataPengguna.length + 1 : 1;
      const newUser = {
        id: newId,
        nama: namaLengkap,
        email: email,
        password: password,
        role: "UPBJJ-UT",
        lokasi: lokasi,
      };

      if (typeof dataPengguna !== "undefined") dataPengguna.push(newUser);

      showPesan(registerPesan, "Pendaftaran berhasil! Silakan login.", "success");
      setLoading(daftarBtn, false);

      setTimeout(() => {
        closeModal(modalRegister);
        registerForm.reset();
        if (registerPesan) registerPesan.className = "message";
      }, 2000);
    });
  }
}

// -- Navigation toggle (dashboard header)
function initNav() {
  /* initNav()
     - Tujuan: menginisialisasi interaksi navbar (toggle hamburger, dropdown)
       yang digunakan pada halaman dashboard/stock/tracking yang menyertakan
       navigasi situs.
     - Digunakan oleh: dashboard.html, stock.html, tracking.html.
  */
  const hamburger = safeGet("hamburger");
  const navLinks = document.querySelector(".nav-links");
  const navOverlay = safeGet("nav-overlay");
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

// -- Init on DOMContentLoaded: run only the initializers that apply to the page
document.addEventListener("DOMContentLoaded", () => {
  // Jalankan inisialisasi spesifik-halaman. Setiap inisialisasi memeriksa
  // keberadaan elemen sehingga script gabungan aman untuk di-include di seluruh situs.
  cekLogin();    // dashboard guard & greeting
  initNav();     // navbar interactions (if navbar exists)
  dataTabel();   // stock table (if table exists)
  initLogin();   // login/register handlers (if login form exists)
  initTracking(); // tracking form (if tracking form exists)
});

// Expose showDetail globally for inline onclick use
window.showDetail = showDetail;
