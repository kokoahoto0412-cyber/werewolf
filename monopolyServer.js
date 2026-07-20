const path = require('path');
const { v4: uuidv4 } = require('uuid');

const BOARD_TILES = [
  { id: 0, name: 'GO', type: 'go', desc: 'Ambil $200 setiap melewati petak ini' },
  { id: 1, name: 'Indonesia', type: 'property', group: 'brown', price: 60, rent: [2, 10, 30, 90, 160, 250], housePrice: 50 },
  { id: 2, name: 'Dana Umum', type: 'chest' },
  { id: 3, name: 'Malaysia', type: 'property', group: 'brown', price: 60, rent: [4, 20, 60, 180, 320, 450], housePrice: 50 },
  { id: 4, name: 'Pajak Bandara', type: 'tax', amount: 200, desc: 'Bayar Pajak Bandara $200' },
  { id: 5, name: 'Bandara Soetta', type: 'railway', price: 200, rent: [25, 50, 100, 200] },
  { id: 6, name: 'Singapura', type: 'property', group: 'lightblue', price: 100, rent: [6, 30, 90, 270, 400, 550], housePrice: 50 },
  { id: 7, name: 'Kesempatan', type: 'chance' },
  { id: 8, name: 'Thailand', type: 'property', group: 'lightblue', price: 100, rent: [6, 30, 90, 270, 400, 550], housePrice: 50 },
  { id: 9, name: 'Vietnam', type: 'property', group: 'lightblue', price: 120, rent: [8, 40, 100, 300, 450, 600], housePrice: 50 },
  { id: 10, name: 'Penjara', type: 'jail', desc: 'Hanya Berkunjung / Di dalam Penjara' },
  { id: 11, name: 'Filipina', type: 'property', group: 'pink', price: 140, rent: [10, 50, 150, 450, 625, 750], housePrice: 100 },
  { id: 12, name: 'PLN (Listrik)', type: 'utility', price: 150, desc: 'Sewa: 4x Dadu (1 utilitas) / 10x Dadu (2 utilitas)' },
  { id: 13, name: 'India', type: 'property', group: 'pink', price: 140, rent: [10, 50, 150, 450, 625, 750], housePrice: 100 },
  { id: 14, name: 'Korea Selatan', type: 'property', group: 'pink', price: 160, rent: [12, 60, 180, 500, 700, 900], housePrice: 100 },
  { id: 15, name: 'Bandara Changi', type: 'railway', price: 200, rent: [25, 50, 100, 200] },
  { id: 16, name: 'Mesir', type: 'property', group: 'orange', price: 180, rent: [14, 70, 200, 550, 750, 950], housePrice: 100 },
  { id: 17, name: 'Dana Umum', type: 'chest' },
  { id: 18, name: 'Arab Saudi', type: 'property', group: 'orange', price: 180, rent: [14, 70, 200, 550, 750, 950], housePrice: 100 },
  { id: 19, name: 'Turki', type: 'property', group: 'orange', price: 200, rent: [16, 80, 220, 600, 800, 1000], housePrice: 100 },
  { id: 20, name: 'Parkir Bebas', type: 'parking', desc: 'Istirahat santai tanpa dipungut biaya' },
  { id: 21, name: 'Yunani', type: 'property', group: 'red', price: 220, rent: [18, 90, 250, 700, 875, 1050], housePrice: 150 },
  { id: 22, name: 'Kesempatan', type: 'chance' },
  { id: 23, name: 'Italia', type: 'property', group: 'red', price: 220, rent: [18, 90, 250, 700, 875, 1050], housePrice: 150 },
  { id: 24, name: 'Spanyol', type: 'property', group: 'red', price: 240, rent: [20, 100, 300, 750, 925, 1100], housePrice: 150 },
  { id: 25, name: 'Bandara Dubai', type: 'railway', price: 200, rent: [25, 50, 100, 200] },
  { id: 26, name: 'Brasil', type: 'property', group: 'yellow', price: 260, rent: [22, 110, 330, 800, 975, 1150], housePrice: 150 },
  { id: 27, name: 'Argentina', type: 'property', group: 'yellow', price: 260, rent: [22, 110, 330, 800, 975, 1150], housePrice: 150 },
  { id: 28, name: 'PAM (Air Bersih)', type: 'utility', price: 150, desc: 'Sewa: 4x Dadu / 10x Dadu' },
  { id: 29, name: 'Australia', type: 'property', group: 'yellow', price: 280, rent: [24, 120, 360, 850, 1025, 1200], housePrice: 150 },
  { id: 30, name: 'Masuk Penjara', type: 'gotojail', desc: 'Langsung dijebloskan ke Penjara' },
  { id: 31, name: 'Belanda', type: 'property', group: 'green', price: 300, rent: [26, 130, 390, 900, 1100, 1275], housePrice: 200 },
  { id: 32, name: 'Jerman', type: 'property', group: 'green', price: 300, rent: [26, 130, 390, 900, 1100, 1275], housePrice: 200 },
  { id: 33, name: 'Dana Umum', type: 'chest' },
  { id: 34, name: 'Prancis', type: 'property', group: 'green', price: 320, rent: [28, 150, 450, 1000, 1200, 1400], housePrice: 200 },
  { id: 35, name: 'Bandara Heathrow', type: 'railway', price: 200, rent: [25, 50, 100, 200] },
  { id: 36, name: 'Kesempatan', type: 'chance' },
  { id: 37, name: 'Jepang', type: 'property', group: 'darkblue', price: 350, rent: [35, 175, 500, 1100, 1300, 1500], housePrice: 200 },
  { id: 38, name: 'Pajak Mewah', type: 'tax', amount: 100, desc: 'Bayar Pajak Barang Mewah $100' },
  { id: 39, name: 'Amerika Serikat', type: 'property', group: 'darkblue', price: 400, rent: [50, 200, 600, 1400, 1700, 2000], housePrice: 200 }
];

const CHANCE_CARDS = [
  { id: 1, title: 'Maju ke GO', text: 'Langsung maju ke GO. Ambil $200.', action: 'move', target: 0 },
  { id: 2, title: 'Liburan ke Tokyo', text: 'Maju ke petak Jepang. Jika melewati GO, ambil $200.', action: 'move', target: 37 },
  { id: 3, title: 'Kunjungan ke Jakarta', text: 'Maju ke petak Indonesia.', action: 'move', target: 1 },
  { id: 4, title: 'Menang Lotre Internasional', text: 'Keberuntungan menantimu! Dapat bonus $100.', action: 'money', amount: 100 },
  { id: 5, title: 'Ditangkap Interpol', text: 'Langsung masuk Penjara. Jangan lewati GO, jangan ambil $200.', action: 'jail' },
  { id: 6, title: 'Kartu Bebas Penjara', text: 'Simpan kartu ini. Bisa dipakai untuk keluar dari Penjara gratis.', action: 'free_jail' },
  { id: 7, title: 'Mundur 3 Langkah', text: 'Langkahmu mundur 3 petak ke belakang.', action: 'move_rel', amount: -3 },
  { id: 8, title: 'Penerbangan ke Dubai', text: 'Maju ke Bandara Dubai.', action: 'move', target: 25 },
  { id: 9, title: 'Denda Tilang Luar Negeri', text: 'Mengemudi terlalu cepat. Bayar denda $15.', action: 'money', amount: -15 },
  { id: 10, title: 'Dividen Saham Global', text: 'Investasimu berkembang. Dapat $50.', action: 'money', amount: 50 },
  { id: 11, title: 'Maju ke Amerika Serikat', text: 'Maju ke Amerika Serikat.', action: 'move', target: 39 },
  { id: 12, title: 'Menang Kontes Vlog Wisata', text: 'Hadiah juara pertama. Dapat $150.', action: 'money', amount: 150 },
  { id: 13, title: 'Bayar Pajak Properti', text: 'Renovasi gedung. Bayar $25 per rumah, $100 per hotel.', action: 'repairs', house: 25, hotel: 100 },
  { id: 14, title: 'Sumbangan Partai Dunia', text: 'Bayar $15 kepada tiap pemain.', action: 'pay_all', amount: 15 },
  { id: 15, title: 'Maju ke Bandara Heathrow', text: 'Maju ke Bandara Heathrow.', action: 'move', target: 35 },
  { id: 16, title: 'Beasiswa Kuliah Luar Negeri', text: 'Dapat bantuan dana $100.', action: 'money', amount: 100 },
  { id: 17, title: 'Biaya Hotel Mewah', text: 'Menginap di hotel bintang 5. Bayar $50.', action: 'money', amount: -50 },
  { id: 18, title: 'Maju ke Spanyol', text: 'Maju ke petak Spanyol.', action: 'move', target: 24 },
  { id: 19, title: 'Investasi Kripto Melonjak', text: 'Kripto cuan besar! Dapat $80.', action: 'money', amount: 80 },
  { id: 20, title: 'Kehilangan Paspor', text: 'Biaya pembuatan paspor baru ekspres. Bayar $30.', action: 'money', amount: -30 },
  { id: 21, title: 'Inspeksi Listrik Negara', text: 'Maju ke PLN. Jika belum ada pemilik, boleh dibeli.', action: 'move_utility', target: 12 },
  { id: 22, title: 'Maju ke Korea Selatan', text: 'Maju ke petak Korea Selatan.', action: 'move', target: 14 },
  { id: 23, title: 'Hadiah Tournament eSports', text: 'Juara dunia game! Dapat $120.', action: 'money', amount: 120 },
  { id: 24, title: 'Denda Kebersihan Kota', text: 'Membuang sampah sembarangan di Paris. Bayar $20.', action: 'money', amount: -20 },
  { id: 25, title: 'Bonus Penjualan Tanah', text: 'Broker memberi komisi. Dapat $60.', action: 'money', amount: 60 },
  { id: 26, title: 'Tagihan Asuransi Perjalanan', text: 'Bayar premi tahunan $40.', action: 'money', amount: -40 },
  { id: 27, title: 'Menang Undian Mobil Listrik', text: 'Jual hadiah mobilnya. Dapat $180.', action: 'money', amount: 180 },
  { id: 28, title: 'Keamanan Bandara Ketat', text: 'Pemeriksaan khusus barang bawaan. Bayar $25.', action: 'money', amount: -25 },
  { id: 29, title: 'Royalti Buku Best Seller', text: 'Bukumu laku keras di Eropa. Dapat $90.', action: 'money', amount: 90 },
  { id: 30, title: 'Terjebak Macet di London', text: 'Mundur 2 langkah.', action: 'move_rel', amount: -2 },
  { id: 31, title: 'Maju ke Australia', text: 'Maju ke petak Australia.', action: 'move', target: 29 },
  { id: 32, title: 'Sponsor Brand Sepatu', text: 'Dapat kontrak kerja sama $70.', action: 'money', amount: 70 },
  { id: 33, title: 'Bayar Denda Keterlambatan Pesawat', text: 'Pesawat ketinggalan. Bayar tiket baru $65.', action: 'money', amount: -65 },
  { id: 34, title: 'Maju ke Mesir', text: 'Maju ke petak Mesir.', action: 'move', target: 16 },
  { id: 35, title: 'Menemukan Dompet di Jalan', text: 'Mengembalikan dompet miliarder. Diberi imbalan $55.', action: 'money', amount: 55 },
  { id: 36, title: 'Pajak Perusahaan Publik', text: 'Bayar $35 per properti utilitas yang kamu miliki.', action: 'tax_utility', amount: 35 },
  { id: 37, title: 'Hadiah Jackpot Kasino Las Vegas', text: 'Menang besar di Las Vegas! Dapat $175.', action: 'money', amount: 175 },
  { id: 38, title: 'Biaya Vaksin Internasional', text: 'Vaksinasi wajib saat tur keliling dunia. Bayar $45.', action: 'money', amount: -45 },
  { id: 39, title: 'Maju ke Singapura', text: 'Maju ke petak Singapura.', action: 'move', target: 6 },
  { id: 40, title: 'Hadiah Festival Budaya', text: 'Menang lomba tari tradisional. Dapat $40.', action: 'money', amount: 40 },
  { id: 41, title: 'Tagihan Internet Satelit', text: 'Layanan roaming global bulanan. Bayar $35.', action: 'money', amount: -35 },
  { id: 42, title: 'Maju ke Italia', text: 'Maju ke petak Italia.', action: 'move', target: 23 },
  { id: 43, title: 'Subsidi Energi Hijau', text: 'Dapat dana insentif pemerintah $85.', action: 'money', amount: 85 },
  { id: 44, title: 'Masuk Penjara 2', text: 'Langsung masuk Penjara tanpa lewat GO.', action: 'jail' },
  { id: 45, title: 'Maju ke Belanda', text: 'Maju ke petak Belanda.', action: 'move', target: 31 },
  { id: 46, title: 'Keuntungan Bisnis Ekspor', text: 'Barang ekspor laku keras. Dapat $110.', action: 'money', amount: 110 },
  { id: 47, title: 'Kerusakan Koper Wisata', text: 'Beli koper anti banting baru. Bayar $50.', action: 'money', amount: -50 },
  { id: 48, title: 'Maju ke Bandara Changi', text: 'Maju ke Bandara Changi.', action: 'move', target: 15 },
  { id: 49, title: 'Bonus Kinerja Eksekutif', text: 'Bonus akhir tahun perusahaan. Dapat $95.', action: 'money', amount: 95 },
  { id: 50, title: 'Tur Malam Hari di Yunani', text: 'Maju ke petak Yunani.', action: 'move', target: 21 }
];

const COMMUNITY_CHEST_CARDS = [
  { id: 1, title: 'Pengembalian Pajak Negara', text: 'Pajak berlebih dikembalikan. Dapat $20.', action: 'money', amount: 20 },
  { id: 2, title: 'Ulang Tahunmu!', text: 'Selamat ulang tahun! Tiap pemain memberi hadiah $10 kepadamu.', action: 'collect_all', amount: 10 },
  { id: 3, title: 'Biaya Rumah Sakit', text: 'Pemeriksaan kesehatan rutin bulanan. Bayar $100.', action: 'money', amount: -100 },
  { id: 4, title: 'Warisan Paman Kaya', text: 'Mendapat warisan kerabat jauh. Dapat $100.', action: 'money', amount: 100 },
  { id: 5, title: 'Hadiah Kontes Kecantikan', text: 'Juara 2 kontes model dunia. Dapat $10.', action: 'money', amount: 10 },
  { id: 6, title: 'Kartu Bebas Penjara', text: 'Simpan kartu ini. Bisa dipakai untuk keluar dari Penjara gratis.', action: 'free_jail' },
  { id: 7, title: 'Biaya Sekolah Anak', text: 'Membayar uang gedung sekolah internasional. Bayar $50.', action: 'money', amount: -50 },
  { id: 8, title: 'Konsultasi Hukum Properti', text: 'Membayar pengacara bisnis. Bayar $25.', action: 'money', amount: -25 },
  { id: 9, title: 'Menang Lomba Debat PBB', text: 'Mendapat penghargaan diploma mentereng. Dapat $100.', action: 'money', amount: 100 },
  { id: 10, title: 'Asuransi Jiwa Cair', text: 'Klaim asuransi disetujui. Dapat $100.', action: 'money', amount: 100 },
  { id: 11, title: 'Biaya Perbaikan Jalan Raya', text: 'Wajib kerja bakti negara. Bayar $40 per rumah, $115 per hotel.', action: 'repairs', house: 40, hotel: 115 },
  { id: 12, title: 'Jual Obligasi Pemerintah', text: 'Cairkan dana simpanan berjangka. Dapat $100.', action: 'money', amount: 100 },
  { id: 13, title: 'Salah Transfer Bank', text: 'Bank salah mentransfer dana ke rekeningmu. Dapat $200.', action: 'money', amount: 200 },
  { id: 14, title: 'Masuk Penjara', text: 'Langsung masuk Penjara. Jangan lewati GO.', action: 'jail' },
  { id: 15, title: 'Biaya Dokter Gigi', text: 'Operasi cabut gigi geraham. Bayar $50.', action: 'money', amount: -50 },
  { id: 16, title: 'Bunga Deposito Cair', text: 'Bank memberikan bunga simpanan. Dapat $25.', action: 'money', amount: 25 },
  { id: 17, title: 'Bantuan Sosial Pangan', text: 'Menerima dana subsidi pangan negara. Dapat $45.', action: 'money', amount: 45 },
  { id: 18, title: 'Sumbangan Panti Asuhan', text: 'Beramal untuk kemanusiaan. Bayar $30.', action: 'money', amount: -30 },
  { id: 19, title: 'Klaim Garansi Elektronik', text: 'Perbaikan TV LED diganti baru. Dapat $20.', action: 'money', amount: 20 },
  { id: 20, title: 'Tagihan Kartu Kredit', text: 'Melunasi belanja online bulanan. Bayar $60.', action: 'money', amount: -60 },
  { id: 21, title: 'Bonus Penemuan Ilmiah', text: 'Hak paten teknologi diakui dunia. Dapat $140.', action: 'money', amount: 140 },
  { id: 22, title: 'Pajak Penghasilan Tambahan', text: 'Audit pajak akhir tahun. Bayar $75.', action: 'money', amount: -75 },
  { id: 23, title: 'Hadiah Turnamen Catur', text: 'Grandmaster turnamen internasional. Dapat $65.', action: 'money', amount: 65 },
  { id: 24, title: 'Subsidi Transportasi Publik', text: 'Kompensasi keterlambatan kereta api. Dapat $15.', action: 'money', amount: 15 },
  { id: 25, title: 'Biaya Keanggotaan Gym VIP', text: 'Perpanjang member gym setahun. Bayar $45.', action: 'money', amount: -45 },
  { id: 26, title: 'Penjualan Karya Seni NFT', text: 'Lukisan digitalmu terjual mahal. Dapat $160.', action: 'money', amount: 160 },
  { id: 27, title: 'Tagihan Listrik Melonjak', text: 'Pemakaian AC berlebihan musim panas. Bayar $35.', action: 'money', amount: -35 },
  { id: 28, title: 'Bonus Karyawan Teladan', text: 'Penghargaan pegawai terbaik bulan ini. Dapat $50.', action: 'money', amount: 50 },
  { id: 29, title: 'Denda Keterlambatan Perpustakaan', text: 'Lupa mengembalikan buku kuno. Bayar $15.', action: 'money', amount: -15 },
  { id: 30, title: 'Donasi Pelestarian Hutan', text: 'Mendukung reboisasi Amazon. Bayar $40.', action: 'money', amount: -40 },
  { id: 31, title: 'Hadiah Undian Supermarket', text: 'Dapat voucher belanja tunai $30.', action: 'money', amount: 30 },
  { id: 32, title: 'Biaya Langganan Streaming', text: 'Paket langganan film & musik setahun. Bayar $25.', action: 'money', amount: -25 },
  { id: 33, title: 'Komisi Penulis Lepas', text: 'Artikel kolom koran terbit. Dapat $55.', action: 'money', amount: 55 },
  { id: 34, title: 'Biaya Servis Mobil', text: 'Ganti oli dan rem mobil pribadi. Bayar $45.', action: 'money', amount: -45 },
  { id: 35, title: 'Kemenangan Kasus Hak Cipta', text: 'Pengadilan memenangkan tuntutanmu. Dapat $125.', action: 'money', amount: 125 },
  { id: 36, title: 'Pajak Daerah Lingkungan', text: 'Iuran keamanan & kebersihan perumahan. Bayar $20.', action: 'money', amount: -20 },
  { id: 37, title: 'Beasiswa Riset Akademik', text: 'Dana hibah penelitian kampus. Dapat $90.', action: 'money', amount: 90 },
  { id: 38, title: 'Ganti Rugi Bencana Alam', text: 'Asuransi rumah akibat gempa cair. Dapat $110.', action: 'money', amount: 110 },
  { id: 39, title: 'Biaya Renovasi Taman', text: 'Mempercantik halaman rumah. Bayar $35.', action: 'money', amount: -35 },
  { id: 40, title: 'Bonus Kode Referral', text: 'Teman menggunakan kode undanganku. Dapat $35.', action: 'money', amount: 35 },
  { id: 41, title: 'Tagihan Air PAM', text: 'Kebocoran pipa saluran air. Bayar $30.', action: 'money', amount: -30 },
  { id: 42, title: 'Honor Menjadi Pembicara', text: 'Seminar motivasi bisnis dunia. Dapat $75.', action: 'money', amount: 75 },
  { id: 43, title: 'Denda Parkir Sembarangan', text: 'Mobil di derek petugas kota. Bayar $25.', action: 'money', amount: -25 },
  { id: 44, title: 'Pengembalian Uang Tiket Konser', text: 'Konser idola dibatalkan. Dapat $80.', action: 'money', amount: 80 },
  { id: 45, title: 'Biaya Pelihara Hewan', text: 'Vaksinasi & makanan anjing ras. Bayar $40.', action: 'money', amount: -40 },
  { id: 46, title: 'Hadiah Kompetisi Desain Logo', text: 'Logo buatanmu dipakai perusahaan top. Dapat $130.', action: 'money', amount: 130 },
  { id: 47, title: 'Sumbangan Pembangunan Monumen', text: 'Berpartisipasi membangun tugu kota. Bayar $50.', action: 'money', amount: -50 },
  { id: 48, title: 'Bonus Penjualan Roti Spesial', text: 'Baker memberi bagi hasil toko. Dapat $40.', action: 'money', amount: 40 },
  { id: 49, title: 'Tagihan Perawatan Kolam Renang', text: 'Bersihkan kolam renang hotel. Bayar $30.', action: 'money', amount: -30 },
  { id: 50, title: 'Hadiah Kejutan Akhir Pekan', text: 'Selamat! Kamu memenangkan hadiah kejutan $150.', action: 'money', amount: 150 }
];

const OWNER_IDS = ['571492745676587009', '1421922204626587820', '1281505068746543181'];
const monopolySessions = new Map();
let _io = null;


const TOKENS = ['🚂','⚓','🎩','🐕','🚗','✈️','🛳️','🌍'];
const COLORS = ['#e74c3c', '#3498db', '#2ecc71', '#f1c40f', '#9b59b6', '#e67e22', '#1abc9c', '#e91e63'];

function shuffleDeck(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function hasCompleteColorSet(player, group) {
  if (!group || !player || !player.properties) return false;
  const groupTiles = BOARD_TILES.filter(t => t && t.group === group);
  if (groupTiles.length === 0) return false;
  return groupTiles.every(t => player.properties[t.id]);
}

function createMonopolySession(hostId, hostName, hostAvatar, avatarMap = {}, guildId = null, botToken = null) {
  const sessionId = 'mono_' + uuidv4().split('-')[0];
  const game = {
    sessionId,
    phase: 'lobby',
    host: hostId,
    players: [],
    turnIndex: 0,
    chanceDeck: shuffleDeck(CHANCE_CARDS),
    chestDeck: shuffleDeck(COMMUNITY_CHEST_CARDS),
    chanceIndex: 0,
    chestIndex: 0,
    logs: [],
    chat: [],
    avatarMap,
    guildId,
    botToken,
    doublesCount: 0,
    diceRolledThisTurn: false,
    lobbyTimer: null,
    maxTimer: null
  };

  // Auto-delete lobby setelah 5 menit jika tidak dimulai
  game.lobbyTimer = setTimeout(() => {
    const g = monopolySessions.get(sessionId);
    if (g && g.phase === 'lobby') {
      if (_io) bcast(_io, sessionId, 'error', { message: 'Lobby dihapus otomatis karena tidak dimulai dalam 5 menit.' });
      monopolySessions.delete(sessionId);
    }
  }, 300000);

  monopolySessions.set(sessionId, game);
  return sessionId;
}

function bcast(io, sessionId, event, data) {
  io.to(sessionId).emit(event, data);
}

function addLog(game, io, text, type = 'info', icon = '📌') {
  const entry = { text, type, icon, time: new Date().toLocaleTimeString() };
  game.logs.push(entry);
  bcast(io, game.sessionId, 'mono_log', entry);
}

function attach(app, io) {
  _io = io;
  const createMonopolyHandler = (req, res) => {
    const { hostId, hostName, hostAvatar, avatarMap, guildId, botToken } = req.body;
    if (!hostId || !hostName) return res.status(400).json({ error: 'Missing hostId or hostName' });
    const sessionId = createMonopolySession(hostId, hostName, hostAvatar || '', avatarMap || {}, guildId, botToken);
    const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3001}`;
    res.json({ sessionId, url: `${baseUrl}/monopoly/${sessionId}` });
  };
  app.post('/api/create-monopoly', createMonopolyHandler);
  app.post('/api/monopoly/create', createMonopolyHandler);

  app.get('/monopoly/:sessionId', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'monopoly.html'));
  });

  io.on('connection', (socket) => {
    socket.on('mono_join', async ({ sessionId, discordId, name, avatar, token }) => {
      const game = monopolySessions.get(sessionId);
      if (!game) return socket.emit('error', { message: 'Room Monopoly tidak ditemukan!' });
      if (game.phase !== 'lobby' && !game.players.find(p => p.id === discordId)) {
        if (!OWNER_IDS.includes(discordId)) {
          return socket.emit('error', { message: 'Game sudah dimulai!' });
        }
        socket.join(sessionId);
        socket.emit('mono_state', {
          game: {
            sessionId: game.sessionId,
            phase: game.phase,
            host: game.host,
            turnIndex: game.turnIndex,
            diceRolledThisTurn: game.diceRolledThisTurn || false,
            doublesCount: game.doublesCount || 0,
            actionDoneThisTurn: game.actionDoneThisTurn || false,
            actedTileThisTurn: game.actedTileThisTurn || null,
            players: game.players,
            tiles: BOARD_TILES,
            logs: game.logs,
            chat: game.chat || []
          },
          myId: discordId
        });
        return;
      }

      if (name && typeof name === 'string') {
        const nameConflict = game.players.some(p => p.id !== discordId && p.name.trim().toLowerCase() === name.trim().toLowerCase());
        if (nameConflict) {
          return socket.emit('error', { message: `❌ Nama "${name.trim()}" sudah digunakan oleh pemain lain di room ini! Silakan gunakan nama lain.` });
        }
      }

      let finalAvatar = avatar;
      if (game.avatarMap && game.avatarMap[name.toLowerCase()]) {
        finalAvatar = game.avatarMap[name.toLowerCase()];
      } else if (game.guildId && game.botToken) {
        try {
          const fetchFunc = typeof fetch !== 'undefined' ? fetch : require('node-fetch');
          const res = await fetchFunc(`https://discord.com/api/v10/guilds/${game.guildId}/members/search?query=${encodeURIComponent(name)}&limit=1`, {
            headers: { 'Authorization': `Bot ${game.botToken}` }
          });
          if (res.ok) {
            const list = await res.json();
            if (list && list.length > 0 && list[0].user) {
              const u = list[0].user;
              finalAvatar = u.avatar ? `https://cdn.discordapp.com/avatars/${u.id}/${u.avatar}.png?size=128` : `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}`;
              if (!game.avatarMap) game.avatarMap = {};
              game.avatarMap[name.toLowerCase()] = finalAvatar;
            }
          }
        } catch(e) {}
      }

      let existing = game.players.find(p => p.id === discordId);
      if (!existing) {
        if (game.players.length >= 4) return socket.emit('error', { message: 'Room sudah penuh (Max 4 pemain).' });
        const pIdx = game.players.length;
        const usedTokens = game.players.map(p => p.token);
        const freeToken = TOKENS.find(t => !usedTokens.includes(t)) || TOKENS[pIdx % TOKENS.length];
        existing = {
          id: discordId,
          name: name,
          avatar: finalAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}`,
          socketId: socket.id,
          token: freeToken,
          color: COLORS[pIdx],
          money: 1500,
          pos: 0,
          inJail: false,
          jailTurns: 0,
          freeJailCards: 0,
          bankrupt: false,
          properties: {}
        };
        game.players.push(existing);
        addLog(game, io, `${name} bergabung ke permainan Monopoly!`, 'join', '👋');
      } else {
        existing.socketId = socket.id;
        existing.name = name;
        existing.avatar = finalAvatar || existing.avatar;
      }

      socket.join(sessionId);
      socket.emit('mono_state', {
        game: {
          sessionId: game.sessionId,
          phase: game.phase,
          host: game.host,
          turnIndex: game.turnIndex,
          diceRolledThisTurn: game.diceRolledThisTurn || false,
          doublesCount: game.doublesCount || 0,
          actionDoneThisTurn: game.actionDoneThisTurn || false,
          actedTileThisTurn: game.actedTileThisTurn || null,
          players: game.players,
          tiles: BOARD_TILES,
          logs: game.logs,
          chat: game.chat || []
        },
        myId: discordId
      });

      bcast(io, sessionId, 'mono_players_update', { players: game.players });
    });

    // ─── Token Change (Lobby only) ───────────────────────────────────────────────
    socket.on('mono_change_token', ({ sessionId, discordId, token }) => {
      const game = monopolySessions.get(sessionId);
      if (!game || game.phase !== 'lobby') return;
      const p = game.players.find(x => x.id === discordId);
      if (!p) return;
      // Reject if another player already has this token
      const conflict = game.players.find(x => x.id !== discordId && x.token === token);
      if (conflict) return socket.emit('error', { message: `Token ${token} sudah dipakai ${conflict.name}!` });
      p.token = token;
      bcast(io, sessionId, 'mono_players_update', { players: game.players });
    });

    socket.on('mono_start', ({ sessionId, discordId }) => {
      const game = monopolySessions.get(sessionId);
      if (!game || game.host !== discordId) return;
      if (game.players.length < 2) return socket.emit('error', { message: 'Minimal 2 pemain untuk memulai.' });
      if (game.lobbyTimer) clearTimeout(game.lobbyTimer);

      // Batas maksimal sesi bermain: 3 jam (auto delete)
      game.maxTimer = setTimeout(() => {
        monopolySessions.delete(sessionId);
      }, 10800000);

      game.phase = 'playing';
      game.turnIndex = 0;
      game.doublesCount = 0;
      game.diceRolledThisTurn = false;
      addLog(game, io, `Game Monopoly Negara Dunia dimulai! Giliran pertama: ${game.players[0].name}`, 'start', '🎲');
      bcast(io, sessionId, 'mono_game_started', { turnIndex: 0 });
    });

    socket.on('mono_roll_dice', ({ sessionId, discordId }) => {
      const game = monopolySessions.get(sessionId);
      if (!game || game.phase !== 'playing') return;
      const currPlayer = game.players[game.turnIndex];
      if (!currPlayer || currPlayer.id !== discordId) return;
      if (game.diceRolledThisTurn && game.doublesCount === 0) return; // already rolled and not doubles

      game.actionDoneThisTurn = false;
      game.actedTileThisTurn = null;
      bcast(io, sessionId, 'mono_action_status', { actionDoneThisTurn: false, actedTileThisTurn: null });

      const d1 = Math.floor(Math.random() * 6) + 1;
      const d2 = Math.floor(Math.random() * 6) + 1;
      const isDoubles = (d1 === d2);
      const totalMove = d1 + d2;

      bcast(io, sessionId, 'mono_dice_rolled', { d1, d2, isDoubles, playerId: discordId });

      if (currPlayer.inJail) {
        if (isDoubles) {
          currPlayer.inJail = false;
          currPlayer.jailTurns = 0;
          addLog(game, io, `${currPlayer.name} mendapat Doubles (${d1}-${d2}) dan BEBAS dari penjara!`, 'good', '🔓');
          movePlayerToken(game, io, currPlayer, totalMove);
          game.diceRolledThisTurn = true;
          game.doublesCount = 0; // doubles to leave jail don't give extra turn
        } else {
          currPlayer.jailTurns++;
          addLog(game, io, `${currPlayer.name} gagal mendapat Doubles di penjara (${d1}-${d2}).`, 'bad', '🔒');
          if (currPlayer.jailTurns >= 3) {
            currPlayer.inJail = false;
            currPlayer.jailTurns = 0;
            currPlayer.money -= 50;
            addLog(game, io, `${currPlayer.name} membayar denda paksa $50 setelah 3 putaran di penjara.`, 'bad', '💸');
            movePlayerToken(game, io, currPlayer, totalMove);
          }
          game.diceRolledThisTurn = true;
          game.doublesCount = 0;
        }
        bcast(io, sessionId, 'mono_players_update', { players: game.players });
        return;
      }

      if (isDoubles) {
        game.doublesCount++;
        addLog(game, io, `${currPlayer.name} mendapat DOUBLES (${d1}-${d2})! Boleh lempar dadu lagi.`, 'doubles', '⚡');
        if (game.doublesCount >= 3) {
          addLog(game, io, `${currPlayer.name} mendapat Doubles 3x berturut-turut! Langsung dijebloskan ke Penjara!`, 'bad', '🚨');
          currPlayer.pos = 10;
          currPlayer.inJail = true;
          currPlayer.jailTurns = 0;
          game.diceRolledThisTurn = true;
          game.doublesCount = 0;
          bcast(io, sessionId, 'mono_player_moved', { playerId: currPlayer.id, pos: 10, instant: true });
          bcast(io, sessionId, 'mono_players_update', { players: game.players });
          return;
        }
      } else {
        game.doublesCount = 0;
        game.diceRolledThisTurn = true;
      }

      movePlayerToken(game, io, currPlayer, totalMove);
    });

    socket.on('mono_buy_property', ({ sessionId, discordId }) => {
      const game = monopolySessions.get(sessionId);
      if (!game || game.phase !== 'playing') return;
      const p = game.players[game.turnIndex];
      if (!p || p.id !== discordId) return;
      const tile = BOARD_TILES[p.pos];
      if (!tile || !['property', 'railway', 'utility'].includes(tile.type)) return;

      const owner = game.players.find(x => x.properties[tile.id]);
      if (owner) return; // already owned
      if (p.money < tile.price) return socket.emit('error', { message: 'Uangmu tidak cukup!' });

      p.money -= tile.price;
      p.properties[tile.id] = { houses: 0, hotel: false, justBought: true };
      game.actionDoneThisTurn = true;
      game.actedTileThisTurn = tile.id;
      addLog(game, io, `${p.name} membeli properti ${tile.name} seharga $${tile.price}!`, 'buy', '🏠');
      bcast(io, sessionId, 'mono_players_update', { players: game.players });
      bcast(io, sessionId, 'mono_tile_updated', { tileId: tile.id, ownerId: p.id, color: p.color });
      bcast(io, sessionId, 'mono_action_status', { actionDoneThisTurn: true, actedTileThisTurn: tile.id });
    });

    socket.on('mono_build_house', ({ sessionId, discordId, tileId }) => {
      const game = monopolySessions.get(sessionId);
      if (!game || game.phase !== 'playing') return;
      const p = game.players[game.turnIndex];
      if (!p || p.id !== discordId) return socket.emit('error', { message: 'Bukan giliranmu!' });
      if (p.pos !== tileId) return socket.emit('error', { message: 'Pion kamu harus berada di petak ini untuk membangun!' });
      if (!p.properties[tileId]) return socket.emit('error', { message: 'Kamu tidak memiliki aset ini!' });
      if (!game.diceRolledThisTurn) {
        return socket.emit('error', { message: '❌ Kamu harus mengocok dadu dan berjalan terlebih dahulu sebelum bisa membangun/upgrade!' });
      }
      const prop = p.properties[tileId];
      if (prop && prop.justBought) {
        return socket.emit('error', { message: '❌ Lahan ini baru kamu beli pada kunjungan ini! Kamu harus memutar keliling papan dulu dan mampir lagi ke sini pada putaran berikutnya untuk bisa membangun.' });
      }
      if (game.actionDoneThisTurn || game.actedTileThisTurn === tileId) {
        return socket.emit('error', { message: '❌ Giliran ini kamu sudah melakukan pembangunan di petak ini (Maksimal 1x per giliran)!' });
      }

      const tile = BOARD_TILES[tileId];
      if (!tile || tile.type !== 'property') return;

      if (prop.hotel) return socket.emit('error', { message: 'Sudah mencapai level Hotel maksimal!' });
      if (p.money < tile.housePrice) return socket.emit('error', { message: 'Uangmu tidak cukup!' });

      p.money -= tile.housePrice;
      game.actionDoneThisTurn = true;
      game.actedTileThisTurn = tileId;
      if (prop.houses < 4) {
        prop.houses++;
        addLog(game, io, `${p.name} membangun 1 Rumah di ${tile.name} (Total: ${prop.houses} Rumah).`, 'build', '🏗️');
      } else {
        prop.houses = 0;
        prop.hotel = true;
        addLog(game, io, `${p.name} membangun HOTEL mewah di ${tile.name}!`, 'build', '🏨');
      }
      bcast(io, sessionId, 'mono_players_update', { players: game.players });
      bcast(io, sessionId, 'mono_tile_updated', { tileId: tile.id, ownerId: p.id, color: p.color, houses: prop.houses, hotel: prop.hotel });
      bcast(io, sessionId, 'mono_action_status', { actionDoneThisTurn: true, actedTileThisTurn: tileId });
    });

    socket.on('mono_end_turn', ({ sessionId, discordId }) => {
      const game = monopolySessions.get(sessionId);
      if (!game || game.phase !== 'playing') return;
      const p = game.players[game.turnIndex];
      if (!p || p.id !== discordId) return;
      if (!game.diceRolledThisTurn) return socket.emit('error', { message: 'Kamu harus mengocok dadu terlebih dahulu!' });
      if (game.doublesCount > 0 && !p.inJail && !p.bankrupt) {
        return socket.emit('error', { message: 'Kamu mendapat Doubles! Kocok dadu sekali lagi.' });
      }

      nextPlayerTurn(game, io);
    });

    socket.on('mono_pay_jail_bail', ({ sessionId, discordId }) => {
      const game = monopolySessions.get(sessionId);
      if (!game || game.phase !== 'playing') return;
      const p = game.players[game.turnIndex];
      if (!p || p.id !== discordId || !p.inJail) return;
      if (p.money < 50) return socket.emit('error', { message: 'Uangmu tidak cukup untuk membayar jaminan $50.' });

      p.money -= 50;
      p.inJail = false;
      p.jailTurns = 0;
      addLog(game, io, `${p.name} membayar jaminan $50 dan bebas dari penjara! Silakan kocok dadu.`, 'good', '🔓');
      bcast(io, sessionId, 'mono_players_update', { players: game.players });
    });

    // ─── Kick Player (Host only, Lobby only) ─────────────────────────────────────
    socket.on('mono_kick', ({ sessionId, discordId, targetId }) => {
      const game = monopolySessions.get(sessionId);
      if (!game || game.host !== discordId) return;
      if (game.phase !== 'lobby') return socket.emit('error', { message: 'Tidak bisa kick saat game sudah mulai.' });
      const target = game.players.find(p => p.id === targetId);
      if (!target) return;
      // Notify the kicked player
      const targetSocket = game.players.find(p => p.id === targetId)?.socketId;
      if (targetSocket) {
        io.to(targetSocket).emit('mono_kicked', { reason: `Kamu dikick oleh Host.` });
      }
      game.players = game.players.filter(p => p.id !== targetId);
      addLog(game, io, `${target.name} telah dikeluarkan dari ruangan oleh Host.`, 'kick', '🥾');
      bcast(io, sessionId, 'mono_players_update', { players: game.players });
    });

    // ─── End Session (Host only) ─────────────────────────────────────────────────
    socket.on('mono_end_session', ({ sessionId, discordId }) => {
      const game = monopolySessions.get(sessionId);
      if (!game || game.host !== discordId) return;
      if (game.lobbyTimer) clearTimeout(game.lobbyTimer);
      if (game.maxTimer)   clearTimeout(game.maxTimer);
      bcast(io, sessionId, 'mono_session_ended', { reason: 'Host mengakhiri sesi permainan.' });
      monopolySessions.delete(sessionId);
    });

    // ─── Leave Room (Non-host, Lobby only) ───────────────────────────────────────
    socket.on('mono_leave', ({ sessionId, discordId }) => {
      const game = monopolySessions.get(sessionId);
      if (!game) return;
      if (game.host === discordId) return socket.emit('error', { message: 'Host tidak bisa meninggalkan room. Gunakan End Session.' });
      if (game.phase !== 'lobby') return socket.emit('error', { message: 'Tidak bisa keluar setelah game dimulai. Gunakan Give Up.' });
      const p = game.players.find(x => x.id === discordId);
      if (!p) return;
      game.players = game.players.filter(x => x.id !== discordId);
      addLog(game, io, `${p.name} meninggalkan ruangan.`, 'leave', '🚪');
      socket.leave(sessionId);
      socket.emit('mono_kicked', { reason: 'Kamu telah keluar dari ruangan.' });
      bcast(io, sessionId, 'mono_players_update', { players: game.players });
    });

    // ─── Give Up / Surrender (Game only) ─────────────────────────────────────────
    socket.on('mono_giveup', ({ sessionId, discordId }) => {
      const game = monopolySessions.get(sessionId);
      if (!game || game.phase !== 'playing') return;
      const p = game.players.find(x => x.id === discordId);
      if (!p || p.bankrupt) return;

      // Forfeit all properties
      game.tiles = game.tiles || BOARD_TILES;
      (game.tiles || []).forEach(t => { if (t.owner === discordId) { t.owner = null; t.houses = 0; t.hotel = false; } });

      p.bankrupt  = true;
      p.money     = 0;
      addLog(game, io, `${p.name} menyerah dan keluar dari permainan! Semua propertinya dikembalikan ke bank.`, 'giveup', '🏳️');
      bcast(io, sessionId, 'mono_players_update', { players: game.players });
      bcast(io, sessionId, 'mono_player_bankrupt', { playerName: p.name });

      // If this was the current player's turn, advance
      const currP = game.players[game.turnIndex];
      if (currP && currP.id === discordId) nextPlayerTurn(game, io);

      // Check if game should end
      const alive = game.players.filter(x => !x.bankrupt);
      if (alive.length <= 1) {
        if (game.maxTimer) clearTimeout(game.maxTimer);
        setTimeout(() => monopolySessions.delete(sessionId), 600000);
        const winner = alive[0] || game.players[0];
        game.phase = 'ended';
        addLog(game, io, `🏆 ${winner.name} memenangkan Monopoly Negara Dunia!`, 'win', '👑');
        bcast(io, sessionId, 'mono_game_ended', { winner });
      }
    });

    // ─── Global Chat (Lobby & Game) ───────────────────────────────────────────────
    socket.on('mono_chat', ({ sessionId, discordId, text }) => {
      const game = monopolySessions.get(sessionId);
      if (!game || !text || !text.trim()) return;
      const p = game.players.find(x => x.id === discordId);
      if (!p) return;
      const msg = {
        id: discordId,
        name: p.name,
        avatar: p.avatar,
        token: p.token,
        color: p.color,
        text: text.trim().substring(0, 150),
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      game.chat = [...(game.chat || []), msg];
      if (game.chat.length > 60) game.chat.shift();
      bcast(io, sessionId, 'mono_chat_msg', msg);
    });

  });
}

function nextPlayerTurn(game, io) {
  game.diceRolledThisTurn = false;
  game.doublesCount = 0;
  game.actionDoneThisTurn = false;
  game.actedTileThisTurn = null;
  bcast(io, game.sessionId, 'mono_action_status', { actionDoneThisTurn: false, actedTileThisTurn: null });
  let loops = 0;
  do {
    game.turnIndex = (game.turnIndex + 1) % game.players.length;
    loops++;
  } while (game.players[game.turnIndex].bankrupt && loops < game.players.length);

  const activePlayers = game.players.filter(p => !p.bankrupt);
  if (activePlayers.length <= 1) {
    game.phase = 'ended';
    if (game.maxTimer) clearTimeout(game.maxTimer);

    // Auto delete room 10 menit setelah game selesai
    setTimeout(() => {
      monopolySessions.delete(game.sessionId);
    }, 600000);

    const winner = activePlayers[0] || game.players[0];
    addLog(game, io, `🏆 PERMAINAN SELESAI! ${winner.name} memenangkan game Monopoly Negara Dunia!`, 'win', '👑');
    bcast(io, game.sessionId, 'mono_game_ended', { winner });
    return;
  }

  const nextP = game.players[game.turnIndex];
  bcast(io, game.sessionId, 'mono_turn_changed', { turnIndex: game.turnIndex, playerName: nextP.name });
}

function movePlayerToken(game, io, p, moveAmount) {
  const oldPos = p.pos;
  p.pos = (p.pos + moveAmount) % 40;
  if (oldPos + moveAmount >= 40) {
    p.money += 200;
    addLog(game, io, `${p.name} melewati GO dan menerima bonus uang $200!`, 'money', '💵');
  }

  if (p.properties) {
    Object.keys(p.properties).forEach(tId => {
      if (Number(tId) !== p.pos) {
        delete p.properties[tId].justBought;
      }
    });
  }

  bcast(io, game.sessionId, 'mono_player_moved', { playerId: p.id, pos: p.pos });
  handleTileLanding(game, io, p);
}

function handleTileLanding(game, io, p) {
  const tile = BOARD_TILES[p.pos];
  if (!tile) return;

  if (['property', 'railway', 'utility'].includes(tile.type)) {
    const owner = game.players.find(x => x.properties[tile.id]);
    if (!owner) {
      // Unowned prompt
      io.to(p.socketId).emit('mono_action_prompt', { type: 'buy', tile });
    } else if (owner.id !== p.id && !owner.inJail && !owner.bankrupt) {
      // Pay rent
      let rentAmount = 0;
      const prop = owner.properties[tile.id];
      if (tile.type === 'property') {
        if (prop.hotel) rentAmount = tile.rent[5];
        else rentAmount = tile.rent[prop.houses];
        if (hasCompleteColorSet(owner, tile.group)) {
          rentAmount *= 2;
        }
      } else if (tile.type === 'railway') {
        const rrCount = Object.keys(owner.properties).filter(id => BOARD_TILES[id] && BOARD_TILES[id].type === 'railway').length;
        rentAmount = tile.rent[Math.max(0, rrCount - 1)];
      } else if (tile.type === 'utility') {
        const utCount = Object.keys(owner.properties).filter(id => BOARD_TILES[id] && BOARD_TILES[id].type === 'utility').length;
        const mult = utCount >= 2 ? 10 : 4;
        rentAmount = mult * (Math.floor(Math.random() * 8) + 4); // simulated dice
      }

      p.money -= rentAmount;
      owner.money += rentAmount;
      addLog(game, io, `${p.name} menginjak tanah ${tile.name} milik ${owner.name}. Bayar sewa $${rentAmount}.`, 'rent', '💸');
      checkBankruptcy(game, io, p, owner);
    }
  } else if (tile.type === 'tax') {
    p.money -= tile.amount;
    addLog(game, io, `${p.name} membayar ${tile.name} sebesar $${tile.amount}.`, 'tax', '📜');
    checkBankruptcy(game, io, p, null);
  } else if (tile.type === 'gotojail') {
    p.pos = 10;
    p.inJail = true;
    p.jailTurns = 0;
    game.diceRolledThisTurn = true;
    game.doublesCount = 0;
    addLog(game, io, `${p.name} tertangkap petugas! Langsung dijebloskan ke Penjara!`, 'bad', '🚨');
    bcast(io, game.sessionId, 'mono_player_moved', { playerId: p.id, pos: 10, instant: true });
  } else if (tile.type === 'chance') {
    drawCard(game, io, p, 'chance');
  } else if (tile.type === 'chest') {
    drawCard(game, io, p, 'chest');
  }

  bcast(io, game.sessionId, 'mono_players_update', { players: game.players });
}

function drawCard(game, io, p, type) {
  let deck, indexKey;
  if (type === 'chance') {
    deck = game.chanceDeck;
    game.chanceIndex = (game.chanceIndex + 1) % deck.length;
    indexKey = game.chanceIndex;
  } else {
    deck = game.chestDeck;
    game.chestIndex = (game.chestIndex + 1) % deck.length;
    indexKey = game.chestIndex;
  }

  const card = deck[indexKey];
  addLog(game, io, `${p.name} mengambil Kartu ${type === 'chance' ? 'Kesempatan' : 'Dana Umum'}: "${card.title}"`, 'card', type === 'chance' ? '❓' : '📦');
  bcast(io, game.sessionId, 'mono_card_drawn', { playerId: p.id, card, type });

  if (card.action === 'money') {
    p.money += card.amount;
    checkBankruptcy(game, io, p, null);
  } else if (card.action === 'move') {
    const oldPos = p.pos;
    p.pos = card.target;
    if (card.target < oldPos && card.target !== 10) p.money += 200; // passed GO
    bcast(io, game.sessionId, 'mono_player_moved', { playerId: p.id, pos: p.pos });
    handleTileLanding(game, io, p);
  } else if (card.action === 'jail') {
    p.pos = 10;
    p.inJail = true;
    p.jailTurns = 0;
    bcast(io, game.sessionId, 'mono_player_moved', { playerId: p.id, pos: 10, instant: true });
  } else if (card.action === 'free_jail') {
    p.freeJailCards++;
  } else if (card.action === 'move_rel') {
    p.pos = (p.pos + card.amount + 40) % 40;
    bcast(io, game.sessionId, 'mono_player_moved', { playerId: p.id, pos: p.pos });
    handleTileLanding(game, io, p);
  } else if (card.action === 'pay_all' || card.action === 'collect_all') {
    const amt = card.amount;
    game.players.forEach(other => {
      if (other.id !== p.id && !other.bankrupt) {
        if (card.action === 'pay_all') { p.money -= amt; other.money += amt; }
        else { p.money += amt; other.money -= amt; }
      }
    });
    checkBankruptcy(game, io, p, null);
  } else if (card.action === 'repairs') {
    let cost = 0;
    Object.values(p.properties).forEach(prop => {
      if (prop.hotel) cost += card.hotel;
      else cost += prop.houses * card.house;
    });
    p.money -= cost;
    addLog(game, io, `${p.name} membayar renovasi bangunan $${cost}.`, 'bad', '🔨');
    checkBankruptcy(game, io, p, null);
  }
}

function checkBankruptcy(game, io, p, creditor) {
  if (p.money < 0) {
    p.bankrupt = true;
    addLog(game, io, `💀 ${p.name} BANGKRUT! Seluruh asetnya diambil alih.`, 'bankrupt', '💀');
    if (creditor && !creditor.bankrupt) {
      creditor.money += Math.max(0, p.money + 100); // give remaining liquidated cash
      Object.keys(p.properties).forEach(tid => { creditor.properties[tid] = p.properties[tid]; });
    }
    p.properties = {};
    bcast(io, game.sessionId, 'mono_players_update', { players: game.players });
  }
}

module.exports = { attach, BOARD_TILES, createMonopolySession, getSessions: () => monopolySessions };
