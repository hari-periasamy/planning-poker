import express from 'express';
import http from 'http';
import { Server } from 'socket.io';

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static('public'));

const roomLinks = {};
const rooms = {};

export default {
  fetch(request) {
    const base = "https://example.com";
    const statusCode = 301;

    const source = new URL(request.url);
    const destination = new URL(source.pathname, base);
    return Response.redirect(destination.toString(), statusCode);
  },
};

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    socket.on('joinRoom', ({ room, username }) => {
        socket.join(room);

        if (!rooms[room]) rooms[room] = {};
        rooms[room][socket.id] = { username, vote: null };

        // Emit updated users list
        io.to(room).emit('updateUsers', rooms[room]);

        // Send current link (only to this socket)
        if (roomLinks[room]) {
            socket.emit('linkUpdate', roomLinks[room]);
        }
    });

    socket.on('submitVote', ({ room, vote }) => {
        if (rooms[room] && rooms[room][socket.id]) {
            rooms[room][socket.id].vote = vote;
            io.to(room).emit('updateUsers', rooms[room]);
        }
    });

    socket.on('revealVotes', (room) => {
        io.to(room).emit('revealVotes');
    });

    socket.on('resetVotes', (room) => {
        if (rooms[room]) {
            for (const userId in rooms[room]) {
                rooms[room][userId].vote = null;
            }
            io.to(room).emit('updateUsers', rooms[room]);
        }

        // Clear link and notify room
        roomLinks[room] = '';
        io.to(room).emit('linkUpdate', '');
        io.to(room).emit('resetVotes');
    });

    socket.on('linkUpdate', ({ room, link }) => {
        roomLinks[room] = link;
        io.to(room).emit('linkUpdate', link);
    });

    socket.on('disconnect', () => {
        for (const room in rooms) {
            if (rooms[room][socket.id]) {
                delete rooms[room][socket.id];
                io.to(room).emit('updateUsers', rooms[room]);
            }
        }
    });
});

const PORT = 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
