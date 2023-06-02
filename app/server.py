import asyncio
import websockets
import json

PLAYERS = []

async def handler(websocket):
    id_packet = {
        "id": str(websocket.id)
    }
    PLAYERS.append(id_packet)
    print(websocket.id, "connected")
    await websocket.send(json.dumps(id_packet))

    while True:
        try:
            message = await websocket.recv()
            data = json.loads(message)
            if data == {}:
                print(websocket.id, "connected with an error")
                remove_player(id_packet['id'])
                break
            update_players(data)
            await websocket.send(json.dumps(PLAYERS))
        except websockets.exceptions.ConnectionClosed:
            remove_player(id_packet['id'])
            print(websocket.id, "disconnected")
            break

async def main():
    async with websockets.serve(handler, "0.0.0.0", 8001):
        await asyncio.Future()

def update_players(data):
    for i in range(len(PLAYERS)):
        if PLAYERS[i]['id'] == data['id']:
            PLAYERS[i] = data
            break

def remove_player(id):
    for i in range(len(PLAYERS)):
        if PLAYERS[i]['id'] == id:
            PLAYERS.pop(i)
            break

if __name__ == "__main__":
    asyncio.run(main())