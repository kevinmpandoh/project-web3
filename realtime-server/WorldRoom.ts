import { Room, Client } from "colyseus";
import { Schema, MapSchema, type } from "@colyseus/schema";

export class Player extends Schema {
  @type("string") wallet: string = "";
  @type("string") name: string = "";
  @type("number") level: number = 1;
  @type("string") tier: string = "sprout";
  @type("number") x: number = 0;
  @type("number") y: number = 0;
}

export class WorldState extends Schema {
  @type({ map: Player }) players = new MapSchema<Player>();
}

export class WorldRoom extends Room<WorldState> {
  onCreate(options: any) {
    this.setState(new WorldState());
    
    this.onMessage("move", (client, data) => {
      const player = this.state.players.get(client.sessionId);
      if (player) {
        player.x = data.x;
        player.y = data.y;
      }
    });
  }

  onJoin(client: Client, options: any) {
    const player = new Player();
    player.wallet = options.wallet;
    player.name = options.name;
    player.level = options.level || 1;
    player.tier = options.tier || "sprout";
    player.x = options.x || 0;
    player.y = options.y || 0;
    
    this.state.players.set(client.sessionId, player);
    console.log(`Player joined: ${player.name} (${player.wallet})`);
  }

  onLeave(client: Client, consented: boolean) {
    const player = this.state.players.get(client.sessionId);
    if (player) {
      console.log(`Player left: ${player.name}`);
    }
    this.state.players.delete(client.sessionId);
  }
}
