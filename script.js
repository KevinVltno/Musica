// ── DATA ──
const SONGS = [
  {id:1,  title:"Bapa Kami",                   artist:"Komunitas Musik Katolik Indonesia",        src:"audio/Bapa Kami.mp3",       dur:"2:45", bg:"#1a3a5c", pop:true,  img:"img/1.jpg"},
  {id:2,  title:"Ave Maria",                   artist:"Citra Scholastika",        src:"audio/Ave Maria.mp3",   dur:"3:49", bg:"#2d4a1e", pop:true,  img:"img/2.jpg"},
  {id:3,  title:"Persembahan Hati",            artist:"Veren, Nita Margaretha & Impact Worship",           src:"audio/Persembahan Hati.mp3",    dur:"4:32", bg:"#3b1a6b", pop:true,  img:"img/3.jpg"},
  {id:4,  title:"Persembahan Hidup",           artist:"Yohanes Rovi & Andrewsyah",      src:"audio/Persembahan Hidup.mp3", dur:"4:04", bg:"#5c3a0a", pop:true,  img:"img/4.jpg"},
  {id:5,  title:"Terima Kasih Seribu",         artist:"Peter Lazaro Sydney", src:"audio/Terimakasih Seribu.mp3",          dur:"2:29", bg:"#1c1a2e", pop:true,  img:"img/5.png"},
  {id:6,  title:"Tuhan Adalah Gembalaku",      artist:"Galilee Worship",           src:"audio/Tuhan Adalah Gembalaku.mp3",    dur:"5:08", bg:"#0a3a5c", pop:true,  img:"img/6.jpg"},
  {id:7,  title:"Kelana",                      artist:"Kidung Semadi",       src:"audio/Kelana.mp3",            dur:"4:11", bg:"#4a0519", pop:true,  img:"img/7.jpg"},
  {id:8,  title:"Dengan Gembira",              artist:"Pebiantama",   src:"audio/Dengan Gembira.mp3",       dur:"5:17", bg:"#083344", pop:false, img:"img/8.png"},
  {id:9,  title:"Ku Mau Cinta Yesus Selamanya",         artist:"LifeGen Worship",      src:"audio/Cinta Yesus.mp3",    dur:"4:51", bg:"#500a1a", pop:false, img:"img/9.jpg"},
  {id:10, title:"Jadikan Hatiku Istana Cintamu",          artist:"Gerry & Gany",  src:"audio/Hatiku.mp3", dur:"4:32", bg:"#1e2a5f", pop:false, img:"img/10.png"},
  {id:11, title:"Panggilanmu",          artist:"Yusup Warsito",  src:"audio/Panggilanmu.mp3", dur:"4:29", bg:"#1e2a5f", pop:false, img:"img/11.png"},
];

// ── AUDIO PLAYER ──
let audioPlayer = new Audio();
audioPlayer.preload = "metadata";

let isShuffle  = false;
let repeatMode = 0; // 0=off 1=repeat all 2=repeat one

let likedIds          = new Set(JSON.parse(localStorage.getItem('musica_liked')    || '[]'));
let playlists         = JSON.parse(localStorage.getItem('musica_playlists') || '[]');
let currentSongId     = null;
let isPlaying         = false;
let progressInterval  = null;
let currentProgress   = 0;
let currentDurSec     = 0;
let currentQueue      = [...SONGS];
let currentQueueIdx   = 0;
let activePage        = 'home';

// ── AUDIO EVENT LISTENERS ──
audioPlayer.addEventListener('timeupdate', () => {
  if (!audioPlayer.duration) return;
  currentProgress = audioPlayer.currentTime;
  currentDurSec   = audioPlayer.duration;
  updateProgress();
  if (lyricsOpen) syncLyricLine(false);
});

audioPlayer.addEventListener('loadedmetadata', () => {
  currentDurSec = audioPlayer.duration;
  document.getElementById('time-total').textContent = fmtTime(audioPlayer.duration);
});

audioPlayer.addEventListener('ended', () => {
  nextSong();
});

audioPlayer.addEventListener('error', (e) => {
  showToast('⚠️ File audio tidak ditemukan');
});

// Volume sync
document.addEventListener('DOMContentLoaded', () => {
  const volRange = document.getElementById('vol-range');
  if (volRange) {
    audioPlayer.volume = volRange.value / 100;
    volRange.addEventListener('input', function () {
      audioPlayer.volume = this.value / 100;
    });
  }
});

// ── SHUFFLE & REPEAT ──
function toggleShuffle() {
  isShuffle = !isShuffle;
  const btn = document.getElementById('shuffle-btn');
  btn.style.color = isShuffle ? 'var(--accent)' : '';
  showToast(isShuffle ? '🔀 Shuffle aktif' : '🔀 Shuffle nonaktif');
}

function toggleRepeat() {
  repeatMode = (repeatMode + 1) % 3;
  const btn  = document.getElementById('repeat-btn');
  const icon = document.getElementById('repeat-icon');
  const base = `<polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>`;
  if (repeatMode === 0) {
    btn.style.color = '';
    icon.innerHTML  = base;
    showToast('🔁 Repeat nonaktif');
  } else if (repeatMode === 1) {
    btn.style.color = 'var(--accent)';
    icon.innerHTML  = base;
    showToast('🔁 Repeat all aktif');
  } else {
    btn.style.color = 'var(--accent2)';
    icon.innerHTML  = base + `<text x="11" y="13.5" font-size="7" fill="var(--accent2)" stroke="none" font-family="Outfit" font-weight="800">1</text>`;
    showToast('🔂 Repeat one aktif');
  }
}

function save() {
  localStorage.setItem('musica_liked',     JSON.stringify([...likedIds]));
  localStorage.setItem('musica_playlists', JSON.stringify(playlists));
}

// ── RENDER HELPERS ──
function coverStyle(s) { return `background:${s.bg}`; }
function imgCover(s, cls = '') {
  return `<img src="${s.img}" alt="${s.title}" class="${cls}" loading="lazy" onerror="this.style.display='none'">`;
}

function buildSongCard(s) {
  const liked = likedIds.has(s.id);
  return `<div class="song-card${currentSongId === s.id ? ' playing' : ''}" id="card-${s.id}">
    <div class="cover" style="background:${s.bg}">
      <img src="${s.img}" alt="${s.title}" loading="lazy" onerror="this.style.display='none'">
      <div class="cover-play" onclick="playSong(${s.id})">
        <svg viewBox="0 0 24 24"><polygon points="5,3 19,12 5,21"/></svg>
      </div>
    </div>
    <div class="song-title">${s.title}</div>
    <div class="song-artist">${s.artist}</div>
    <div class="song-actions">
      <button class="btn-like${liked ? ' liked' : ''}" onclick="toggleLike(${s.id},event)" title="${liked ? 'Hapus dari Disukai' : 'Suka'}">
        <svg viewBox="0 0 24 24" fill="${liked ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
        </svg>
      </button>
      <span class="song-dur">${s.dur}</span>
      <button class="btn-add-pl" onclick="openPlDropdown(${s.id},event)" title="Tambah ke Playlist">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
      </button>
    </div>
  </div>`;
}

function buildSongRow(s, idx, queue) {
  const liked = likedIds.has(s.id);
  return `<div class="song-row${currentSongId === s.id ? ' playing' : ''}" id="row-${s.id}" onclick="playSong(${s.id},'${queue}')">
    <div class="row-num">${currentSongId === s.id ? '▶' : idx + 1}</div>
    <div class="row-cover" style="background:${s.bg}"><img src="${s.img}" alt="${s.title}" loading="lazy" onerror="this.style.display='none'"></div>
    <div class="row-info">
      <div class="row-title">${s.title}</div>
      <div class="row-artist">${s.artist}</div>
    </div>
    <div class="row-actions">
      <button class="btn-like${liked ? ' liked' : ''}" onclick="toggleLike(${s.id},event)" style="margin-right:4px">
        <svg viewBox="0 0 24 24" fill="${liked ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" width="16" height="16">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
        </svg>
      </button>
      <button class="btn-add-pl" onclick="openPlDropdown(${s.id},event)">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>
      </button>
    </div>
    <div class="row-dur">${s.dur}</div>
  </div>`;
}

// ── REC PLAYLISTS ──
const REC_PLAYLISTS = [
  {name:"Misa Harian",         desc:"Lagu-lagu untuk perayaan Ekaristi",          songIds:[2,6,7,10,1],  colors:["#0c4a6e","#1e1b4b","#14532d","#4a1d96"]},
  {name:"Doa Rosario",         desc:"Meditasi bersama Bunda Maria",               songIds:[1,3,9,2,5],   colors:["#4a1d96","#500724","#1e3a5f","#0c4a6e"]},
  {name:"Pujian & Penyembahan",desc:"Puji Tuhan dengan sepenuh hati",             songIds:[4,8,9,3,5],   colors:["#78350f","#1c1917","#14532d","#1e1b4b"]},
  {name:"Lagu Klasik Gereja",  desc:"Warisan iman sepanjang masa",                songIds:[10,6,1,2,7],  colors:["#1e3a5f","#0c4a6e","#4c0519","#14532d"]},
  {name:"Advent & Natal",      desc:"Menyambut kelahiran Sang Juruselamat",       songIds:[5,8,4,3,6],   colors:["#4a1d96","#78350f","#083344","#500724"]},
  {name:"Prapaskah & Paskah",  desc:"Menghayati sengsara dan kebangkitan",        songIds:[2,10,7,3,5],  colors:["#14532d","#1c1917","#1e1b4b","#4c0519"]},
];

const REC_HERO_COLORS = [
  'linear-gradient(180deg,#4a1d96 0%,#2a1060 60%,#121212 100%)',
  'linear-gradient(180deg,#9d174d 0%,#5a0a2c 60%,#121212 100%)',
  'linear-gradient(180deg,#065f46 0%,#022c22 60%,#121212 100%)',
  'linear-gradient(180deg,#1e3a5f 0%,#0c1f35 60%,#121212 100%)',
  'linear-gradient(180deg,#78350f 0%,#3d1a07 60%,#121212 100%)',
  'linear-gradient(180deg,#1c1917 0%,#0c0a09 60%,#121212 100%)',
];

const SONG_ALBUMS = {
  1:"Puji Syukur",
  2:"Ave Maria",
  3:"Kidung Maria",
  4:"Nyanyian Syukur",
  5:"Misa Harian",
  6:"Hadir-Mu",
  7:"Kidung Iman",
  8:"Doa Pagi",
  9:"Roh Kudus",
  10:"Penebusan",
};

let activeRecIdx = null;

function renderRecPlaylists() {
  const el = document.getElementById('rec-playlist-grid');
  el.innerHTML = REC_PLAYLISTS.map((pl, i) => {
    const coverSongs = SONGS.filter(s => pl.songIds.includes(s.id)).slice(0, 4);
    const cells = coverSongs.map(s =>
      `<div class="rec-pl-cover-cell" style="background:${s.bg}"><img src="${s.img}" style="width:100%;height:100%;object-fit:cover;display:block" loading="lazy" onerror="this.style.display='none'"></div>`
    ).join('');
    return `<div class="rec-pl-card" onclick="openRecModal(${i})">
      <div class="rec-pl-cover">
        ${cells}
        <div class="rec-pl-cover-overlay">
          <div class="rec-pl-name">${pl.name}</div>
          <div class="rec-pl-sub">${pl.desc} · ${pl.songIds.length} lagu</div>
        </div>
        <div class="rec-pl-play"><svg viewBox="0 0 24 24"><polygon points="5,3 19,12 5,21"/></svg></div>
      </div>
    </div>`;
  }).join('');
}

function openRecModal(idx) {
  activeRecIdx = idx;
  const pl    = REC_PLAYLISTS[idx];
  const songs = SONGS.filter(s => pl.songIds.includes(s.id));

  document.getElementById('rec-modal-hero').style.background = REC_HERO_COLORS[idx % REC_HERO_COLORS.length];
  document.getElementById('rec-modal-cover').innerHTML = songs.slice(0, 4).map(s =>
    `<div class="rec-modal-cover-cell" style="background:${s.bg}"><img src="${s.img}" style="width:100%;height:100%;object-fit:cover;display:block" loading="lazy" onerror="this.style.display='none'"></div>`
  ).join('');
  document.getElementById('rec-modal-title').textContent = pl.name;

  const artists = [...new Set(songs.map(s => s.artist))].slice(0, 3).join(', ');
  document.getElementById('rec-modal-desc').innerHTML =
    `${artists} dan lainnya<br><span style="color:rgba(255,255,255,.35);font-size:12px">${songs.length} lagu · disimpan untuk kamu</span>`;

  document.getElementById('rec-modal-body').innerHTML = songs.map((s, i) => `
    <div class="rec-song-row${currentSongId === s.id ? ' playing' : ''}" id="rec-row-${s.id}" onclick="playRecSong(${s.id},${idx})">
      <div class="rec-song-num">${currentSongId === s.id ? '▶' : i + 1}</div>
      <div class="rec-song-left">
        <div class="rec-song-cover" style="${coverStyle(s)}">${imgCover(s)}</div>
        <div class="rec-song-info">
          <div class="rec-song-title">${s.title}</div>
          <div class="rec-song-artist">${s.artist}</div>
        </div>
      </div>
      <div class="rec-song-album">${SONG_ALBUMS[s.id] || s.title}</div>
      <div class="rec-song-dur">${s.dur}</div>
    </div>`).join('');

  document.getElementById('modal-rec-pl').classList.add('open');
}

function closeRecModal() {
  document.getElementById('modal-rec-pl').classList.remove('open');
}

function playRecSong(songId, plIdx) {
  const pl    = REC_PLAYLISTS[plIdx];
  const songs = SONGS.filter(s => pl.songIds.includes(s.id));
  currentQueue    = songs;
  currentQueueIdx = songs.findIndex(s => s.id === songId);
  playSong(songId);
  songs.forEach((s, i) => {
    const row = document.getElementById('rec-row-' + s.id);
    if (!row) return;
    row.classList.toggle('playing', s.id === songId);
    row.querySelector('.rec-song-num').textContent = s.id === songId ? '▶' : i + 1;
  });
}

function playRecFromModal(shuffle) {
  const pl    = REC_PLAYLISTS[activeRecIdx];
  let songs   = SONGS.filter(s => pl.songIds.includes(s.id));
  if (shuffle) {
    songs     = [...songs].sort(() => Math.random() - .5);
    isShuffle = true;
    const btn = document.getElementById('shuffle-btn');
    if (btn) btn.style.color = 'var(--accent)';
  }
  currentQueue    = songs;
  currentQueueIdx = 0;
  playSong(songs[0].id);
  closeRecModal();
  showToast(shuffle ? `🔀 Acak: ${pl.name}` : `▶ Memutar: ${pl.name}`);
}

// ── HOME ──
function renderHome() {
  const pop = SONGS.filter(s => s.pop);
  document.getElementById('popular-grid').innerHTML = pop.map(buildSongCard).join('');
  renderRecPlaylists();
}

function showAllPopular() {
  document.getElementById('popular-grid').innerHTML = SONGS.map(buildSongCard).join('');
  const em = document.querySelector('.section-title em');
  if (em) em.textContent = '';
}

// ── SEARCH ──
function renderSearch(q = '') {
  const res  = document.getElementById('search-results');
  const list = q
    ? SONGS.filter(s =>
        s.title.toLowerCase().includes(q.toLowerCase()) ||
        s.artist.toLowerCase().includes(q.toLowerCase()))
    : SONGS;
  if (!list.length) {
    res.innerHTML = `<div class="empty-state"><div class="es-icon">🔍</div><h3>Lagu tidak ditemukan</h3><p>Coba kata kunci lain</p></div>`;
    return;
  }
  res.innerHTML = `<div class="songs-list">${list.map((s, i) => buildSongRow(s, i, 'search')).join('')}</div>`;
}

function doSearch(v) { renderSearch(v); }

// ── LIKED ──
function renderLiked() {
  const list = SONGS.filter(s => likedIds.has(s.id));
  document.getElementById('liked-count').textContent = `${list.length} lagu`;
  const el = document.getElementById('liked-list');
  if (!list.length) {
    el.innerHTML = `<div class="empty-state"><div class="es-icon">💔</div><h3>Belum ada lagu disukai</h3><p>Tekan ikon ♥ pada lagu untuk menyimpannya di sini.</p></div>`;
    return;
  }
  el.innerHTML = `<div class="songs-list">${list.map((s, i) => buildSongRow(s, i, 'liked')).join('')}</div>`;
}

// ── PLAYLISTS SIDEBAR ──
let currentPlaylistIdx = null;

function renderPlaylists() {
  const el = document.getElementById('playlist-list');
  if (!playlists.length) { el.innerHTML = ''; return; }
  el.innerHTML = playlists.map((pl, i) => {
    const songs = SONGS.filter(s => pl.songIds.includes(s.id)).slice(0, 4);
    let thumb = '';
    if (songs.length >= 4) {
      thumb = `<div class="pl-thumb"><div class="pl-thumb-grid">${songs.map(s => `<div class="pl-thumb-cell"><img src="${s.img}" loading="lazy" onerror="this.style.display='none'"></div>`).join('')}</div></div>`;
    } else if (songs.length > 0) {
      thumb = `<div class="pl-thumb" style="background:${songs[0].bg}"><img src="${songs[0].img}" style="width:100%;height:100%;object-fit:cover" loading="lazy" onerror="this.style.display='none'"></div>`;
    } else {
      thumb = `<div class="pl-thumb"><div class="pl-thumb-single">🎵</div></div>`;
    }
    return `<div class="playlist-item${activePage === 'playlist' && currentPlaylistIdx === i ? ' active' : ''}" onclick="openPlaylist(${i})">
      ${thumb}
      <div class="pl-item-info">
        <div class="pl-item-name">${pl.name}</div>
        <div class="pl-item-count">${pl.songIds.length} lagu</div>
      </div>
    </div>`;
  }).join('');
}

function openPlaylist(idx) {
  currentPlaylistIdx = idx;
  const pl    = playlists[idx];
  const songs = SONGS.filter(s => pl.songIds.includes(s.id));
  const colors = ['#1e1b4b','#14532d','#4a1d96','#0c4a6e','#500724'];
  const bg     = colors[idx % colors.length];

  const coverCells = songs.slice(0, 4).map(s =>
    `<div style="background:${s.bg};overflow:hidden;display:grid;place-items:center"><img src="${s.img}" style="width:100%;height:100%;object-fit:cover;display:block" loading="lazy" onerror="this.style.display='none'"></div>`
  ).join('');

  const coverHtml = songs.length >= 4
    ? `<div style="width:90px;height:90px;border-radius:12px;overflow:hidden;display:grid;grid-template-columns:1fr 1fr;grid-template-rows:1fr 1fr;flex-shrink:0;box-shadow:0 8px 24px rgba(0,0,0,.4)">${coverCells}</div>`
    : songs.length > 0
      ? `<div style="width:90px;height:90px;border-radius:12px;overflow:hidden;flex-shrink:0;background:${songs[0].bg};box-shadow:0 8px 24px rgba(0,0,0,.4)"><img src="${songs[0].img}" style="width:100%;height:100%;object-fit:cover;display:block" loading="lazy" onerror="this.style.display='none'"></div>`
      : `<div style="width:90px;height:90px;border-radius:12px;background:linear-gradient(135deg,${bg},${bg}99);display:grid;place-items:center;font-size:36px;flex-shrink:0">🎵</div>`;

  document.getElementById('pl-header').innerHTML = `
    ${coverHtml}
    <div class="liked-meta">
      <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:var(--muted);margin-bottom:4px">Playlist</div>
      <h2>${pl.name}</h2>
      <p id="pl-song-count">${songs.length} lagu</p>
      <div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap">
        <button class="btn-primary" style="font-size:12px;padding:7px 14px;display:flex;align-items:center;gap:6px" onclick="openAddSongsModal()">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="13" height="13"><path d="M12 5v14M5 12h14"/></svg>
          Tambah Lagu
        </button>
        <button class="btn-secondary" style="font-size:12px;padding:7px 14px;display:flex;align-items:center;gap:6px;color:#f43f5e;border-color:#f43f5e44" onclick="deletePlaylist(${idx})">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="13" height="13"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/></svg>
          Hapus Playlist
        </button>
      </div>
    </div>`;

  renderPlaylistSongs();
  showPage('playlist', null);
  renderPlaylists();
}

function renderPlaylistSongs() {
  const pl    = playlists[currentPlaylistIdx];
  const songs = SONGS.filter(s => pl.songIds.includes(s.id));
  const countEl = document.getElementById('pl-song-count');
  if (countEl) countEl.textContent = `${songs.length} lagu`;
  const el = document.getElementById('pl-song-list');
  if (!songs.length) {
    el.innerHTML = `<div class="empty-state"><div class="es-icon">🎵</div><h3>Playlist kosong</h3><p>Klik "Tambah Lagu" untuk mengisi playlist ini.</p></div>`;
  } else {
    el.innerHTML = `<div class="songs-list">${songs.map((s, i) => buildPlaylistRow(s, i)).join('')}</div>`;
  }
}

function buildPlaylistRow(s, idx) {
  const liked = likedIds.has(s.id);
  return `<div class="song-row${currentSongId === s.id ? ' playing' : ''}" id="row-${s.id}">
    <div class="row-num" style="cursor:pointer" onclick="playSong(${s.id},'playlist')">${currentSongId === s.id ? '▶' : idx + 1}</div>
    <div class="row-cover" style="background:${s.bg};cursor:pointer" onclick="playSong(${s.id},'playlist')"><img src="${s.img}" alt="${s.title}" loading="lazy" onerror="this.style.display='none'"></div>
    <div class="row-info" style="cursor:pointer" onclick="playSong(${s.id},'playlist')">
      <div class="row-title">${s.title}</div>
      <div class="row-artist">${s.artist}</div>
    </div>
    <div class="row-actions" style="opacity:1">
      <button class="btn-like${liked ? ' liked' : ''}" onclick="toggleLike(${s.id},event)" title="Suka" style="margin-right:2px">
        <svg viewBox="0 0 24 24" fill="${liked ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" width="16" height="16">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
        </svg>
      </button>
      <button class="btn-add-pl" onclick="removeSongFromPlaylist(${s.id})" title="Hapus dari playlist" style="color:#f43f5e44;padding:4px" onmouseenter="this.style.color='#f43f5e'" onmouseleave="this.style.color='#f43f5e44'">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="15" height="15"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>
    <div class="row-dur">${s.dur}</div>
  </div>`;
}

function removeSongFromPlaylist(songId) {
  playlists[currentPlaylistIdx].songIds = playlists[currentPlaylistIdx].songIds.filter(id => id !== songId);
  save();
  renderPlaylistSongs();
  showToast('🗑️ Lagu dihapus dari playlist');
}

function deletePlaylist(idx) {
  const pl = playlists[idx];
  if (!confirm(`Hapus playlist "${pl.name}"?`)) return;
  playlists.splice(idx, 1);
  save();
  renderPlaylists();
  showPage('home', document.querySelector('.nav-item'));
  showToast(`🗑️ Playlist "${pl.name}" dihapus`);
}

// ── NAVIGATION ──
function showPage(name, navEl) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('page-' + name).classList.add('active');
  activePage = name;
  if (navEl) {
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    navEl.classList.add('active');
  }
  if (name === 'liked')  renderLiked();
  if (name === 'search') renderSearch(document.getElementById('search-input').value);
}

// ── PLAYBACK ──
function parseDur(str) {
  const [m, s] = str.split(':').map(Number);
  return m * 60 + s;
}
function fmtTime(sec) {
  if (isNaN(sec)) return '0:00';
  const m = Math.floor(sec / 60), s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function playSong(id, queueType) {
  const song = SONGS.find(s => s.id === id);
  if (!song) return;

  // Build queue
  if (queueType) {
    const q = document.getElementById('search-input').value;
    const queues = {
      search:   SONGS.filter(s => q
                  ? (s.title.toLowerCase().includes(q.toLowerCase()) || s.artist.toLowerCase().includes(q.toLowerCase()))
                  : true),
      liked:    SONGS.filter(s => likedIds.has(s.id)),
      playlist: currentPlaylistIdx !== null
                  ? SONGS.filter(s => playlists[currentPlaylistIdx].songIds.includes(s.id))
                  : SONGS,
    };
    currentQueue = queues[queueType] || SONGS;
  }

  currentSongId   = id;
  currentQueueIdx = currentQueue.findIndex(s => s.id === id);
  if (currentQueueIdx === -1) { currentQueue = SONGS; currentQueueIdx = SONGS.findIndex(s => s.id === id); }

  // Update player UI
  const cover = document.getElementById('player-cover');
  cover.style.cssText = `background:${song.bg};width:50px;height:50px;border-radius:10px;overflow:hidden;flex-shrink:0;display:block`;
  cover.innerHTML = `<img src="${song.img}" style="width:100%;height:100%;object-fit:cover;border-radius:10px;display:block" loading="lazy" onerror="this.style.display='none'">`;
  document.getElementById('player-title').textContent  = song.title;
  document.getElementById('player-artist').textContent = song.artist;
  document.getElementById('time-total').textContent    = song.dur;
  currentDurSec   = parseDur(song.dur);
  currentProgress = 0;
  updateProgress();
  updatePlayerHeart();

  // Play audio
  audioPlayer.pause();
  if (song.src) {
    audioPlayer.src = song.src;
    audioPlayer.load();
    audioPlayer.play().catch(() => showToast('⚠️ File audio tidak ditemukan'));
  }
  isPlaying = true;
  updatePlayIcon();

  if (lyricsOpen) { updateLyricsHeader(); renderLyricsLines(); }
  if (mobilePanelOpen) syncMobilePanel();
  refreshAllCards();
}

function refreshAllCards() {
  document.querySelectorAll('.song-card').forEach(el => {
    const id = parseInt(el.id.replace('card-', ''));
    el.classList.toggle('playing', id === currentSongId);
  });
  document.querySelectorAll('.song-row').forEach(el => {
    const id  = parseInt(el.id.replace('row-', ''));
    const num = el.querySelector('.row-num');
    el.classList.toggle('playing', id === currentSongId);
    if (num) {
      const origIdx = num.dataset.idx || num.textContent;
      num.textContent = id === currentSongId ? '▶' : (num.dataset.idx || num.textContent);
    }
  });
}

function togglePlay() {
  if (!currentSongId) return;
  if (isPlaying) {
    audioPlayer.pause();
    isPlaying = false;
  } else {
    audioPlayer.play().catch(() => {});
    isPlaying = true;
  }
  updatePlayIcon();
}

function updatePlayIcon() {
  const pauseIcon = '<rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>';
  const playIcon  = '<polygon points="5,3 19,12 5,21"/>';
  document.getElementById('play-icon').innerHTML = isPlaying ? pauseIcon : playIcon;
  const mobileBtn = document.getElementById('mobile-play-icon');
  if (mobileBtn) mobileBtn.innerHTML = isPlaying ? pauseIcon : playIcon;
  const mppIcon = document.getElementById('mpp-play-icon');
  if (mppIcon) mppIcon.innerHTML = isPlaying ? pauseIcon : playIcon;
}

function setBottomNav(page) {
  document.querySelectorAll('.bnav-item').forEach(b => b.classList.remove('active'));
  const el = document.getElementById('bnav-' + page);
  if (el) el.classList.add('active');
}

function updateProgress() {
  const pct = currentDurSec ? (currentProgress / currentDurSec * 100) : 0;
  document.getElementById('progress-fill').style.width = pct + '%';
  document.getElementById('time-cur').textContent = fmtTime(currentProgress);
  const mppFill = document.getElementById('mpp-progress-fill');
  if (mppFill) mppFill.style.width = pct + '%';
  const mppCur = document.getElementById('mpp-time-cur');
  if (mppCur) mppCur.textContent = fmtTime(currentProgress);
  const mppTotal = document.getElementById('mpp-time-total');
  if (mppTotal && currentDurSec) mppTotal.textContent = fmtTime(currentDurSec);
}

function seekSong(e) {
  if (!currentSongId) return;
  const bar  = document.getElementById('progress-bar');
  const rect = bar.getBoundingClientRect();
  const pct  = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
  const time = pct * (audioPlayer.duration || currentDurSec);
  currentProgress      = time;
  audioPlayer.currentTime = time;
  updateProgress();
}

function nextSong() {
  if (!currentQueue.length) return;
  if (repeatMode === 2) {
    audioPlayer.currentTime = 0;
    audioPlayer.play().catch(() => {});
    return;
  }
  if (isShuffle) {
    let idx;
    do { idx = Math.floor(Math.random() * currentQueue.length); }
    while (currentQueue.length > 1 && idx === currentQueueIdx);
    currentQueueIdx = idx;
  } else {
    currentQueueIdx = (currentQueueIdx + 1) % currentQueue.length;
    if (currentQueueIdx === 0 && repeatMode === 0) {
      isPlaying = false;
      updatePlayIcon();
      currentProgress = 0;
      updateProgress();
      return;
    }
  }
  playSong(currentQueue[currentQueueIdx].id);
}

function prevSong() {
  if (audioPlayer.currentTime >= 3) {
    audioPlayer.currentTime = 0;
    currentProgress = 0;
    updateProgress();
    return;
  }
  if (isShuffle) {
    let idx;
    do { idx = Math.floor(Math.random() * currentQueue.length); }
    while (currentQueue.length > 1 && idx === currentQueueIdx);
    currentQueueIdx = idx;
  } else {
    currentQueueIdx = (currentQueueIdx - 1 + currentQueue.length) % currentQueue.length;
  }
  playSong(currentQueue[currentQueueIdx].id);
}

// ── LIKE ──
function toggleLike(id, e) {
  e && e.stopPropagation();
  const had = likedIds.has(id);
  had ? likedIds.delete(id) : likedIds.add(id);
  save();
  showToast(had ? '💔 Dihapus dari Disukai' : '❤️ Ditambahkan ke Disukai');
  if (currentSongId === id) updatePlayerHeart();
  const p = activePage;
  if (p === 'home')     renderHome();
  if (p === 'search')   renderSearch(document.getElementById('search-input').value);
  if (p === 'liked')    renderLiked();
  if (p === 'playlist') renderPlaylistSongs();
}

function toggleLikePlayer() {
  if (!currentSongId) return;
  toggleLike(currentSongId);
}

function updatePlayerHeart() {
  const liked  = currentSongId && likedIds.has(currentSongId);
  const btn    = document.getElementById('player-like-btn');
  const heart  = document.getElementById('player-heart');
  btn.classList.toggle('liked', !!liked);
  heart.setAttribute('fill', liked ? 'currentColor' : 'none');
}

// ── PLAYLIST MODAL ──
function openCreateModal() {
  document.getElementById('modal-create').classList.add('open');
  document.getElementById('pl-name-input').value = '';
  document.getElementById('songs-picker').innerHTML = SONGS.map(s => `
    <label class="picker-item">
      <input type="checkbox" value="${s.id}">
      <div class="picker-cover" style="${coverStyle(s)}">${imgCover(s)}</div>
      <div class="picker-info">
        <div class="picker-title">${s.title}</div>
        <div class="picker-artist">${s.artist}</div>
      </div>
    </label>`).join('');
}

function closeCreateModal() {
  document.getElementById('modal-create').classList.remove('open');
}

function createPlaylist() {
  const name = document.getElementById('pl-name-input').value.trim();
  if (!name) { showToast('⚠️ Masukkan nama playlist'); return; }
  const checked = [...document.querySelectorAll('#songs-picker input:checked')].map(i => parseInt(i.value));
  playlists.push({ name, songIds: checked });
  save();
  renderPlaylists();
  closeCreateModal();
  showToast(`✅ Playlist "${name}" berhasil dibuat`);
}

// ── ADD TO PLAYLIST DROPDOWN ──
let ddSongId = null;

function openPlDropdown(id, e) {
  e.stopPropagation();
  ddSongId = id;
  const dd    = document.getElementById('pl-dropdown');
  const items = document.getElementById('pl-dd-items');
  if (!playlists.length) {
    items.innerHTML = `<div class="pl-dd-item" onclick="openCreateModal();closePlDropdown()" style="color:var(--accent)">+ Buat Playlist Baru</div>`;
  } else {
    items.innerHTML = playlists.map((pl, i) =>
      `<div class="pl-dd-item" onclick="addSongToPlaylist(${i})">🎵 ${pl.name}</div>`
    ).join('') + `<div class="pl-dd-item" onclick="openCreateModal();closePlDropdown()" style="color:var(--accent);border-top:1px solid var(--border);margin-top:4px;padding-top:8px">+ Buat Playlist Baru</div>`;
  }
  dd.style.top  = (e.clientY + 4) + 'px';
  dd.style.left = Math.min(e.clientX, window.innerWidth - 200) + 'px';
  dd.classList.add('open');
  setTimeout(() => document.addEventListener('click', closePlDropdown, { once: true }), 10);
}

function closePlDropdown() {
  document.getElementById('pl-dropdown').classList.remove('open');
}

function addSongToPlaylist(plIdx) {
  const pl = playlists[plIdx];
  if (pl.songIds.includes(ddSongId)) {
    showToast('⚠️ Lagu sudah ada di playlist');
  } else {
    pl.songIds.push(ddSongId);
    save();
    showToast(`✅ Ditambahkan ke "${pl.name}"`);
  }
  closePlDropdown();
}

// ── ADD SONGS TO EXISTING PLAYLIST ──
function openAddSongsModal() {
  document.getElementById('modal-add-songs').classList.add('open');
  document.getElementById('add-songs-search').value = '';
  renderAddSongsPicker('');
}

function renderAddSongsPicker(q) {
  const pl   = playlists[currentPlaylistIdx];
  const list = q
    ? SONGS.filter(s =>
        s.title.toLowerCase().includes(q.toLowerCase()) ||
        s.artist.toLowerCase().includes(q.toLowerCase()))
    : SONGS;
  document.getElementById('add-songs-picker').innerHTML = list.map(s => {
    const already = pl.songIds.includes(s.id);
    return `<label class="picker-item" style="${already ? 'opacity:.55' : ''}">
      <input type="checkbox" value="${s.id}" ${already ? 'checked disabled' : ''}>
      <div class="picker-cover" style="${coverStyle(s)}">${imgCover(s)}</div>
      <div class="picker-info">
        <div class="picker-title">${s.title} ${already ? '<span style="color:var(--accent);font-size:11px">✓ sudah ada</span>' : ''}</div>
        <div class="picker-artist">${s.artist}</div>
      </div>
    </label>`;
  }).join('');
}

function filterAddSongsPicker(q) { renderAddSongsPicker(q); }

function closeAddSongsModal() {
  document.getElementById('modal-add-songs').classList.remove('open');
}

function saveAddedSongs() {
  const pl      = playlists[currentPlaylistIdx];
  const checked = [...document.querySelectorAll('#add-songs-picker input:checked:not(:disabled)')].map(i => parseInt(i.value));
  if (!checked.length) { showToast('⚠️ Pilih setidaknya satu lagu'); return; }
  let added = 0;
  checked.forEach(id => { if (!pl.songIds.includes(id)) { pl.songIds.push(id); added++; } });
  save();
  renderPlaylistSongs();
  closeAddSongsModal();
  showToast(`✅ ${added} lagu ditambahkan ke playlist`);
}

// ── TOAST ──
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove('show'), 2500);
}

// ── LYRICS DATA ──
const LYRICS = {
  1: [
    {t:0,   text:"♪"},
    {t:20,   text:"Bapa kami yang ada di surga"},
    {t:27,  text:"Dimuliakanlah nama-Mu"},
    {t:35,  text:"Datanglah kerajaan-Mu"},
    {t:43,  text:"Jadilah kehendak-Mu"},
    {t:50,  text:"Di atas bumi seperti di dalam surga"},
    {t:64,  text:"Berikanlah kami rezeki"},
    {t:73,  text:"Pada hari ini"},
    {t:79,  text:"Dan ampunilah kesalahan kami"},
    {t:87,  text:"Seperti kami pun"},
    {t:91,  text:"Mengampuni yang bersalah kepada kami"},
    {t:102,  text:"Dan janganlah  masukkan kami"},
    {t:109,  text:"Ke dalam pencobaan"},
    {t:118,  text:"Tetapi bebaskanlah kami"},
    {t:125,  text:"Dari yang jahat"},
    {t:133,  text:"Dari yang jahat"},
    {t:140, text:"Dari yang jahat"},
    {t:147, text:"♪"},
    {t:152, text:"Aamiin..."},
  ],
  2: [
    {t:0,   text:"♪"},
    {t:16,  text:"Engkau yang dipilih Allah Bapa disurga"},
    {t:23,  text:"Untuk melahirkan PutraNya yang kudus"},
    {t:30,  text:"Engkaulah Bunda Kristus"},
    {t:33,  text:"Bunda sang Penebus segala dosa manusia"},
    {t:43,  text:"Bunda Maria perawan yang tiada ternoda"},
    {t:50,  text:"HatiMu bersinar putih tiada tercela"},
    {t:57,  text:"Engkau Bunda Masehi yang diangkat ke Surga"},
    {t:64,  text:"Penuh kemuliaan"},
    {t:69,  text:"Ave Maria, Ave Maria"},
    {t:85,  text:"Terpujilah Bunda terpuji namaMu"},
    {t:91,  text:"Sepanjang segala masa"},
    {t:96, text:"Ave Maria, Ave Maria"},
    {t:112, text:"Syukur kepadaNya Tuhan yang pengasih"},
    {t:119, text:"Selama-lamanya"},
    {t:126, text:"Bunda Maria perawan yang tiada ternoda"},
    {t:133, text:"HatiMu bersinar putih tiada tercela"},
    {t:140, text:"Engkaulah Bunda almasih yang diangkat ke Surga"},
    {t:146, text:"Penuh kemuliaan"},
    {t:151, text:"Ave Maria, Ave Maria"},
    {t:167, text:"Terpujilah Bunda terpuji namaMu"},
    {t:174, text:"Sepanjang segala masa"},
    {t:179, text:"Ave Maria, Ave Maria"},
    {t:195, text:"Syukur kepadaNya Tuhan yang pengasih"},
    {t:201, text:"Selama-lamanya"},
    {t:208, text:"Syukur kepadaNya Tuhan yang pengasih"},
    {t:215, text:"Selama-lamanya"},
    {t:220, text:"♪"},
  ],
  3: [
    {t:0,   text:"♪"},
    {t:18,  text:"Allah Bapa sungguh besar kasihMu"},
    {t:25,  text:"Engkau selalu hadir dalam setiap langkahku"},
    {t:33,  text:"Sungguh indah ku menjadi anakMu"},
    {t:40,  text:"Hidup dalam kasihMu kasih yang tak ternilai"},
    {t:50,  text:"Tak sanggup aku membalas kasihMu"},
    {t:57,  text:"Hanya ini Bapa yang ku bisa"},
    {t:66,  text:"Bapa terimalah persembahan hatiku"},
    {t:73,  text:"Nyanyian pujian kepadaMu"},
    {t:81,  text:"Ini diriku jadikanlah alatMu"},
    {t:88,  text:"Terimalah Bapa persembahan hati"},
    {t:95,  text:"♪"},
    {t:101, text:"Allah Bapa sungguh besar kasihMu"},
    {t:108, text:"Engkau selalu hadir dalam setiap langkahku"},
    {t:116, text:"Sungguh indah ku menjadi anakMu"},
    {t:123, text:"Hidup dalam kasihMu kasih yang tak ternilai"},
    {t:133, text:"Tak sanggup aku membalas kasihMu"},
    {t:141, text:"Hanya ini Bapa yang ku bisa"},
    {t:147, text:"Bapa terimalah persembahan hatiku"},
    {t:154, text:"Nyanyian pujian kepadaMu"},
    {t:162, text:"Ini diriku jadikanlah alatMu"},
    {t:169, text:"Terimalah Bapa persembahan hati"},
    {t:181, text:"Persembahan hatiku dalam nyanyian ini"},
    {t:187, text:"Biarlah indah dan menyukakanMu"},
    {t:195,  text:"♪"},
    {t:208, text:"Bapa terimalah persembahan hatiku"},
    {t:215, text:"Nyanyian pujian kepadaMu"},
    {t:223, text:"Inilah diriku jadikanlah alatMu"},
    {t:230, text:"Terimalah Bapa persembahan hati"},
    {t:239, text:"Inilah diriku jadikanlah alatMu"},
    {t:245, text:"Terimalah Bapa persembahan hati"},
    {t:255, text:"Terimalah persembahan hati..."},
    {t:267, text:"♪"},
  ],
  4: [
    {t:0,   text:"♪"},
    {t:27,  text:"Hidup kami Tuhan Engkau yang berikan"},
    {t:35,  text:"Kan kami jalani demi panggilan"},
    {t:43,  text:"Hidup ini memang penuh perjuangan"},
    {t:51,  text:"Kadang pula penuh pergulatan"},
    {t:58,  text:"Kepada-Mu hidup kami kembalikan"},
    {t:65,  text:"Ke dalam tangan-Mu segalanya kuserahkan"},
    {t:73,  text:"Suka duka tawa maupun tangisan"},
    {t:81,  text:"Semoga ini jadi kidung dan pujian"},
    {t:91,  text:"Kusembahkan hati budi diri kami"},
    {t:101,  text:"Hidup mati kami dalam dunia ini"},
    {t:108, text:"Biar Kau jagai sampai akhir nanti"},
    {t:116, text:"Mengabdi Tuhan kini sampai mati"},
    {t:122, text:"♪"},
    {t:158, text:"Kami pasrah diri kepada-Mu Bapa"},
    {t:165, text:"Kebebasan hidup dan cita rasa"},
    {t:173, text:"Sukma raga ini Kau jua yang punya"},
    {t:181, text:"Kesaksian kami di tengah dunia"},
    {t:191, text:"Kusembahkan hati budi diri kami"},
    {t:201, text:"Hidup mati kami dalam dunia ini"},
    {t:208, text:"Biar Kau jagai sampai akhir nanti"},
    {t:216, text:"Mengabdi Tuhan kini sampai mati"},
    {t:224, text:"Bagimu Tuhan persembahan hidup"},
    {t:230, text:"♪"},
  ],
  5: [
    {t:0,   text:"♪"},
    {t:13,  text:"Surya bersinar, udara segar, terima kasih"},
    {t:21,  text:"Di tepi pantai, ombak berderai, terima kasih"},
    {t:29,  text:"Melati wangi, kutilang nyanyi, terima kasih"},
    {t:36,  text:"Serimba raya dengungkan lagu, terima kasih"},
    {t:44,  text:"Terima kasih seribu pada Tuhan Allahku"},
    {t:51,  text:"Aku bahagia karena dicinta, terima kasih"},
    {t:59,  text:"Terima kasih seribu pada Tuhan Allahku"},
    {t:66,  text:"Aku bahagia karena dicinta, terima kasih"},
    {t:74,  text:"Hati manusia pandai mencinta, terima kasih"},
    {t:81,  text:"Setiap waktu, sisi hatiku, terima kasih"},
    {t:89,  text:"Panjatkan doa setinggi surga, terima kasih"},
    {t:97,  text:"Sepanjang masa terucap kata, terima kasih"},
    {t:105, text:"Terima kasih seribu pada Tuhan Allahku"},
    {t:113, text:"Aku bahagia karena dicinta, terima kasih"},
    {t:120, text:"Terima kasih seribu pada Tuhan Allahku"},
    {t:128, text:"Aku bahagia karena dicinta, terima kasih"},
    {t:135, text:"Aku bahagia karena dicinta, terima kasih"},
    {t:141,   text:"♪"}
  ],
  6: [
    {t:0,   text:"♪"},
    {t:16,  text:"Tuhan adalah gembalaku"},
    {t:22,  text:"takkan kekurangan aku"},
    {t:29,  text:"Dia membaringkan aku"},
    {t:36,  text:"di padang yang berumput hijau"},
    {t:46,  text:"Tuhan adalah gembalaku"},
    {t:53,  text:"takkan kekurangan aku"},
    {t:60,  text:"Dia membaringkan aku"},
    {t:67,  text:"di padang yang berumput hijau"},
    {t:73,  text:"Dia membimbingku ke air yang tenang"},
    {t:80,  text:"Dia menyegarkan jiwaku"},
    {t:86,  text:"Dia menuntunku di jalan yang benar"},
    {t:93,  text:"oleh karena nama-Nya"},
    {t:100, text:"Sekalipun aku berjalan"},
    {t:107, text:"dalam lembah kekelaman"},
    {t:115, text:"♪"},
    {t:125, text:"Aku tidak takut bahaya"},
    {t:130, text:"sebab Engkau besertaku"},
    {t:139, text:"Gada-Mu dan tongkat-Mu"},
    {t:146, text:"itulah yang menghibur aku"},
    {t:151, text:"Dia membimbingku ke air yang tenang"},
    {t:158, text:"Dia menyegarkan jiwaku"},
    {t:165, text:"Dia menuntunku di jalan yang benar"},
    {t:172, text:"oleh karena nama-Nya"},
    {t:179, text:"Sekalipun aku berjalan"},
    {t:186, text:"dalam lembah kekelaman"},
    {t:193, text:"♪"},
    {t:217, text:"Dia membimbingku ke air yang tenang"},
    {t:224, text:"Dia menyegarkan jiwaku"},
    {t:232, text:"Dia menuntunku di jalan yang benar"},
    {t:238, text:"oleh karena nama-Nya"},
    {t:245, text:"Dia membimbingku ke air yang tenang"},
    {t:252, text:"Dia menyegarkan jiwaku"},
    {t:259, text:"Dia menuntunku di jalan yang benar"},
    {t:265, text:"oleh karena nama-Nya"},
    {t:272, text:"Sekalipun aku berjalan"},
    {t:279, text:"dalam lembah kekelaman"},
    {t:285, text:"Dan aku pun akan Diam dalam"},
    {t:293, text:"Rumah Tuhan sepanjang masa"},
    {t:300, text:"♪"},
  ],
  7: [
    {t:0,   text:"♪"},
    {t:29,  text:"Kita bagai kelana menyusur cakrawala"},
    {t:36,  text:"Menuju langit suarga"},
    {t:43,  text:"Diantar nyanyi enau dan hawa segar pulau"},
    {t:50,  text:"Yang indah di bibir samudra"},
    {t:55,  text:"Kehidupan yang penuh hasrat dan semangat"},
    {t:62,   text:"♪"},
    {t:72,  text:"Angin iman membawa balada syair indah"},
    {t:79,  text:"Untuk meluhurkan Tuhan"},
    {t:86,  text:"Ke dinding bukit-bukit nama-Nya diserukan"},
    {t:93,  text:"Oleh alam dan manusia"},
    {t:97, text:"Dengan hati yang tulus, ikhlas, dan gembira"},
    {t:105,   text:"♪"},
    {t:150, text:"Kita bagai kelana menyusur cakrawala"},
    {t:157, text:"Menuju langit suarga"},
    {t:164, text:"Diantar nyanyi enau dan hawa segar pulau"},
    {t:171, text:"Yang indah di bibir samudra"},
    {t:176, text:"Kehidupan yang penuh hasrat dan semangat"},
    {t:189,   text:"♪"},
    {t:193, text:"Angin iman membawa balada syair indah"},
    {t:200, text:"Untuk meluhurkan Tuhan"},
    {t:207, text:"Ke dinding bukit-bukit nama-Nya diserukan"},
    {t:213, text:"Oleh alam dan manusia"},
    {t:219, text:"Dengan hati yang tulus, ikhlas, dan gembira"},
    {t:226,   text:"♪"},
  ],
  8: [
    {t:0,   text:"♪"},
    {t:53,  text:"Dengan gembira bersama melangkah"},
    {t:58,  text:"Kita semua menghadap Tuhan"},
    {t:64,  text:"Bertepuk tangan nyanyi sukaria"},
    {t:69,  text:"Sebab besar kasih setianya"},
    {t:75,  text:"Angkatlah hati jiwa"},
    {t:81,  text:"Mohon rahmat berlimpah"},
    {t:86,  text:"Agar kita pun pantas"},
    {t:91,  text:"Berkenan kepadanya"},
    {t:95,   text:"♪"},
    {t:104,  text:"Satukan kami umat-Mu ya Tuhan"},
    {t:109,  text:"Dalam Kristus jadi satu warga"},
    {t:115,  text:"Hingga kami sehati dan sejiwa"},
    {t:120,  text:"Memuliakan nama-Mu Tuhan"},
    {t:126, text:"Angkatlah hati jiwa"},
    {t:132, text:"Mohon rahmat berlimpah"},
    {t:137, text:"Agar kita pun pantas"},
    {t:142, text:"Berkenan kepadanya"},
    {t:147,   text:"♪"},
    {t:170, text:"Angkatlah hati jiwa"},
    {t:175, text:"Mohon rahmat berlimpah"},
    {t:180, text:"Agar kita pun pantas"},
    {t:185, text:"Berkenan kepadanya"},
    {t:190  , text:"Angkatlah hati jiwa"},
    {t:197, text:"Mohon rahmat berlimpah"},
    {t:202, text:"Agar kita pun pantas"},
    {t:207, text:"Berkenan kepadanya"},
    {t:211, text:"Angkatlah hati jiwa"},
    {t:217, text:"Mohon rahmat berlimpah"},
    {t:222, text:"Agar kita pun pantas"},
    {t:227, text:"Berkenan kepadanya"},
    {t:232, text:"Agar kita pun pantas"},
    {t:237, text:"Berkenan kepadanya"},
    {t:242, text:"Agar kita pun pantas"},
    {t:247, text:"Berkenan kepadanya"},
    {t:255, text:"Berkenan kepadanya"},
    {t:263, text:"Berkenan kepadanya"},
    {t:267,   text:"♪"},
  ],
  9: [
    {t:0,   text:"♪"},
    {t:22,  text:"Ku mau cinta Yesus selamanya"},
    {t:30,  text:"Ku mau cinta Yesus selamanya"},
    {t:38,  text:"Meskipun badai silih berganti dalam hidupku"},
    {t:46,  text:"Ku tetap cinta Yesus selamanya"},
    {t:54,  text:"Ya Abba, Bapa, ini aku anak-Mu"},
    {t:62,  text:"Layakkanlah seluruh hidupku"},
    {t:71,  text:"Ya Abba, Bapa, ini aku anak-Mu"},
    {t:79,  text:"Pakailah sesuai dengan rencana-Mu"},
    {t:92,  text:"Ku mau cinta Yesus selamanya"},
    {t:100,  text:"Ku mau cinta Yesus selamanya"},
    {t:108, text:"Meskipun badai silih berganti dalam hidupku"},
    {t:117, text:"Ku tetap cinta Yesus selamanya"},
    {t:124, text:"Ya Abba, Bapa, ini aku anak-Mu"},
    {t:133, text:"Layakkanlah seluruh hidupku"},
    {t:141, text:"Ya Abba, Bapa, ini aku anak-Mu"},
    {t:149, text:"Pakailah sesuai dengan rencana-Mu"},
    {t:157, text:"Ya Abba, Bapa, ini aku anak-Mu"},
    {t:166, text:"Layakkanlah seluruh hidupku"},
    {t:174, text:"Ya Abba, Bapa, ini aku anak-Mu"},
    {t:182, text:"Pakailah sesuai dengan rencana-Mu"},
    {t:191, text:"Pakailah sesuai dengan rencana-Mu"},
    {t:199, text:"Pakailah sesuai dengan rencana-Mu"},
    {t:208,   text:"♪"},
    {t:220, text:"Ku mau cinta Yesus selamanya"},
    {t:229, text:"Ku mau cinta Yesus selamanya"},
    {t:237, text:"Meskipun badai silih berganti dalam hidupku"},
    {t:246, text:"Ku tetap cinta Yesus selamanya"},
    {t:260,   text:"♪"},
  ],
  10: [
    {t:0,   text:"♪"},
    {t:18,  text:"Siapakah aku di hadapan-Mu, Tuhan?"},
    {t:26,  text:"Kau curahkan cinta-Mu"},
    {t:32,  text:"Apakah hatiku bagi-Mu"},
    {t:39,  text:"Cintamu setia selalu"},
    {t:48,  text:"Pantaskah kumenyambut"},
    {t:52,  text:"Tubuh Darah-Mu?"},
    {t:55,  text:"Karena banyak dosaku"},
    {t:62,  text:"sering kuingkari"},
    {t:66,  text:"Cinta-Mu dalam langkah hidupku"},
    {t:76,  text:"Ampunilah aku"},
    {t:79,  text:"ampuni kelemahanku"},
    {t:83,  text:"Ampuni dosaku"},
    {t:86,  text:"dalam kerahiman-Mu"},
    {t:91,  text:"Agar ku mampu wartakan kasih-Mu"},
    {t:98,  text:"di dalam hidupku"},
    {t:106, text:"Bersihkan hatiku"},
    {t:108, text:"dengan sucinya cinta-Mu"},
    {t:113, text:"Jadikan hatiku istana cinta-Mu"},
    {t:120, text:"Tempat yang layak untuk"},
    {t:124, text:"Bersemayaman Tubuh dan Darah-Mu"},
    {t:136,   text:"♪"},
    {t:173, text:"Pantaskah kumenyambut"},
    {t:178, text:"Tubuh Darah-Mu"},
    {t:181, text:"Karena banyak dosaku"},
    {t:187, text:"sering Kuingkari"},
    {t:191, text:"Cinta-Mu dalam langkah hidupku"},
    {t:201, text:"Ampunilah aku"},
    {t:204, text:"ampuni kelemahanku"},
    {t:209, text:"Ampuni dosaku"},
    {t:212, text:"dalam kerahiman-Mu"},
    {t:217, text:"Agar ku mampu wartakan kasih-Mu"},
    {t:223, text:"di dalam hidupku"},
    {t:231, text:"Bersihkan hatiku"},
    {t:234, text:"dengan sucinya cinta-Mu"},
    {t:238, text:"Jadikan hatiku istana cinta-Mu"},
    {t:246, text:"Tempat yang layak untuk"},
    {t:250, text:"Bersemayaman Tubuh dan Darah-Mu"},
    {t:261, text:"Tempat yang layak untuk"},
    {t:265, text:"Bersemayaman Tubuh dan Darah-Mu"},
    {t:276, text:"Tempat yang layak untuk"},
    {t:280, text:"Bersemayaman Tubuh dan Darah-Mu"},
    {t:289 ,   text:"♪"},
  ],

    11: [
    {t:0 ,   text:"♪"},
    {t:41,  text:"Kujalani hidup ini"},
    {t:47,  text:"lewat bukit dan lembah"},
    {t:52,  text:"lewat gurun dan lautan"},
    {t:58,  text:"ku terjang badai Taufan"},
    {t:66,  text:"tak kurasa menderita"},
    {t:72,  text:"walau miskin dan hina"},
    {t:77,  text:"kuserahkan harapanku"},
    {t:83,  text:"dibawah salibmu"},
    {t:91,  text:"dalam hidupku selalu kudengar"},
    {t:102, text:"dalam hidupku selalu kudengar"},
    {t:113, text:"panggilan hidupku"},
    {t:119, text:"kutahu ya Tuhan"},
    {t:124, text:"Padamu kurasa bahagia"},
    {t:135, text:"padamu kurasa bahagia"},
    {t:145, text:"♪"},
    {t:172, text:"ku kan tetap mengikuti"},
    {t:177, text:"panggilanmu ya Tuhan"},
    {t:182, text:"kuserahkan segalanya"},
    {t:188, text:"dibawah salibmu"},
    {t:196, text:"dalam hidupku selalu kudengar"},
    {t:207, text:"dalam hidupku selalu kudengar"},
    {t:219, text:"panggilan hidupku"},
    {t:224, text:"kutahu ya Tuhan"},
    {t:229, text:"padamu kurasa bahagia"},
    {t:241, text:"padamu kurasa bahagia"},
    {t:252, text:"padamu kurasa bahagia"},
    {t:261, text:"♪"},
  ],

  
};

// ── LYRICS LOGIC ──
let lyricsOpen      = false;
let currentLyricIdx = -1;

function toggleLyrics() {
  if (!currentSongId) { showToast('⚠️ Pilih lagu terlebih dahulu'); return; }
  lyricsOpen ? closeLyrics() : openLyrics();
}

function openLyrics() {
  lyricsOpen = true;
  const panel = document.getElementById('lyrics-panel');
  panel.style.display = 'flex';
  requestAnimationFrame(() => { panel.classList.add('open'); });
  document.getElementById('lyrics-toggle-btn').style.color = 'var(--accent)';
  updateLyricsHeader();
  renderLyricsLines();
  syncLyricLine(true);
}

function closeLyrics() {
  lyricsOpen = false;
  const panel = document.getElementById('lyrics-panel');
  panel.classList.remove('open');
  document.getElementById('lyrics-toggle-btn').style.color = '';
  setTimeout(() => { if (!lyricsOpen) panel.style.display = 'none'; }, 350);
}

function updateLyricsHeader() {
  if (!currentSongId) return;
  const s = SONGS.find(x => x.id === currentSongId);
  if (!s) return;
  const cover = document.getElementById('lyrics-cover');
  cover.style.cssText = `background:${s.bg};width:56px;height:56px;border-radius:12px;overflow:hidden;flex-shrink:0;box-shadow:0 8px 32px rgba(0,0,0,.5);display:block`;
  cover.innerHTML = `<img src="${s.img}" style="width:100%;height:100%;object-fit:cover;border-radius:12px;display:block" loading="lazy" onerror="this.style.display='none'">`;
  document.getElementById('lyrics-panel-title').textContent  = s.title;
  document.getElementById('lyrics-panel-artist').textContent = s.artist;
  document.getElementById('lyrics-time-total').textContent   = s.dur;
}

function renderLyricsLines() {
  const data = LYRICS[currentSongId];
  if (!data) {
    document.getElementById('lyrics-body').innerHTML =
      `<div class="lyrics-no-data"><div class="nd-icon">🎵</div><p>Lirik belum tersedia untuk lagu ini</p></div>`;
    return;
  }
  if (!document.getElementById('lyrics-lines')) {
    document.getElementById('lyrics-body').innerHTML = `<div class="lyrics-lines" id="lyrics-lines"></div>`;
  }
  document.getElementById('lyrics-lines').innerHTML = data.map((l, i) =>
    `<div class="lyric-line upcoming" id="lyric-line-${i}" onclick="seekToLyric(${l.t})">${l.text}</div>`
  ).join('');
  currentLyricIdx = -1;
}

function syncLyricLine(jump) {
  if (!lyricsOpen || !currentSongId) return;
  const data = LYRICS[currentSongId];
  if (!data) return;

  const pct = currentDurSec ? (currentProgress / currentDurSec * 100) : 0;
  const mf  = document.getElementById('lyrics-mini-fill');
  if (mf) mf.style.width = pct + '%';
  const tc  = document.getElementById('lyrics-time-cur');
  if (tc) tc.textContent = fmtTime(currentProgress);

  let newIdx = -1;
  for (let i = data.length - 1; i >= 0; i--) {
    if (currentProgress >= data[i].t) { newIdx = i; break; }
  }
  if (newIdx === currentLyricIdx) return;
  currentLyricIdx = newIdx;

  data.forEach((_, i) => {
    const el = document.getElementById('lyric-line-' + i);
    if (!el) return;
    el.className = 'lyric-line ' + (i < newIdx ? 'past' : i === newIdx ? 'active' : 'upcoming');
  });

  if (newIdx >= 0) {
    const active = document.getElementById('lyric-line-' + newIdx);
    if (active) active.scrollIntoView({ behavior: jump ? 'auto' : 'smooth', block: 'center' });
  }
}

function seekToLyric(t) {
  currentProgress         = t;
  audioPlayer.currentTime = t;
  updateProgress();
}

// ── MODAL CLOSE ON OVERLAY CLICK ──
document.getElementById('modal-rec-pl').addEventListener('click',   function(e){ if(e.target===this) closeRecModal(); });
document.getElementById('modal-create').addEventListener('click',   function(e){ if(e.target===this) closeCreateModal(); });
document.getElementById('modal-add-songs').addEventListener('click',function(e){ if(e.target===this) closeAddSongsModal(); });

// ── MOBILE EXPANDED PLAYER PANEL ──
let mobilePanelOpen = false;

function openMobilePanelIfMobile() {
  if (window.innerWidth > 768) return;
  if (!currentSongId) return;
  syncMobilePanel();
  document.getElementById('mobile-player-panel').classList.add('open');
  document.getElementById('mobile-panel-overlay').classList.add('open');
  mobilePanelOpen = true;
}

function closeMobilePanel() {
  document.getElementById('mobile-player-panel').classList.remove('open');
  document.getElementById('mobile-panel-overlay').classList.remove('open');
  mobilePanelOpen = false;
}

function syncMobilePanel() {
  if (!currentSongId) return;
  const song = SONGS.find(s => s.id === currentSongId);
  if (!song) return;

  // cover
  const mppCover = document.getElementById('mpp-cover');
  mppCover.style.cssText = `background:${song.bg};width:56px;height:56px;border-radius:12px;overflow:hidden;flex-shrink:0;display:grid;place-items:center;font-size:24px`;
  mppCover.innerHTML = `<img src="${song.img}" style="width:100%;height:100%;object-fit:cover;border-radius:12px;display:block" onerror="this.style.display='none'">`;

  document.getElementById('mpp-title').textContent  = song.title;
  document.getElementById('mpp-artist').textContent = song.artist;

  // progress
  const pct = currentDurSec ? (currentProgress / currentDurSec * 100) : 0;
  const mppFill = document.getElementById('mpp-progress-fill');
  if (mppFill) mppFill.style.width = pct + '%';
  document.getElementById('mpp-time-cur').textContent   = fmtTime(currentProgress);
  document.getElementById('mpp-time-total').textContent = fmtTime(currentDurSec || parseDur(song.dur));

  // play icon
  const pauseIcon = '<rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>';
  const playIcon  = '<polygon points="5,3 19,12 5,21"/>';
  const mppPlayIcon = document.getElementById('mpp-play-icon');
  if (mppPlayIcon) mppPlayIcon.innerHTML = isPlaying ? pauseIcon : playIcon;

  // heart
  const liked = likedIds.has(currentSongId);
  const mppLikeBtn = document.getElementById('mpp-like-btn');
  if (mppLikeBtn) {
    mppLikeBtn.classList.toggle('liked', liked);
    const h = document.getElementById('mpp-heart');
    if (h) { h.setAttribute('fill', liked ? '#f43f5e' : 'none'); h.setAttribute('stroke', liked ? '#f43f5e' : 'currentColor'); }
  }

  // shuffle/repeat colors
  const mppShuffle = document.getElementById('mpp-shuffle-btn');
  if (mppShuffle) mppShuffle.style.color = isShuffle ? 'var(--accent)' : '';
  const mppRepeat  = document.getElementById('mpp-repeat-btn');
  if (mppRepeat) mppRepeat.style.color = repeatMode > 0 ? 'var(--accent)' : '';
}

// Seek from mobile panel progress bar
document.addEventListener('DOMContentLoaded', () => {
  const mppBar = document.getElementById('mpp-progress-bar');
  if (mppBar) {
    mppBar.addEventListener('click', e => {
      if (!currentSongId) return;
      const rect = mppBar.getBoundingClientRect();
      const pct  = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const time = pct * (audioPlayer.duration || currentDurSec);
      currentProgress = time;
      audioPlayer.currentTime = time;
      updateProgress();
    });
  }
});

// (mpp progress is synced inside updateProgress above)

// Also sync play icon in mpp when togglePlay is called
// (handled by patching the main updatePlayIcon above)

// ── INIT ──
renderHome();
renderSearch();
renderPlaylists();
