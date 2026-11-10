(function (global) {
  "use strict";

  var PRODUCT_NAME = "BookingYukk!";
  var DATA_KEY = "namaproduk_demo_data_v1";
  var SESSION_KEY = "namaproduk_demo_session_v1";

  function client() {
    if (!global.NamaProdukSupabase) {
      throw new Error("Koneksi Supabase belum siap. Periksa URL, key, dan koneksi internet.");
    }
    return global.NamaProdukSupabase;
  }

  function throwIfError(result) {
    if (result.error) {
      throw new Error(result.error.message || "Permintaan ke database gagal.");
    }
    return result.data;
  }

  function toTime(value) {
    return String(value || "").slice(0, 5);
  }

  function minutes(time) {
    var parts = toTime(time).split(":").map(Number);
    return (parts[0] || 0) * 60 + (parts[1] || 0);
  }

  function timeFromMinutes(value) {
    return String(Math.floor(value / 60)).padStart(2, "0") + ":" + String(value % 60).padStart(2, "0");
  }

  function dateInJakarta() {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Jakarta",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
  }

  function mapMitra(row) {
    if (!row) return null;
    return {
      id: row.id,
      slug: row.slug,
      nama: row.nama,
      kategori: row.kategori,
      alamat: row.alamat,
      telepon: row.telepon,
      jamMulai: toTime(row.jam_mulai || "09:00"),
      jamSelesai: toTime(row.jam_selesai || "18:00"),
    };
  }

  function mapLayanan(row) {
    return {
      id: row.id,
      mitraId: row.mitra_id,
      nama: row.nama,
      durasi: Number(row.durasi || 30),
      harga: Number(row.harga || 0),
    };
  }

  function mapBooking(row) {
    var relatedService = Array.isArray(row.layanan) ? row.layanan[0] : row.layanan;
    return {
      id: row.id,
      kode: row.kode,
      mitraId: row.mitra_id,
      layananId: row.layanan_id,
      layananNama: relatedService ? relatedService.nama : "Layanan",
      durasi: Number(row.durasi_menit || (relatedService ? relatedService.durasi : 30)),
      jumlahOrang: Number(row.jumlah_orang || 1),
      hargaLayanan: Number(relatedService ? relatedService.harga : 0),
      tanggal: row.tanggal,
      dibuatPada: row.dibuat_pada,
      jamMulai: toTime(row.jam_mulai),
      jamSelesai: toTime(row.jam_selesai),
      nama: row.nama,
      telepon: row.telepon,
      status: row.status,
    };
  }

  /* Demo / Fallback Store */
  function shiftDate(baseDate, offsetDays) {
    var parts = baseDate.split("-").map(Number);
    var d = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
    d.setUTCDate(d.getUTCDate() + offsetDays);
    return d.toISOString().slice(0, 10);
  }

  function generateSampleBookings() {
    var todayStr = dateInJakarta();
    var bookings = [
      // Hari ini (Barbershop Rapi)
      { id: "bk-rapi-01", kode: "BY-8821", mitraId: "mitra-rapi", layananId: "layanan-rapi-2", layananNama: "Potong + keramas", durasi: 60, jumlahOrang: 1, hargaLayanan: 55000, tanggal: todayStr, jamMulai: "10:00", jamSelesai: "11:00", nama: "Rizky Ramadhan", telepon: "081234567890", status: "diterima", dibuatPada: todayStr + "T08:15:00.000Z" },
      { id: "bk-rapi-02", kode: "BY-7712", mitraId: "mitra-rapi", layananId: "layanan-rapi-1", layananNama: "Potong rambut", durasi: 30, jumlahOrang: 1, hargaLayanan: 35000, tanggal: todayStr, jamMulai: "11:30", jamSelesai: "12:00", nama: "Dimas Prasetyo", telepon: "085712345678", status: "diterima", dibuatPada: todayStr + "T09:00:00.000Z" },
      { id: "bk-rapi-03", kode: "BY-6623", mitraId: "mitra-rapi", layananId: "layanan-rapi-3", layananNama: "Rapikan jenggot", durasi: 30, jumlahOrang: 1, hargaLayanan: 25000, tanggal: todayStr, jamMulai: "13:00", jamSelesai: "13:30", nama: "Farhan Maulana", telepon: "081398765432", status: "menunggu", dibuatPada: todayStr + "T09:45:00.000Z" },
      { id: "bk-rapi-04", kode: "BY-5534", mitraId: "mitra-rapi", layananId: "layanan-rapi-1", layananNama: "Potong rambut", durasi: 30, jumlahOrang: 1, hargaLayanan: 35000, tanggal: todayStr, jamMulai: "14:00", jamSelesai: "14:30", nama: "Budi Santoso", telepon: "082155667788", status: "menunggu", dibuatPada: todayStr + "T10:10:00.000Z" },
      { id: "bk-rapi-05", kode: "BY-4415", mitraId: "mitra-rapi", layananId: "layanan-rapi-2", layananNama: "Potong + keramas", durasi: 60, jumlahOrang: 1, hargaLayanan: 55000, tanggal: todayStr, jamMulai: "15:30", jamSelesai: "16:30", nama: "Kevin Ardiansyah", telepon: "087811223344", status: "diterima", dibuatPada: todayStr + "T10:30:00.000Z" },

      // Kemarin (Hari -1)
      { id: "bk-rapi-06", kode: "BY-3301", mitraId: "mitra-rapi", layananId: "layanan-rapi-1", layananNama: "Potong rambut", durasi: 30, jumlahOrang: 1, hargaLayanan: 35000, tanggal: shiftDate(todayStr, -1), jamMulai: "09:30", jamSelesai: "10:00", nama: "Ahmad Fauzi", telepon: "081299887766", status: "diterima", dibuatPada: shiftDate(todayStr, -1) + "T08:00:00.000Z" },
      { id: "bk-rapi-07", kode: "BY-3302", mitraId: "mitra-rapi", layananId: "layanan-rapi-2", layananNama: "Potong + keramas", durasi: 60, jumlahOrang: 1, hargaLayanan: 55000, tanggal: shiftDate(todayStr, -1), jamMulai: "11:00", jamSelesai: "12:00", nama: "Doni Pratama", telepon: "085611224455", status: "diterima", dibuatPada: shiftDate(todayStr, -1) + "T09:30:00.000Z" },
      { id: "bk-rapi-08", kode: "BY-3303", mitraId: "mitra-rapi", layananId: "layanan-rapi-3", layananNama: "Rapikan jenggot", durasi: 30, jumlahOrang: 1, hargaLayanan: 25000, tanggal: shiftDate(todayStr, -1), jamMulai: "14:00", jamSelesai: "14:30", nama: "Rian Hidayat", telepon: "081822334455", status: "diterima", dibuatPada: shiftDate(todayStr, -1) + "T11:00:00.000Z" },
      { id: "bk-rapi-09", kode: "BY-3304", mitraId: "mitra-rapi", layananId: "layanan-rapi-1", layananNama: "Potong rambut", durasi: 30, jumlahOrang: 1, hargaLayanan: 35000, tanggal: shiftDate(todayStr, -1), jamMulai: "15:00", jamSelesai: "15:30", nama: "Fikri Ramli", telepon: "082233445566", status: "dibatalkan", dibuatPada: shiftDate(todayStr, -1) + "T13:00:00.000Z" },

      // Hari -2
      { id: "bk-rapi-10", kode: "BY-3201", mitraId: "mitra-rapi", layananId: "layanan-rapi-2", layananNama: "Potong + keramas", durasi: 60, jumlahOrang: 1, hargaLayanan: 55000, tanggal: shiftDate(todayStr, -2), jamMulai: "10:00", jamSelesai: "11:00", nama: "Gideon Halim", telepon: "081900112233", status: "diterima", dibuatPada: shiftDate(todayStr, -2) + "T09:00:00.000Z" },
      { id: "bk-rapi-11", kode: "BY-3202", mitraId: "mitra-rapi", layananId: "layanan-rapi-1", layananNama: "Potong rambut", durasi: 30, jumlahOrang: 1, hargaLayanan: 35000, tanggal: shiftDate(todayStr, -2), jamMulai: "11:30", jamSelesai: "12:00", nama: "Aris Munandar", telepon: "081277665544", status: "diterima", dibuatPada: shiftDate(todayStr, -2) + "T10:00:00.000Z" },
      { id: "bk-rapi-12", kode: "BY-3203", mitraId: "mitra-rapi", layananId: "layanan-rapi-1", layananNama: "Potong rambut", durasi: 30, jumlahOrang: 1, hargaLayanan: 35000, tanggal: shiftDate(todayStr, -2), jamMulai: "13:30", jamSelesai: "14:00", nama: "Bayu Wicaksono", telepon: "087788990011", status: "diterima", dibuatPada: shiftDate(todayStr, -2) + "T11:00:00.000Z" },
      { id: "bk-rapi-13", kode: "BY-3204", mitraId: "mitra-rapi", layananId: "layanan-rapi-2", layananNama: "Potong + keramas", durasi: 60, jumlahOrang: 1, hargaLayanan: 55000, tanggal: shiftDate(todayStr, -2), jamMulai: "14:30", jamSelesai: "15:30", nama: "Surya Kencana", telepon: "081344556677", status: "diterima", dibuatPada: shiftDate(todayStr, -2) + "T12:00:00.000Z" },
      { id: "bk-rapi-14", kode: "BY-3205", mitraId: "mitra-rapi", layananId: "layanan-rapi-3", layananNama: "Rapikan jenggot", durasi: 30, jumlahOrang: 1, hargaLayanan: 25000, tanggal: shiftDate(todayStr, -2), jamMulai: "16:00", jamSelesai: "16:30", nama: "Teguh Santika", telepon: "085699887766", status: "diterima", dibuatPada: shiftDate(todayStr, -2) + "T13:00:00.000Z" },
      { id: "bk-rapi-15", kode: "BY-3206", mitraId: "mitra-rapi", layananId: "layanan-rapi-1", layananNama: "Potong rambut", durasi: 30, jumlahOrang: 1, hargaLayanan: 35000, tanggal: shiftDate(todayStr, -2), jamMulai: "16:30", jamSelesai: "17:00", nama: "Fajar Nugraha", telepon: "081233445566", status: "dibatalkan", dibuatPada: shiftDate(todayStr, -2) + "T14:00:00.000Z" },

      // Hari -3
      { id: "bk-rapi-16", kode: "BY-3101", mitraId: "mitra-rapi", layananId: "layanan-rapi-2", layananNama: "Potong + keramas", durasi: 60, jumlahOrang: 1, hargaLayanan: 55000, tanggal: shiftDate(todayStr, -3), jamMulai: "10:30", jamSelesai: "11:30", nama: "Yudi Purnomo", telepon: "081122334455", status: "diterima", dibuatPada: shiftDate(todayStr, -3) + "T09:00:00.000Z" },
      { id: "bk-rapi-17", kode: "BY-3102", mitraId: "mitra-rapi", layananId: "layanan-rapi-1", layananNama: "Potong rambut", durasi: 30, jumlahOrang: 1, hargaLayanan: 35000, tanggal: shiftDate(todayStr, -3), jamMulai: "13:00", jamSelesai: "13:30", nama: "Wahyu Setiawan", telepon: "085233445566", status: "diterima", dibuatPada: shiftDate(todayStr, -3) + "T10:00:00.000Z" },
      { id: "bk-rapi-18", kode: "BY-3103", mitraId: "mitra-rapi", layananId: "layanan-rapi-3", layananNama: "Rapikan jenggot", durasi: 30, jumlahOrang: 1, hargaLayanan: 25000, tanggal: shiftDate(todayStr, -3), jamMulai: "15:00", jamSelesai: "15:30", nama: "Galih Pratama", telepon: "081399887711", status: "diterima", dibuatPada: shiftDate(todayStr, -3) + "T11:00:00.000Z" },
      { id: "bk-rapi-19", kode: "BY-3104", mitraId: "mitra-rapi", layananId: "layanan-rapi-1", layananNama: "Potong rambut", durasi: 30, jumlahOrang: 1, hargaLayanan: 35000, tanggal: shiftDate(todayStr, -3), jamMulai: "16:00", jamSelesai: "16:30", nama: "Indra Kusuma", telepon: "087811992288", status: "diterima", dibuatPada: shiftDate(todayStr, -3) + "T12:00:00.000Z" },

      // Hari -4
      { id: "bk-rapi-20", kode: "BY-3001", mitraId: "mitra-rapi", layananId: "layanan-rapi-1", layananNama: "Potong rambut", durasi: 30, jumlahOrang: 1, hargaLayanan: 35000, tanggal: shiftDate(todayStr, -4), jamMulai: "09:30", jamSelesai: "10:00", nama: "Rendi Saputra", telepon: "081255443322", status: "diterima", dibuatPada: shiftDate(todayStr, -4) + "T08:00:00.000Z" },
      { id: "bk-rapi-21", kode: "BY-3002", mitraId: "mitra-rapi", layananId: "layanan-rapi-2", layananNama: "Potong + keramas", durasi: 60, jumlahOrang: 1, hargaLayanan: 55000, tanggal: shiftDate(todayStr, -4), jamMulai: "11:00", jamSelesai: "12:00", nama: "Satria Dewa", telepon: "085611778899", status: "diterima", dibuatPada: shiftDate(todayStr, -4) + "T09:00:00.000Z" },
      { id: "bk-rapi-22", kode: "BY-3003", mitraId: "mitra-rapi", layananId: "layanan-rapi-1", layananNama: "Potong rambut", durasi: 30, jumlahOrang: 1, hargaLayanan: 35000, tanggal: shiftDate(todayStr, -4), jamMulai: "14:00", jamSelesai: "14:30", nama: "Gilang Ramadhan", telepon: "081922334488", status: "diterima", dibuatPada: shiftDate(todayStr, -4) + "T10:00:00.000Z" },

      // Hari -5
      { id: "bk-rapi-23", kode: "BY-2901", mitraId: "mitra-rapi", layananId: "layanan-rapi-2", layananNama: "Potong + keramas", durasi: 60, jumlahOrang: 1, hargaLayanan: 55000, tanggal: shiftDate(todayStr, -5), jamMulai: "10:00", jamSelesai: "11:00", nama: "Dodi Kurnia", telepon: "081277889900", status: "diterima", dibuatPada: shiftDate(todayStr, -5) + "T09:00:00.000Z" },
      { id: "bk-rapi-24", kode: "BY-2902", mitraId: "mitra-rapi", layananId: "layanan-rapi-1", layananNama: "Potong rambut", durasi: 30, jumlahOrang: 1, hargaLayanan: 35000, tanggal: shiftDate(todayStr, -5), jamMulai: "11:30", jamSelesai: "12:00", nama: "Hendra Wijaya", telepon: "085733221100", status: "diterima", dibuatPada: shiftDate(todayStr, -5) + "T10:00:00.000Z" },
      { id: "bk-rapi-25", kode: "BY-2903", mitraId: "mitra-rapi", layananId: "layanan-rapi-1", layananNama: "Potong rambut", durasi: 30, jumlahOrang: 1, hargaLayanan: 35000, tanggal: shiftDate(todayStr, -5), jamMulai: "13:00", jamSelesai: "13:30", nama: "Alif Pratama", telepon: "081355667788", status: "diterima", dibuatPada: shiftDate(todayStr, -5) + "T11:00:00.000Z" },
      { id: "bk-rapi-26", kode: "BY-2904", mitraId: "mitra-rapi", layananId: "layanan-rapi-3", layananNama: "Rapikan jenggot", durasi: 30, jumlahOrang: 1, hargaLayanan: 25000, tanggal: shiftDate(todayStr, -5), jamMulai: "14:00", jamSelesai: "14:30", nama: "Lukman Hakim", telepon: "087711223344", status: "diterima", dibuatPada: shiftDate(todayStr, -5) + "T12:00:00.000Z" },
      { id: "bk-rapi-27", kode: "BY-2905", mitraId: "mitra-rapi", layananId: "layanan-rapi-1", layananNama: "Potong rambut", durasi: 30, jumlahOrang: 1, hargaLayanan: 35000, tanggal: shiftDate(todayStr, -5), jamMulai: "15:00", jamSelesai: "15:30", nama: "Bima Arya", telepon: "082199887766", status: "diterima", dibuatPada: shiftDate(todayStr, -5) + "T13:00:00.000Z" },
      { id: "bk-rapi-28", kode: "BY-2906", mitraId: "mitra-rapi", layananId: "layanan-rapi-2", layananNama: "Potong + keramas", durasi: 60, jumlahOrang: 1, hargaLayanan: 55000, tanggal: shiftDate(todayStr, -5), jamMulai: "16:00", jamSelesai: "17:00", nama: "Tommy Gunawan", telepon: "081244556677", status: "diterima", dibuatPada: shiftDate(todayStr, -5) + "T14:00:00.000Z" },

      // Hari -6
      { id: "bk-rapi-29", kode: "BY-2801", mitraId: "mitra-rapi", layananId: "layanan-rapi-1", layananNama: "Potong rambut", durasi: 30, jumlahOrang: 1, hargaLayanan: 35000, tanggal: shiftDate(todayStr, -6), jamMulai: "10:00", jamSelesai: "10:30", nama: "Eko Prasetyo", telepon: "085622334455", status: "diterima", dibuatPada: shiftDate(todayStr, -6) + "T09:00:00.000Z" },
      { id: "bk-rapi-30", kode: "BY-2802", mitraId: "mitra-rapi", layananId: "layanan-rapi-2", layananNama: "Potong + keramas", durasi: 60, jumlahOrang: 1, hargaLayanan: 55000, tanggal: shiftDate(todayStr, -6), jamMulai: "11:30", jamSelesai: "12:30", nama: "Rio Febrian", telepon: "081311447788", status: "diterima", dibuatPada: shiftDate(todayStr, -6) + "T10:00:00.000Z" },
      { id: "bk-rapi-31", kode: "BY-2803", mitraId: "mitra-rapi", layananId: "layanan-rapi-1", layananNama: "Potong rambut", durasi: 30, jumlahOrang: 1, hargaLayanan: 35000, tanggal: shiftDate(todayStr, -6), jamMulai: "14:00", jamSelesai: "14:30", nama: "Panji Gumilang", telepon: "087833557799", status: "diterima", dibuatPada: shiftDate(todayStr, -6) + "T11:00:00.000Z" },
      { id: "bk-rapi-32", kode: "BY-2804", mitraId: "mitra-rapi", layananId: "layanan-rapi-3", layananNama: "Rapikan jenggot", durasi: 30, jumlahOrang: 1, hargaLayanan: 25000, tanggal: shiftDate(todayStr, -6), jamMulai: "15:30", jamSelesai: "16:00", nama: "Rudy Hartono", telepon: "081944668800", status: "diterima", dibuatPada: shiftDate(todayStr, -6) + "T12:00:00.000Z" },

      // Salon Senja
      { id: "bk-senja-01", kode: "BY-9101", mitraId: "mitra-senja", layananId: "layanan-senja-1", layananNama: "Cuci dan blow", durasi: 60, jumlahOrang: 1, hargaLayanan: 45000, tanggal: todayStr, jamMulai: "11:00", jamSelesai: "12:00", nama: "Siti Rahmawati", telepon: "081288990011", status: "diterima", dibuatPada: todayStr + "T08:30:00.000Z" },
      { id: "bk-senja-02", kode: "BY-9102", mitraId: "mitra-senja", layananId: "layanan-senja-2", layananNama: "Creambath", durasi: 90, jumlahOrang: 1, hargaLayanan: 75000, tanggal: todayStr, jamMulai: "13:30", jamSelesai: "15:00", nama: "Maya Anggraini", telepon: "085733445566", status: "menunggu", dibuatPada: todayStr + "T09:15:00.000Z" },
      { id: "bk-senja-03", kode: "BY-9103", mitraId: "mitra-senja", layananId: "layanan-senja-3", layananNama: "Potong rambut", durasi: 60, jumlahOrang: 1, hargaLayanan: 40000, tanggal: todayStr, jamMulai: "16:00", jamSelesai: "17:00", nama: "Nadya Permata", telepon: "087899887766", status: "diterima", dibuatPada: todayStr + "T10:00:00.000Z" },
      { id: "bk-senja-04", kode: "BY-9104", mitraId: "mitra-senja", layananId: "layanan-senja-2", layananNama: "Creambath", durasi: 90, jumlahOrang: 1, hargaLayanan: 75000, tanggal: shiftDate(todayStr, -1), jamMulai: "11:00", jamSelesai: "12:30", nama: "Tania Putri", telepon: "081322446688", status: "diterima", dibuatPada: shiftDate(todayStr, -1) + "T09:00:00.000Z" },
      { id: "bk-senja-05", kode: "BY-9105", mitraId: "mitra-senja", layananId: "layanan-senja-1", layananNama: "Cuci dan blow", durasi: 60, jumlahOrang: 1, hargaLayanan: 45000, tanggal: shiftDate(todayStr, -1), jamMulai: "14:00", jamSelesai: "15:00", nama: "Bella Safira", telepon: "085699775533", status: "diterima", dibuatPada: shiftDate(todayStr, -1) + "T10:00:00.000Z" },

      // Laundry Bersih
      { id: "bk-bersih-01", kode: "BY-8101", mitraId: "mitra-bersih", layananId: "layanan-bersih-2", layananNama: "Cuci express", durasi: 60, jumlahOrang: 2, hargaLayanan: 15000, tanggal: todayStr, jamMulai: "09:00", jamSelesai: "10:00", nama: "Dewi Lestari", telepon: "081311223344", status: "diterima", dibuatPada: todayStr + "T08:00:00.000Z" },
      { id: "bk-bersih-02", kode: "BY-8102", mitraId: "mitra-bersih", layananId: "layanan-bersih-1", layananNama: "Cuci dan setrika (reguler)", durasi: 60, jumlahOrang: 1, hargaLayanan: 8000, tanggal: todayStr, jamMulai: "11:00", jamSelesai: "12:00", nama: "Bambang Pamungkas", telepon: "082144556677", status: "menunggu", dibuatPada: todayStr + "T09:30:00.000Z" },
      { id: "bk-bersih-03", kode: "BY-8103", mitraId: "mitra-bersih", layananId: "layanan-bersih-3", layananNama: "Setrika saja", durasi: 30, jumlahOrang: 1, hargaLayanan: 6000, tanggal: todayStr, jamMulai: "14:00", jamSelesai: "14:30", nama: "Citra Kirana", telepon: "085677889900", status: "diterima", dibuatPada: todayStr + "T10:00:00.000Z" },
      { id: "bk-bersih-04", kode: "BY-8104", mitraId: "mitra-bersih", layananId: "layanan-bersih-1", layananNama: "Cuci dan setrika (reguler)", durasi: 60, jumlahOrang: 1, hargaLayanan: 8000, tanggal: shiftDate(todayStr, -1), jamMulai: "10:00", jamSelesai: "11:00", nama: "Hadi Pranoto", telepon: "087811335577", status: "diterima", dibuatPada: shiftDate(todayStr, -1) + "T09:00:00.000Z" }
    ];
    return bookings;
  }

  function createSeed() {
    var barbershop = {
      id: "mitra-rapi",
      slug: "barbershop-rapi",
      nama: "Barbershop Rapi",
      kategori: "Barbershop",
      alamat: "Jl. Melati No. 12, Bandung",
      telepon: "6285793830821",
      jamMulai: "09:00",
      jamSelesai: "17:00",
      email: "rapi@demo.id",
      password: "demo123"
    };
    var laundry = {
      id: "mitra-bersih",
      slug: "laundry-bersih",
      nama: "Laundry Bersih",
      kategori: "Laundry",
      alamat: "Jl. Mawar No. 8, Bandung",
      telepon: "6285793830821",
      jamMulai: "08:00",
      jamSelesai: "18:00",
      email: "bersih@demo.id",
      password: "demo123"
    };
    var salon = {
      id: "mitra-senja",
      slug: "salon-senja",
      nama: "Salon Senja",
      kategori: "Salon",
      alamat: "Jl. Anggrek No. 21, Bandung",
      telepon: "6285793830821",
      jamMulai: "10:00",
      jamSelesai: "19:00",
      email: "senja@demo.id",
      password: "demo123"
    };
    var mitraList = [barbershop, laundry, salon];
    var layananList = [
      { id: "layanan-rapi-1", mitraId: barbershop.id, nama: "Potong rambut", durasi: 30, harga: 35000 },
      { id: "layanan-rapi-2", mitraId: barbershop.id, nama: "Potong + keramas", durasi: 60, harga: 55000 },
      { id: "layanan-rapi-3", mitraId: barbershop.id, nama: "Rapikan jenggot", durasi: 30, harga: 25000 },
      { id: "layanan-bersih-1", mitraId: laundry.id, nama: "Cuci dan setrika (reguler)", durasi: 60, harga: 8000 },
      { id: "layanan-bersih-2", mitraId: laundry.id, nama: "Cuci express", durasi: 60, harga: 15000 },
      { id: "layanan-bersih-3", mitraId: laundry.id, nama: "Setrika saja", durasi: 30, harga: 6000 },
      { id: "layanan-senja-1", mitraId: salon.id, nama: "Cuci dan blow", durasi: 60, harga: 45000 },
      { id: "layanan-senja-2", mitraId: salon.id, nama: "Creambath", durasi: 90, harga: 75000 },
      { id: "layanan-senja-3", mitraId: salon.id, nama: "Potong rambut", durasi: 60, harga: 40000 }
    ];
    return { mitra: mitraList, layanan: layananList, booking: generateSampleBookings(), penutupan: [] };
  }

  function getDemoStore() {
    try {
      var raw = global.localStorage.getItem(DATA_KEY);
      if (!raw) {
        var seed = createSeed();
        global.localStorage.setItem(DATA_KEY, JSON.stringify(seed));
        return seed;
      }
      var store = JSON.parse(raw);
      if (!store.booking || store.booking.length === 0) {
        store.booking = generateSampleBookings();
        global.localStorage.setItem(DATA_KEY, JSON.stringify(store));
      }
      return store;
    } catch (e) {
      return createSeed();
    }
  }

  function saveDemoStore(data) {
    try {
      global.localStorage.setItem(DATA_KEY, JSON.stringify(data));
    } catch (e) {}
  }

  function generateDemoSlots(mitraId, layananId, tanggal, jumlahOrang) {
    var store = getDemoStore();
    var m = store.mitra.find(function (item) { return item.id === mitraId; }) || store.mitra[0];
    var l = store.layanan.find(function (item) { return item.id === layananId; }) || { durasi: 30 };
    var totalDurasi = Number(l.durasi) * (Number(jumlahOrang) || 1);
    var startM = minutes(m.jamMulai);
    var endM = minutes(m.jamSelesai);
    var bookings = store.booking.filter(function (b) { return b.mitraId === mitraId && b.tanggal === tanggal && b.status !== "dibatalkan"; });
    var closures = (store.penutupan || []).filter(function (c) { return c.mitraId === mitraId && c.tanggal === tanggal; });
    var slots = [];
    for (var s = startM; s + totalDurasi <= endM; s += 30) {
      var slotStart = s;
      var slotEnd = s + totalDurasi;
      var isBooked = bookings.some(function (b) {
        return slotStart < minutes(b.jamSelesai) && slotEnd > minutes(b.jamMulai);
      });
      var isClosed = closures.some(function (c) {
        return slotStart < minutes(c.jamSelesai) && slotEnd > minutes(c.jamMulai);
      });
      var isTersedia = !isBooked && !isClosed;
      slots.push({
        jamMulai: timeFromMinutes(slotStart),
        jamSelesai: timeFromMinutes(slotEnd),
        status: isBooked ? "terisi" : isClosed ? "ditutup" : "kosong",
        tersedia: isTersedia
      });
    }
    return slots;
  }

  function createDemoBooking(input) {
    var store = getDemoStore();
    var s = store.layanan.find(function (i) { return i.id === input.layananId; });
    var durasi = (s ? s.durasi : 30) * (Number(input.jumlahOrang) || 1);
    var endMinutes = minutes(input.jamMulai) + durasi;
    var jamSelesai = timeFromMinutes(endMinutes);
    var kode = "BY-" + Math.floor(1000 + Math.random() * 9000);
    var b = {
      id: "book-" + Date.now(),
      kode: kode,
      mitraId: input.mitraId,
      layananId: input.layananId,
      layananNama: s ? s.nama : "Layanan",
      durasi: durasi,
      jumlahOrang: Number(input.jumlahOrang) || 1,
      hargaLayanan: s ? s.harga : 0,
      tanggal: input.tanggal,
      jamMulai: input.jamMulai,
      jamSelesai: jamSelesai,
      nama: input.nama.trim(),
      telepon: input.telepon,
      status: "menunggu",
      dibuatPada: new Date().toISOString()
    };
    store.booking.unshift(b);
    saveDemoStore(store);
    return b;
  }

  var api = {
    PRODUCT_NAME: PRODUCT_NAME,

    async listMitra() {
      try {
        var result = await client()
          .from("mitra")
          .select("id, slug, nama, kategori, alamat")
          .order("nama");
        return throwIfError(result);
      } catch (err) {
        return getDemoStore().mitra.map(function (m) {
          return { id: m.id, slug: m.slug, nama: m.nama, kategori: m.kategori, alamat: m.alamat };
        });
      }
    },

    async listMitraDirektori() {
      try {
        var mitra = await api.listMitra();
        return Promise.all(mitra.map(async function (item) {
          var details = await Promise.all([
            api.listLayanan(item.id),
            api.getJadwalMingguan(item.id),
          ]);
          return {
            id: item.id,
            slug: item.slug,
            nama: item.nama,
            kategori: item.kategori,
            alamat: item.alamat,
            layanan: details[0],
            jadwal: details[1],
          };
        }));
      } catch (err) {
        var demo = getDemoStore();
        return demo.mitra.map(function (item) {
          return {
            id: item.id,
            slug: item.slug,
            nama: item.nama,
            kategori: item.kategori,
            alamat: item.alamat,
            layanan: demo.layanan.filter(function (l) { return l.mitraId === item.id; }),
            jadwal: [0, 1, 2, 3, 4, 5, 6].map(function (d) {
              return { hari: d, buka: true, jamMulai: item.jamMulai, jamSelesai: item.jamSelesai };
            })
          };
        });
      }
    },

    async getMitraBySlug(slug) {
      try {
        var result = await client()
          .from("mitra")
          .select("id, slug, nama, kategori, alamat, jam_mulai, jam_selesai")
          .eq("slug", slug)
          .maybeSingle();
        var profile = throwIfError(result);
        if (profile) {
          var mitra = mapMitra(profile);
          try {
            mitra.telepon = await api.getMitraPublicContact(slug);
          } catch (e) {
            mitra.telepon = "6285793830821";
          }
          return mitra;
        }
      } catch (err) {}
      var demo = getDemoStore().mitra.find(function (m) { return m.slug === slug; });
      return demo ? Object.assign({}, demo) : null;
    },

    async getMitraPublicContact(slug) {
      try {
        var result = await client().rpc("get_mitra_public_contact", {
          p_slug: slug,
        });
        return throwIfError(result);
      } catch (err) {
        var m = getDemoStore().mitra.find(function (item) { return item.slug === slug; });
        return m ? m.telepon : "6285793830821";
      }
    },

    async listLayanan(mitraId) {
      try {
        var result = await client()
          .from("layanan")
          .select("id, mitra_id, nama, durasi, harga")
          .eq("mitra_id", mitraId)
          .order("nama");
        return throwIfError(result).map(mapLayanan);
      } catch (err) {
        return getDemoStore().layanan.filter(function (l) { return l.mitraId === mitraId; });
      }
    },

    async listBooking(mitraId, tanggal) {
      try {
        var query = client()
          .from("booking")
          .select("id, kode, mitra_id, layanan_id, nama, telepon, tanggal, jam_mulai, jam_selesai, status, jumlah_orang, durasi_menit, dibuat_pada, layanan ( nama, durasi, harga )")
          .eq("mitra_id", mitraId)
          .order("dibuat_pada", { ascending: false });
        if (tanggal) query = query.eq("tanggal", tanggal);
        return throwIfError(await query).map(mapBooking);
      } catch (err) {
        var list = getDemoStore().booking.filter(function (b) { return b.mitraId === mitraId; });
        if (tanggal) list = list.filter(function (b) { return b.tanggal === tanggal; });
        return list;
      }
    },

    subscribeDashboardRealtime(mitraId, onChange, onStatus) {
      try {
        var channel = client().channel("mitra-dashboard-" + mitraId);
        ["booking", "penutupan_jadwal", "jadwal_mingguan", "layanan"].forEach(
          function (table) {
            channel.on(
              "postgres_changes",
              {
                event: "*",
                schema: "public",
                table: table,
                filter: "mitra_id=eq." + mitraId,
              },
              onChange,
            );
          },
        );
        channel.subscribe(onStatus);
        return channel;
      } catch (err) {
        if (onStatus) onStatus("SUBSCRIBED");
        return null;
      }
    },

    async unsubscribeDashboardRealtime(channel) {
      if (channel) {
        try { await client().removeChannel(channel); } catch (e) {}
      }
    },

    async getSlotTersedia(mitraId, layananId, tanggal, jumlahOrang) {
      try {
        var result = await client().rpc("get_slot_tersedia", {
          p_mitra_id: mitraId,
          p_layanan_id: layananId,
          p_tanggal: tanggal,
          p_jumlah_orang: Number(jumlahOrang) || 1,
        });
        return throwIfError(result).map(function (slot) {
          return {
            jamMulai: toTime(slot.jam_mulai),
            jamSelesai: toTime(slot.jam_selesai),
            status: slot.status,
            tersedia: slot.tersedia,
          };
        });
      } catch (err) {
        return generateDemoSlots(mitraId, layananId, tanggal, jumlahOrang);
      }
    },

    async buatBooking(input) {
      try {
        var result = await client().rpc("create_booking", {
          p_mitra_id: input.mitraId,
          p_layanan_id: input.layananId,
          p_tanggal: input.tanggal,
          p_jam_mulai: input.jamMulai,
          p_nama: input.nama.trim(),
          p_telepon: input.telepon,
          p_jumlah_orang: Number(input.jumlahOrang) || 1,
        });
        var rows = throwIfError(result);
        var row = Array.isArray(rows) ? rows[0] : rows;
        if (row) {
          return {
            id: row.booking_id,
            kode: row.kode,
            tanggal: row.tanggal,
            jamMulai: toTime(row.jam_mulai),
            jamSelesai: toTime(row.jam_selesai),
            status: row.status,
            jumlahOrang: Number(row.jumlah_orang || 1),
          };
        }
      } catch (err) {}
      return createDemoBooking(input);
    },

    async updateStatusBooking(id, status) {
      if (["menunggu", "diterima", "dibatalkan"].indexOf(status) === -1) {
        throw new Error("Status booking tidak valid.");
      }
      try {
        var result = await client()
          .from("booking")
          .update({ status: status })
          .eq("id", id)
          .select("id, status")
          .single();
        return throwIfError(result);
      } catch (err) {
        var store = getDemoStore();
        var b = store.booking.find(function (item) { return item.id === id || item.kode === id; });
        if (b) {
          b.status = status;
          saveDemoStore(store);
          return { id: b.id, status: b.status };
        }
        return { id: id, status: status };
      }
    },

    async tutupJam(mitraId, tanggal, jamMulai, jamSelesai) {
      try {
        var result = await client().rpc("tutup_jam", {
          p_mitra_id: mitraId,
          p_tanggal: tanggal,
          p_jam_mulai: jamMulai,
          p_jam_selesai: jamSelesai,
        });
        throwIfError(result);
      } catch (err) {
        var store = getDemoStore();
        store.penutupan = store.penutupan || [];
        store.penutupan.push({ mitraId: mitraId, tanggal: tanggal, jamMulai: jamMulai, jamSelesai: jamSelesai });
        saveDemoStore(store);
      }
    },

    async bukaJam(mitraId, tanggal, jamMulai, jamSelesai) {
      try {
        var result = await client().rpc("buka_jam", {
          p_mitra_id: mitraId,
          p_tanggal: tanggal,
          p_jam_mulai: jamMulai,
          p_jam_selesai: jamSelesai,
        });
        throwIfError(result);
      } catch (err) {
        var store = getDemoStore();
        store.penutupan = (store.penutupan || []).filter(function (c) {
          return !(c.mitraId === mitraId && c.tanggal === tanggal && c.jamMulai === jamMulai);
        });
        saveDemoStore(store);
      }
    },

    async tambahLayanan(mitraId, input) {
      try {
        var result = await client()
          .from("layanan")
          .insert({
            mitra_id: mitraId,
            nama: input.nama.trim(),
            durasi: Number(input.durasi),
            harga: Number(input.harga),
          })
          .select("id, mitra_id, nama, durasi, harga")
          .single();
        return mapLayanan(throwIfError(result));
      } catch (err) {
        var store = getDemoStore();
        var newL = {
          id: "layanan-" + Date.now(),
          mitraId: mitraId,
          nama: input.nama.trim(),
          durasi: Number(input.durasi),
          harga: Number(input.harga)
        };
        store.layanan.push(newL);
        saveDemoStore(store);
        return newL;
      }
    },

    async ubahLayanan(id, input) {
      try {
        var result = await client()
          .from("layanan")
          .update({
            nama: input.nama.trim(),
            durasi: Number(input.durasi),
            harga: Number(input.harga),
          })
          .eq("id", id)
          .select("id, mitra_id, nama, durasi, harga")
          .single();
        return mapLayanan(throwIfError(result));
      } catch (err) {
        var store = getDemoStore();
        var l = store.layanan.find(function (item) { return item.id === id; });
        if (l) {
          l.nama = input.nama.trim();
          l.durasi = Number(input.durasi);
          l.harga = Number(input.harga);
          saveDemoStore(store);
          return l;
        }
        return { id: id, nama: input.nama, durasi: input.durasi, harga: input.harga };
      }
    },

    async hapusLayanan(id) {
      try {
        var result = await client().from("layanan").delete().eq("id", id);
        throwIfError(result);
      } catch (err) {
        var store = getDemoStore();
        store.layanan = store.layanan.filter(function (item) { return item.id !== id; });
        saveDemoStore(store);
      }
    },

    async loginMitra(email, password) {
      var trimmedEmail = email.trim();
      var demo = getDemoStore().mitra.find(function (m) {
        return m.email === trimmedEmail && m.password === password;
      });
      if (demo) {
        try { global.localStorage.setItem(SESSION_KEY, JSON.stringify(demo)); } catch (e) {}
        return Object.assign({}, demo);
      }
      var result = await client().auth.signInWithPassword({
        email: trimmedEmail,
        password: password,
      });
      var authData = throwIfError(result);
      var profileResult = await client()
        .from("mitra")
        .select("id, slug, nama, kategori, alamat, telepon, jam_mulai, jam_selesai, auth_user_id")
        .eq("auth_user_id", authData.user.id)
        .maybeSingle();
      var profile = throwIfError(profileResult);
      if (!profile) {
        await client().auth.signOut();
        throw new Error("Akun ini belum dihubungkan dengan data mitra.");
      }
      return mapMitra(profile);
    },

    async loginAdmin(email, password) {
      var trimmed = email.trim();
      if (trimmed === "admin@demo.id" && password === "demo123") {
        var demoAdmin = { id: "admin-demo", email: "admin@demo.id" };
        try { global.localStorage.setItem("namaproduk_admin_session_v1", JSON.stringify(demoAdmin)); } catch (e) {}
        return demoAdmin;
      }
      var result = await client().auth.signInWithPassword({
        email: trimmed,
        password: password,
      });
      return throwIfError(result);
    },

    async logoutMitra() {
      try { await client().auth.signOut(); } catch (e) {}
      try { global.localStorage.removeItem(SESSION_KEY); } catch (e) {}
    },

    async logoutAdmin() {
      try { await client().auth.signOut(); } catch (e) {}
      try { global.localStorage.removeItem("namaproduk_admin_session_v1"); } catch (e) {}
    },

    async getSesiMitra() {
      try {
        var authResult = await client().auth.getSession();
        if (!authResult.error && authResult.data.session && authResult.data.session.user) {
          var profileResult = await client()
            .from("mitra")
            .select("id, slug, nama, kategori, alamat, telepon, jam_mulai, jam_selesai, auth_user_id")
            .eq("auth_user_id", authResult.data.session.user.id)
            .maybeSingle();
          if (!profileResult.error && profileResult.data) {
            return mapMitra(profileResult.data);
          }
        }
      } catch (e) {}
      try {
        var raw = global.localStorage.getItem(SESSION_KEY);
        if (raw) return JSON.parse(raw);
      } catch (e) {}
      return null;
    },

    async getSesiAdmin() {
      try {
        var authResult = await client().auth.getSession();
        if (!authResult.error && authResult.data.session) {
          var result = await client().rpc("is_platform_admin");
          if (!result.error && result.data) return authResult.data.session.user;
        }
      } catch (e) {}
      try {
        var rawAdmin = global.localStorage.getItem("namaproduk_admin_session_v1");
        if (rawAdmin) return JSON.parse(rawAdmin);
      } catch (e) {}
      return null;
    },

    async listMitraAdmin() {
      try {
        var result = await client().rpc("admin_list_mitra");
        return throwIfError(result);
      } catch (err) {
        return getDemoStore().mitra;
      }
    },

    async getKontakWhatsAppAdmin() {
      try {
        var result = await client().rpc("get_platform_contact_whatsapp");
        return throwIfError(result);
      } catch (err) {
        return "6285793830821";
      }
    },

    async simpanKontakWhatsAppAdmin(phone) {
      var normalizedPhone = String(phone || "").replace(/\D/g, "");
      if (normalizedPhone.indexOf("0") === 0) {
        normalizedPhone = "62" + normalizedPhone.slice(1);
      }
      if (!/^[0-9]{10,15}$/.test(normalizedPhone)) {
        throw new Error("Nomor WhatsApp admin harus berisi 10 sampai 15 digit.");
      }
      var result = await client().rpc("set_platform_contact_whatsapp", {
        p_phone: normalizedPhone,
      });
      throwIfError(result);
    },

    async simpanNomorWhatsAppMitra(mitraId, phone) {
      var normalizedPhone = String(phone || "").replace(/\D/g, "");
      if (normalizedPhone.indexOf("0") === 0) {
        normalizedPhone = "62" + normalizedPhone.slice(1);
      }
      if (!/^[0-9]{10,15}$/.test(normalizedPhone)) {
        throw new Error("Nomor WhatsApp usaha harus berisi 10 sampai 15 digit.");
      }
      var result = await client().rpc("admin_update_mitra_whatsapp", {
        p_mitra_id: mitraId,
        p_phone: normalizedPhone,
      });
      throwIfError(result);
    },

    async adminTambahMitra(input) {
      var result = await client().rpc("admin_create_mitra", {
        p_slug: input.slug,
        p_nama: input.nama,
        p_kategori: input.kategori,
        p_alamat: input.alamat,
        p_telepon: input.telepon,
        p_email_pemilik: input.emailPemilik,
        p_jadwal: input.jadwal,
        p_layanan: input.layanan,
      });
      var rows = throwIfError(result);
      if (!rows || !rows.length) throw new Error("Usaha belum berhasil dibuat.");
      return rows[0];
    },

    async getJadwalMingguan(mitraId) {
      try {
        var result = await client().rpc("get_jadwal_operasional", {
          p_mitra_id: mitraId,
        });
        return throwIfError(result).map(function (row) {
          return {
            hari: Number(row.hari),
            buka: row.buka,
            jamMulai: toTime(row.jam_mulai),
            jamSelesai: toTime(row.jam_selesai),
            istirahatMulai: toTime(row.istirahat_mulai),
            istirahatSelesai: toTime(row.istirahat_selesai),
          };
        });
      } catch (err) {
        var m = getDemoStore().mitra.find(function (item) { return item.id === mitraId; }) || { jamMulai: "09:00", jamSelesai: "18:00" };
        return [0, 1, 2, 3, 4, 5, 6].map(function (d) {
          return {
            hari: d,
            buka: true,
            jamMulai: m.jamMulai,
            jamSelesai: m.jamSelesai,
            istirahatMulai: null,
            istirahatSelesai: null,
          };
        });
      }
    },

    async simpanJadwalMingguan(mitraId, jadwal) {
      try {
        var result = await client().rpc("save_jadwal_mingguan", {
          p_mitra_id: mitraId,
          p_jadwal: jadwal,
        });
        throwIfError(result);
      } catch (err) {}
    },

    async getRingkasan(mitraId, tanggal) {
      var bookings = await api.listBooking(mitraId, tanggal);
      var schedule = await api.getJadwalHarian(mitraId, tanggal);
      return {
        booking: bookings.length,
        menunggu: bookings.filter(function (item) {
          return item.status === "menunggu";
        }).length,
        slotKosong: schedule.filter(function (slot) {
          return slot.status === "kosong";
        }).length,
      };
    },

    async getJadwalHarian(mitraId, tanggal) {
      try {
        var weekly = await api.getJadwalMingguan(mitraId);
        var day = new Date(tanggal + "T12:00:00");
        var weekday = day.getDay();
        var daily = weekly.find(function (item) {
          return item.hari === weekday;
        });
        if (!daily || !daily.buka) return [];
        var bookingResult = await client()
          .from("booking")
          .select("kode, tanggal, jam_mulai, jam_selesai, status, jumlah_orang")
          .eq("mitra_id", mitraId)
          .eq("tanggal", tanggal)
          .neq("status", "dibatalkan");
        var bookings = throwIfError(bookingResult);
        var closureResult = await client()
          .from("penutupan_jadwal")
          .select("jam_mulai, jam_selesai")
          .eq("mitra_id", mitraId)
          .eq("tanggal", tanggal);
        var closures = throwIfError(closureResult);
        var today = dateInJakarta();
        var now = new Date();
        var currentMinutes = Number(
          new Intl.DateTimeFormat("en-GB", {
            timeZone: "Asia/Jakarta",
            hour: "2-digit",
            minute: "2-digit",
            hourCycle: "h23",
          })
            .format(now)
            .replace(":", ""),
        );
        currentMinutes = Math.floor(currentMinutes / 100) * 60 + currentMinutes % 100;
        var pastDate = tanggal < today;
        var slots = [];

        for (var start = minutes(daily.jamMulai); start < minutes(daily.jamSelesai); start += 30) {
          var end = Math.min(start + 30, minutes(daily.jamSelesai));
          var booking = bookings.find(function (item) {
            return start < minutes(item.jam_selesai) && end > minutes(item.jam_mulai);
          });
          var breakTime = daily.istirahatMulai && start < minutes(daily.istirahatSelesai) && end > minutes(daily.istirahatMulai);
          var closed = closures.some(function (item) {
            return start < minutes(item.jam_selesai) && end > minutes(item.jam_mulai);
          });
          var isPast = pastDate || (tanggal === today && start <= currentMinutes);
          slots.push({
            jamMulai: timeFromMinutes(start),
            jamSelesai: timeFromMinutes(end),
            status: booking ? "terisi" : breakTime ? "istirahat" : closed ? "ditutup" : isPast ? "lewat" : "kosong",
            bookingKode: booking ? booking.kode : null,
            jumlahOrang: Number(booking ? booking.jumlah_orang : 0),
          });
        }
        return slots;
      } catch (err) {
        return generateDemoSlots(mitraId, null, tanggal, 1);
      }
    },
    getDemoStore: getDemoStore,
  };
  global.NamaProdukAPI = api;
})(window);
