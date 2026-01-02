"""
Reddit Ops Console - WebSocket Manager
Manages WebSocket connections for real-time job streaming.
"""
import asyncio
import json
from datetime import datetime
from typing import Dict, Set, Optional
from dataclasses import dataclass
from fastapi import WebSocket, WebSocketDisconnect


@dataclass
class ConnectionInfo:
    """WebSocket connection metadata."""
    websocket: WebSocket
    run_id: str
    connected_at: datetime
    last_heartbeat: datetime


class WebSocketManager:
    """
    Manages WebSocket connections for streaming job events.
    
    Features:
    - Room-based connections (one room per run_id)
    - Global notification channel for all clients
    - Heartbeat for connection health
    - Broadcast to all connections in a room
    """
    
    def __init__(self):
        # run_id -> set of WebSocket connections
        self._rooms: Dict[str, Set[WebSocket]] = {}
        # WebSocket -> ConnectionInfo
        self._connections: Dict[WebSocket, ConnectionInfo] = {}
        # Global notification subscribers (connected to /ws/notifications)
        self._global_clients: Set[WebSocket] = set()
        # Lock for thread-safe operations
        self._lock = asyncio.Lock()
    
    async def connect(self, websocket: WebSocket, run_id: str):
        """Accept a new WebSocket connection and add to room."""
        await websocket.accept()
        
        async with self._lock:
            # Add to room
            if run_id not in self._rooms:
                self._rooms[run_id] = set()
            self._rooms[run_id].add(websocket)
            
            # Track connection
            self._connections[websocket] = ConnectionInfo(
                websocket=websocket,
                run_id=run_id,
                connected_at=datetime.now(),
                last_heartbeat=datetime.now(),
            )
    
    async def connect_global(self, websocket: WebSocket):
        """Accept a WebSocket connection for global notifications."""
        await websocket.accept()
        
        async with self._lock:
            self._global_clients.add(websocket)
    
    async def disconnect_global(self, websocket: WebSocket):
        """Remove a global notification WebSocket connection."""
        async with self._lock:
            self._global_clients.discard(websocket)
    
    async def disconnect(self, websocket: WebSocket):
        """Remove a WebSocket connection."""
        async with self._lock:
            if websocket in self._connections:
                conn = self._connections[websocket]
                
                # Remove from room
                if conn.run_id in self._rooms:
                    self._rooms[conn.run_id].discard(websocket)
                    # Clean up empty rooms
                    if not self._rooms[conn.run_id]:
                        del self._rooms[conn.run_id]
                
                # Remove connection tracking
                del self._connections[websocket]
            
            # Also remove from global clients if present
            self._global_clients.discard(websocket)
    
    async def broadcast(self, run_id: str, message: dict):
        """Broadcast a message to all connections in a room."""
        async with self._lock:
            if run_id not in self._rooms:
                return
            
            dead_connections = []
            
            for websocket in self._rooms[run_id]:
                try:
                    await websocket.send_json(message)
                except Exception:
                    dead_connections.append(websocket)
            
            # Clean up dead connections
            for ws in dead_connections:
                await self.disconnect(ws)
    
    async def broadcast_global(self, message: dict):
        """Broadcast a notification to all global subscribers."""
        async with self._lock:
            dead_connections = []
            
            for websocket in self._global_clients:
                try:
                    await websocket.send_json(message)
                except Exception:
                    dead_connections.append(websocket)
            
            # Clean up dead connections
            for ws in dead_connections:
                self._global_clients.discard(ws)
    
    async def send_personal(self, websocket: WebSocket, message: dict):
        """Send a message to a specific connection."""
        try:
            await websocket.send_json(message)
        except Exception:
            await self.disconnect(websocket)
    
    def get_room_connections(self, run_id: str) -> int:
        """Get number of connections in a room."""
        return len(self._rooms.get(run_id, set()))
    
    def get_total_connections(self) -> int:
        """Get total number of active connections."""
        return len(self._connections)
    
    def get_global_connections(self) -> int:
        """Get number of global notification subscribers."""
        return len(self._global_clients)
    
    async def heartbeat(self, websocket: WebSocket):
        """Update heartbeat for a connection."""
        if websocket in self._connections:
            self._connections[websocket].last_heartbeat = datetime.now()
    
    async def cleanup_stale_connections(self, max_age_seconds: int = 300):
        """Remove connections that haven't had a heartbeat in max_age_seconds."""
        async with self._lock:
            now = datetime.now()
            stale = []
            
            for ws, conn in self._connections.items():
                age = (now - conn.last_heartbeat).total_seconds()
                if age > max_age_seconds:
                    stale.append(ws)
            
            for ws in stale:
                try:
                    await ws.close()
                except:
                    pass
                await self.disconnect(ws)


# Global WebSocket manager instance
ws_manager = WebSocketManager()
