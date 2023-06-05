const VERSION = 0.1; // Not implemented yet (makes sure a player is on the right version of game)

const FPS = 60; // Set fixed FPS (ppl with 144 hz monitors would move faster vs ppl on 60 hz monitors)
const INTERVAL = 1000 / FPS; // Rate at which canvas is updated in ms

const WORLDWIDTH = 750; // How wide our map is
const WORLDHEIGHT = 750; // How tall our map is
const PLAYER_CAP = 5;

let MAINPLAYER; // Will store our MainPlayer class. ONLY refers to the local player, not others.
let NAME; // Name of our main player
let ID; // ID of our main player (obtained by recieving a unique id upon initial connect)
let PLAYING = false; // Is our player on the menu/death or playing?
let PLAYERS = []; // Stores all players that the server gives back
let ANGLE = 0; // Stores local player's rotation

//FOR SWINGING
let SWINGING = 0; // 0 - not swinging, 1 - swinging, 2 - unswinging
let SWING_TIMER = 0; // used to animate swinging
let SWING_DELAY = 1; // set how fast player can swing
let SWING_DELAY_TIMER = 0;

var LASTX = WORLDWIDTH / 2; // Camera will leave off at this x position when player dies
var LASTY = WORLDHEIGHT / 2; // Camera will leave off at this y position when player dies

var MOUSEX; // will store mouse pos on the screen
var MOUSEY;

var websocket; // Our websocket for server connection (can be changed for different server)

const c = document.getElementById("canvas");
const ctx = c.getContext("2d");

canvas.addEventListener('mousemove', get_mouse_position);

ctx.canvas.width = window.innerWidth; // make fullscreen
ctx.canvas.height = window.innerHeight; // make fullscreen

window.addEventListener("resize", () => { //make fullscreen even when user resizes window
    ctx.canvas.width = window.innerWidth;
    ctx.canvas.height = window.innerHeight;
});

// grab all the HTML stuff
const menu = document.getElementById("menu");
const play_button = document.getElementById("play");
const name_input = document.getElementById("name");
const server_dropdown = document.getElementById("servers");
const error_msg = document.getElementById("error");
const player_list = document.getElementById("player_list");
const server_text = document.getElementById("server_text");
const death_menu = document.getElementById("death");
const play_death_button = document.getElementById("play_death");
const menu_death_button = document.getElementById("menu_death");

setup_websocket("ws://samsonahh.me:8001/"); // default server to connect to upon loading page

play_button.addEventListener("click", (e) => { // handles when player clicks play on menu
    if (websocket.readyState == WebSocket.OPEN) { // attempts to join if connected to server
        if (name_input.value) {
            NAME = name_input.value;
        }
        else {
            NAME = "unnamed";
        }

        if (get_players_playing() >= PLAYER_CAP) {
            error_msg.style.display = "inline";
            error_msg.innerHTML = "Lobby is full";
            error_msg.style.color = "red";
        }
        else {
            menu.style.display = "none";
            get_mouse_position(e);
            start();
        }
    }
    else { // tries to rejoin same server if not connected
        server_dropdown.dispatchEvent(new Event("change"));
    }
});

play_death_button.addEventListener("click", (e) => {
    if (websocket.readyState == WebSocket.OPEN && !PLAYING) { // handles when player clicks play on death menu
        if (get_players_playing() >= PLAYER_CAP) {
            menu_death_button.dispatchEvent(new Event("click"));
            error_msg.style.display = "inline";
            error_msg.innerHTML = "Lobby is full";
            error_msg.style.color = "red";
        }
        else {
            death_menu.style.display = "none";
            get_mouse_position(e);
            start();
        }
    }
})

menu_death_button.addEventListener("click", (e) => { // handles when player clicks menu on death menu
    death_menu.style.display = "none";
    menu.style.display = "inline-block";
})

server_dropdown.addEventListener("change", (e) => { // handles when dropdown is changed
    if (server_dropdown.value == "localhost") { //connected to locally hosted server
        setup_websocket("ws://localhost:8001/");
    }
    if (server_dropdown.value == "droplet") { //connects to our droplet server
        setup_websocket("ws://samsonahh.me:8001/");
    }
});

class Player { // general player class for everyone
    worldX;
    worldY;
    screenX;
    screenY;
    name;

    constructor(wx, wy, n) {
        this.worldX = wx;
        this.worldY = wy;
        this.name = n;
    }

    display(angle, swing_angle) {
        if (PLAYING) { // displays relative to main player
            this.screenX = this.worldX + MAINPLAYER.screenX - MAINPLAYER.worldX;
            this.screenY = this.worldY + MAINPLAYER.screenY - MAINPLAYER.worldY;
        }
        else { // displays relative to where the player last died/left off
            this.screenX = this.worldX + ctx.canvas.width / 2 - LASTX;
            this.screenY = this.worldY + ctx.canvas.height / 2 - LASTY;
        }

        draw_sword_and_hand(this.screenX, this.screenY, angle, swing_angle);

        ctx.lineWidth = 7.5;
        draw_circle_text(this.screenX, this.screenY, 30, "red", this.name); // the player's body
        ctx.lineWidth = 1;  

        draw_circle(this.screenX + 29 * Math.cos(angle + Math.PI/6), this.screenY + 29 * Math.sin(angle + Math.PI/6), 6, "black"); // right eye
        draw_circle(this.screenX + 29 * Math.cos(angle - Math.PI/6), this.screenY + 29 * Math.sin(angle - Math.PI/6), 6, "black"); // left eye
    }
}

class MainPlayer extends Player { // specialized player class for the local player
    // directional booleans for control
    up = false;
    down = false;
    left = false;
    right = false;

    constructor(wx, wy, n) {
        super(wx, wy, n);
        this.screenX = ctx.canvas.width / 2; // player is always centered in the middle of the screen
        this.screenY = ctx.canvas.height / 2;
    }

    display(swing_angle) {
        this.screenX = ctx.canvas.width / 2; // ensures player is still centered even after window resize
        this.screenY = ctx.canvas.height / 2;
        
        let d_from_mouse = distance(this.screenX, this.screenY, MOUSEX, MOUSEY);
        ANGLE = Math.acos((MOUSEX - this.screenX)/d_from_mouse);
        if(MOUSEY < ctx.canvas.height/2){
            ANGLE*=-1;
        }
        draw_line(this.screenX, this.screenY, this.screenX + 90 * Math.cos(ANGLE), this.screenY + 90 * Math.sin(ANGLE), "black");
        draw_circle(this.screenX + 90 * Math.cos(ANGLE), this.screenY + 90 * Math.sin(ANGLE), 5, "black");

        draw_sword_and_hand(this.screenX, this.screenY, ANGLE, swing_angle);

        ctx.lineWidth = 7.5;
        draw_circle_text(this.screenX, this.screenY, 30, "cyan", this.name); // the player's body
        ctx.lineWidth = 1;  

        draw_circle(this.screenX + 29 * Math.cos(ANGLE + Math.PI/6), this.screenY + 29 * Math.sin(ANGLE + Math.PI/6), 6, "black"); // right eye
        draw_circle(this.screenX + 29 * Math.cos(ANGLE - Math.PI/6), this.screenY + 29 * Math.sin(ANGLE - Math.PI/6), 6, "black"); // left eye
    }

    handle_movement() { // move 2 units in direction
        if (this.up) this.worldY -= 2;
        if (this.down) this.worldY += 2;
        if (this.left) this.worldX -= 2;
        if (this.right) this.worldX += 2;
        this.check_bounds();
    }

    check_bounds() { // handles if player is knocked outside
        if (this.worldY > WORLDHEIGHT + 30 || this.worldY < -30 || this.worldX > WORLDWIDTH + 30 || this.worldX < -30) {
            kill_player();
        }
    }

    handle_collision(other) {
        let d = distance(other.x, other.y, this.worldX, this.worldY);
        let vector = {
            x: (this.worldX - other.x) / d,
            y: (this.worldY - other.y) / d
        };
        if (d < 60 && d > 0) {
            this.worldX = other.x + vector.x * 60;
            this.worldY = other.y + vector.y * 60;
        }
        //swing
        let other_face_vector = {
            x: Math.cos(other.angle),
            y: Math.sin(other.angle)
        };
        let between_vector = {
            x: this.worldX - other.x,
            y: this.worldY - other.y
        };
        let dot = other_face_vector.x * between_vector.x + other_face_vector.y * between_vector.y;

        if (other.swinging && d < 90 + 30 && dot >= 0){
            console.log("DO SOMETHING");
        }
    }

    start_swing(){
        if(SWING_DELAY_TIMER > SWING_DELAY && SWINGING == 0){
            SWINGING = 1;
            SWING_TIMER = 0;
            SWING_DELAY_TIMER = 0;
        }
    }
}

function send_local_data(data) { // send data to server
    websocket.send(JSON.stringify(data));
}

function setup_websocket(address) { // websockets connects to the specified address
    error_msg.style.display = "none";

    if (websocket) { // if you are already connected then gracefully disconnect
        handle_server_disconnect();
    }
    websocket = new WebSocket(address);

    websocket.onerror = (e) => { // if there is error connecting to server
        show_server_connected_msg(false);
        return;
    };

    websocket.onclose = handle_server_disconnect; // if server forcibly closes

    websocket.addEventListener("message", handle_server_data); // start listening for data from server
}

function handle_server_data({ data }) {
    d = JSON.parse(data);
    if (d.hasOwnProperty("id") && Object.keys(d).length == 1) { // if server sends back only a player id then store that as your new ID
        ID = d.id;
        show_server_connected_msg(true);
    }
    PLAYERS = d; // updates local PLAYERS list with server's players list
    // console.log(PLAYERS);
    server_text.innerText = "Server (" + get_players_playing() + "/" + PLAYER_CAP + "):"
}

function start() { // called once when Play is pressed
    MAINPLAYER = new MainPlayer(Math.random() * (WORLDWIDTH - 30) + 30, Math.random() * (WORLDHEIGHT - 30) + 30, NAME); // spawn random location
    PLAYING = true;
    SWING_DELAY_TIMER = 0;
    
    enable_controls();
}

function update() { // called every frame when page is loaded
    draw_background();
    update_player_list(); // updates the leaderboard

    for (let i = 0; i < PLAYERS.length; i++) { // draws all other players and handles collision with them
        if (PLAYERS[i].id != ID) {
            p = new Player(PLAYERS[i].x, PLAYERS[i].y, PLAYERS[i].name);
            p.display(PLAYERS[i].angle, PLAYERS[i].swing_angle);
            if (PLAYING) {
                MAINPLAYER.handle_collision(PLAYERS[i]);
            }
        }
    }

    if (PLAYING) {
        let swing_angle = get_swing_angle();

        MAINPLAYER.display(swing_angle);
        MAINPLAYER.handle_movement();
    }

    if (websocket.readyState == WebSocket.OPEN) { // send back our local player's data to the server
        play_button.innerHTML = "Play";
        if (PLAYING) {
            local_data = {
                id: ID,
                name: NAME,
                x: MAINPLAYER.worldX,
                y: MAINPLAYER.worldY,
                playing: PLAYING,
                angle: ANGLE,
                swinging: SWINGING == 1 || SWINGING == 2,
                swing_angle: get_swing_angle()
            };
        }
        else {
            local_data = {
                id: ID
            };
        }
        send_local_data(local_data);
    }

    if (websocket.readyState == WebSocket.CLOSED) {
        play_button.innerHTML = "Retry";
        show_server_connected_msg(false);
    }
}
setInterval(update, INTERVAL); // creates 60 FPS by updating loop every INTERVAL = 1000/FPS = 13.333... milliseconds











function draw_line(x0, y0, x1, y1, color) {
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.strokeStyle = color;
    ctx.stroke();
}

function draw_rect(x, y, width, height, color) {
    ctx.strokeStyle = color;
    ctx.strokeRect(x, y, width, height);
}

function draw_circle(x, y, radius, color) {
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, 2 * Math.PI, false);
    ctx.strokeStyle = "black";
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.fill();
}

function draw_circle_text(x, y, radius, color, name) {
    draw_circle(x, y, radius, color);
    ctx.fillStyle = "black";
    ctx.font = "bold 18px Helvetica";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(name, x, y - 1.5 * radius);
}

function clear() {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
}

function draw_background() {
    clear();

    if (PLAYING) {
        var sX = 0 - MAINPLAYER.worldX + MAINPLAYER.screenX;
        var sY = 0 - MAINPLAYER.worldY + MAINPLAYER.screenY;
    }
    else {
        var sX = 0 - LASTX + ctx.canvas.width / 2;
        var sY = 0 - LASTY + ctx.canvas.height / 2;
    }
    ctx.lineWidth = 7.5;
    draw_rect(sX, sY, WORLDWIDTH, WORLDHEIGHT, "black");
    ctx.lineWidth = 1;

    for (let i = 0; i < WORLDWIDTH; i += 25) {
        for (let j = 0; j < WORLDHEIGHT; j += 25) {
            draw_line(i + sX, sY, i + sX, sY + WORLDHEIGHT, "gray");
            draw_line(sX, j + sY, sX + WORLDWIDTH, j + sY, "gray");
        }
    }
}

function distance(x0, y0, x1, y1) {
    return Math.sqrt((x0 - x1) * (x0 - x1) + (y0 - y1) * (y0 - y1));
}

function show_server_connected_msg(is_connected) {
    if (is_connected) {
        error_msg.style.display = "inline";
        error_msg.innerHTML = "Connected to server";
        error_msg.style.color = "green";
    }
    else {
        error_msg.style.display = "inline";
        error_msg.innerHTML = "Failed to connect to server";
        error_msg.style.color = "red";
    }
}

function update_player_list() { // updates the leaderboard
    clear_player_list();
    var position = 1;
    for (let i = 0; i < PLAYERS.length; i++) {
        if (PLAYERS[i].playing) {
            const listing = player_list.appendChild(document.createElement('div'));
            listing.innerHTML = position + ": " + PLAYERS[i].name;
            if (PLAYERS[i].id == ID) {
                listing.style.fontWeight = "bold";
            }
            position++;
        }
    }
}

function clear_player_list() { // clears the leaderboard
    children = []
    for (let i = 0; i < player_list.childNodes.length; i++) {
        children[i] = player_list.childNodes[i];
    }
    for (let i = 0; i < children.length; i++) {
        children[i].remove();
    }
}

function stop_movement() {
    MAINPLAYER.up = false;
    MAINPLAYER.down = false;
    MAINPLAYER.left = false;
    MAINPLAYER.right = false;
}

function check_focused() { // stop movement when user tabs out, right clicks, or clicks on different window
    window.addEventListener("contextmenu", stop_movement);

    document.addEventListener("visibilitychange", stop_movement);

    window.onblur = stop_movement;
}

function get_players_playing() { // return number of players playing
    let answer = 0;
    for (let i = 0; i < PLAYERS.length; i++) {
        if (PLAYERS[i].playing) {
            answer++;
        }
    }
    return answer;
}

function enable_controls() {
    window.addEventListener("keydown", check_keys_down);
    window.addEventListener("keyup", check_keys_up);
    window.addEventListener("click", MAINPLAYER.start_swing);
    check_focused();
}

function disable_controls() {
    window.removeEventListener("keydown", check_keys_down);
    window.removeEventListener("keyup", check_keys_up);
    window.removeEventListener("click", MAINPLAYER.start_swing);
    window.removeEventListener("contextmenu", stop_movement);
    document.removeEventListener("visibilitychange", stop_movement);
    window.onblur = () => { };
}

function check_keys_down(e) {
    if (e.code == "KeyW") {
        MAINPLAYER.up = true;
    }
    if (e.code == "KeyS") {
        MAINPLAYER.down = true;
    }
    if (e.code == "KeyA") {
        MAINPLAYER.left = true;
    }
    if (e.code == "KeyD") {
        MAINPLAYER.right = true;
    }
}

function check_keys_up(e) {
    if (e.code == "KeyW") {
        MAINPLAYER.up = false;
    }
    if (e.code == "KeyS") {
        MAINPLAYER.down = false;
    }
    if (e.code == "KeyA") {
        MAINPLAYER.left = false;
    }
    if (e.code == "KeyD") {
        MAINPLAYER.right = false;
    }
}

function kill_player() {
    disable_controls();

    LASTX = MAINPLAYER.worldX;
    LASTY = MAINPLAYER.worldY;

    PLAYING = false;
    MAINPLAYER = undefined;

    death_menu.style.display = "inline-block";
}

function handle_server_disconnect() {
    if (PLAYING) {
        kill_player();
        death_menu.style.display = "none";
        menu.style.display = "inline-block";

        error_msg.style.display = "inline";
        error_msg.innerHTML = "Server closed unexpectedly";
        error_msg.style.color = "red";
    }

    websocket.close(); // close current connection
    PLAYERS = []; // clear players
    clear(); // clear canvas
    websocket.removeEventListener("message", handle_server_data);
    websocket.onerror = () => { };
    websocket.onclose = () => { };
}

function get_mouse_position(e){
    MOUSEX = e.offsetX;
    MOUSEY = e.offsetY;
}

function get_swing_angle(){ // returns the swing angle used for animation
    if(SWINGING == 1){
        SWING_TIMER += 1/FPS; // deltatime
    }

    if(SWING_TIMER >= 0.25){
        SWINGING = 2;
    }

    if(SWINGING == 2){
        SWING_TIMER -= 1/FPS;
    }

    if(SWING_TIMER <= 0){
        SWINGING = 0;
        SWING_TIMER = 0;
        SWING_DELAY_TIMER += 1/FPS;
    }

    // timer/0.25 = i/PI
    return SWING_TIMER*(Math.PI)/0.25;
}

function draw_sword_and_hand(x, y, angle, swing_angle){
    ctx.lineWidth = 15;
    draw_line(x, y, x + 75 * Math.cos(angle + Math.PI/2 - swing_angle), y + 75 * Math.sin(angle + Math.PI/2 - swing_angle), "rgb(100, 100, 100)"); // sword shaft
    for(let i = 14 ; i > 0; i--){
        ctx.lineWidth = i;
        draw_line(x, y, x + (90-i) * Math.cos(angle + Math.PI/2 - swing_angle), y + (90-i) * Math.sin(angle + Math.PI/2 - swing_angle), "rgb(100, 100, 100)"); // sword tip   
    }
    ctx.lineWidth = 10;100
    draw_line(x + 45 * Math.cos(angle + Math.PI/2 + Math.PI/8 - swing_angle), y + 45 * Math.sin(angle + Math.PI/2 + Math.PI/8 - swing_angle), x + 45 * Math.cos(angle + Math.PI/2 - Math.PI/8 - swing_angle), y + 45 * Math.sin(angle + Math.PI/2 - Math.PI/8 - swing_angle), "rgb(101, 67, 33)"); // cross guard of sword

    ctx.lineWidth = 7.5;
    draw_circle(x + 27 * Math.cos(angle + Math.PI/2 - swing_angle), y + 27 * Math.sin(angle + Math.PI/2 - swing_angle), 12, "rgb(150, 150, 150)"); // hand
    ctx.lineWidth = 1;
}