"""
Procedural dungeon generator using recursive Binary Space Partitioning.
Returns a JSON structure describing rooms and corridors.
"""
import random
from dataclasses import dataclass
from dataclasses import field


@dataclass
class Rect:
    x: int
    y: int
    w: int
    h: int

    @property
    def cx(self) -> int:
        return self.x + self.w // 2

    @property
    def cy(self) -> int:
        return self.y + self.h // 2

    def to_dict(self) -> dict:
        return {"x": self.x, "y": self.y, "w": self.w, "h": self.h}


@dataclass
class DungeonMap:
    width: int
    height: int
    rooms: list[Rect] = field(default_factory=list)
    corridors: list[Rect] = field(default_factory=list)
    doors: list[dict] = field(default_factory=list)
    grid: list[list[int]] = field(default_factory=list)

    def to_dict(self, seed: int, theme: str) -> dict:
        return {
            "seed": seed,
            "theme": theme,
            "width": self.width,
            "height": self.height,
            "grid_size": 10,  # each cell = 10 feet
            "rooms": [r.to_dict() for r in self.rooms],
            "corridors": [c.to_dict() for c in self.corridors],
            "doors": self.doors,
        }


def generate_dungeon(
    width: int = 50,
    height: int = 40,
    room_count: int = 8,
    seed: int | None = None,
    theme: str = "dungeon",
) -> dict:
    """Generate a dungeon using BSP algorithm."""
    if seed is not None:
        random.seed(seed)
    else:
        seed = random.randint(1, 99999)
        random.seed(seed)

    dungeon = DungeonMap(width=width, height=height)

    # Initialize grid
    dungeon.grid = [[0] * width for _ in range(height)]

    # BSP subdivision
    MIN_ROOM_SIZE = 4
    MAX_LEAF_SIZE = 18

    def split(rect: Rect, depth: int) -> list[Rect]:
        if depth <= 0 or rect.w <= MIN_ROOM_SIZE * 2 or rect.h <= MIN_ROOM_SIZE * 2:
            # Create a room within this leaf
            rw = random.randint(max(MIN_ROOM_SIZE, rect.w // 3), max(MIN_ROOM_SIZE + 1, rect.w - 2))
            rh = random.randint(max(MIN_ROOM_SIZE, rect.h // 3), max(MIN_ROOM_SIZE + 1, rect.h - 2))
            rx = rect.x + random.randint(1, max(1, rect.w - rw - 1))
            ry = rect.y + random.randint(1, max(1, rect.h - rh - 1))
            return [Rect(rx, ry, rw, rh)]

        # Decide split direction
        if rect.w > rect.h and rect.w > MAX_LEAF_SIZE:
            split_h = random.randint(MIN_ROOM_SIZE, rect.w - MIN_ROOM_SIZE)
            left = Rect(rect.x, rect.y, split_h, rect.h)
            right = Rect(rect.x + split_h, rect.y, rect.w - split_h, rect.h)
            return split(left, depth - 1) + split(right, depth - 1)
        elif rect.h > MAX_LEAF_SIZE:
            split_v = random.randint(MIN_ROOM_SIZE, rect.h - MIN_ROOM_SIZE)
            top = Rect(rect.x, rect.y, rect.w, split_v)
            bottom = Rect(rect.x, rect.y + split_v, rect.w, rect.h - split_v)
            return split(top, depth - 1) + split(bottom, depth - 1)
        else:
            # Try horizontal split anyway
            if rect.w > MIN_ROOM_SIZE * 3:
                split_h = random.randint(MIN_ROOM_SIZE, rect.w - MIN_ROOM_SIZE)
                left = Rect(rect.x, rect.y, split_h, rect.h)
                right = Rect(rect.x + split_h, rect.y, rect.w - split_h, rect.h)
                return split(left, depth - 1) + split(right, depth - 1)
            # Try vertical
            if rect.h > MIN_ROOM_SIZE * 3:
                split_v = random.randint(MIN_ROOM_SIZE, rect.h - MIN_ROOM_SIZE)
                top = Rect(rect.x, rect.y, rect.w, split_v)
                bottom = Rect(rect.x, rect.y + split_v, rect.w, rect.h - split_v)
                return split(top, depth - 1) + split(bottom, depth - 1)
            # Can't split — create single room
            return [Rect(rect.x + 1, rect.y + 1, max(MIN_ROOM_SIZE, rect.w - 2), max(MIN_ROOM_SIZE, rect.h - 2))]

    # Split the full dungeon area
    full_rect = Rect(0, 0, width, height)
    depth = max(2, min(6, room_count // 2))
    dungeon.rooms = split(full_rect, depth)

    # Ensure minimum room count
    while len(dungeon.rooms) < room_count:
        r = random.choice(dungeon.rooms)
        if r.w > MIN_ROOM_SIZE * 2 + 2 and r.h > MIN_ROOM_SIZE * 2 + 2:
            dungeon.rooms.remove(r)
            mid_x = r.x + r.w // 2
            r.y + r.h // 2
            dungeon.rooms.append(Rect(r.x + 1, r.y + 1, mid_x - r.x - 2, r.h - 2))
            dungeon.rooms.append(Rect(mid_x + 1, r.y + 1, r.x + r.w - mid_x - 2, r.h - 2))

    # Connect rooms with corridors (minimum spanning tree by center distance)
    connected: set[int] = {0}
    unconnected = set(range(1, len(dungeon.rooms)))

    while unconnected:
        best_dist = float("inf")
        best_a = best_b = -1

        for a in connected:
            ra = dungeon.rooms[a]
            for b in unconnected:
                rb = dungeon.rooms[b]
                dist = abs(ra.cx - rb.cx) + abs(ra.cy - rb.cy)
                if dist < best_dist:
                    best_dist = dist
                    best_a, best_b = a, b

        if best_a >= 0 and best_b >= 0:
            ra = dungeon.rooms[best_a]
            rb = dungeon.rooms[best_b]

            # Create L-shaped corridor
            if random.random() < 0.5:
                # Horizontal then vertical
                dungeon.corridors.append(Rect(min(ra.cx, rb.cx), ra.cy, abs(ra.cx - rb.cx) + 1, 1))
                dungeon.corridors.append(Rect(rb.cx, min(ra.cy, rb.cy), 1, abs(ra.cy - rb.cy) + 1))
            else:
                # Vertical then horizontal
                dungeon.corridors.append(Rect(ra.cx, min(ra.cy, rb.cy), 1, abs(ra.cy - rb.cy) + 1))
                dungeon.corridors.append(Rect(min(ra.cx, rb.cx), rb.cy, abs(ra.cx - rb.cx) + 1, 1))

            dungeon.doors.append({"x": ra.cx, "y": ra.cy})
            dungeon.doors.append({"x": rb.cx, "y": rb.cy})

            connected.add(best_b)
            unconnected.remove(best_b)

    # Fill grid: 1=room, 2=corridor
    for room in dungeon.rooms:
        for y in range(room.y, room.y + room.h):
            for x in range(room.x, room.x + room.w):
                if 0 <= y < height and 0 <= x < width:
                    dungeon.grid[y][x] = 1

    for corridor in dungeon.corridors:
        for y in range(corridor.y, corridor.y + corridor.h):
            for x in range(corridor.x, corridor.x + corridor.w):
                if 0 <= y < height and 0 <= x < width and dungeon.grid[y][x] == 0:
                    dungeon.grid[y][x] = 2

    return dungeon.to_dict(seed, theme)
