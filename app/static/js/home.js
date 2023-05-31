const c = document.getElementById("canvas");
const ctx = c.getContext("2d");

const websocket = new WebSocket("ws://localhost:8001/");

ctx.canvas.width = window.innerWidth;
ctx.canvas.height = window.innerHeight;

window.addEventListener("DOMContentLoaded", ()=>{
    update();
})

window.addEventListener("resize", ()=>{
    ctx.canvas.width = window.innerWidth;
    ctx.canvas.height = window.innerHeight;
    // console.log("CANVAS RESIZED", ctx.canvas.width, ctx.canvas.height);
})

const WORLDWIDTH = 500;
const WORLDHEIGHT = 500;

class Player{
    worldX;
    worldY;
    screenX;
    screenY;

    constructor(wx, wy){
        this.worldX = wx;
        this.worldY = wy;
    }

    display(){
        this.screenX = this.worldX + MAINPLAYER.screenX - MAINPLAYER.worldX;
        this.screenY = this.worldY + MAINPLAYER.screenY - MAINPLAYER.worldY;
        draw_circle(this.screenX, this.screenY, 30, "red");
    }
}

class MainPlayer extends Player{
    up = false;
    down = false;
    left = false;
    right = false;

    constructor(wx, wy){
        super(wx, wy);
        this.screenX = ctx.canvas.width/2;
        this.screenY = ctx.canvas.height/2;
    }

    display(){
        this.screenX = ctx.canvas.width/2;
        this.screenY = ctx.canvas.height/2;
        draw_circle(this.screenX, this.screenY, 30, "red");
    }

    handle_movement(){
        if(this.up) this.worldY -= 2;
        if(this.down) this.worldY += 2;
        if(this.left) this.worldX -= 2;
        if(this.right) this.worldX += 2;
    }
}

const MAINPLAYER = new MainPlayer(WORLDWIDTH/2, WORLDHEIGHT/2);
var PLAYERS = [];

var localData = {
    "id": 0,
    name: "MAIN",
    x: MAINPLAYER.worldX,
    y: MAINPLAYER.worldY
}

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
    // console.log("SCREEN", MAINPLAYER.screenX, MAINPLAYER.screenY, "WORLD", MAINPLAYER.worldX, MAINPLAYER.worldY);
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
    // console.log("WORLD", MAINPLAYER.worldX, MAINPLAYER.worldY);
})

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

function clear(){
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
}

function draw_background(){
    clear();

    var sX = 0 - MAINPLAYER.worldX + MAINPLAYER.screenX;
    var sY = 0 - MAINPLAYER.worldY + MAINPLAYER.screenY; 
    draw_rect(sX, sY, WORLDWIDTH, WORLDHEIGHT, "black");

    for(let i = 0; i < WORLDWIDTH; i += 25){
        for(let j = 0; j < WORLDHEIGHT; j += 25){
            draw_line(i + sX, sY, i + sX, sY + WORLDHEIGHT, "gray");
            draw_line(sX, j + sY, sX + WORLDWIDTH, j + sY, "gray");
        }
    }
}

function sendLocalData(data){
    websocket.send(JSON.stringify(data));
}

websocket.addEventListener("message", ({data}) => {
    d = JSON.parse(data)
    if(d.hasOwnProperty("id")){
        localData.id = d.id;
    }
    PLAYERS = d;
    console.log(PLAYERS);
})

function start(){

}

function update(){
    requestAnimationFrame(update);

    draw_background();
    MAINPLAYER.display();
    MAINPLAYER.handle_movement();

    for(let i = 0; i < PLAYERS.length; i++){
        if(PLAYERS[i].id != localData.id){
            p = new Player(PLAYERS[i].x, PLAYERS[i].y);
            p.display();
        }
    }

    localData.x = MAINPLAYER.worldX;
    localData.y = MAINPLAYER.worldY;

    if(websocket.readyState == WebSocket.OPEN){
        sendLocalData(localData);
    }
}