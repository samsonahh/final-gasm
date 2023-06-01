const FPS = 60;
const INTERVAL = Math.floor(1000 / FPS); // rounding down since our code will rarely run at the exact interval
let START_TIME = performance.now();
let PREVIOUS_TIME = START_TIME;

let CURRENT_TIME = 0;
let DELTA_TIME = 0;

const WORLDWIDTH = 500;
const WORLDHEIGHT = 500;

var MAINPLAYER;
var NAME;
var ID;
var PLAYING = false;
var PLAYERS = [];

var websocket;

const c = document.getElementById("canvas");
const ctx = c.getContext("2d");

const menu = document.getElementById("menu");
const play_button = document.getElementById("play");
const name_input = document.getElementById("name");
const server_dropdown = document.getElementById("servers");
const error_msg = document.getElementById("error");

setup_websocket("ws://localhost:8001/");
update();

play_button.addEventListener("click", (e)=>{
    if(websocket.readyState == WebSocket.OPEN){
        NAME = name_input.value;
        menu.style.display = "none";
        start();
    }
});

server_dropdown.addEventListener("change", (e)=>{
    if(server_dropdown.value == "localhost"){
        setup_websocket("ws://localhost:8001/");
    }
    if(server_dropdown.value == "droplet"){
        setup_websocket("ws://samsonahh.me:8001/");
    }
});

ctx.canvas.width = window.innerWidth;
ctx.canvas.height = window.innerHeight;

window.addEventListener("resize", ()=>{
    ctx.canvas.width = window.innerWidth;
    ctx.canvas.height = window.innerHeight;
});

class Player{
    worldX;
    worldY;
    screenX;
    screenY;
    name;
    
    constructor(wx, wy, n){
        this.worldX = wx;
        this.worldY = wy;
        this.name = n;
    }
    
    display(){
        if(PLAYING){
            this.screenX = this.worldX + MAINPLAYER.screenX - MAINPLAYER.worldX;
            this.screenY = this.worldY + MAINPLAYER.screenY - MAINPLAYER.worldY;
        }
        else{
            this.screenX = this.worldX + ctx.canvas.width/2 - WORLDWIDTH/2;
            this.screenY = this.worldY + ctx.canvas.height/2 - WORLDHEIGHT/2;
        }
        draw_circle_text(this.screenX, this.screenY, 30, "red", this.name);
    }
}

class MainPlayer extends Player{
    up = false;
    down = false;
    left = false;
    right = false;
    
    constructor(wx, wy, n){
        super(wx, wy, n);
        this.screenX = ctx.canvas.width/2;
        this.screenY = ctx.canvas.height/2;
    }
    
    display(){
        this.screenX = ctx.canvas.width/2;
        this.screenY = ctx.canvas.height/2;
        draw_circle_text(this.screenX, this.screenY, 30, "red", this.name);
    }
    
    handle_movement(){
        if(this.up) this.worldY -= 2;
        if(this.down) this.worldY += 2;
        if(this.left) this.worldX -= 2;
        if(this.right) this.worldX += 2;
    }
}

function sendLocalData(data){
    websocket.send(JSON.stringify(data));
}

function setup_websocket(address){
    if(websocket){
        websocket.close();
        PLAYERS = [];
        clear();
    }
    websocket = new WebSocket(address);

    websocket.onerror = (e) => {
        error_msg.style.display = "inline";
        return;
    }

    error_msg.style.display = "none";

    websocket.addEventListener("message", ({data}) => {
        d = JSON.parse(data);
        if(d.hasOwnProperty("id")){
            console.log("Connection successful");
            ID = d.id;
        }
        PLAYERS = d;
        // console.log(PLAYERS);
    })
}

function start(){
    MAINPLAYER = new MainPlayer(WORLDWIDTH/2, WORLDWIDTH/2, NAME);
    PLAYING = true;
    window.addEventListener("keydown", (e)=>{
        if(e.code == "KeyW"){
            MAINPLAYER.up = true;
        }
        if(e.code == "KeyS"){
            MAINPLAYER.down = true;
        }
        if(e.code == "KeyA"){
            MAINPLAYER.left = true;
        }
        if(e.code == "KeyD"){
            MAINPLAYER.right = true;
        }
    })
    
    window.addEventListener("keyup", (e)=>{
        if(e.code == "KeyW"){
            MAINPLAYER.up = false;
        }
        if(e.code == "KeyS"){
            MAINPLAYER.down = false;
        }
        if(e.code == "KeyA"){
            MAINPLAYER.left = false;
        }
        if(e.code == "KeyD"){
            MAINPLAYER.right = false;
        }
    })
}

function update(timestamp){
    CURRENT_TIME = timestamp;
    DELTA_TIME = CURRENT_TIME - PREVIOUS_TIME;

    if(DELTA_TIME > INTERVAL){ // put all real updates in here (fixes fps)
        draw_background();
        if(PLAYING){
            MAINPLAYER.display();
            MAINPLAYER.handle_movement();
        }
    
        for(let i = 0; i < PLAYERS.length; i++){
            if(PLAYERS[i].id != local_data.id){
                p = new Player(PLAYERS[i].x, PLAYERS[i].y, PLAYERS[i].name);
                p.display();
            }
        }
    
        if(websocket.readyState == WebSocket.OPEN){
            if(PLAYING){
                local_data = {
                    id: ID,
                    name: NAME,
                    x: MAINPLAYER.worldX,
                    y: MAINPLAYER.worldY,
                    playing: PLAYING
                };
            }
            else{
                local_data = {
                    id: ID
                }
            }
            sendLocalData(local_data);
        }
    }
    requestAnimationFrame(update);
}












function draw_line(x0, y0, x1, y1, color){
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    strokeStyle = color;
    ctx.stroke();
}

function draw_rect(x, y, width, height, color){
    ctx.strokeStyle = color;
    ctx.strokeRect(x, y, width, height);
}

function draw_circle(x, y, radius, color){
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, 2 * Math.PI, false);
    ctx.strokeStyle = color;
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.fill();
}

function draw_circle_text(x, y, radius, color, name){
    draw_circle(x, y, radius, color);
    ctx.fillStyle = "black";
    ctx.font = "bold 18px Helvetica";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(name, x, y);
}

function clear(){
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
}

function draw_background(){
    clear();

    if(PLAYING){
        var sX = 0 - MAINPLAYER.worldX + MAINPLAYER.screenX;
        var sY = 0 - MAINPLAYER.worldY + MAINPLAYER.screenY; 
    }
    else{
        var sX = 0 - WORLDWIDTH/2 + ctx.canvas.width/2;
        var sY = 0 - WORLDHEIGHT/2 + ctx.canvas.height/2; 
    }
    draw_rect(sX, sY, WORLDWIDTH, WORLDHEIGHT, "black");

    for(let i = 0; i < WORLDWIDTH; i += 25){
        for(let j = 0; j < WORLDHEIGHT; j += 25){
            draw_line(i + sX, sY, i + sX, sY + WORLDHEIGHT, "gray");
            draw_line(sX, j + sY, sX + WORLDWIDTH, j + sY, "gray");
        }
    }
}