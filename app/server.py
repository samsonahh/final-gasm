import asyncio
import websockets
import json

PLAYERS = []
CLIENTS = set()

async def handler(websocket): # all connection is handled here
    CLIENTS.add(websocket) # adds current connection to clients list
    id_packet = { # store unique id as a single dict
        "id": str(websocket.id)
    }
    PLAYERS.append(id_packet) # add the newly connected player to our player list
    print(websocket.id, "connected")
    await websocket.send(json.dumps(id_packet)) # let the new player know what their unique id is

    while True: # while the player is connected
        try: # attempt to communicate with client
            message = await websocket.recv() # grab the client's player position (string)
            data = json.loads(message) # turn the string into a dictionary

            if data == {} or (type(data) is not dict): # if the client never received their id
                print(websocket.id, "connected with an error")
                remove_player(id_packet['id']) 
                CLIENTS.remove(websocket)
                break # closes the connection with the client

            if 'killer' in data.keys(): # if client sends a hit packet
                # print(data['killer'], "hit", data['victim'])
                broadcast(json.dumps(data))
                continue

            if 'death' in data.keys(): # if client sends a death packet
                print(data['death']['killer'], "killed", data['death']['victim'])
                broadcast(json.dumps(data))
                continue

            if 'id' in data.keys(): # if regular data packet
                update_players(data) # updates player data
                await websocket.send(json.dumps(PLAYERS)) # send all players' data back to client
                continue
            
            # if not valid packet then kick player (budget anticheat)
            print("Kicked", id_packet['id'], "for invalid packet")
            remove_player(id_packet['id'])
            CLIENTS.remove(websocket)
            break


        except websockets.exceptions.ConnectionClosed: # if client disconnects or communication fails with client
            remove_player(id_packet['id'])
            print(websocket.id, "disconnected")
            CLIENTS.remove(websocket)
            break # closes the connection with the client

async def send(websocket, message):
    try:
        await websocket.send(message)
    except websockets.ConnectionClosed:
        pass

def broadcast(message):
    for websocket in CLIENTS:
        asyncio.create_task(send(websocket, message))

async def main(): # initializes the server (starts once when executing this file)
    async with websockets.serve(handler, "0.0.0.0", 8001): # "0.0.0.0" refers to the machine the file is running on and 8001 is the port
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
    print("Server started: Waiting for connections")
    asyncio.run(main())