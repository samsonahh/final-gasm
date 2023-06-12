const FPS = 60; // Set fixed FPS (ppl with 144 hz monitors would move faster vs ppl on 60 hz monitors)
const INTERVAL = 1000 / FPS; // Rate at which canvas is updated in ms

const WORLDWIDTH = 750; // How wide our map is
const WORLDHEIGHT = 750; // How tall our map is
const PLAYER_CAP = 5;

let MAINPLAYER; // Will store our MainPlayer class. ONLY refers to the local player, not others.
let NAME; // Name of our main player
let ID; // ID of our main player (obtained by recieving a unique id upon initial connect)
let LAST_HIT_ID; // ID of the last player to hit the main player (defaults to the main player's id)
let SCORE; // the score that the main player has achieved
let PLAYING = false; // Is our player on the menu/death or playing?
let PLAYERS = []; // Stores all players that the server gives back
let HIT_CHECKER = {}; // Stores whether each player has been hit before (makes sure that it doesn't hit a player more than once). {id: true/false, ...} format 
let ANGLE = 0; // Stores local player's rotation
let MAX_SPEED = 2; // Speed of player

//FOR SWINGING
let SWINGING = 0; // 0 - not swinging, 1 - swinging, 2 - unswinging
let SWING_TIMER = 0; // used to animate swinging
let SWING_DELAY = 1; // set how fast player can swing
let SWING_DELAY_TIMER = 0;

var LASTX = WORLDWIDTH / 2; // Camera will leave off at this x position when player dies
var LASTY = WORLDHEIGHT / 2; // Camera will leave off at this y position when player dies

var MOUSEX; // will store mouse pos on the screen
var MOUSEY;

//MOBILE
var GOTOX; // x pos to move towards
var GOTOY; // y pos to move towards
let MOVING; // did the player reach pressed spot?

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
document.getElementById("servers")[0].setAttribute('selected', 'selected');
const error_msg = document.getElementById("error");
const player_list = document.getElementById("player_list");
const death_list = document.getElementById("death_list");
const server_text = document.getElementById("server_text");
const death_menu = document.getElementById("death");
const killing_player = document.getElementById("killing_player");
const scoring = document.getElementById("scoring");
const play_death_button = document.getElementById("play_death");
const menu_death_button = document.getElementById("menu_death");

setup_websocket("ws://samsonahh.me:8001/"); // default server to connect to upon loading page

play_button.addEventListener("click", (e) => { // handles when player clicks play on menu
    if (websocket.readyState == WebSocket.OPEN) { // attempts to join if connected to server
        if (name_input.value) {
            NAME = name_input.value;
            if(name_input.value.length > 15){ // limit name length
                NAME = name_input.value.substring(0, 15);
            }
        }
        else {
            NAME = "unnamed";
        }

        if (get_players_playing() >= PLAYER_CAP) { // show lobby full msg if full
            error_msg.style.display = "inline";
            error_msg.innerHTML = "Lobby is full";
            error_msg.style.color = "red";
        }
        else { // otherwise join the game
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
        if (get_players_playing() >= PLAYER_CAP) { // if full
            menu_death_button.dispatchEvent(new Event("click"));
            error_msg.style.display = "inline";
            error_msg.innerHTML = "Lobby is full";
            error_msg.style.color = "red";
        }
        else { // if not then join
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

        draw_sword_and_hand(this.screenX, this.screenY, angle, swing_angle); // sword and hand

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

    velocity_x = 0;
    velocity_y = 0;

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
        // draw_line(this.screenX, this.screenY, this.screenX + 90 * Math.cos(ANGLE), this.screenY + 90 * Math.sin(ANGLE), "black");
        // draw_circle(this.screenX + 90 * Math.cos(ANGLE), this.screenY + 90 * Math.sin(ANGLE), 5, "black");

        draw_sword_and_hand(this.screenX, this.screenY, ANGLE, swing_angle); // draw sword and hand

        ctx.lineWidth = 7.5;
        draw_circle_text(this.screenX, this.screenY, 30, "cyan", this.name); // the player's body
        ctx.lineWidth = 1;  

        draw_circle(this.screenX + 29 * Math.cos(ANGLE + Math.PI/6), this.screenY + 29 * Math.sin(ANGLE + Math.PI/6), 6, "black"); // right eye
        draw_circle(this.screenX + 29 * Math.cos(ANGLE - Math.PI/6), this.screenY + 29 * Math.sin(ANGLE - Math.PI/6), 6, "black"); // left eye
    }

    handle_movement() {
        let accleration_x = 0;
        let accleration_y = 0;

        //diagonal max speed
        let MAX_SPEED_D = MAX_SPEED/1.414;
        let diagonal = false;

        //pressing wasd keys causes accleration if not at max speed
        
        //detect diagonal movement
        if((this.up && this.left) || (this.up && this.right) || (this.down && this.left) || (this.down && this.right) || (this.down && this.right) || (this.up && this.right) || (this.down && this.left) || (this.up && this.left)){
            diagonal = true;
        }

        //speed limit for vertical and horzontal vectors for diagonal movement
        if(diagonal == true){
            if (((this.up && this.left) || (this.up && this.right)) && this.velocity_y > -MAX_SPEED_D){
                accleration_y = -0.3; 
                //console.log("up");
            }
            if (((this.down && this.left) || (this.down && this.right)) && this.velocity_y < MAX_SPEED_D){
                accleration_y = 0.3; 
                //console.log("down");
            }
            if (((this.down && this.right) || (this.up && this.right)) && this.velocity_x < MAX_SPEED_D){
                accleration_x = 0.3; 
                //console.log("right");
            }
            if (((this.down && this.left) || (this.up && this.left)) && this.velocity_x > -MAX_SPEED_D){
                accleration_x = -0.3; 
                //console.log("left");
            }
        }

        //speed limit for non-diagonal movement
        if (this.up && this.velocity_y > -MAX_SPEED && diagonal == false) accleration_y = -0.3;
        if (this.down && this.velocity_y < MAX_SPEED && diagonal == false) accleration_y = 0.3;
        if (this.left && this.velocity_x > -MAX_SPEED && diagonal == false) accleration_x = -0.3;
        if (this.right && this.velocity_x < MAX_SPEED && diagonal == false) accleration_x = 0.3;

        //Check current player speed (for debugging purposes)
        //let m = Math.sqrt(this.velocity_x * this.velocity_x + this.velocity_y * this.velocity_y);
        //console.log(m);
        

        if(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) && MOVING){ // for mobile
            if(GOTOX - this.worldX > 0.5 && this.velocity_x < MAX_SPEED) accleration_x = 0.3;
            if(GOTOX - this.worldX < -0.5 && this.velocity_x > -MAX_SPEED) accleration_x = -0.3;
            if(GOTOY - this.worldY > 0.5 && this.velocity_y < MAX_SPEED) accleration_y = 0.3;
            if(GOTOY - this.worldY < -0.5 && this.velocity_y > -MAX_SPEED) accleration_y = -0.3;
            let dist = distance(GOTOX, GOTOY, this.worldX, this.worldY);
            if(dist < 1){
                MOVING = false;
            }
        }

        //add acceleration to velocity
        this.velocity_y += accleration_y;
        this.velocity_x += accleration_x;

        //friction on y axis
        if(Math.abs(this.velocity_y)<0.1) this.velocity_y = 0;
        if (this.velocity_y>0) this.velocity_y += -0.1;
        if (this.velocity_y<0) this.velocity_y += 0.1;
        
        //friction on x axis
        if(Math.abs(this.velocity_x)<0.1) this.velocity_x = 0;
        if (this.velocity_x>0) this.velocity_x += -0.1;
        if (this.velocity_x<0) this.velocity_x += 0.1;

        //apply the velocities to the position
        this.worldX += this.velocity_x;
        this.worldY += this.velocity_y;

        this.check_bounds(); // check if player is outside
    }

    check_bounds() { // handles if player is knocked outside
        if (this.worldY > WORLDHEIGHT + 30 || this.worldY < -30 || this.worldX > WORLDWIDTH + 30 || this.worldX < -30) {
            kill_main_player();
        }
    }

    handle_collision(other) {
        // for regular body collision
        let d = distance(other.x, other.y, this.worldX, this.worldY);
        let vector = {
            x: (this.worldX - other.x) / d,
            y: (this.worldY - other.y) / d
        };
        if (d < 60 && d > 0) {
            this.worldX = other.x + vector.x * 60;
            this.worldY = other.y + vector.y * 60;
        }

        // swing
        let facing_vector = { // vector where other is facing
            x: Math.cos(ANGLE),
            y: Math.sin(ANGLE)
        };
        let between_vector = { // vector from main to other
            x: other.x - this.worldX,
            y: other.y - this.worldY
        };
        
        // let sX = other.x + this.screenX - this.worldX;
        // let sY = other.y + this.screenY - this.worldY;

        let DOT = vector.x;
        let left_tangent_angle = Math.asin(30/d) + Math.acos(DOT);
        let right_tangent_angle = -Math.asin(30/d) + Math.acos(DOT);
        if(other.y > this.worldY){
            left_tangent_angle = Math.asin(30/d) - Math.acos(DOT);
            right_tangent_angle = -Math.asin(30/d) - Math.acos(DOT);
        }

        // draw_line(this.screenX, this.screenY, sX, sY, "black");
        // draw_line(this.screenX, this.screenY, this.screenX + 90 * facing_vector.x, this.screenY + 90 * facing_vector.y , "black");
        // draw_line(this.screenX, this.screenY, this.screenX - 90 * Math.cos(right_tangent_angle), this.screenY - 90 * Math.sin(right_tangent_angle) , "black");
        // draw_line(this.screenX, this.screenY, this.screenX - 90 * Math.cos(left_tangent_angle), this.screenY - 90 * Math.sin(left_tangent_angle) , "black");
        
        let dot = between_vector.x * facing_vector.x + between_vector.y * facing_vector.y;
        let right_dot = -Math.cos(right_tangent_angle) * facing_vector.x - Math.sin(right_tangent_angle) * facing_vector.y;
        let left_dot = -Math.cos(left_tangent_angle) * facing_vector.x - Math.sin(left_tangent_angle) * facing_vector.y;

        let facing_up = facing_vector.y < 0;
        let below_other = other.y < this.worldY;
        let below_right = other.x < this.worldX;

        if(facing_up){
            if(below_other && below_right) dot = left_dot;
            if(below_other && !below_right) dot = right_dot;
            if(!below_other && below_right) dot = left_dot;
            if(!below_other && !below_right) dot = right_dot;
        }
        if(!facing_up){
            if(below_other && below_right) dot = right_dot;
            if(below_other && !below_right) dot = left_dot;
            if(!below_other && below_right) dot = right_dot;
            if(!below_other && !below_right) dot = left_dot;
        }

        if ((SWINGING == 1 || SWINGING == 2) && d < 90 + 30 && dot >= 0){ // if main player is swinging close enough and at the right direction to the other player
            if(HIT_CHECKER[other.id] == false){ // ensures that player doesnt get hit more than once
                console.log(NAME + " hit " + other.name);
                other.LAST_HIT_ID = ID;
                other.LAST_HIT_NAME = NAME;
                hit_player_by_id(other.id, normalize_vector(facing_vector));
                HIT_CHECKER[other.id] = true; // prevents second hit
            }
        }
    }

    start_swing(e){
        if(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)){ // for mobile
            GOTOX = e.clientX - MAINPLAYER.screenX + MAINPLAYER.worldX;
            GOTOY = e.clientY - MAINPLAYER.screenY + MAINPLAYER.worldY;
            MOVING = true;
        }
        if(SWING_DELAY_TIMER > SWING_DELAY && SWINGING == 0){ // if you are off swing cooldown and not already swinging
            SWINGING = 1;
            SWING_TIMER = 0;
            SWING_DELAY_TIMER = 0;

            // allow all other players to be hit by you
            HIT_CHECKER = {};
            for(let i = 0; i < PLAYERS.length; i++){
                HIT_CHECKER[PLAYERS[i].id] = false;
            }
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
    if (d.hasOwnProperty("id") && Object.keys(d).length == 1) { // when server tells you your id upon connect
        ID = d.id;
        show_server_connected_msg(true);
    }

    if(d.hasOwnProperty('victim')){ // when serevr tells you that someone was hit
        if(d.victim == ID && PLAYING){ // when server tells you that you were hit
            let killer = PLAYERS.find(player => player.id == d.killer);
            LAST_HIT_ID = d.killer;
            add_force_to_main_player(d.direction);
        }
        return;
    }

    if(d.hasOwnProperty('death')){ // when server tells you that someone dies
        update_killfeed(d);
        return;
    }
    PLAYERS = d; // updates local PLAYERS list with server's players list
    server_text.innerText = "Server (" + get_players_playing() + "/" + PLAYER_CAP + "):"
}

function start() { // called once when Play is pressed
    MAINPLAYER = new MainPlayer(Math.random() * (WORLDWIDTH - 30) + 30, Math.random() * (WORLDHEIGHT - 30) + 30, NAME); // spawn random location
    PLAYING = true;
    SWING_DELAY_TIMER = 0;
    LAST_HIT_ID = ID;
    SCORE = 0;
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
        MAINPLAYER.display(get_swing_angle());
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
                last_hit_id: LAST_HIT_ID,
                score: SCORE,
                angle: ANGLE,
                swinging: SWINGING == 1 || SWINGING == 2,
                swing_angle: get_swing_angle()
            };
        }
        else {
            local_data = {
                id: ID,
                name: NAME,
                score: SCORE
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

    for (let i = 0; i < WORLDWIDTH; i += 50) {
        for (let j = 0; j < WORLDHEIGHT; j += 50) {
            draw_line(i + sX, sY, i + sX, sY + WORLDHEIGHT, "gray");
            draw_line(sX, j + sY, sX + WORLDWIDTH, j + sY, "gray");
        }
    }
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

function update_killfeed(death_packet) { // updates the killfeed
    let killer = PLAYERS.find(player => player.id == death_packet.death.killer);
    let victim = PLAYERS.find(player => player.id == death_packet.death.victim);
    const feed = death_list.appendChild(document.createElement('div'));
    if (death_packet.death.killer == death_packet.death.victim) {
        feed.innerHTML = victim.name + " committed suicide";
    } else {
        feed.innerHTML =  victim.name + " was eliminated by " + killer.name;
    }
    if (ID == killer.id) {
        SCORE += 1;
    }
}

function update_player_list() { // updates the leaderboard
    clear_player_list();
    let playing_players = sort_playing_players();
    for (let i = 0; i < playing_players.length; i++) {
        const listing = player_list.appendChild(document.createElement('div'));
        listing.innerHTML = (i+1) + ": " + playing_players[i].name + " -- " + playing_players[i].score;
        if (playing_players[i].id == ID) {
            listing.style.fontWeight = "bold";
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

function sort_playing_players() {
    let playing_players = [];
    for (let i = 0; i < PLAYERS.length; i++) {
        if (PLAYERS[i].playing) {
            playing_players.push(PLAYERS[i]);
        }
    }
    for (let j = 0; j < playing_players.length; j++) {
        for (let i = 0; i < playing_players.length; i++) {
            if ((i != (playing_players.length-1)) && (playing_players[i+1].score > playing_players[i].score)) {
                let temp = playing_players[i];
                playing_players[i] = playing_players[i+1];
                playing_players[i+1] = temp;
            }
        }
    }
    return playing_players;
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

function kill_main_player() { // kills main player and sends death packet to server
    let data = {
        death: {
            victim: ID, // main player is victim
            killer: LAST_HIT_ID, // whoever the tracked killer is
        }
    };
    send_local_data(data);

    disable_controls();
    
    clear_death_menu();

    let killer = PLAYERS.find(player => player.id == LAST_HIT_ID);
    const murderer = killing_player.appendChild(document.createElement('div'));
    const scored = scoring.appendChild(document.createElement('div'));
    if (LAST_HIT_ID == ID) {
        murderer.innerHTML = killer.name + " (that's you!)";
    } else {
        murderer.innerHTML = killer.name;
    }
    scored.innerHTML = "SCORE: " + SCORE;

    LASTX = MAINPLAYER.worldX;
    LASTY = MAINPLAYER.worldY;

    PLAYING = false;
    MAINPLAYER = undefined;

    death_menu.style.display = "inline-block";
}

function clear_death_menu() {
    children = []
    for (let i = 0; i < killing_player.childNodes.length; i++) {
        children[i] = killing_player.childNodes[i];
    }
    for (let i = 0; i < children.length; i++) {
        children[i].remove();
    }
    children2 = []
    for (let i = 0; i < scoring.childNodes.length; i++) {
        children2[i] = scoring.childNodes[i];
    }
    for (let i = 0; i < children2.length; i++) {
        children2[i].remove();
    }
}

function handle_server_disconnect() {
    if (PLAYING) {
        kill_main_player();
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

function hit_player_by_id(victim_id, dir){
    let data = {
        killer: ID,
        victim: victim_id,
        direction: dir
    };
    send_local_data(data);
}

function add_force_to_main_player(dir){
    MAINPLAYER.velocity_x+= dir.x*12.5;
    MAINPLAYER.velocity_y+= dir.y*12.5;
}

function normalize_vector(vector){
    let mag = (Math.sqrt(vector.x * vector.x + vector.y * vector.y));
    return {
        x: vector.x/mag,
        y: vector.y/mag
    };
}