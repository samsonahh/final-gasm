import asyncio
import websockets
import json

PLAYERS = []

async def handler(websocket):
    print(websocket.id, "connected")
    id_packet = {
        "id": str(websocket.id)
    }
    PLAYERS.append(id_packet)
    ID_INDEX = len(PLAYERS) - 1
    await websocket.send(json.dumps(id_packet))

    while True:
        try:
            message = await websocket.recv()
            data = json.loads(message)
            if data == {}:
                print(websocket.id, "connected with an error")
                PLAYERS.pop(ID_INDEX)
                break
            PLAYERS[ID_INDEX] = data
            await websocket.send(json.dumps(PLAYERS))
        except websockets.exceptions.ConnectionClosed:
            PLAYERS.pop(ID_INDEX)
            print(websocket.id, "disconnected")
            break

async def main():
    async with websockets.serve(handler, "0.0.0.0", 8001):
        await asyncio.Future()


if __name__ == "__main__":
    asyncio.run(main())