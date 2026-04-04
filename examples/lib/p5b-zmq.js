const { Request } = require("zeromq");

class P5bZMQ {
    constructor(options = {}) {
        this.host = options.host || "localhost";
        this.port = options.port || "60001";
        this.silent = options.silent || false;
        this.sock = null;
        this.p = options.p || null;

        this.metrics = {
            framesDrawn: 0,
            framesSent: 0,
            errorCount: 0
        };
        this.pending = false;
        this.statsInterval = this.statsInterval || 5000;

        if (!this.p) {
            throw new Error("Must pass in a P5b instance");
        }

        this.p.on("frame", async (pixelBuffer) => {
            this.metrics.framesDrawn++;
            if (this.pending) return;  // Skip frame if send is in progress
            await this.onFrame(pixelBuffer);
        });

        this.p.on("error", (err) => {
            this.metrics.errorCount++;
            if (!this.silent) {
                console.error(`p5b error in ${err.phase}:`, err.error.message);
            }
        });

        this.statsInterval = setInterval(() => {
            console.log(JSON.stringify(this.metrics));
        }, this.statsInterval);
    }

    async connect() {
        const zmqDest = `tcp://${this.host}:${this.port}`;
        if (!this.silent) {
            console.log(`Connecting to ${zmqDest}`);
        }

        this.sock = new Request();
        this.sock.connect(zmqDest);
        
        this.p.run();
        return zmqDest;
    }

    async disconnect() {
        clearInterval(this.statsInterval);
        this.p.stop();
        if (this.sock) {
            this.sock.close();
            this.sock = null;
        }
    }

    async onFrame(pixelBuffer) {
        if (pixelBuffer.length !== this.p.width * this.p.height * 4) {
            const err = new Error(`Size mismatch: ${pixelBuffer.length} != ${this.p.width * this.p.height * 4}`);
            if (!this.silent) {
                console.error(err.message);
            }
            return;
        }

        this.pending = true;
        try {
            await this.sock.send(pixelBuffer);
            await this.sock.receive();
            this.metrics.framesSent++;
        } catch (err) {
            this.metrics.errorCount++;
            if (!this.silent) {
                console.error(`ZMQ error: ${err.message}`);
            }
        } finally {
            this.pending = false;
        }
    }
}

module.exports = { P5bZMQ };
