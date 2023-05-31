function create_grid(canvas){
    console.log("CANVAS");
}

window.addEventListener("DOMContentLoaded", ()=>{
    const c = document.getElementById("canvas");
    create_grid(c);
})

const websocket = new WebSocket("ws://localhost:8001/");

function sendMsg(msg, websocket){
    websocket.send(msg);
}