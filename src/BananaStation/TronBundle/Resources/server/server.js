/* =================================
 Initialisation des variables NodeJS
 =================================== */

var io = require('socket.io')(process.env.PORT || 3000);

/* =================================
 Initialisation des variables de jeu
 =================================== */

var map = {'width': 500, 'height': 500};
var collisionMap;
var players = [];
var vitesse = 4;
var playerleft = 0;
var start = false;
var cooldown = true;
var colors = [
    {'color': '#438087', 'taken': 0, 'x': 50, 'y': 250, 'dx': 0, 'dy': 1, 'img': 'public/img/tron/bcar.png'},
    {'color': '#74952B', 'taken': 0, 'x': 450, 'y': 250, 'dx': 0, 'dy': -1, 'img': 'public/img/tron/gcar.png'},
    {'color': '#8F3B36', 'taken': 0, 'x': 250, 'y': 50, 'dx': -1, 'dy': 0, 'img': 'public/img/tron/rcar.png'},
    {'color': '#932C91', 'taken': 0, 'x': 250, 'y': 450, 'dx': 1, 'dy': 0, 'img': 'public/img/tron/pcar.png'}];

/* ==========================
 Communication avec le client
 ============================ */

io.sockets.on('connection', function (socket) {

    var trailid = 1;
    var me = {
        'dx': 0,
        'dy': 0,
        'destroy': false
    };

    socket.on('login', function (name) {
        socket.emit('init', {'map': map});
        me.name = name;
        for (var k in players) {
            if (players.hasOwnProperty(k)) {
                socket.emit('newplayer', players[k]);
            }
        }
        io.sockets.emit('chat', {'player': name, 'message': 'vient de se connecter !'});
    });

    socket.on('ready', function () {
        if (!players.hasOwnProperty(me.id) && !start) {
            for (var k in colors) {
                if (colors.hasOwnProperty(k)) {
                    if (colors[k].taken == 0) {
                        colors[k].taken = 1;
                        me.color = colors[k].color;
                        me.img = colors[k].img;
                        me.x = colors[k].x;
                        me.y = colors[k].y;
                        me.dx = colors[k].dx;
                        me.dy = colors[k].dy;
                        me.destroy = false;
                        me.trails = [{'id': 1, 'x': colors[k].x, 'y': colors[k].y}];
                        me.id = players.push(me) - 1;
                        playerleft++;
                        io.sockets.emit('newplayer', me);
                        break;
                    }
                }
            }
        }
    });

    socket.on('move', function (move) {
        if (players.hasOwnProperty(me.id) && start) {
            if (me.dx == 0 && me.dy == 0) {
                me.dx = move.dx;
                me.dy = move.dy;
            }
            else if (move.dx != me.dx * -1 && move.dy != me.dy * -1) {
                me.dx = move.dx;
                me.dy = move.dy;
                me.trails.push({'id': trailid++, 'x': me.x, 'y': me.y});
            }
        }
    });

    socket.on('chat', function (message) {
        io.sockets.emit('chat', {'player': me.name, 'message': message});
    });

    socket.on('ping', function () {
        socket.emit('pong');
    });

    socket.on('disconnect', function () {
        if (typeof me.destroy !== 'undefined' && me.destroy === false) {
            me.destroy = true;
            playerleft--;
            for (var c in colors) {
                if (colors.hasOwnProperty(c)) {
                    if (colors[c].color == me.color) {
                        colors[c].taken = 0;
                    }
                }
            }
            io.sockets.emit('destroy', me.id);
        }
        if (typeof me.name !== 'undefined') {
            io.sockets.emit('chat', {'player': me.name, 'message': 'vient de se déconnecter !'});
        }
    });
});

/* ========================================
 Cycle de vie de la partie et boucle de jeu
 ========================================== */

var timer;
var waiting;
var timeout = 0;
timer = setInterval(function () {
    if (start) {
        if (playerleft <= 1 && !cooldown) {
            cooldown = true;
            io.sockets.emit('status', getWinner() + ' remporte la partie !');
            waiting = setTimeout(function () {
                reset();
                clearTimeout(waiting);
            }, 3000);
        } else {
            colliding();
            moving();
        }
    } else {
        if (playerleft > 1 && cooldown) {
            cooldown = false;
            io.sockets.emit('status', 'La partie démarre dans 5 secondes !');
            timeout = setTimeout(function () {
                start = true;
                io.sockets.emit('status', 'La partie démarre !');
                clearTimeout(timeout);
                timeout = 0;
            }, 5000);
        }
    }
}, 33);

function reset() {
    playerleft = 0;
    start = false;
    players = [];

    for (var c in colors) {
        if (colors.hasOwnProperty(c)) {
            colors[c].taken = 0;
        }
    }

    collisionMap = new Array(map.width);
    for (var i = 0; i < map.width; i++) {
        collisionMap[i] = new Array(map.height);
        for (var j = 0; j < map.height; j++) {
            collisionMap[i][j] = -1;
        }
    }
    io.sockets.emit('reset');
}

function getWinner() {
    for (var k in players) {
        if (players.hasOwnProperty(k)) {
            if (!players[k].destroy) {
                return players[k].name;
            }
        }
    }
}

function moving() {
    for (var k in players) {
        if (players.hasOwnProperty(k)) {
            if (!players[k].destroy) {
                var x1 = players[k].x;
                var y1 = players[k].y;
                var dx = players[k].dx;
                var dy = players[k].dy;
                players[k].x += players[k].dx * vitesse;
                players[k].y += players[k].dy * vitesse;
                io.sockets.emit('move', players[k]);
                var x2 = players[k].x;
                var y2 = players[k].y;
                while (x2 != x1 || y2 != y1) {
                    collisionMap[x1][y1] = players[k].id;
                    x1 += dx;
                    y1 += dy;
                }
            }
        }
    }
}

function colliding() {
    for (var k in players) {
        if (players.hasOwnProperty(k)) {
            if (!players[k].destroy) {
                var x1 = players[k].x;
                var y1 = players[k].y;
                var x2 = players[k].x + players[k].dx * vitesse;
                var y2 = players[k].y + players[k].dy * vitesse;
                var dx = players[k].dx;
                var dy = players[k].dy;
                while (x2 != x1 || y2 != y1) {
                    if (collisionMap[x1][y1] != -1) {
                        if ([collisionMap[x1][y1]] == players[k].id) {
                            io.sockets.emit('status', players[k].name + ' s\'est auto détruit !');
                        } else {
                            io.sockets.emit('status', players[collisionMap[x1][y1]].name + ' a détruit ' + players[k].name);
                        }
                        destroy(players[k]);
                        break;
                    }
                    x1 += dx;
                    y1 += dy;
                }
                if (players[k].x + players[k].dx * vitesse - 8 <= 0
                    || players[k].x + players[k].dx * vitesse + 8 >= map.width
                    || players[k].y + players[k].dy * vitesse - 8 <= 0
                    || players[k].y + players[k].dy * vitesse + 8 >= map.height
                ) {
                    io.sockets.emit('status', players[k].name + ' s\'est pris un mur !');
                    destroy(players[k]);
                }
            }
        }
    }
}

function destroy(player) {
    player.destroy = true;
    playerleft--;
    io.sockets.emit('destroy', player.id);
}

/* ==================
 Lancement du serveur
 ==================== */

reset();