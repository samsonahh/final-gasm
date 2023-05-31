const c = document.getElementById("canvas");
const ctx = c.getContext("2d");

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
        this.screenX = WORLDWIDTH/2;
        this.screenY = WORLDHEIGHT/2;
    }

    display(){
        draw_circle(this.screenX, this.screenY, 30, "red");
    }
}

const MAINPLAYER = new MainPlayer(WORLDWIDTH/2, WORLDHEIGHT/2);

window.addEventListener("DOMContentLoaded", ()=>{
    c.width = window.innerWidth;
    c.height = window.innerHeight;
    console.log("LOADED CANVAS");
})

window.addEventListener("resize", ()=>{
    c.style.width = window.innerWidth + "px";
    c.style.height = window.innerHeight + "px";
})

window.addEventListener("keydown", (e)=>{
    if(e.code == "KeyW"){
        MAINPLAYER.worldY -= 1;
    }
    if(e.code == "KeyS"){
        MAINPLAYER.worldY += 1;
    }
    if(e.code == "KeyA"){
        MAINPLAYER.worldX -= 1;
    }
    if(e.code == "KeyS"){
        MAINPLAYER.worldX += 1;
    }
    console.log(MAINPLAYER.worldX, MAINPLAYER.worldY);
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
    ctx.clearRect(0, 0, WORLDWIDTH, WORLDHEIGHT);
}

function draw_background(){
    clear();

    draw_rect(0, 0, 0 - MAINPLAYER.worldX + MAINPLAYER.screenX, 0 - MAINPLAYER.worldY + MAINPLAYER.screenY, "black");

    // for(let i = 0; i < WORLDWIDTH; i+=20){
    //     for(let j = 0; j < WORLDHEIGHT; j+=20){
    //         draw_line(i, 0, i, WORLDHEIGHT, "black");
    //         draw_line(0, j, WORLDWIDTH, j, "black");
    //     }
    // }
}

function start(){

}

function update(){
    draw_background();
    MAINPLAYER.display();
}

setInterval(update, 1000);

const websocket = new WebSocket("ws://localhost:8001/");

function sendMsg(msg){
    websocket.send(msg);
}

websocket.addEventListener("message", ({data}) => {
    console.log(data);
})