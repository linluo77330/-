import { Room } from './Room.js';

export class RoomManager {
  private rooms = new Map<string, Room>();

  getOrCreate(roomId: string): Room {
    let room = this.rooms.get(roomId);
    if (!room) {
      room = new Room(roomId);
      this.rooms.set(roomId, room);
    }
    return room;
  }

  removeIfEmpty(roomId: string): void {
    const room = this.rooms.get(roomId);
    if (room?.isEmpty()) {
      this.rooms.delete(roomId);
    }
  }
}
