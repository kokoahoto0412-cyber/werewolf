const path = require('path');

// ─── HUGE WORD CATEGORIES DATABASE (RATUSAN KATA) ──────────────────────────────
const WORD_CATEGORIES = {
  'Makanan & Minuman': [
    'Nasi Goreng','Sate Ayam','Bakso','Mie Ayam','Rendang','Martabak','Gado Gado','Soto Ayam',
    'Ketoprak','Pempek','Es Campur','Es Teh Manis','Kopi Susu','Jus Alpukat','Keripik Singkong',
    'Opor Ayam','Rawon','Gudeg','Serabi','Klepon','Lumpia','Bakpao','Pisang Goreng','Tahu Bulat',
    'Donat','Cokelat','Es Krim','Puding','Hamburger','Pizza','Spaghetti','Roti Bakar','Ayam Geprek',
    'Seblak','Cilok','Cireng','Batagor','Kue Cubit','Nasi Uduk','Bubur Ayam','Sate Padang',
    'Ayam Bakar','Ikan Bakar','Bebek Goreng','Sayur Asem','Sayur Lodeh','Lontong Sayur','Toge Goreng',
    'Karedok','Pecel Lele','Ayam Penyet','Kue Putu','Nastar','Kastengel','Putri Salju','Dadar Gulung',
    'Onde Onde','Cucur','Bika Ambon','Lapis Legit','Kue Talam','Lemper','Risoles','Pastel','Kroket',
    'Siomay','Hakau','Dimsum','Sushi','Ramen','Takoyaki','Udon','Onigiri','Kebab','Burrito','Taco',
    'Hotdog','French Fries','Cheese Cake','Macaron','Waffle','Pancake','Churros','Croissant','Kopi Hitam',
    'Teh Tarik','Bajigur','Bandrek','Sekoteng','Es Cendol','Es Doger','Es Kelapa Muda','Jus Jeruk','Jus Mangga'
  ],
  'Negara & Tempat': [
    'Indonesia','Jepang','Korea Selatan','Amerika Serikat','Inggris','Belanda','Jerman','Prancis',
    'Italia','Spanyol','Rusia','China','Singapura','Malaysia','Thailand','Australia','Kanada',
    'Brasil','Mesir','Arab Saudi','Turki','India','Vietnam','Filipina','Meksiko','Swiss','Yunani',
    'Argentina','Portugal','Belgia','Swedia','Norwegia','Finlandia','Polandia','Ukraina','Selandia Baru',
    'Afrika Selatan','Maroko','Uni Emirat Arab','Qatar','Kuwait','Iran','Irak','Palestina','Israel',
    'Monas','Borobudur','Prambanan','Menara Eiffel','Patung Liberty','Colosseum','Tembok Besar China',
    'Taj Mahal','Piramida','Menara Pisa','Big Ben','Burj Khalifa','Sydney Opera House','Gunung Fuji',
    'Bali','Raja Ampat','Danau Toba','Gunung Bromo','Labuan Bajo','Candi','Masjid','Gereja','Pura',
    'Vihara','Istana','Museum','Kebun Binatang','Taman Bermain','Bioskop','Rumah Sakit','Sekolah','Universitas',
    'Bandara','Stasiun Kereta','Pelabuhan','Pasar Tradisional','Supermarket','Mall','Restoran','Kafe'
  ],
  'Hewan': [
    'Kucing','Anjing','Harimau','Singa','Gajah','Jerapah','Monyet','Zebra','Buaya','Ular',
    'Kura Kura','Penyu','Ikan Paus','Lumba Lumba','Hiu','Burung Hantu','Elang','Merpati','Kupu Kupu',
    'Laba Laba','Semut','Lebah','Nyamuk','Lalat','Katak','Kelinci','Hamster','Kuda','Sapi','Kambing',
    'Bebek','Ayam','Penguin','Panda','Koala','Kanguru','Komodo','Cumi Cumi','Gurita','Kepiting',
    'Udang','Lobster','Belut','Kuda Laut','Ikan Badut','Ikan Pari','Anjing Laut','Beruang Kutub',
    'Rakun','Tupai','Kelelawar','Landak','Trenggiling','Badak','Kuda Nil','Rusa','Unta','Babi Hutan',
    'Serigala','Rubah','Cheetah','Macan Tutul','Gorila','Orangutan','Siamang','Bunglon','Iguana','Tokek',
    'Cicak','Ular Kobra','Ular Sanca','Katak Pohon','Salamander','Axolotl','Burung Merak','Burung Kakaktua','Burung Beo',
    'Burung Bangau','Burung Pelikan','Flamingo','Burung Kolibri','Kalajengking','Kelabang','Kumbang','Capung','Belalang'
  ],
  'Benda & Alat': [
    'Sepeda','Mobil','Sepeda Motor','Pesawat Terbang','Kapal Laut','Kereta Api','Helm','Jaket',
    'Sepatu','Sandal','Jam Tangan','Kacamata','Topi','Tas Punggung','Dompet','Payung','Buku',
    'Pensil','Pulpen','Penghapus','Penggaris','Gunting','Meja Belajar','Kursi','Lemari Pakaian',
    'Tempat Tidur','Bantal','Guling','Selimut','Cermin','Sisir','Sikat Gigi','Handuk','Sabun',
    'Ember','Sapu','Kipas Angin','Televisi','Smartphone','Laptop','Headphone','Kamera','Senter',
    'Setrika','Mesin Cuci','Kulkas','Blender','Rice Cooker','Kompor Gas','Tabung Gas','Wajan','Panci',
    'Pisau Dapur','Sendok','Garpu','Piring','Gelas','Teko','Botol Minum','Termos','Gayung','Pel',
    'Kemoceng','Tempat Sampah','Lampu Pijar','Stopkontak','Baterai','Kabel Charger','Powerbank','Mouse','Keyboard',
    'Printer','Harddisk','Flashdisk','Proyektor','Microphone','Speaker','Gitar','Piano','Biola','Drum',
    'Seruling','Teropong','Kalkulator','Gembok','Kunci','Tang','Obeng','Palu','Gergaji','Bor Listrik'
  ],
  'Anime & Manga': [
    'Naruto','One Piece','Dragon Ball','Attack on Titan','Demon Slayer','Jujutsu Kaisen',
    'Bleach','Hunter x Hunter','My Hero Academia','Death Note','Detective Conan','Pokemon',
    'Doraemon','Sinchan','Gundam','Sailor Moon','Tokyo Ghoul','Black Clover','Haikyuu','Spy x Family',
    'Chainsaw Man','One Punch Man','Boruto','Avatar','Beyblade','Digimon','Captain Tsubasa',
    'Goku','Luffy','Zoro','Sanji','Sasuke','Kakashi','Itachi','Levi Ackerman','Eren Yeager','Mikasa',
    'Tanjiro','Nezuko','Gojo Satoru','Sukuna','Killua','Gon','Light Yagami','L','Conan Edogawa','Kaito Kid',
    'Pikachu','Charizard','Nobita','Giant','Suneo','Dorami','Anya Forger','Makima','Denji','Saitama',
    'Genos','Inuyasha','Fullmetal Alchemist','Sword Art Online','Kirito','Asuna','Tokyo Revengers','Mikey','Draken',
    'Solo Leveling','Sung Jin Woo','Fairy Tail','Natsu','Evangelion','Totoro','Spirited Away'
  ],
  'Game': [
    'Mobile Legends','PUBG Mobile','Free Fire','Minecraft','Roblox','Grand Theft Auto','Valorant',
    'Dota 2','Clash of Clans','Clash Royale','Genshin Impact','Super Mario','Tetris','Pacman',
    'Among Us','Stumble Guys','Angry Birds','Subway Surfers','Candy Crush','Plants vs Zombies',
    'Resident Evil','God of War','Tekken','Mortal Kombat','Fifa','Need for Speed','Assassins Creed',
    'Layla','Zilong','Alucard','Miya','Fanny','Johnson','Gusion','Chou','Pudge','Invoker',
    'Steve','Creeper','Enderman','Herobrine','Mario','Luigi','Bowser','Sonic','Pikachu','Link',
    'Zelda','Kratos','Master Chief','Lara Croft','Leon Kennedy','Jill Valentine','Nemesis','CJ San Andreas','Arthur Morgan',
    'Elden Ring','Dark Souls','Hollow Knight','Undertale','Sans','Five Nights at Freddys','Freddy Fazbear','Cyberpunk 2077','The Witcher',
    'Geralt of Rivia','League of Legends','Overwatch','Apex Legends','Fortnite','Call of Duty','Silent Hill','Pyramid Head','Outlast'
  ],
  'Minecraft': [
    'Creeper','Zombie','Skeleton','Enderman','Slime','Spider','Cave Spider','Silverfish','Blaze','Ghast',
    'Magma Cube','Wither Skeleton','Zombie Piglin','Piglin','Piglin Brute','Hoglin','Zoglin','Strider','Phantom','Witch',
    'Vindicator','Evoker','Ravager','Pillager','Vex','Warden','Guardian','Elder Guardian','Shulker','Ender Dragon',
    'Wither','Iron Golem','Snow Golem','Villager','Zombie Villager','Wandering Trader','Steve','Alex','Herobrine','Axolotl',
    'Allay','Frog','Tadpole','Goat','Glow Squid','Bee','Panda','Fox','Dolphin','Turtle',
    'Parrot','Llama','Polar Bear','Wolf','Cat','Ocelot','Horse','Donkey','Mule','Skeleton Horse',
    'Cow','Mooshroom','Pig','Sheep','Chicken','Rabbit','Squid','Bat','Cod','Salmon',
    'Diamond Sword','Diamond Pickaxe','Diamond Axe','Diamond Shovel','Netherite Sword','Netherite Armor','Golden Apple','Enchanted Golden Apple','Bow','Crossbow',
    'Trident','Shield','Elytra','Totem of Undying','Ender Pearl','Eye of Ender','Blaze Rod','Nether Star','Redstone Dust','Glowstone Dust',
    'Crafting Table','Furnace','Blast Furnace','Smoker','Enchanting Table','Anvil','Brewing Stand','Cauldron','Chest','Ender Chest',
    'Shulker Box','Bed','Torch','Lantern','Campfire','Beacon','Conduit','TNT','Bookshelf','Jukebox',
    'Diamond Block','Gold Block','Iron Block','Emerald Block','Obsidian','Bedrock','Grass Block','Dirt','Cobblestone','Oak Log'
  ],
  'Film & Serial': [
    'Spider Man','Batman','Iron Man','Superman','Avengers','Harry Potter','Jurassic Park',
    'Titanic','Avatar','Transformers','Fast and Furious','Pirates of the Caribbean','Star Wars',
    'Toy Story','Frozen','Lion King','Minions','Shrek','Kung Fu Panda','Moana','Aladdin','Joker',
    'Captain America','Thor','Hulk','Black Panther','Doctor Strange','Wolverine','Deadpool','Venom','Thanos',
    'Harley Quinn','Wonder Woman','Aquaman','Flash','Jack Sparrow','Darth Vader','Yoda','Luke Skywalker','Mandalorian',
    'Sherlock Holmes','James Bond','John Wick','Dominic Toretto','Optimus Prime','Bumblebee','Godzilla','King Kong','Alien',
    'Predator','Terminator','Rambo','Rocky','Indiana Jones','Neo Matrix','Pennywise IT','Michael Myers','Jason Voorhees',
    'Ghostbusters','Back to the Future','Lord of the Rings','Gandalf','Gollum','Stranger Things','Squid Game','Money Heist','Game of Thrones'
  ],
  'Pekerjaan & Profesi': [
    'Dokter','Polisi','Tentara','Guru','Pilot','Nakhoda','Masinis','Sopir','Koki','Pelayan',
    'Petani','Nelayan','Pedagang','Seniman','Penyanyi','Aktor','Penari','Penulis','Wartawan',
    'Fotografer','Arsitek','Programmer','YouTuber','Gamer','Satpam','Montir','Tukang Cukur',
    'Perawat','Apoteker','Dokter Gigi','Dokter Hewan','Hakim','Pengacara','Jaksa','Presiden','Menteri',
    'Walikota','Kepala Desa','Camat','Astronaut','Ilmuwan','Detektif','Pembersih Jalan','Tukang Kebun','Tukang Kayu',
    'Tukang Las','Tukang Batu','Tukang Listrik','Tukang Ledeng','Penjahit','Desainer Busana','Model','Pemusik','Dirigen',
    'Sutradara','Kameramen','Editor Video','Penyiar Radio','Pembawa Acara','Kasir','Akuntan','Manajer','Direktur',
    'Sekretaris','Resepsionis','Kurir','Tukang Pos','Pramugari','Sopir Bus','Sopir Taksi','Tukang Ojek','Tukang Becak'
  ],
  'Kartun': [
    'My Little Pony','Twilight Sparkle','Rainbow Dash','Pinkie Pie','Fluttershy','Rarity','Applejack',
    'SpongeBob','Patrick Star','Squidward','Mr Krabs','Plankton','Sandy Cheeks','Gary','Krusty Krab',
    'Tom and Jerry','Mickey Mouse','Donald Duck','Goofy','Winnie the Pooh','Scooby Doo','Shaggy','Popeye',
    'Ben 10','Powerpuff Girls','Blossom','Bubbles','Buttercup','Dexter','Johnny Bravo','Courage',
    'Adventure Time','Finn','Jake','Regular Show','Gumball','Darwin','We Bare Bears','Grizzly','Panda','Ice Bear',
    'Teen Titans','Robin','Starfire','Raven','Cyborg','Beast Boy','Upin dan Ipin','Upin','Ipin',
    'Kak Ros','Tok Dalang','Jarjit','Mail','Mei Mei','Fizi','Ehsaan','BoBoiBoy','Gopal','Yaya',
    'Ying','Fang','Adudu','Probe','Ejen Ali','Adit Sopo Jarwo','Sopo','Jarwo','Winx Club','Barbie',
    'Teletubbies','Tinky Winky','Dipsy','Laa Laa','Po','Shaun the Sheep','Timmy Time','Bernard Bear','Larva',
    'Masha and the Bear','Paw Patrol','Peppa Pig','Dora the Explorer','Boots','Swiper','Diego',
    'Fairly OddParents','Timmy Turner','Cosmo','Wanda','Jimmy Neutron','Danny Phantom','Avatar Aang','Aang',
    'Katara','Sokka','Zuko','Toph','Appa','Garfield','Snoopy','Pink Panther','Minions','Shrek',
    'Felix the Cat','Woody Woodpecker','Bugs Bunny','Daffy Duck','Tweety','Sylvester','Road Runner','Wile E Coyote','Tazmanian Devil'
  ],
  'Aktivitas & Olahraga': [
    'Sepak Bola','Bulu Tangkis','Berenang','Memancing','Menari','Bernyanyi','Tidur Berjalan','Menangis',
    'Memasak','Melompat','Bersepeda','Yoga','Tinju','Basket','Bola Voli','Tenis','Lari Marathon','Panahan',
    'Main Gitar','Main Game','Membaca Buku','Belanja','Mandi','Menyapu','Mencuci Baju','Mengepel','Berkemah',
    'Mendaki Gunung','Jogging','Scuba Diving','Berselancar','Bermain Skate','Angkat Beban','Gym','Makan Malam',
    'Minum Kopi','Menulis Surat','Melukis','Belajar','Bermain Piano','Menyetir Mobil','Naik Motor','Naik Kereta',
    'Terjun Payung','Bermain Golf','Bermain Bowling','Biliard','Tenis Meja','Sepatu Roda','Balap Lari','Lompat Tali',
    'Karate','Taekwondo','Pencak Silat','Judo','Gulat','Anggar','Panjat Tebing','Berkuda','Arung Jeram',
    'Olahraga Pagi','Senam','Zumba','Aerobik','Berjemur','Piknik','Foto Selfie','Menonton Bioskop','Mendengarkan Musik',
    'Mengobrol','Tertawa','Tersenyum','Marah','Melamun','Berdoa','Sujud','Mengendarai Sepeda','Membuat Kue',
    'Menanam Bunga','Menyiram Tanaman','Memberi Makan Hewan','Memotong Rambut','Berdandan','Menyetrika Baju','Mencuci Piring',
    'Membuka Kado','Meniup Lilin','Berpesta','Menjemur Pakaian','Bermain Layangan','Bermain Petak Umpet','Lompat Jauh'
  ],
  'Fantasi & Mitologi': [
    'Naga','Putri Duyung','Unicorn','Vampir','Zombie','Alien','Peri','Raksasa','Malaikat','Iblis',
    'Centaur','Phoenix','Sihir','Sapu Terbang','Pegasus','Hydra','Kraken','Griffin','Minotaur','Cerberus',
    'Penyihir','Ksatria','Istana Terbang','Peti Harta Karun','Pedang Excalibur','Tongkat Sihir','Ramuan Ajaib','Portal Gaib',
    'Elf','Dwarf','Goblin','Orc','Troll','Ogre','Banshee','Sirene','Medusa','Cyclops','Sphinx','Leviathan',
    'Garuda','Barong','Kitsune','Tengu','Kappa','Anubis','Osiris','Zeus','Poseidon','Hades','Thor','Odin',
    'Loki','Valkyrie','Golem','Gargoyle','Chimera','Basilisk','Werewolf','Manusia Serigala','Hantu','Kuntilanak',
    'Pocong','Tuyul','Genderuwo','Leak','Jin','Lampu Aladin','Permadani Terbang','Bola Kristal','Topi Penyihir',
    'Jubah Gaib','Cermin Ajaib','Pohon Berbicara','Peri Gigi','Santa Claus','Peri Hutan','Naga Api','Naga Es',
    'Raja Iblis','Pangeran Kegelapan','Putri Salju','Ksatria Suci','Pemanah Elf','Dewa Matahari','Dewa Bulan','Dewa Petir'
  ],
  'Buah & Tumbuhan': [
    'Semangka','Durian','Rambutan','Pisang','Stroberi','Brokoli','Jamur','Kaktus','Bunga Matahari','Pohon Kelapa',
    'Lidah Buaya','Pohon Bambu','Nanas','Mangga','Alpukat','Jeruk','Apel','Anggur','Pepaya','Manggis','Salak',
    'Kelengkeng','Buah Naga','Jambu Air','Tomat','Terong','Bayam','Kangkung','Bunga Mawar','Bunga Melati','Pohon Beringin',
    'Rumput Laut','Jambu Biji','Kedondong','Duku','Leci','Kiwi','Melon','Blewah','Timun','Labu','Wortel',
    'Kentang','Ubi Jalar','Singkong','Bawang Merah','Bawang Putih','Cabai','Tomat Ceri','Kubis','Sawi','Daun Bawang',
    'Seledri','Kemangi','Daun Singkong','Pare','Labu Siam','Kacang Panjang','Buncis','Kacang Tanah','Kacang Hijau',
    'Kacang Kedelai','Jagung','Padi','Gandum','Pohon Mangga','Pohon Pisang','Pohon Jati','Pohon Mahoni','Pohon Pinus',
    'Pohon Cemara','Pohon Sakura','Bunga Anggrek','Bunga Tulip','Bunga Teratai','Bunga Kembang Sepatu','Bunga Aster','Bunga Lily',
    'Kantong Semar','Putri Malu','Lumut','Pakis','Daun Pandan','Serai','Jahe','Kunyit','Lengkuas','Kayu Manis'
  ],
  'Merek & Logo': [
    'Discord','YouTube','TikTok','Google','Apple','Indomie','Gojek','KFC','McDonald','Shopee','Netflix',
    'Instagram','WhatsApp','Facebook','Twitter','X','Spotify','Twitch','Steam','PlayStation','Xbox','Nintendo',
    'Adidas','Nike','Samsung','Xiaomi','Tokopedia','Grab','Starbucks','Pizza Hut','Burger King','Coca Cola',
    'Pepsi','Microsoft','Windows','Android','Intel','Nvidia','AMD','Sony','LG','Oppo','Vivo','Realme',
    'Asus','Lenovo','Acer','HP','Dell','Canon','Nikon','GoPro','Puma','Reebok','Vans','Converse',
    'Uniqlo','Zara','H&M','Gucci','Louis Vuitton','Chanel','Hermes','Rolex','Casio','G-Shock','Honda',
    'Yamaha','Suzuki','Kawasaki','Toyota','Daihatsu','Mitsubishi','BMW','Mercedes Benz','Ferrari','Lamborghini','Porsche',
    'Tesla','Boeing','AirAsia','Garuda Indonesia','Indomaret','Alfamart','BCA','BRI','Mandiri','BNI','Dana',
    'OVO','GoPay','Traveloka','Tiketcom','Lazada','Blibli','Zalora','Nutella','SilverQueen','Teh Botol Sosro'
  ],
  'Fenomena Alam': [
    'Pelangi','Gunung Meletus','Tsunami','Gerhana Matahari','Hujan Salju','Angin Puting Beliung','Badai Petir','Aurora',
    'Gempa Bumi','Air Terjun','Hujan Lebat','Banjir','Kemarau','Gerhana Bulan','Bintang Jatuh','Meteor','Kabut',
    'Awan Mendung','Gelombang Laut','Gurun Pasir','Samudera','Gua Hitam','Pulau Terpencil','Badai Salju','Badai Pasir',
    'Angin Topan','Angin Sepoi Sepoi','Hujan Es','Hujan Asam','Matahari Terbit','Matahari Terbenam','Bulan Purnama','Bulan Sabit',
    'Gerhana Matahari Total','Pelangi Malam','Kilat Petir','Halilintar','Tanah Longsor','Retakan Bumi','Lumpur Hisap','Kawah Gunung',
    'Danau Kawah','Geyser','Sumber Air Panas','Gunung Es','Gletser','Lembah Hijau','Jurang Terjal','Tebing Batu',
    'Pantai Pasir Putih','Karang Laut','Palung Laut','Terumbu Karang','Hutan Hujan Tropis','Hutan Pinus','Sabana','Padang Rumput',
    'Rawa Rawa','Muara Sungai','Hulu Sungai','Mata Air','Oasis','Fatamorgana','Awan Cumulonimbus','Badai Tropis',
    'Gelombang Pasang','Surut Laut','Pusaran Air','Arus Laut','Es Mencair','Musim Semi','Musim Panas','Musim Gugur',
    'Musim Dingin','Musim Hujan','Musim Kemarau','Debu Vulkanik','Lahar Panas','Aliran Magma','Batu Meteor','Komet Halley'
  ],
  'Tokoh & YouTuber': [
    'Windah Basudara','Lionel Messi','Cristiano Ronaldo','Albert Einstein','Michael Jackson','Deddy Corbuzier','Raditya Dika','MrBeast',
    'PewDiePie','MiawAug','Atta Halilintar','Raffi Ahmad','Jess No Limit','Kimi Hime','Lesti Kejora','Najwa Shihab','Elon Musk',
    'Mark Zuckerberg','Bill Gates','Jackie Chan','Bruce Lee','Charlie Chaplin','Marilyn Monroe','Stephen Hawking','Steve Jobs',
    'Jeff Bezos','Warren Buffett','Nikola Tesla','Isaac Newton','Thomas Alva Edison','Alexander Graham Bell','Leonardo da Vinci','Vincent van Gogh',
    'Pablo Picasso','Wolfgang Amadeus Mozart','Ludwig van Beethoven','William Shakespeare','Nelson Mandela','Mahatma Gandhi','Soekarno','B.J. Habibie',
    'Joko Widodo','Prabowo Subianto','Anies Baswedan','Ganjar Pranowo','Susi Pudjiastuti','Hotman Paris','Ivan Gunawan','Ruben Onsu',
    'Denny Sumargo','Boy William','Sule','Andre Taulany','Parto','Nunung','Cak Lontong','Kiky Saputri','Ernest Prakasa',
    'Pandji Pragiwaksono','Tretan Muslim','Coki Pardede','Tara Arts','Frost Diamond','BeaconCream','Brandon Kent','DeanKT',
    'Reapz','Lemon RRQ','Oura Eko','Tuturu','Jonathan Liandi','Neymar Jr','Kylian Mbappe','Erling Haaland','LeBron James',
    'Michael Jordan','Kobe Bryant','Mike Tyson','Muhammad Ali','Roger Federer','Rafael Nadal','Novak Djokovic','Valentino Rossi',
    'Marc Marquez','Lewis Hamilton','Taylor Swift','Ed Sheeran','Justin Bieber','Ariana Grande','Bruno Mars','Adele'
  ]
};

// Auto generate 'Mix' category combining all
WORD_CATEGORIES['Mix'] = Object.values(WORD_CATEGORIES).flat();

const OWNER_IDS = ['571492745676587009', '1421922204626587820', '1281505068746543181'];
const drawSessions = new Map();
let _io = null;


function generateSessionId() {
  return 'draw_' + Math.random().toString(36).substring(2, 8);
}

function createDrawSession(hostId, hostName, hostAvatar, avatarMap, guildId, botToken) {
  const sessionId = generateSessionId();
  const game = {
    sessionId,
    hostId,
    hostName,
    phase: 'lobby', // 'lobby', 'choosing', 'drawing', 'game_over'
    category: 'Mix',
    players: [], // { id, name, avatar, score, isHost, socketId }
    avatarMap: avatarMap || {},
    guildId,
    botToken,
    round: 1,
    maxRounds: 3,
    turnIndex: 0,
    currentDrawerId: null,
    currentWord: '',
    hintWord: '',
    timer: 0,
    timerInterval: null,
    lobbyTimer: null,
    guessedPlayers: new Set(),
    drawHistory: [],
    logs: []
  };

  // Auto-delete lobby setelah 5 menit jika tidak dimulai
  game.lobbyTimer = setTimeout(() => {
    const g = drawSessions.get(sessionId);
    if (g && g.phase === 'lobby') {
      if (_io) bcast(_io, sessionId, 'error', { message: 'Lobby dihapus otomatis karena tidak dimulai dalam 5 menit.' });
      drawSessions.delete(sessionId);
    }
  }, 300000);

  drawSessions.set(sessionId, game);
  return sessionId;
}

function bcast(io, sessionId, event, data) {
  io.to(sessionId).emit(event, data);
}

function getMaskedHint(word, revealedIndices = []) {
  return word.split('').map((char, idx) => {
    if (char === ' ') return '\u00A0\u00A0\u00A0';
    if (revealedIndices.includes(idx)) return char;
    return '_';
  }).join(' ');
}

function startChoosingPhase(io, game) {
  if (game.phase === 'game_over' || !drawSessions.has(game.sessionId) || game.players.length === 0) return;
  if (game.lobbyTimer) { clearTimeout(game.lobbyTimer); game.lobbyTimer = null; }
  game.phase = 'choosing';
  game.guessedPlayers.clear();
  game.drawHistory = [];

  if (game.turnIndex >= game.players.length) {
    game.turnIndex = 0;
    game.round++;
    if (game.round > game.maxRounds) {
      endGame(io, game);
      return;
    }
  }

  const drawer = game.players[game.turnIndex];
  game.currentDrawerId = drawer.id;

  const pool = WORD_CATEGORIES[game.category] || WORD_CATEGORIES['Mix'];
  // Pick 3 random unique words
  const shuffled = [...pool].sort(() => 0.5 - Math.random());
  const choices = shuffled.slice(0, 3);

  bcast(io, game.sessionId, 'phase_update', {
    phase: 'choosing',
    round: game.round,
    maxRounds: game.maxRounds,
    drawerName: drawer.name,
    drawerId: drawer.id
  });

  if (drawer.socketId) {
    io.to(drawer.socketId).emit('word_choices', { choices });
  }

  // Skip turn after 10s if drawer doesn't pick (AFK protection)
  clearInterval(game.timerInterval);
  let time = 10;
  game.timerInterval = setInterval(() => {
    time--;
    if (time <= 0) {
      clearInterval(game.timerInterval);
      if (game.phase === 'choosing') {
        endTurn(io, game, `⏳ ${drawer.name} tidak memilih kata (AFK)! Giliran dilewati.`);
      }
    }
  }, 1000);
}

function startDrawingPhase(io, game, word) {
  if (game.phase === 'game_over' || !drawSessions.has(game.sessionId) || game.players.length === 0) return;
  clearInterval(game.timerInterval);
  game.phase = 'drawing';
  game.currentWord = word.trim();
  
  // Initialize hint
  const wordLen = game.currentWord.length;
  const revealed = [];
  game.hintWord = getMaskedHint(game.currentWord, revealed);

  const drawer = game.players.find(p => p.id === game.currentDrawerId);

  bcast(io, game.sessionId, 'drawing_start', {
    round: game.round,
    drawerId: game.currentDrawerId,
    drawerName: drawer ? drawer.name : '???',
    hint: game.hintWord,
    wordLength: wordLen
  });

  if (drawer && drawer.socketId) {
    io.to(drawer.socketId).emit('secret_word', { word: game.currentWord });
  }

  game.timer = 80;
  bcast(io, game.sessionId, 'timer_update', { time: game.timer });

  let hintCountdown = 25;

  game.timerInterval = setInterval(() => {
    game.timer--;
    hintCountdown--;

    if (hintCountdown <= 0 && game.currentWord.length > 3) {
      hintCountdown = 25;
      // Reveal 1 random hidden character
      const unrevealedIdx = [];
      for (let i = 0; i < game.currentWord.length; i++) {
        if (game.currentWord[i] !== ' ' && !revealed.includes(i)) {
          unrevealedIdx.push(i);
        }
      }
      if (unrevealedIdx.length > 1) {
        const randIdx = unrevealedIdx[Math.floor(Math.random() * unrevealedIdx.length)];
        revealed.push(randIdx);
        game.hintWord = getMaskedHint(game.currentWord, revealed);
        bcast(io, game.sessionId, 'hint_update', { hint: game.hintWord });
      }
    }

    bcast(io, game.sessionId, 'timer_update', { time: game.timer });

    if (game.timer <= 0) {
      clearInterval(game.timerInterval);
      endTurn(io, game, `Waktu Habis! Kata yang benar adalah: ${game.currentWord}`);
    }
  }, 1000);
}

function endTurn(io, game, reason) {
  clearInterval(game.timerInterval);
  bcast(io, game.sessionId, 'turn_end', {
    reason,
    word: game.currentWord,
    players: getPublicPlayers(game)
  });

  game.turnIndex++;
  setTimeout(() => {
    startChoosingPhase(io, game);
  }, 5000);
}

function endGame(io, game) {
  clearInterval(game.timerInterval);
  game.phase = 'game_over';
  const sorted = [...game.players].sort((a, b) => b.score - a.score);
  bcast(io, game.sessionId, 'game_over', {
    winners: sorted.filter(p => !p.isSpectator),
    players: getPublicPlayers(game)
  });
}

function attach(app, io) {
  _io = io;
  const createDrawHandler = (req, res) => {
    const { hostId, hostName, hostAvatar, avatarMap, guildId, botToken } = req.body;
    if (!hostId || !hostName) return res.status(400).json({ error: 'Missing hostId or hostName' });
    const sessionId = createDrawSession(hostId, hostName, hostAvatar || '', avatarMap || {}, guildId, botToken);
    const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3001}`;
    res.json({ sessionId, url: `${baseUrl}/draw/${sessionId}` });
  };
  app.post('/api/create-draw', createDrawHandler);
  app.post('/api/draw/create', createDrawHandler);

  app.get('/draw/:sessionId', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'draw.html'));
  });

  io.on('connection', (socket) => {
    socket.on('draw_join', async ({ sessionId, discordId, name, avatar }) => {
      const game = drawSessions.get(sessionId);
      if (!game) return socket.emit('error', { message: 'Room Draw & Guess tidak ditemukan!' });
      if (game.players.length >= 10 && !game.players.find(p => p.id === discordId)) {
        if (!OWNER_IDS.includes(discordId)) {
          return socket.emit('error', { message: 'Room sudah penuh (Max 10 Pemain)!' });
        }
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
              const memAv = list[0].avatar;
              if (memAv) {
                finalAvatar = `https://cdn.discordapp.com/guilds/${game.guildId}/users/${u.id}/avatars/${memAv}.png?size=128`;
              } else if (u.avatar) {
                finalAvatar = `https://cdn.discordapp.com/avatars/${u.id}/${u.avatar}.png?size=128`;
              } else {
                finalAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}`;
              }
              if (!game.avatarMap) game.avatarMap = {};
              game.avatarMap[name.toLowerCase()] = finalAvatar;
            }
          }
        } catch(e) {}
      }

      const isOwnerSpec = OWNER_IDS.includes(discordId) && (game.phase !== 'lobby' || getPublicPlayers(game).length >= 10);
      let p = game.players.find(x => x.id === discordId || x.name.toLowerCase() === name.toLowerCase());
      if (!p) {
        p = {
          id: discordId,
          name: name || 'Gamer',
          avatar: finalAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}`,
          score: 0,
          isHost: (discordId === game.hostId || game.players.length === 0),
          isSpectator: isOwnerSpec
        };
        game.players.push(p);
      } else {
        if (name) p.name = name;
        if (finalAvatar) p.avatar = finalAvatar;
        if (isOwnerSpec) p.isSpectator = true;
      }
      p.socketId = socket.id;
      socket.join(sessionId);

      socket.emit('draw_room_state', {
        sessionId: game.sessionId,
        phase: game.phase,
        category: game.category,
        categories: Object.keys(WORD_CATEGORIES),
        players: getPublicPlayers(game),
        hostId: game.hostId,
        myId: discordId,
        round: game.round,
        maxRounds: game.maxRounds,
        currentDrawerId: game.currentDrawerId,
        hint: game.hintWord,
        drawHistory: game.drawHistory
      });

      bcast(io, sessionId, 'players_update', { players: getPublicPlayers(game) });
    });

    socket.on('draw_select_category', ({ sessionId, category }) => {
      const game = drawSessions.get(sessionId);
      if (!game || game.phase !== 'lobby') return;
      if (WORD_CATEGORIES[category]) {
        game.category = category;
        bcast(io, sessionId, 'category_updated', { category });
      }
    });

    socket.on('draw_start_game', ({ sessionId, discordId }) => {
      const game = drawSessions.get(sessionId);
      if (!game || game.phase !== 'lobby') return;
      if (game.players.length < 3) {
        return socket.emit('error', { message: 'Minimal butuh 3 pemain untuk memulai!' });
      }
      startChoosingPhase(io, game);
    });

    socket.on('draw_pick_word', ({ sessionId, word }) => {
      const game = drawSessions.get(sessionId);
      if (!game || game.phase !== 'choosing') return;
      if (socket.id === game.players[game.turnIndex]?.socketId) {
        startDrawingPhase(io, game, word);
      }
    });

    socket.on('draw_canvas', ({ sessionId, stroke }) => {
      const game = drawSessions.get(sessionId);
      if (!game || game.phase !== 'drawing') return;
      if (game.currentDrawerId && game.players.find(p => p.id === game.currentDrawerId)?.socketId === socket.id) {
        game.drawHistory.push(stroke);
        socket.to(sessionId).emit('canvas_stroke', stroke);
      }
    });

    socket.on('draw_clear', ({ sessionId }) => {
      const game = drawSessions.get(sessionId);
      if (!game || game.phase !== 'drawing') return;
      if (game.currentDrawerId && game.players.find(p => p.id === game.currentDrawerId)?.socketId === socket.id) {
        game.drawHistory = [];
        bcast(io, sessionId, 'canvas_cleared', {});
      }
    });

    socket.on('draw_undo', ({ sessionId }) => {
      const game = drawSessions.get(sessionId);
      if (!game || game.phase !== 'drawing') return;
      if (game.currentDrawerId && game.players.find(p => p.id === game.currentDrawerId)?.socketId === socket.id) {
        if (game.drawHistory && game.drawHistory.length > 0) {
          game.drawHistory.pop();
          bcast(io, sessionId, 'canvas_history', { history: game.drawHistory });
        }
      }
    });

    socket.on('draw_guess', ({ sessionId, discordId, text }) => {
      const game = drawSessions.get(sessionId);
      if (!game || !text) return;

      const player = game.players.find(p => p.id === discordId);
      if (!player) return;

      const guessClean = text.trim().toLowerCase();
      const wordClean = game.currentWord.trim().toLowerCase();

      // If drawer types secret word, block it
      if (discordId === game.currentDrawerId) {
        socket.emit('chat_msg', { sender: 'System', text: '⚠️ Penggambar dilarang membocorkan jawaban di chat!', isSystem: true });
        return;
      }

      // Restrict chat of players who already guessed correctly (cannot spoil answer to others)
      if (game.guessedPlayers.has(discordId)) {
        game.players.forEach(p => {
          if (p.socketId && (game.guessedPlayers.has(p.id) || p.id === game.currentDrawerId)) {
            io.to(p.socketId).emit('chat_msg', {
              sender: `${player.name} (Penebak)`,
              text: text.trim(),
              isSystem: false
            });
          }
        });
        return;
      }

      if (game.phase === 'drawing' && guessClean === wordClean) {
        game.guessedPlayers.add(discordId);

        // Scoring: 1 second left = 1 point (max +80)
        const points = Math.max(1, Math.min(80, game.timer));
        player.score += points;

        // Drawer bonus: +10 points per correct guess
        const drawer = game.players.find(p => p.id === game.currentDrawerId);
        if (drawer) drawer.score += 10;

        bcast(io, sessionId, 'correct_guess', {
          playerId: discordId,
          playerName: player.name,
          points,
          players: getPublicPlayers(game)
        });

        // Check if all guessers got it
        const nonDrawers = getPublicPlayers(game).filter(p => p.id !== game.currentDrawerId);
        if (game.guessedPlayers.size >= nonDrawers.length) {
          endTurn(io, game, `Semua pemain berhasil menebak! Kata: ${game.currentWord}`);
        }
      } else {
        bcast(io, sessionId, 'chat_msg', {
          sender: player.name,
          text: text.trim(),
          isSystem: false
        });
      }
    });

    socket.on('draw_kick', ({ sessionId, targetId }) => {
      const game = drawSessions.get(sessionId);
      if (!game) return;
      const targetIdx = game.players.findIndex(p => p.id === targetId);
      if (targetIdx !== -1) {
        const targetSock = game.players[targetIdx].socketId;
        game.players.splice(targetIdx, 1);
        if (targetSock) io.to(targetSock).emit('kicked', { message: 'Kamu telah di-kick oleh Host!' });
        bcast(io, sessionId, 'players_update', { players: game.players });
      }
    });

    socket.on('draw_leave', ({ sessionId, discordId }) => {
      const game = drawSessions.get(sessionId);
      if (!game) return;
      const targetIdx = game.players.findIndex(p => p.id === discordId);
      if (targetIdx !== -1) {
        game.players.splice(targetIdx, 1);
        bcast(io, sessionId, 'players_update', { players: game.players });
      }
    });

    socket.on('draw_end_session', ({ sessionId }) => {
      const game = drawSessions.get(sessionId);
      if (!game) return;
      if (game.lobbyTimer) clearTimeout(game.lobbyTimer);
      clearInterval(game.timerInterval);
      drawSessions.delete(sessionId);
      bcast(io, sessionId, 'session_ended', { message: 'Session telah diakhiri oleh Host.' });
    });
  });
}

module.exports = { attach, WORD_CATEGORIES, getSessions: () => drawSessions };
