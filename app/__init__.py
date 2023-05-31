import asyncio
import websockets
import json

players = []

async def handler(websocket):
    id_packet = {
        "id": str(websocket.id)
    }
    players.append(id_packet)
    await websocket.send(json.dumps(id_packet))

    async for message in websocket:
        data = json.loads(message)
        update_players(players, data)
        await websocket.send(json.dumps(players))

    await websocket.wait_closed()
    pop_player(players, id_packet["id"])

async def main():
    async with websockets.serve(handler, "0.0.0.0", 8001):
        await asyncio.Future()


def update_players(players, data):
    for i in range(len(players)):
        if players[i]["id"] == data["id"]:
            players[i] = data

def pop_player(players, id):
    for i in range(len(players)):
        if players[i]["id"] == id:
            print(players[i]["name"], "left")
            players.pop(i)
            break
    

if __name__ == "__main__":
    asyncio.run(main())