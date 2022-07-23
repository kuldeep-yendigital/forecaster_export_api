class EventService {

    constructor() {
        this.connections = {};
        this.history = {};
    }

    addConnection(req, res, id = null) {
        return (() => {
            if (!id) {
                id = new Date().getTime().toString() + Math.floor(Math.random() * 1000).toString()
            }
            const conn = {
                id: id,
                send: function send(body) {
                    res.write(body);
                }
            };
            this.connections[conn.id] = conn;

            res.writeHead(200, {
                "Access-Control-Allow-Origin": "*",
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
                'X-Accel-Buffering': 'no' // Disable buffering for nginx
            });

            res.write('\n');
            req.on('close', () => {
                delete this.connections[conn.id];
            });
        })();
    }

    trigger(body) {
        const id = body.id || Math.floor(Math.random() * 1001);
        body.updatedAt = Date.now();
        const event = format_event(body);
        if(body.connection_id && this.connections[body.connection_id]) {
            this.connections[body.connection_id].send(event);
        }
        else {
            for (var k in this.connections) {
                this.connections[k].send(event);
            }
        }
    }

    latest_events() {
        var str = [];
        for (var id in this.history) {
            str.push(history[id]);
        }
        return str.join('');
    }
}




function format_event(body) {
    return 'data: ' + JSON.stringify(body) + '\n\n';
}

global.__es = global.__es || new EventService();
module.exports = global.__es;
