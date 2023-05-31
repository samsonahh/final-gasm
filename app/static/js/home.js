const c = document.getElementById("canvas");
const ctx = c.getContext("2d");

ctx.canvas.width = window.innerWidth;
ctx.canvas.height = window.innerHeight;

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
}

const MAINPLAYER = new MainPlayer(WORLDWIDTH/2, WORLDHEIGHT/2);

window.addEventListener("keydown", (e)=>{
    if(e.code == "KeyW"){
        MAINPLAYER.worldY -= 2;
    }
    if(e.code == "KeyS"){
        MAINPLAYER.worldY += 2;
    }
    if(e.code == "KeyA"){
        MAINPLAYER.worldX -= 2;
    }
    if(e.code == "KeyD"){
        MAINPLAYER.worldX += 2;
    }
    // console.log("SCREEN", MAINPLAYER.screenX, MAINPLAYER.screenY, "WORLD", MAINPLAYER.worldX, MAINPLAYER.worldY);
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
            draw_line(i + sX, sY, i + sX, sY + WORLDHEIGHT, "black");
            draw_line(sX, j + sY, sX + WORLDWIDTH, j + sY, "blacl");
        }
    }
}

function start(){

}

function update(){
    draw_background();
    MAINPLAYER.display();
}

setInterval(update, 1000/60);

const websocket = new WebSocket("ws://localhost:8001/");

function sendMsg(msg){
    websocket.send(msg);
}

websocket.addEventListener("message", ({data}) => {
    console.log(data);
})