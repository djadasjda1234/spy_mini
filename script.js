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
    if (!myName) {
        showScreen('screen-auth');
    } else if (!myRoom) {
        showScreen('screen-room-select');
    } else {
        showScreen('main-content');
        startPolling();
    }
}

// Функция теперь просто показывает один главный экран и скрывает остальные оверлеи
function showScreen(id) {
    document.getElementById('screen-auth').classList.add('hidden');
    document.getElementById('screen-room-select').classList.add('hidden');
    document.getElementById('main-content').classList.add('hidden');
    
    document.getElementById(id).classList.remove('hidden');
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

function leaveRoom() {
    localStorage.removeItem('spy_room');
    location.reload();
}

function startPolling() {
    document.getElementById('display-room').innerText = myRoom;
    setInterval(async () => {
        if(!myRoom || !myName) return;
        try {
            // Пинг сервера
            await fetch(`${SERVER_URL}/join`, { 
                method: 'POST', 
                headers: {'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true'}, 
                body: JSON.stringify({ room: myRoom, name: myName }) 
            });

            // Получение данных игры
            const r = await fetch(`${SERVER_URL}/game_data?room=${myRoom}&name=${encodeURIComponent(myName)}`, { 
                headers: {'ngrok-skip-browser-warning': 'true'} 
            });
            const d = await r.json();

            const lobbyEl = document.getElementById('screen-lobby');
            const gameEl = document.getElementById('screen-game');

            if (!d.active) {
                // СОСТОЯНИЕ: ЛОББИ
                lobbyEl.classList.remove('hidden');
                gameEl.classList.add('hidden');
                document.getElementById('overlay-res').classList.add('hidden');
                document.getElementById('overlay-vote').classList.add('hidden');
                updateLobby();
            } else {
                // СОСТОЯНИЕ: ИГРА ИДЕТ
                lobbyEl.classList.add('hidden');
                gameEl.classList.remove('hidden');
                updateGame(d);
            }
        } catch (e) {
            console.log("Ошибка связи с сервером");
        }
    }, 2000);
}

async function updateLobby() {
    try {
        const r = await fetch(`${SERVER_URL}/players?room=${myRoom}`, { 
            headers: {'ngrok-skip-browser-warning': 'true'} 
        });
        const d = await r.json();
        if (d.players) {
            const list = document.getElementById('player-list');
            list.innerHTML = d.players.map(p => `
                <div class="player-badge">
                    <span>${p}</span> 
                    ${p === myName ? '<b style="color:var(--primary)">(ТЫ)</b>' : ''}
                </div>
            `).join('');
            
            const btn = document.getElementById('start-btn');
            btn.disabled = d.players.length < 3;
            btn.innerText = d.players.length < 3 ? `ЖДЕМ ИГРОКОВ (${d.players.length}/3)` : "НАЧАТЬ ИГРУ";
        }
    } catch (e) {}
}

function updateGame(d) {
    document.getElementById('g-role').innerText = d.role;
    document.getElementById('g-role').style.color = d.role === "ШПИОН" ? "var(--red)" : "var(--primary)";
    document.getElementById('g-word').innerText = d.word;
    document.getElementById('g-category').innerText = "КАТЕГОРИЯ: " + d.category;
    document.getElementById('g-round').innerText = `КРУГ ${d.round}/3`;
    document.getElementById('turn-indicator').innerText = d.is_my_turn ? "★ ТВОЙ ХОД ★" : `ХОДИТ: ${d.current_turn}`;
    
    // Кнопка угадывания только для шпиона и только в фазе чата
    document.getElementById('spy-guess-btn').classList.toggle('hidden', d.role !== "ШПИОН" || d.phase !== "CHAT");
    
    // Чат
    document.getElementById('chat-box').innerHTML = d.messages.map(m => `
        <div class="msg ${m.user === myName ? 'me' : ''}">
            <small>${m.user}</small><br>${m.text}
        </div>
    `).join('');
    
    // Оверлеи фаз
    document.getElementById('overlay-vote').classList.toggle('hidden', d.phase !== 'VOTING');
    document.getElementById('overlay-res').classList.toggle('hidden', d.phase !== 'RESULTS');
    
    if(d.phase === 'RESULTS') {
        document.getElementById('res-msg').innerText = d.result_msg;
        document.getElementById('vote-list').innerHTML = ""; 
    }
    
    if(d.phase === 'VOTING' && document.getElementById('vote-list').innerHTML === "") {
        document.getElementById('vote-list').innerHTML = d.order
            .filter(p => p !== myName)
            .map(p => `<button class="btn" onclick="sendVote('${p}')">${p}</button>`)
            .join('');
    }
}

function showSpyGuess() { document.getElementById('overlay-spy-input').classList.remove('hidden'); }

async function submitSpyWord() {
    const wordInput = document.getElementById('spy-word-input');
    const word = wordInput.value.trim();
    if(!word) return;
    await fetch(`${SERVER_URL}/spy_guess`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true'},
        body: JSON.stringify({ room: myRoom, name: myName, text: word })
    });
    document.getElementById('overlay-spy-input').classList.add('hidden');
    wordInput.value = "";
}

async function startGame() { 
    await fetch(`${SERVER_URL}/start_game`, { 
        method: 'POST', 
        headers: {'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true'}, 
        body: JSON.stringify({ room: myRoom, name: myName }) 
    }); 
}

async function triggerReset() {
    document.getElementById('overlay-res').classList.add('hidden');
    await fetch(`${SERVER_URL}/reset`, { 
        method: 'POST', 
        headers: {'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true'}, 
        body: JSON.stringify({ room: myRoom, name: myName }) 
    });
}

async function sendMsg() {
    const i = document.getElementById('chat-in');
    if(!i.value.trim()) return;
    await fetch(`${SERVER_URL}/send_message`, { 
        method: 'POST', 
        headers: {'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true'}, 
        body: JSON.stringify({ room: myRoom, name: myName, text: i.value }) 
    });
    i.value = "";
}

async function sendVote(t) {
    await fetch(`${SERVER_URL}/vote`, { 
        method: 'POST', 
        headers: {'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true'}, 
        body: JSON.stringify({ room: myRoom, name: myName, target: t }) 
    });
}

init();
