const SERVER_URL = "https://joystick-roast-unable.ngrok-free.dev"; 
let myName = localStorage.getItem('spy_nick');
let myRoom = localStorage.getItem('spy_room');

function showConfirm(text, cb) {
    document.getElementById('confirm-text').innerText = text;
    document.getElementById('overlay-confirm').classList.remove('hidden');
    document.getElementById('confirm-yes-btn').onclick = () => { cb(); closeConfirm(); };
}

function closeConfirm() { document.getElementById('overlay-confirm').classList.add('hidden'); }

function init() {
    if (!myName) showScreen('screen-auth');
    else if (!myRoom) showScreen('screen-room-select');
    else { showScreen('main-content'); startPolling(); }
}

function showScreen(id) {
    document.querySelectorAll('.overlay, #main-content, #screen-lobby, #screen-game').forEach(s => s.classList.add('hidden'));
    document.getElementById(id).classList.remove('hidden');
    if(id === 'main-content') document.getElementById('screen-lobby').classList.remove('hidden');
}

function confirmNick() {
    const v = document.getElementById('nick-input').value.trim();
    if (v.length < 2) return;
    myName = v + "#" + Math.floor(1000 + Math.random()*9000);
    localStorage.setItem('spy_nick', myName);
    init();
}

function confirmRoom() {
    const v = document.getElementById('room-input').value.trim();
    if (!v) return;
    myRoom = v;
    localStorage.setItem('spy_room', myRoom);
    init();
}

function leaveRoom() { localStorage.removeItem('spy_room'); location.reload(); }

function startPolling() {
    document.getElementById('display-room').innerText = myRoom;
    setInterval(async () => {
        if(!myRoom || !myName) return;
        try {
            await fetch(`${SERVER_URL}/join`, { 
                method: 'POST', 
                headers: {'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true'}, 
                body: JSON.stringify({ room: myRoom, name: myName }) 
            });
            const r = await fetch(`${SERVER_URL}/game_data?room=${myRoom}&name=${encodeURIComponent(myName)}`, { headers: {'ngrok-skip-browser-warning': 'true'} });
            const d = await r.json();

            if (!d.active) {
                document.getElementById('screen-lobby').classList.remove('hidden');
                document.getElementById('screen-game').classList.add('hidden');
                updateLobby();
            } else {
                document.getElementById('screen-lobby').classList.add('hidden');
                document.getElementById('screen-game').classList.remove('hidden');
                updateGame(d);
            }
        } catch (e) {}
    }, 2000);
}

async function updateLobby() {
    const r = await fetch(`${SERVER_URL}/players?room=${myRoom}`, { headers: {'ngrok-skip-browser-warning': 'true'} });
    const d = await r.json();
    document.getElementById('player-list').innerHTML = d.players.map(p => `<div class="player-badge"><span>${p}</span> ${p === myName ? '<b>(ТЫ)</b>' : ''}</div>`).join('');
    const btn = document.getElementById('start-btn');
    btn.disabled = d.players.length < 3;
    btn.innerText = d.players.length < 3 ? `ЖДЕМ (${d.players.length}/3)` : "НАЧАТЬ ИГРУ";
}

function updateGame(d) {
    document.getElementById('g-role').innerText = d.role;
    document.getElementById('g-role').style.color = d.role === "ШПИОН" ? "var(--red)" : "var(--primary)";
    document.getElementById('g-word').innerText = d.word;
    document.getElementById('g-category').innerText = "КАТЕГОРИЯ: " + d.category;
    document.getElementById('g-round').innerText = `КРУГ ${d.round}/3`;
    document.getElementById('turn-indicator').innerText = d.is_my_turn ? "★ ТВОЙ ХОД ★" : `ХОДИТ: ${d.current_turn}`;
    document.getElementById('spy-guess-btn').classList.toggle('hidden', d.role !== "ШПИОН");
    document.getElementById('chat-box').innerHTML = d.messages.map(m => `<div class="msg ${m.user === myName ? 'me' : ''}"><small>${m.user}</small><br>${m.text}</div>`).join('');
    document.getElementById('overlay-vote').classList.toggle('hidden', d.phase !== 'VOTING');
    document.getElementById('overlay-res').classList.toggle('hidden', d.phase !== 'RESULTS');
    if(d.phase === 'RESULTS') document.getElementById('res-msg').innerText = d.result_msg;
    if(d.phase === 'VOTING' && document.getElementById('vote-list').innerHTML === "") {
        document.getElementById('vote-list').innerHTML = d.order.filter(p=>p!==myName).map(p=>`<button class="btn" onclick="sendVote('${p}')">${p}</button>`).join('');
    }
}

function showSpyGuess() { document.getElementById('overlay-spy-input').classList.remove('hidden'); }
async function submitSpyWord() {
    const word = document.getElementById('spy-word-input').value.trim();
    if(!word) return;
    document.getElementById('overlay-spy-input').classList.add('hidden');
    alert("Вариант отправлен!"); 
}

async function startGame() { await fetch(`${SERVER_URL}/start_game`, { method: 'POST', headers: {'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true'}, body: JSON.stringify({ room: myRoom, name: myName }) }); }
async function triggerReset() { await fetch(`${SERVER_URL}/reset`, { method: 'POST', headers: {'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true'}, body: JSON.stringify({ room: myRoom, name: myName }) }); }
async function sendMsg() {
    const i = document.getElementById('chat-in');
    if(!i.value.trim()) return;
    await fetch(`${SERVER_URL}/send_message`, { method: 'POST', headers: {'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true'}, body: JSON.stringify({ room: myRoom, name: myName, text: i.value }) });
    i.value = "";
}
async function sendVote(t) {
    await fetch(`${SERVER_URL}/vote`, { method: 'POST', headers: {'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true'}, body: JSON.stringify({ room: myRoom, name: myName, target: t }) });
}
init();